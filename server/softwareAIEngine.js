/**
 * ====================================================================
 * RADAR SECOP - MOTOR DE CONTRATACIÓN DE SOFTWARE, CONSULTORÍA & IA
 * Marco Normativo y Técnico:
 * - Ley 1150 de 2007, Art. 2 Numeral 3 (Concurso de Méritos para TI y Consultoría)
 * - Guía Oficial de CCE para Estimación por Factor Multiplicador (Decreto 1082/2015)
 * - Estatuto Tributario: Art. 476 Numerales 23 y 24 (Exclusión de IVA Cloud y Software)
 * - Ley 23 de 1982 y Ley 1450 de 2011, Art. 20 (Cesión de Derechos Patrimoniales de Autor)
 * - Marcos de Calidad de Software (ISO 25010 / SLAs) y Métricas de IA (Accuracy, F1, Hallucination)
 * ====================================================================
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

class SoftwareAIEngine {
  constructor() {
    this.FACTOR_PRESTACIONAL_DEFAULT_PCT = 52.0;       // 52% prestaciones sociales (CST/Ley 100)
    this.FACTOR_INDIRECTOS_DEFAULT_PCT = 25.0;          // 25% gastos generales, licencias, hardware
    this.FACTOR_UTILIDAD_HONORARIOS_DEFAULT_PCT = 15.0; // 15% honorarios profesionales / utilidad
  }

  /**
   * Calcula el Factor Multiplicador oficial según la metodología de Colombia Compra Eficiente
   * 
   * @param {Object} params
   * @param {number} [params.factorPrestacionalPct=52.0]
   * @param {number} [params.factorCostosIndirectosPct=25.0]
   * @param {number} [params.factorUtilidadHonorariosPct=15.0]
   * @returns {Object}
   */
  calcularFactorMultiplicador({
    factorPrestacionalPct = 52.0,
    factorCostosIndirectosPct = 25.0,
    factorUtilidadHonorariosPct = 15.0
  } = {}) {
    const prestacional = Math.max(0, Number(factorPrestacionalPct) || this.FACTOR_PRESTACIONAL_DEFAULT_PCT);
    const indirectos = Math.max(0, Number(factorCostosIndirectosPct) || this.FACTOR_INDIRECTOS_DEFAULT_PCT);
    const utilidad = Math.max(0, Number(factorUtilidadHonorariosPct) || this.FACTOR_UTILIDAD_HONORARIOS_DEFAULT_PCT);

    // Fórmula CCE: FM = 1 + (Prestaciones/100) + (Indirectos/100) + (Utilidad/100)
    const factorMultiplicador = 1 + (prestacional / 100) + (indirectos / 100) + (utilidad / 100);

    return {
      factor_prestacional_pct: prestacional,
      factor_costos_indirectos_pct: indirectos,
      factor_utilidad_honorarios_pct: utilidad,
      factor_multiplicador: Number(factorMultiplicador.toFixed(3)),
      fundamento_legal: 'Metodología de Factor Multiplicador CCE (Decreto 1082 de 2015)',
      explicacion: `Por cada $1.000 COP de salario básico del profesional, la tarifa final propuesta es de $${Math.round(factorMultiplicador * 1000).toLocaleString('es-CO')} COP.`
    };
  }

  /**
   * Estima el presupuesto integral de un proyecto de Software y Servicios de IA
   * 
   * @param {Object} params
   * @param {Array<Object>} params.roles - Lista de roles del equipo de desarrollo e IA
   * @param {number} [params.factorMultiplicador=1.92]
   * @param {number} [params.duracionMeses=6]
   * @param {number} [params.sprintsTotales=12]
   * @param {Object} [params.consumoCloudTokens={}]
   * @returns {Object}
   */
  estimarPresupuestoSoftwareIA({
    roles = [],
    factorMultiplicador = 1.92,
    duracionMeses = 6,
    sprintsTotales = 12,
    consumoCloudTokens = {}
  }) {
    const fm = Number(factorMultiplicador) || 1.92;
    const meses = Math.max(1, parseInt(duracionMeses, 10) || 6);
    const sprints = Math.max(1, parseInt(sprintsTotales, 10) || 12);

    let costoDirectoPersonalMes = 0;

    const rolesCalculados = (Array.isArray(roles) && roles.length > 0 ? roles : this.getRolesDefault()).map(r => {
      const salarioBase = Number(r.salarioBaseMes) || 0;
      const dedicacion = Math.min(100, Math.max(1, Number(r.dedicacionPct) || 100));
      const costoDirectoRol = (salarioBase * dedicacion) / 100;
      const tarifaFacturadaMes = costoDirectoRol * fm;
      const costoTotalProyectoRol = tarifaFacturadaMes * meses;

      costoDirectoPersonalMes += costoDirectoRol;

      return {
        rol: r.rol || 'Ingeniero de Software',
        nivel: r.nivel || 'SENIOR',
        salario_base_mes: salarioBase,
        dedicacion_pct: dedicacion,
        costo_directo_mes: Number(costoDirectoRol.toFixed(2)),
        tarifa_facturada_mes: Number(tarifaFacturadaMes.toFixed(2)),
        costo_total_proyecto: Number(costoTotalProyectoRol.toFixed(2))
      };
    });

    const costoTotalPersonalMes = costoDirectoPersonalMes * fm;
    const costoTotalPersonalProyecto = costoTotalPersonalMes * meses;

    // Cómputo Cloud & Consumo de Tokens de IA
    const tokensMillon = Number(consumoCloudTokens.tokens_llm_millon) || 100;
    const costoPorMillonCop = Number(consumoCloudTokens.costo_por_millon_cop) || 200000; // ~$50 USD / M token
    const costoInferenciaIa = tokensMillon * costoPorMillonCop;

    const infraestructuraCloudMes = Number(consumoCloudTokens.infraestructura_cloud_mes) || 6000000;
    const costoTotalCloud = infraestructuraCloudMes * meses;

    const vectorDbYHerramientas = Number(
      consumoCloudTokens.vector_db_herramientas !== undefined
        ? consumoCloudTokens.vector_db_herramientas
        : (consumoCloudTokens.vector_db_y_herramientas !== undefined
            ? consumoCloudTokens.vector_db_y_herramientas
            : 8000000)
    );

    const costoTotalCloudTokens = costoInferenciaIa + costoTotalCloud + vectorDbYHerramientas;

    const presupuestoTotal = costoTotalPersonalProyecto + costoTotalCloudTokens;
    const costoPorSprint = presupuestoTotal / sprints;

    return {
      duracion_meses: meses,
      sprints_totales: sprints,
      factor_multiplicador_aplicado: fm,
      roles_evaluados: rolesCalculados,
      resumen_personal: {
        costo_directo_salarios_mes: Number(costoDirectoPersonalMes.toFixed(2)),
        costo_total_personal_mes: Number(costoTotalPersonalMes.toFixed(2)),
        costo_total_personal_proyecto: Number(costoTotalPersonalProyecto.toFixed(2))
      },
      resumen_cloud_ia: {
        tokens_llm_millon: tokensMillon,
        costo_inferencia_ia_cop: Number(costoInferenciaIa.toFixed(2)),
        infraestructura_cloud_mes: Number(infraestructuraCloudMes.toFixed(2)),
        costo_total_cloud_proyecto: Number(costoTotalCloud.toFixed(2)),
        vector_db_y_herramientas: Number(vectorDbYHerramientas.toFixed(2)),
        costo_total_cloud_tokens: Number(costoTotalCloudTokens.toFixed(2))
      },
      presupuesto_total_estimado: Number(presupuestoTotal.toFixed(2)),
      costo_promedio_por_sprint: Number(costoPorSprint.toFixed(2)),
      regimen_tributario_sugerido: {
        exclusion_iva_cloud: true,
        fundamento_iva: 'Art. 476 Numeral 23 y 24 E.T. (Servicios Cloud y Software Excluidos de IVA)',
        contribucion_obra_ley_1106: false,
        fundamento_ley_1106: 'La contribución del 5% de la Ley 1106/2006 NO aplica a Software, Consultoría o IA.'
      }
    };
  }

  /**
   * Roles por defecto para proyectos de IA y Software a la Medida
   */
  getRolesDefault() {
    return [
      { rol: 'Arquitecto de Solución Cloud & IA', nivel: 'LEAD', salarioBaseMes: 14000000, dedicacionPct: 100 },
      { rol: 'Ingeniero de IA & Modelos LLM', nivel: 'SENIOR', salarioBaseMes: 10500000, dedicacionPct: 100 },
      { rol: 'Desarrollador Fullstack Backend/Frontend', nivel: 'SENIOR', salarioBaseMes: 8500000, dedicacionPct: 100 },
      { rol: 'Ingeniero DevOps, SRE & Ciberseguridad', nivel: 'SENIOR', salarioBaseMes: 8500000, dedicacionPct: 50 },
      { rol: 'Ingeniero QA Automation & Pruebas', nivel: 'SEMI_SENIOR', salarioBaseMes: 6000000, dedicacionPct: 50 },
      { rol: 'Scrum Master / Agile Project Lead', nivel: 'SENIOR', salarioBaseMes: 8000000, dedicacionPct: 50 }
    ];
  }

  /**
   * Evalúa el cumplimiento de SLAs y Calidad Pericial de Modelos de IA
   * 
   * @param {Object} params
   * @returns {Object}
   */
  evaluarSlasYCalidadIA({
    uptimeReal = 99.95,
    uptimeMeta = 99.90,
    latenciaRealMs = 145,
    latenciaMetaMs = 200,
    mttrRealHoras = 1.20,
    mttrMetaHoras = 2.00,
    codeCoveragePct = 88.50,
    vulnerabilidadesCriticas = 0,
    precisionModeloIaPct = 94.20,
    f1ScoreIaPct = 93.80,
    tasaAlucinacionIaPct = 1.20
  }) {
    const upReal = Number(uptimeReal) || 0;
    const upMeta = Number(uptimeMeta) || 99.9;
    const latReal = parseInt(latenciaRealMs, 10) || 0;
    const latMeta = parseInt(latenciaMetaMs, 10) || 200;
    const mttrReal = Number(mttrRealHoras) || 0;
    const mttrMeta = Number(mttrMetaHoras) || 2.0;

    const cov = Number(codeCoveragePct) || 0;
    const vuln = parseInt(vulnerabilidadesCriticas, 10) || 0;
    const prec = Number(precisionModeloIaPct) || 0;
    const f1 = Number(f1ScoreIaPct) || 0;
    const aluc = Number(tasaAlucinacionIaPct) || 0;

    const slaUptimeCumple = upReal >= upMeta;
    const slaLatenciaCumple = latReal <= latMeta;
    const slaMttrCumple = mttrReal <= mttrMeta;
    const calidadCoverageCumple = cov >= 80.0;
    const seguridadOwaspCumple = vuln === 0;
    const calidadIaCumple = prec >= 90.0 && f1 >= 90.0 && aluc <= 2.0;

    const fallas = [];
    if (!slaUptimeCumple) fallas.push(`Disponibilidad (${upReal}%) inferior a la meta (${upMeta}%)`);
    if (!slaLatenciaCumple) fallas.push(`Latencia (${latReal}ms) superior a la meta (${latMeta}ms)`);
    if (!slaMttrCumple) fallas.push(`MTTR (${mttrReal}h) supera la meta (${mttrMeta}h)`);
    if (!calidadCoverageCumple) fallas.push(`Cobertura de pruebas (${cov}%) menor al umbral mínimo del 80%`);
    if (!seguridadOwaspCumple) fallas.push(`${vuln} vulnerabilidades OWASP críticas detectadas`);
    if (!calidadIaCumple) fallas.push(`Métricas de IA no conformes (Alucinación: ${aluc}%, F1: ${f1}%)`);

    let estadoGlobal = 'CONFORME_OPTIMO';
    let penalizable = false;

    if (fallas.length === 0) {
      estadoGlobal = 'CONFORME_OPTIMO';
    } else if (fallas.length <= 2 && slaUptimeCumple && seguridadOwaspCumple) {
      estadoGlobal = 'CONFORME_OBSERVADO';
    } else {
      estadoGlobal = 'PENALIZABLE_SLA_INCUMPLIDO';
      penalizable = true;
    }

    return {
      estado_global: estadoGlobal,
      es_penalizable: penalizable,
      slas_infraestructura: {
        uptime: { real: upReal, meta: upMeta, cumple: slaUptimeCumple },
        latencia: { real: latReal, meta: latMeta, cumple: slaLatenciaCumple },
        mttr: { real: mttrReal, meta: mttrMeta, cumple: slaMttrCumple }
      },
      calidad_software: {
        code_coverage_pct: cov,
        cumple_coverage: calidadCoverageCumple,
        vulnerabilidades_owasp_criticas: vuln,
        cumple_seguridad: seguridadOwaspCumple
      },
      metricas_inteligencia_artificial: {
        precision_pct: prec,
        f1_score_pct: f1,
        tasa_alucinacion_pct: aluc,
        alucinacion_tolerada_max: 2.0,
        cumple_ia: calidadIaCumple
      },
      fallas_detectadas: fallas,
      dictamen_supervision: penalizable
        ? `ALERTA DE PENALIZACIÓN: Se evidencia incumplimiento reiterado de SLAs técnicos en ${fallas.length} indicadores.`
        : `CONFORME: El software y los modelos de IA operan dentro de los umbrales de disponibilidad y fidelidad técnica exigidos.`
    };
  }

  /**
   * Califica la idoneidad del equipo de trabajo para Concurso de Méritos (Ley 1150)
   * 
   * @param {Object} params
   * @param {Array<Object>} params.perfiles
   * @returns {Object}
   */
  evaluarEquipoConcursoMeritos({ perfiles = [] }) {
    let puntajeFormacion = 0;
    let puntajeExperiencia = 0;
    let puntajeCertificaciones = 0;

    const evaluados = (Array.isArray(perfiles) ? perfiles : []).map(p => {
      let ptsForm = 0;
      let ptsExp = 0;
      let ptsCert = 0;

      const posgrado = (p.posgrado || '').toUpperCase();
      if (posgrado.includes('DOCTOR') || posgrado.includes('PHD')) ptsForm = 15;
      else if (posgrado.includes('MAESTR') || posgrado.includes('MASTER')) ptsForm = 12;
      else if (posgrado.includes('ESPECIALIZ')) ptsForm = 8;
      else ptsForm = 4;

      const meses = parseInt(p.mesesExperiencia, 10) || 0;
      if (meses >= 60) ptsExp = 15;
      else if (meses >= 36) ptsExp = 10;
      else ptsExp = 5;

      const certs = Array.isArray(p.certificaciones) ? p.certificaciones : [];
      ptsCert = Math.min(10, certs.length * 3.5);

      const totalPerfil = ptsForm + ptsExp + ptsCert;
      puntajeFormacion += ptsForm;
      puntajeExperiencia += ptsExp;
      puntajeCertificaciones += ptsCert;

      return {
        profesional: p.profesional || 'Profesional de TI',
        rol: p.rol || 'Ingeniero de Software',
        posgrado: p.posgrado || 'Título Profesional',
        meses_experiencia: meses,
        certificaciones: certs,
        puntaje_obtenido: Number(totalPerfil.toFixed(1))
      };
    });

    const totalConcurso = Math.min(100, puntajeFormacion + puntajeExperiencia + puntajeCertificaciones);

    return {
      perfiles_evaluados: evaluados,
      puntaje_formacion_obtenido: Number(puntajeFormacion.toFixed(1)),
      puntaje_experiencia_obtenido: Number(puntajeExperiencia.toFixed(1)),
      puntaje_certificaciones_obtenido: Number(puntajeCertificaciones.toFixed(1)),
      puntaje_total_concurso: Number(totalConcurso.toFixed(1)),
      dictamen_habilitacion: totalConcurso >= 70.0 ? 'HABILITADO_ALTO_PUNTAJE' : 'REQUIERE_SUBSANACION_EXPERIENCIA'
    };
  }

  /**
   * Genera el Dictamen Pericial de Software, Propuesta Técnica y SLAs en PDF
   * 
   * @param {Object} data
   * @returns {Promise<Buffer>}
   */
  async generarDictamenTecnicoSoftwarePdf(data) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: 36, bottom: 36, left: 36, right: 36 },
          bufferPages: true
        });

        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const {
          proceso_numero = 'CM-TI-2026-001',
          contrato_numero = 'CTO-TI-2026-045',
          entidad_nombre = 'MINISTERIO DE LAS TIC - MINTIC',
          contratista_nombre = 'NIKADU IA S.A.S.',
          contratista_nit = '901.888.777-1',
          nombre_proyecto = 'Plataforma de Agentes Conversacionales con IA & Analítica Predictiva',
          estimacion = {},
          slas = {},
          propiedad_intelectual = {}
        } = data;

        const primaryColor = '#10B981';   // Verde Esmeralda NIKADU
        const darkText = '#0F172A';
        const grayText = '#475569';
        const lightBg = '#F8FAFC';
        const accentCyan = '#0EA5E9';

        // -------------------------------------------------------------
        // ENCABEZADO TÉCNICO TI & IA
        // -------------------------------------------------------------
        doc.rect(36, 36, 540, 52).fillAndStroke('#ECFDF5', '#A7F3D0');

        doc.fillColor('#065F46').fontSize(9.5).font('Helvetica-Bold')
           .text('PROPUESTA TÉCNICA & SUPERVISIÓN DE SOFTWARE, CONSULTORÍA E IA', 46, 44, { align: 'center', width: 520 });
        doc.fillColor(darkText).fontSize(11).font('Helvetica-Bold')
           .text('MEMORIA DE CÁLCULO FACTOR MULTIPLICADOR CCE & ACUERDOS DE NIVEL DE SERVICIO (SLA)', 46, 57, { align: 'center', width: 520 });
        doc.fillColor(grayText).fontSize(7).font('Helvetica')
           .text('Ley 1150/2007 Concurso de Méritos • Cesión de Derechos Patrimoniales Ley 23/1982 • Exclusión de IVA Art. 476 E.T.', 46, 72, { align: 'center', width: 520 });

        doc.y = 98;

        // -------------------------------------------------------------
        // FICHA GENERAL DEL PROYECTO TECNOLÓGICO
        // -------------------------------------------------------------
        doc.rect(36, doc.y, 540, 68).fillAndStroke(lightBg, '#E2E8F0');
        const cy = doc.y + 6;

        doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('EXPEDIENTE DE INGENIERÍA DE SOFTWARE & SERVICIOS DE IA', 44, cy);

        let ly = cy + 12;
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(darkText).text('Entidad Contratante: ', 44, ly, { continued: true })
           .font('Helvetica').text(entidad_nombre);
        doc.font('Helvetica-Bold').text('Contrato / Concurso: ', 320, ly, { continued: true })
           .font('Helvetica').text(`${contrato_numero} / ${proceso_numero}`);

        ly += 11;
        doc.font('Helvetica-Bold').text('Proveedor Tecnológico: ', 44, ly, { continued: true })
           .font('Helvetica').text(`${contratista_nombre} (NIT: ${contratista_nit})`);
        doc.font('Helvetica-Bold').text('Factor Multiplicador CCE: ', 320, ly, { continued: true })
           .font('Helvetica-Bold').fillColor(primaryColor).text(`${estimacion.factor_multiplicador_aplicado || 1.92}x`);

        ly += 11;
        doc.font('Helvetica-Bold').fillColor(darkText).text('Nombre del Proyecto: ', 44, ly, { continued: true })
           .font('Helvetica').text(nombre_proyecto.substring(0, 50));
        doc.font('Helvetica-Bold').text('Duración / Sprints: ', 320, ly, { continued: true })
           .font('Helvetica').text(`${estimacion.duracion_meses || 6} Meses (${estimacion.sprints_totales || 12} Sprints)`);

        ly += 11;
        doc.font('Helvetica-Bold').text('Presupuesto Total Estimado: ', 44, ly, { continued: true })
           .font('Helvetica-Bold').fillColor(primaryColor).text(`$ ${Number(estimacion.presupuesto_total_estimado || 0).toLocaleString('es-CO')} COP (Excluido IVA Art. 476)`);
        doc.font('Helvetica-Bold').fillColor(darkText).text('Régimen Obra 5%: ', 320, ly, { continued: true })
           .font('Helvetica-Bold').fillColor('#059669').text('NO APLICA LEY 1106');

        doc.y = 176;

        // -------------------------------------------------------------
        // SECCIÓN 1: FACTOR MULTIPLICADOR Y ROLES DE INGENIERÍA
        // -------------------------------------------------------------
        doc.rect(36, doc.y, 540, 16).fill('#1E293B');
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF')
           .text('1. EQUIPO TÉCNICO DE INGENIERÍA & FACTOR MULTIPLICADOR CCE', 44, doc.y + 4);

        doc.y += 18;

        const tableTop = doc.y;
        doc.rect(36, tableTop, 540, 14).fill('#F1F5F9');
        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(darkText);
        doc.text('ROL ESPECIALIZADO TI / IA', 44, tableTop + 3, { width: 180 });
        doc.text('NIVEL', 225, tableTop + 3, { width: 50, align: 'center' });
        doc.text('DEDICACIÓN', 280, tableTop + 3, { width: 60, align: 'center' });
        doc.text('SUELDO BASE MES', 345, tableTop + 3, { width: 90, align: 'right' });
        doc.text('TARIFA CCE MES (FM)', 445, tableTop + 3, { width: 120, align: 'right' });

        let dy = tableTop + 15;
        const roles = estimacion.roles_evaluados || [];

        roles.forEach((r, idx) => {
          if (idx % 2 === 1) doc.rect(36, dy, 540, 12).fill('#F8FAFC');
          doc.font('Helvetica').fontSize(6.5).fillColor(darkText);
          doc.text(r.rol, 44, dy + 2, { width: 180 });
          doc.text(r.nivel, 225, dy + 2, { width: 50, align: 'center' });
          doc.text(`${r.dedicacion_pct}%`, 280, dy + 2, { width: 60, align: 'center' });
          doc.text(`$ ${Number(r.salario_base_mes).toLocaleString('es-CO')}`, 345, dy + 2, { width: 90, align: 'right' });
          doc.font('Helvetica-Bold').fillColor(primaryColor)
             .text(`$ ${Number(r.tarifa_facturada_mes).toLocaleString('es-CO')}`, 445, dy + 2, { width: 120, align: 'right' });
          dy += 12;
        });

        doc.y = dy + 6;

        // -------------------------------------------------------------
        // SECCIÓN 2: ACUERDOS DE NIVEL DE SERVICIO (SLA) & CALIDAD DE IA
        // -------------------------------------------------------------
        doc.rect(36, doc.y, 540, 16).fill('#0F766E');
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF')
           .text('2. ACUERDOS DE NIVEL DE SERVICIO (SLA) & MÉTRICAS DE INTELIGENCIA ARTIFICIAL', 44, doc.y + 4);

        doc.y += 18;

        const slaCardY = doc.y;
        doc.rect(36, slaCardY, 540, 48).fillAndStroke('#FFFFFF', '#CBD5E1');

        let sy = slaCardY + 4;
        doc.font('Helvetica').fontSize(7.2).fillColor(darkText);
        doc.text(`• Uptime Disponibilidad: ${slas.slas_infraestructura?.uptime?.real || 99.95}% (Meta SLA: >=${slas.slas_infraestructura?.uptime?.meta || 99.90}%)`, 44, sy);
        doc.text(`• Latencia Promedio API: ${slas.slas_infraestructura?.latencia?.real || 145} ms (Meta SLA: <=${slas.slas_infraestructura?.latencia?.meta || 200} ms)`, 310, sy);

        sy += 11;
        doc.text(`• Cobertura Pruebas (Coverage): ${slas.calidad_software?.code_coverage_pct || 88.5}% (Umbral: >=80%)`, 44, sy);
        doc.text(`• Vulnerabilidades OWASP Críticas: ${slas.calidad_software?.vulnerabilidades_owasp_criticas || 0} detectadas`, 310, sy);

        sy += 11;
        doc.text(`• Precisión / F1-Score Modelo IA: ${slas.metricas_inteligencia_artificial?.precision_pct || 94.2}% (Meta: >=90%)`, 44, sy);
        doc.font('Helvetica-Bold').fillColor('#059669')
           .text(`• Tasa de Alucinación de IA: ${slas.metricas_inteligencia_artificial?.tasa_alucinacion_pct || 1.2}% (Tolerancia: <=2.0%)`, 310, sy);

        sy += 11;
        doc.font('Helvetica-Bold').fillColor(primaryColor)
           .text(`Estado Global de Supervisión: ${slas.estado_global || 'CONFORME_OPTIMO'}`, 44, sy);

        doc.y = slaCardY + 56;

        // -------------------------------------------------------------
        // SECCIÓN 3: CLÁUSULA DE PROPIEDAD INTELECTUAL (LEY 23/82 / LEY 1450/11)
        // -------------------------------------------------------------
        doc.rect(36, doc.y, 540, 44).fillAndStroke('#F0FDF4', '#86EFAC');
        const piY = doc.y + 4;
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#166534')
           .text('3. CERTIFICACIÓN DE CESIÓN DE DERECHOS PATRIMONIALES (ART. 20 LEY 1450 DE 2011)', 44, piY);
        doc.font('Helvetica').fontSize(6.5).fillColor(darkText)
           .text(
             'El contratista certifica la cesión total y exclusiva de los derechos patrimoniales sobre el código fuente, artefactos y modelos desarrollados a favor de la Entidad Estatal, conservando los derechos morales del autor. Se garantiza que los componentes de código abierto incorporados operan bajo licencias permisivas (MIT/Apache 2.0) sin riesgo de contaminación GPL.',
             44,
             piY + 11,
             { width: 520, align: 'justify' }
           );

        doc.y = piY + 48;

        // -------------------------------------------------------------
        // FIRMAS DE AVAL TÉCNICO
        // -------------------------------------------------------------
        const sWidth = 150;
        const fy = doc.y + 10;
        doc.rect(36, fy, 540, 50).fillAndStroke('#FFFFFF', '#CBD5E1');

        doc.moveTo(46, fy + 32).lineTo(46 + sWidth, fy + 32).stroke('#94A3B8');
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(darkText)
           .text('REPRESENTANTE LEGAL / TECH LEAD', 46, fy + 35, { width: sWidth, align: 'center' });
        doc.font('Helvetica').fontSize(5.5).fillColor(grayText)
           .text(`${contratista_nombre}\nIngeniería & Soluciones de IA`, 46, fy + 43, { width: sWidth, align: 'center' });

        doc.moveTo(380, fy + 32).lineTo(380 + sWidth, fy + 32).stroke('#94A3B8');
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(darkText)
           .text('SUPERVISOR TÉCNICO DE TI', 380, fy + 35, { width: sWidth, align: 'center' });
        doc.font('Helvetica').fontSize(5.5).fillColor(grayText)
           .text(`${entidad_nombre}\nOficina de Tecnologías de Información`, 380, fy + 43, { width: sWidth, align: 'center' });

        // Numeración de páginas
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(6.5).font('Helvetica').fillColor('#94A3B8')
             .text(
               `Radar SECOP • Ficha Técnica de Software e IA • Página ${i + 1} de ${pages.count}`,
               36,
               doc.page.height - 24,
               { align: 'center', width: 540 }
             );
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Genera el Libro de Estimación y Costeo de Software e IA en Excel (.xlsx)
   * 
   * @param {Object} data
   * @returns {Promise<Buffer>}
   */
  async generarMemoriaCosteoSoftwareExcel(data) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Radar SECOP - NIKADU IA';
    workbook.lastModifiedBy = 'Radar SECOP';
    workbook.created = new Date();
    workbook.modified = new Date();

    const {
      proceso_numero = 'CM-TI-2026-001',
      contrato_numero = 'CTO-TI-2026-045',
      entidad_nombre = 'ENTIDAD ESTATAL CONTRATANTE',
      contratista_nombre = 'NIKADU IA S.A.S.',
      estimacion = {}
    } = data;

    const ws = workbook.addWorksheet('Presupuesto Software & IA CCE');
    ws.views = [{ showGridLines: true }];

    ws.columns = [
      { width: 32 },
      { width: 28 },
      { width: 20 },
      { width: 22 },
      { width: 24 }
    ];

    ws.mergeCells('A1:E1');
    ws.getCell('A1').value = 'REPÚBLICA DE COLOMBIA • RADAR SECOP SUITE DE TECNOLOGÍA & IA';
    ws.getCell('A1').font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
    ws.getCell('A1').alignment = { horizontal: 'center' };

    ws.mergeCells('A2:E2');
    ws.getCell('A2').value = 'MEMORIA DE CÁLCULO DE FACTOR MULTIPLICADOR CCE & CÓMPUTO CLOUD / IA';
    ws.getCell('A2').font = { size: 12, bold: true, color: { argb: 'FF10B981' } };
    ws.getCell('A2').alignment = { horizontal: 'center' };

    ws.addRow([]);
    ws.addRow(['CONTRATO / PROCESO:', contrato_numero, 'PROCESO SECOP:', proceso_numero]);
    ws.addRow(['ENTIDAD CONTRATANTE:', entidad_nombre, 'PROVEEDOR TI:', contratista_nombre]);
    ws.addRow(['DURACIÓN DEL PROYECTO:', `${estimacion.duracion_meses || 6} Meses`, 'TOTAL SPRINTS:', `${estimacion.sprints_totales || 12} Sprints`]);
    ws.addRow(['FACTOR MULTIPLICADOR:', estimacion.factor_multiplicador_aplicado || 1.92, 'RÉGIMEN IVA:', 'EXCLUIDO ART. 476 E.T.']);

    ['A4', 'A5', 'A6', 'A7', 'C4', 'C5', 'C6', 'C7'].forEach(c => {
      ws.getCell(c).font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
    });

    ws.addRow([]);
    ws.addRow(['1. NÓMINA DE INGENIERÍA DE SOFTWARE & SERVICIOS DE IA (FACTOR MULTIPLICADOR)']);
    ws.getCell('A9').font = { bold: true, size: 11, color: { argb: 'FF10B981' } };

    const hRow = 10;
    ws.addRow(['ROL PROFESIONAL', 'NIVEL', 'DEDICACIÓN', 'SALARIO BASE MES (COP)', 'TARIFA FACTURADA MES']);
    ws.getRow(hRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ['A10', 'B10', 'C10', 'D10', 'E10'].forEach(c => {
      ws.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
    });

    const roles = estimacion.roles_evaluados || [];
    let startRow = 11;
    roles.forEach(r => {
      ws.addRow([
        r.rol,
        r.nivel,
        `${r.dedicacion_pct}%`,
        Number(r.salario_base_mes),
        Number(r.tarifa_facturada_mes)
      ]);
      ws.getCell(`D${startRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
      ws.getCell(`E${startRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
      startRow++;
    });

    const totalPersonalRow = startRow;
    ws.addRow(['SUBTOTAL PERSONAL MES', 'Nómina + FM', '100%', { formula: `SUM(D11:D${startRow - 1})` }, { formula: `SUM(E11:E${startRow - 1})` }]);
    ws.getCell(`D${totalPersonalRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
    ws.getCell(`E${totalPersonalRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
    ws.getRow(totalPersonalRow).font = { bold: true, color: { argb: 'FF065F46' } };
    ['A', 'B', 'C', 'D', 'E'].forEach(col => {
      ws.getCell(`${col}${totalPersonalRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    });

    startRow++;
    ws.addRow([]);
    ws.addRow(['2. COSTOS DE CÓMPUTO CLOUD, TOKENS DE INFERENCIA IA & HERRAMIENTAS']);
    ws.getCell(`A${startRow + 1}`).font = { bold: true, size: 11, color: { argb: 'FF0EA5E9' } };
    startRow += 2;

    const cRow = startRow;
    ws.addRow(['RUBRO TECNOLÓGICO', 'PROVEEDOR / MODELO', 'UNIDAD', 'CANTIDAD', 'VALOR TOTAL (COP)']);
    ws.getRow(cRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ['A', 'B', 'C', 'D', 'E'].forEach(col => {
      ws.getCell(`${col}${cRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0EA5E9' } };
    });

    const cloud = estimacion.resumen_cloud_ia || {};
    startRow++;
    ws.addRow(['Inferencia de Modelos de IA', 'Gemini / Claude / OpenAI', 'Millones de Tokens', cloud.tokens_llm_millon || 100, Number(cloud.costo_inferencia_ia_cop || 0)]);
    ws.getCell(`E${startRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';

    startRow++;
    ws.addRow(['Infraestructura Cloud / GPUs', 'AWS / Azure / GCP', 'Meses de Hosting', estimacion.duracion_meses || 6, Number(cloud.costo_total_cloud_proyecto || 0)]);
    ws.getCell(`E${startRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';

    startRow++;
    ws.addRow(['Base de Datos Vectorial (RAG)', 'Pinecone / Qdrant / PgVector', 'Suscripción Proyecto', 1, Number(cloud.vector_db_y_herramientas || 0)]);
    ws.getCell(`E${startRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';

    startRow++;
    ws.addRow([]);
    startRow++;

    // Presupuesto total consolidado
    ws.addRow(['PRESUPUESTO TOTAL ESTIMADO (SOFTWARE & IA)', 'Personal + Cloud/Tokens', 'TOTAL', '', Number(estimacion.presupuesto_total_estimado || 0)]);
    ws.getCell(`E${startRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
    ws.getRow(startRow).font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };
    ['A', 'B', 'C', 'D', 'E'].forEach(col => {
      ws.getCell(`${col}${startRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF08A' } };
    });

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = new SoftwareAIEngine();
