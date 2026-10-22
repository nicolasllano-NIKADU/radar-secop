const db = require('./dbPostgres');
const config = require('./config');
const notifier = require('./notifier');
const PDFDocument = require('pdfkit');

class PAAManager {
  constructor() {
    this.socrataBase = 'https://www.datos.gov.co/resource/9sue-ezhx.json';
    this.appToken = process.env.SOCRATA_APP_TOKEN || null;
  }

  /**
   * Construye filtros SoQL dinámicos según palabras clave y códigos UNSPSC de la empresa
   */
  buildSoqlQuery(perfil, limit = 100, anio = '2026') {
    const keywords = perfil.palabras_clave || [];
    const unspsc = perfil.codigos_unspsc || [];

    const clauses = [];
    clauses.push(`annio = '${anio}'`);

    // Descartar contratos directos de apoyo a la gestión individual o servicios profesionales persona natural
    const excludeClauses = [
      "not (lower(descripcion) like '%apoyo a la gesti%')",
      "not (lower(descripcion) like '%servicios profesionales%')",
      "not (lower(descripcion) like '%prestar servicios profesionales%')",
      "not (lower(descripcion) like '%prestar sus servicios como%')",
      "not (lower(descripcion) like '%prestar como contratista%')"
    ];

    // Condición de afinidad temática
    const matchClauses = [];
    keywords.forEach(kw => {
      const cleanKw = kw.toLowerCase().replace(/'/g, "''").trim();
      if (cleanKw) {
        matchClauses.push(`lower(descripcion) like '%${cleanKw}%'`);
      }
    });

    unspsc.forEach(code => {
      const cleanCode = code.trim();
      if (cleanCode) {
        matchClauses.push(`categorias_unspsc like '%${cleanCode}%'`);
      }
    });

    if (matchClauses.length > 0) {
      clauses.push(`(${matchClauses.join(' or ')})`);
    }

    clauses.push(...excludeClauses);

    const where = clauses.join(' and ');
    const params = new URLSearchParams({
      $where: where,
      $limit: String(limit),
      $order: 'fecha_de_carga_del_paa DESC'
    });

    if (this.appToken) {
      params.append('$$app_token', this.appToken);
    }

    return `${this.socrataBase}?${params.toString()}`;
  }

  /**
   * Realiza la sincronización de compras proyectadas del PAA para una empresa
   */
  async syncPAAForCompany(empresa, perfil, limit = 80) {
    const url = this.buildSoqlQuery(perfil, limit);
    console.log(`📡 [PAA] Consultando compras proyectadas para ${empresa.razon_social}...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Socrata PAA error ${response.status}: ${await response.text()}`);
    }

    const items = await response.json();
    let nuevos = 0;

    for (const item of items) {
      // 1. Guardar o actualizar registro de compra proyectada
      const id = item.id || item.identificador_unico;
      const valorTotal = parseFloat(item.valor_total_esperado || item.valor_esperado_de_presupuesto) || 0;
      const urlProc = item.url_proceso?.url || '';

      const queryPaa = `
        INSERT INTO paa_adquisiciones (
          id, identificador_unico, descripcion, nombre_entidad, nit_entidad,
          codigo_entidad, modalidad, categorias_unspsc, fecha_esperada_inicio,
          fecha_esperada_recepcion, duracion_esperada, unidad_duracion,
          valor_total_esperado, origen_recursos, url_proceso, annio,
          version_paa, fecha_version, fecha_carga_paa, actualizado_en
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          descripcion = EXCLUDED.descripcion,
          valor_total_esperado = EXCLUDED.valor_total_esperado,
          fecha_esperada_inicio = EXCLUDED.fecha_esperada_inicio,
          actualizado_en = NOW()
        RETURNING id;
      `;

      await db.query(queryPaa, [
        id,
        item.identificador_unico || id,
        item.descripcion || 'Sin descripción',
        item.nombre_entidad || 'Entidad Estatal',
        item.nit_entidad || '',
        item.codigo_entidad || '',
        item.modalidad || 'N/A',
        item.categorias_unspsc || '',
        item.fecha_esperada_de_inicio || 'No definido',
        item.fecha_esperada_de_recepcion || 'No definido',
        item.duracion_esperada || '',
        item.unidad_de_duracion_esperada || '',
        valorTotal,
        item.origen_recursos || '',
        urlProc,
        item.annio || '2026',
        item.version_del_paa || '1',
        item.fecha_version || '',
        item.fecha_de_carga_del_paa || ''
      ]);

      // 2. Calcular Score Predictivo de 3 factores (Fórmula técnica de documentación):
      // Score_Match = w1*Sim_UNSPSC + w2*Fit_Financial + w3*Proximity_Geo
      const matchScoreData = this.calculatePredictiveScore(empresa, perfil, item);

      // 3. Registrar Match Predictivo
      const queryMatch = `
        INSERT INTO paa_empresa_match (
          paa_id, empresa_id, score_predictivo, similitud_unspsc, fit_financiero,
          proximidad_geo, mes_estimado, palabras_clave_match
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        )
        ON CONFLICT (paa_id, empresa_id) DO UPDATE SET
          score_predictivo = EXCLUDED.score_predictivo,
          similitud_unspsc = EXCLUDED.similitud_unspsc,
          fit_financiero = EXCLUDED.fit_financiero,
          proximidad_geo = EXCLUDED.proximidad_geo,
          mes_estimado = EXCLUDED.mes_estimado,
          palabras_clave_match = EXCLUDED.palabras_clave_match
        RETURNING (xmax = 0) AS es_nuevo;
      `;

      const matchRes = await db.query(queryMatch, [
        id,
        empresa.id,
        matchScoreData.scoreTotal,
        matchScoreData.simUnspsc,
        matchScoreData.fitFinanciero,
        matchScoreData.proximidadGeo,
        item.fecha_esperada_de_inicio || 'Próximo',
        matchScoreData.matchedKeywords
      ]);

      if (matchRes.rows[0]?.es_nuevo) {
        nuevos++;
      }
    }

    return { totalConsultados: items.length, nuevos };
  }

