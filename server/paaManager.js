const db = require('./dbPostgres');
const config = require('./config');
const notifier = require('./notifier');

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
}

module.exports = new PAAManager();