  /**
   * Algoritmo de compatibilidad comercial:
   * Score = w1 * Sim_UNSPSC (40%) + w2 * Fit_Financial (40%) + w3 * Proximity_Geo (20%)
   */
  calculatePredictiveScore(empresa, perfil, item) {
    const desc = (item.descripcion || '').toLowerCase();
    const unspscCompra = (item.categorias_unspsc || '').split(';');

    // Factor 1: Similitud UNSPSC y temática (w1 = 40%)
    const matchedKeywords = [];
    (perfil.palabras_clave || []).forEach(kw => {
      if (desc.includes(kw.toLowerCase())) matchedKeywords.push(kw);
    });

    let simUnspsc = 0;
    const companyCodes = perfil.codigos_unspsc || [];
    const unspscMatches = companyCodes.filter(c => unspscCompra.some(uc => uc.includes(c)));
    
    if (unspscMatches.length > 0) {
      simUnspsc = 100;
    } else if (matchedKeywords.length > 0) {
      simUnspsc = Math.min(100, matchedKeywords.length * 30);
    }

    // Factor 2: Fit Financiero (w2 = 40%)
    // Compara el valor estimado de compra con el Capital de Trabajo y Activo Corriente de la empresa
    let fitFinanciero = 50; // Base neutral
    const valorPresupuesto = parseFloat(item.valor_total_esperado || item.valor_esperado_de_presupuesto) || 0;
    const capTrabajo = parseFloat(empresa.capital_trabajo) || 0;

    if (valorPresupuesto > 0) {
      if (capTrabajo >= valorPresupuesto * 0.3) {
        fitFinanciero = 100; // Capacidad financiera óptima para respaldar el anticipo/ejecución
      } else if (capTrabajo >= valorPresupuesto * 0.1) {
        fitFinanciero = 75;
      } else if (capTrabajo > 0) {
        fitFinanciero = 45; // Requiere consorcio
      }
    }

    // Factor 3: Proximidad Geográfica (w3 = 20%)
    let proximidadGeo = 70; // Cobertura nacional estándar
    const entidad = (item.nombre_entidad || '').toLowerCase();
    const dpto = (perfil.departamentos || [])[0]?.toLowerCase() || '';

    if (dpto && entidad.includes(dpto)) {
      proximidadGeo = 100;
    }

    const scoreTotal = Math.round(
      0.40 * simUnspsc +
      0.40 * fitFinanciero +
      0.20 * proximidadGeo
    );

    return {
      scoreTotal: Math.min(100, Math.max(10, scoreTotal)),
      simUnspsc,
      fitFinanciero,
      proximidadGeo,
      matchedKeywords
    };
  }

  /**
   * Obtiene la cartelera de oportunidades proyectadas del PAA
   */
  async getPAAOpportunities(empresaId, options = {}) {
    const { mes, minScore = 40, limit = 50 } = options;

    let filterQuery = 'WHERE pem.empresa_id = $1';
    const params = [empresaId];

    if (minScore) {
      params.push(minScore);
      filterQuery += ` AND pem.score_predictivo >= $${params.length}`;
    }

    if (mes && mes !== 'TODOS') {
      params.push(`%${mes}%`);
      filterQuery += ` AND lower(pa.fecha_esperada_inicio) LIKE lower($${params.length})`;
    }

    params.push(limit);
    const sql = `
      SELECT 
        pa.id,
        pa.identificador_unico,
        pa.descripcion,
        pa.nombre_entidad,
        pa.nit_entidad,
        pa.modalidad,
        pa.categorias_unspsc,
        pa.fecha_esperada_inicio,
        pa.duracion_esperada,
        pa.unidad_duracion,
        pa.valor_total_esperado,
        pa.origen_recursos,
        pa.url_proceso,
        pa.annio,
        pem.score_predictivo,
        pem.similitud_unspsc,
        pem.fit_financiero,
        pem.proximidad_geo,
        pem.mes_estimado,
        pem.palabras_clave_match
      FROM paa_empresa_match pem
      JOIN paa_adquisiciones pa ON pem.paa_id = pa.id
      ${filterQuery}
      ORDER BY pem.score_predictivo DESC, pa.valor_total_esperado DESC
      LIMIT $${params.length};
    `;

    const res = await db.query(sql, params);
    return res.rows;
  }

  /**
   * Obtiene la proyección consolidada por trimestres (Q1 a Q4) del PAA
   */
  async getCalendarioTrimestral(empresaId) {
    const sql = `
      SELECT 
        pa.*,
        pem.score_predictivo,
        pem.similitud_unspsc,
        pem.fit_financiero,
        pem.proximidad_geo,
        pem.palabras_clave_match
      FROM paa_empresa_match pem
      JOIN paa_adquisiciones pa ON pem.paa_id = pa.id
      WHERE pem.empresa_id = $1
      ORDER BY pem.score_predictivo DESC, pa.valor_total_esperado DESC;
    `;
    const res = await db.query(sql, [empresaId]);
    const items = res.rows;

    const trimestres = {
      Q1: { label: 'Trimestre I (Ene - Mar)', count: 0, valorTotal: 0 },
      Q2: { label: 'Trimestre II (Abr - Jun)', count: 0, valorTotal: 0 },
      Q3: { label: 'Trimestre III (Jul - Sep)', count: 0, valorTotal: 0 },
      Q4: { label: 'Trimestre IV (Oct - Dic)', count: 0, valorTotal: 0 },
      POR_DEFINIR: { label: 'Por Definir / Anual', count: 0, valorTotal: 0 }
    };

    let totalValor = 0;
    let sumaScore = 0;
    const entidadesMap = {};
    const modalidadesMap = {};

    items.forEach(it => {
      const v = parseFloat(it.valor_total_esperado) || 0;
      const s = parseInt(it.score_predictivo, 10) || 50;
      totalValor += v;
      sumaScore += s;

      const ent = it.nombre_entidad || 'Entidad Estatal';
      entidadesMap[ent] = (entidadesMap[ent] || 0) + v;

      const mod = it.modalidad || 'Otras';
      modalidadesMap[mod] = (modalidadesMap[mod] || 0) + 1;

      const f = (it.fecha_esperada_inicio || '').toLowerCase();
      if (f.includes('enero') || f.includes('febrero') || f.includes('marzo') || /[-/]0[123][-/]/.test(f)) {
        trimestres.Q1.count++;
        trimestres.Q1.valorTotal += v;
      } else if (f.includes('abril') || f.includes('mayo') || f.includes('junio') || /[-/]0[456][-/]/.test(f)) {
        trimestres.Q2.count++;
        trimestres.Q2.valorTotal += v;
      } else if (f.includes('julio') || f.includes('agosto') || f.includes('septiembre') || /[-/]0[789][-/]/.test(f)) {
        trimestres.Q3.count++;
        trimestres.Q3.valorTotal += v;
      } else if (f.includes('octubre') || f.includes('noviembre') || f.includes('diciembre') || /[-/]1[012][-/]/.test(f)) {
        trimestres.Q4.count++;
        trimestres.Q4.valorTotal += v;
      } else {
        trimestres.POR_DEFINIR.count++;
        trimestres.POR_DEFINIR.valorTotal += v;
      }
    });

    const topEntidades = Object.entries(entidadesMap)
      .map(([entidad, valor]) => ({ entidad, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    const topModalidades = Object.entries(modalidadesMap)
      .map(([modalidad, count]) => ({ modalidad, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total_oportunidades: items.length,
      valor_total_proyectado: totalValor,
      promedio_match_score: items.length > 0 ? Math.round(sumaScore / items.length) : 0,
      trimestres,
      top_entidades: topEntidades,
      top_modalidades: topModalidades
    };
  }

  /**
   * Genera el Informe Oficial de Inteligencia Comercial PAA en PDF (pdfkit)
   */
  async generarInformeComercialPdf(empresaId) {
    const resEmp = await db.query('SELECT * FROM empresas WHERE id = $1', [empresaId]);
    if (resEmp.rows.length === 0) throw new Error('Empresa no encontrada');
    const empresa = resEmp.rows[0];

    const calendario = await this.getCalendarioTrimestral(empresaId);
    const topItems = await this.getPAAOpportunities(empresaId, { minScore: 50, limit: 10 });

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          layout: 'portrait',
          margin: 36
        });

        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const fCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);

        // Encabezado Institucional
        doc.fontSize(7.5).fillColor('#64748b').text('REPÚBLICA DE COLOMBIA • SISTEMA DE CONTRATACIÓN PÚBLICA SECOP II', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text('INFORME DE INTELIGENCIA COMERCIAL PREVENTIVA - PAA 2026', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(7.5).fillColor('#475569').font('Helvetica').text('Monitoreo Estratégico y Matching Predictivo con Datos Abiertos de la ANCP - Colombia Compra Eficiente', { align: 'center' });
        doc.moveDown(0.6);

        // Resumen Ejecutivo del Proponente y Metadatos
        const topY = doc.y;
        doc.rect(36, topY, 540, 52).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(7);

        doc.font('Helvetica-Bold').text('EMPRESA EVALUADA:', 44, topY + 6).font('Helvetica').text(`${empresa.razon_social} (NIT: ${empresa.nit})`, 145, topY + 6);
        doc.font('Helvetica-Bold').text('CAPITAL DE TRABAJO:', 44, topY + 17).font('Helvetica').text(fCOP(empresa.capital_trabajo || 0), 145, topY + 17);
        doc.font('Helvetica-Bold').text('FECHA GENERACIÓN:', 44, topY + 28).font('Helvetica').text(new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }), 145, topY + 28);
        doc.font('Helvetica-Bold').text('DATASET FUENTE:', 44, topY + 39).font('Helvetica').text('API SODA REST SECOP II (Dataset 9sue-ezhx)', 145, topY + 39);

        doc.font('Helvetica-Bold').text('OPORTUNIDADES DETECTADAS:', 350, topY + 6).font('Helvetica-Bold').fillColor('#1e40af').text(String(calendario.total_oportunidades), 485, topY + 6);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text('PRESUPUESTO TOTAL PROYECTADO:', 350, topY + 17).font('Helvetica-Bold').fillColor('#0f172a').text(fCOP(calendario.valor_total_proyectado), 485, topY + 17);
        doc.font('Helvetica-Bold').text('SCORE PREDICTIVO PROMEDIO:', 350, topY + 28).font('Helvetica-Bold').fillColor('#10b981').text(`${calendario.promedio_match_score}% MATCH`, 485, topY + 28);

        doc.y = topY + 60;

        // SECCIÓN 1: DISTRIBUCIÓN TRIMESTRAL DE COMPRAS PÚBLICAS (Q1 a Q4)
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text('1. DISTRIBUCIÓN DE COMPRAS PÚBLICAS PROYECTADAS POR TRIMESTRE (Q1 - Q4):');
        doc.moveDown(0.3);

        const tab1Y = doc.y;
        doc.rect(36, tab1Y, 540, 14).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(6.5).font('Helvetica-Bold');
        doc.text('TRIMESTRE / PERIODO', 44, tab1Y + 3, { width: 170 });
        doc.text('RANGO TEMPORAL', 220, tab1Y + 3, { width: 130 });
        doc.text('PROCESOS', 360, tab1Y + 3, { width: 70, align: 'center' });
        doc.text('PRESUPUESTO PROYECTADO (COP)', 440, tab1Y + 3, { width: 130, align: 'right' });

        const qKeys = [
          { key: 'Q1', rango: 'Enero - Marzo 2026' },
          { key: 'Q2', rango: 'Abril - Junio 2026' },
          { key: 'Q3', rango: 'Julio - Septiembre 2026' },
          { key: 'Q4', rango: 'Octubre - Diciembre 2026' },
          { key: 'POR_DEFINIR', rango: 'Fecha Abierta / Sin Mes' }
        ];

        let currY = tab1Y + 14;
        qKeys.forEach((q, idx) => {
          const tData = calendario.trimestres[q.key];
          doc.rect(36, currY, 540, 14).fillAndStroke(idx % 2 === 0 ? '#f8fafc' : '#ffffff', '#e2e8f0');
          doc.fillColor('#0f172a').fontSize(6.5).font('Helvetica-Bold').text(tData.label, 44, currY + 3, { width: 170 });
          doc.font('Helvetica').text(q.rango, 220, currY + 3, { width: 130 });
          doc.text(String(tData.count), 360, currY + 3, { width: 70, align: 'center' });
          doc.font('Helvetica-Bold').text(fCOP(tData.valorTotal), 440, currY + 3, { width: 130, align: 'right' });
          currY += 14;
        });

        // Fila Total PAA
        doc.rect(36, currY, 540, 15).fill('#e2e8f0');
        doc.fillColor('#0f172a').fontSize(7).font('Helvetica-Bold');
        doc.text('TOTAL GENERAL CONSOLIDADO:', 44, currY + 4);
        doc.text(String(calendario.total_oportunidades), 360, currY + 4, { width: 70, align: 'center' });
        doc.text(fCOP(calendario.valor_total_proyectado), 440, currY + 4, { width: 130, align: 'right' });

        doc.y = currY + 22;

        // SECCIÓN 2: TOP OPORTUNIDADES ANTICIPADAS (SCORE >= 50%)
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text('2. PRINCIPALES CONTRATACIONES ANTICIPADAS Y ALINEACIÓN PREDICTIVA:');
        doc.moveDown(0.3);

        const tab2Y = doc.y;
        doc.rect(36, tab2Y, 540, 14).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(6).font('Helvetica-Bold');
        doc.text('ENTIDAD ESTATAL', 42, tab2Y + 4, { width: 120 });
        doc.text('MODALIDAD / OBJETO', 165, tab2Y + 4, { width: 180 });
        doc.text('MES ESPERADO', 350, tab2Y + 4, { width: 65, align: 'center' });
        doc.text('PRESUPUESTO COP', 420, tab2Y + 4, { width: 85, align: 'right' });
        doc.text('MATCH SCORE', 510, tab2Y + 4, { width: 60, align: 'center' });

        let currY2 = tab2Y + 14;
        if (topItems.length === 0) {
          doc.rect(36, currY2, 540, 14).fillAndStroke('#ffffff', '#e2e8f0');
          doc.fillColor('#64748b').fontSize(6.5).font('Helvetica-Oblique').text('No se encontraron contrataciones con score predictivo superior al 50%.', 44, currY2 + 3);
          currY2 += 14;
        } else {
          topItems.slice(0, 7).forEach((it, idx) => {
            doc.rect(36, currY2, 540, 18).fillAndStroke(idx % 2 === 0 ? '#f8fafc' : '#ffffff', '#e2e8f0');
            doc.fillColor('#0f172a').fontSize(6).font('Helvetica-Bold');
            doc.text(it.nombre_entidad ? it.nombre_entidad.substring(0, 26) : 'Entidad Estatal', 42, currY2 + 3, { width: 120 });
            doc.font('Helvetica').fontSize(5.5).text(`[${it.modalidad || 'Modalidad'}] ${it.descripcion ? it.descripcion.substring(0, 52) + '...' : ''}`, 165, currY2 + 3, { width: 180 });
            doc.fontSize(6).text(it.fecha_esperada_inicio || 'Por definir', 350, currY2 + 5, { width: 65, align: 'center' });
            doc.font('Helvetica-Bold').text(fCOP(it.valor_total_esperado), 420, currY2 + 5, { width: 85, align: 'right' });
            
            // Badge score
            const score = parseInt(it.score_predictivo, 10) || 50;
            const scoreColor = score >= 75 ? '#10b981' : (score >= 50 ? '#f59e0b' : '#64748b');
            doc.fillColor(scoreColor).font('Helvetica-Bold').text(`${score}%`, 510, currY2 + 5, { width: 60, align: 'center' });
            currY2 += 18;
          });
        }

        doc.y = currY2 + 16;

        // SECCIÓN 3: RECOMENDACIONES DE ALISTAMIENTO PREVENTIVO
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text('3. PLAN DE ACCIÓN Y ALISTAMIENTO TEMPRANO PARA LICITACIONES (CCE):');
        doc.moveDown(0.3);

        const recY = doc.y;
        doc.rect(36, recY, 540, 56).fillAndStroke('#eff6ff', '#bfdbfe');
        doc.fillColor('#1e40af').fontSize(6.5).font('Helvetica');
        
        doc.text('• Oportunidad de Renovación del RUP:', 44, recY + 6, { bold: true });
        doc.fillColor('#1e3a8a').text('La radicación debe efectuarse antes del 5.° día hábil de abril (Decreto 1082/2015). La sola radicación oportuna conserva la vigencia legal del registro para participar en licitaciones de Q1 y Q2 con la información en firme previa (Conceptos C-525/2026 y C-423/2021).', 44, recY + 14, { width: 520, lineGap: 1 });

        doc.fillColor('#1e40af').text('• Estructuras Plurales y Capacidad Residual (K_R):', 44, recY + 28, { bold: true });
        doc.fillColor('#1e3a8a').text('Para convocatorias de obra pública que superen el Capital de Trabajo individual, se recomienda formalizar acuerdos preliminares de consorcio o unión temporal antes de la emisión de borradores de pliego, optimizando el aporte porcentual de experiencia y garantías.', 44, recY + 36, { width: 520, lineGap: 1 });

        doc.fillColor('#1e40af').text('• Observaciones Preventivas al Borrador:', 44, recY + 48, { bold: true });
        doc.fillColor('#1e3a8a').text('Identificar en los estudios previos condiciones restrictivas o códigos UNSPSC desproporcionados para radicar observaciones técnicas durante el término de traslado.', 44, recY + 54, { width: 520, lineGap: 1 });

        // Firmas y Cierre Institucional
        doc.y = recY + 66;
        doc.moveDown(1.5);
        const sigY = doc.y;
        doc.moveTo(36, sigY).lineTo(250, sigY).stroke('#0f172a');
        doc.moveTo(320, sigY).lineTo(540, sigY).stroke('#0f172a');

        doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text('DIRECCIÓN DE INTELIGENCIA COMERCIAL:', 36, sigY + 4);
        doc.font('Helvetica').fontSize(6).text(empresa.razon_social, 36, sigY + 13);
        doc.text('Radar SECOP AI Platform • B2B SaaS', 36, sigY + 21);

        doc.font('Helvetica-Bold').fontSize(7).text('VERIFICACIÓN NORMATIVA Y TÉCNICA:', 320, sigY + 4);
        doc.font('Helvetica').fontSize(6).text('Motor Predictivo ANCP - Colombia Compra Eficiente', 320, sigY + 13);
        doc.text('Conforme a Ley 1150/2007 y Decreto 1082/2015', 320, sigY + 21);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = new PAAManager();
