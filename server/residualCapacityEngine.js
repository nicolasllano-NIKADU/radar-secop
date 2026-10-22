// ============================================================================
// RADAR SECOP - MOTOR DE CAPACIDAD RESIDUAL (K RESIDUAL) Y FORMULARIO 5 CCE
// Normativa: Decreto 1082/2015 (Art. 2.2.1.1.1.6.4), Guía Metodológica de 
// Capacidad Residual de ANCP - Colombia Compra Eficiente y Pliegos Tipo.
// ============================================================================

const PDFDocument = require('pdfkit');
const dbPostgres = require('./dbPostgres');

class ResidualCapacityEngine {
  /**
   * Calcula los componentes oficiales de la Capacidad Residual según CCE:
   * K_R = (CO + E + CT + CF) - SCE
   */
  static calcularFactoresKR(datos, smmlvValor = 1423500) {
    const smmlv = parseFloat(smmlvValor) || 1423500;
    const ac = parseFloat(datos.activo_corriente) || 0;
    const pc = parseFloat(datos.pasivo_corriente) || 0;
    const pat = parseFloat(datos.patrimonio) || 0;
    const at = parseFloat(datos.activo_total) || (ac + pat);
    const pt = parseFloat(datos.pasivo_total) || pc;
    const uo = parseFloat(datos.utilidad_operacional) || 0;
    const gi = parseFloat(datos.gastos_intereses) || 0;
    const io = parseFloat(datos.ingresos_operacionales) || 0;
    const expSmmlv = parseFloat(datos.experiencia_obras_smmlv) || 0;
    const numIng = parseInt(datos.numero_ingenieros_arquitectos, 10) || 0;
    const numTec = parseInt(datos.numero_tecnicos_tecnologos, 10) || 0;

    // 1. Capacidad de Organización (CO):
    // Evaluación según escala oficial de ingresos operacionales en SMMLV:
    const ioEnSmmlv = io > 0 ? (io / smmlv) : ((uo * 3) / smmlv);
    let coSmmlv = 0;
    if (ioEnSmmlv <= 3000) {
      coSmmlv = ioEnSmmlv * 0.20;
    } else if (ioEnSmmlv <= 10000) {
      coSmmlv = (3000 * 0.20) + ((ioEnSmmlv - 3000) * 0.25);
    } else {
      coSmmlv = (3000 * 0.20) + (7000 * 0.25) + ((ioEnSmmlv - 10000) * 0.30);
    }
    // Salvaguarda con base en Utilidad Operacional si IO no fue registrado
    if (coSmmlv <= 0 && uo > 0) {
      coSmmlv = (uo * 1.2) / smmlv;
    }
    const coCop = Math.round(coSmmlv * smmlv);

    // 2. Experiencia (E):
    // Factor de experiencia en contratos de obras en SMMLV acreditados en el RUP
    const eSmmlv = Math.round(expSmmlv * 0.85);
    const eCop = Math.round(eSmmlv * smmlv);

    // 3. Capacidad Técnica (CT):
    // Nómina de ingenieros/arquitectos (40 SMMLV c/u) y técnicos/tecnólogos (20 SMMLV c/u)
    const ctSmmlv = (numIng * 40) + (numTec * 20);
    const ctCop = Math.round(ctSmmlv * smmlv);

    // 4. Capacidad Financiera (CF):
    // Índices de liquidez, endeudamiento y capital de trabajo
    const il = pc > 0 ? (ac / pc) : 2.0;
    const ie = at > 0 ? (pt / at) : 0.4;
    const ci = gi > 0 ? (uo / gi) : 3.0;
    const capitalTrabajo = Math.max(0, ac - pc);

    // Factor de multiplicador financiero (0.5 a 2.0)
    const factorFinanciero = Math.max(0.5, Math.min(2.0, (il * 0.4) + ((1 - ie) * 0.4) + (Math.min(5, ci) * 0.05)));
    const cfCop = Math.round(capitalTrabajo * 0.5 * factorFinanciero);
    const cfSmmlv = parseFloat((cfCop / smmlv).toFixed(2));

    // Capacidad Bruta antes de SCE
    const kBrutoCop = coCop + eCop + ctCop + cfCop;
    const kBrutoSmmlv = parseFloat((kBrutoCop / smmlv).toFixed(2));

    return {
      smmlv,
      indices: {
        indice_liquidez: parseFloat(il.toFixed(2)),
        indice_endeudamiento: parseFloat(ie.toFixed(2)),
        cobertura_intereses: parseFloat(ci.toFixed(2)),
        capital_trabajo: capitalTrabajo
      },
      componentes: {
        capacidad_operativa_co: { cop: coCop, smmlv: parseFloat(coSmmlv.toFixed(2)) },
        experiencia_e: { cop: eCop, smmlv: eSmmlv },
        capacidad_tecnica_ct: { cop: ctCop, smmlv: ctSmmlv },
        capacidad_financiera_cf: { cop: cfCop, smmlv: cfSmmlv }
      },
      k_bruto: {
        cop: kBrutoCop,
        smmlv: kBrutoSmmlv
      }
    };
  }

  /**
   * Calcula el Saldo Total de Contratos en Ejecución (SCE) con ponderación plural
   */
  static calcularSCE(contratos) {
    let totalSceCop = 0;
    const contratosDetalle = (contratos || []).map(c => {
      const vTotal = parseFloat(c.valor_total_contrato) || 0;
      const vFacturado = parseFloat(c.valor_facturado_actas) || 0;
      const pctPart = parseFloat(c.porcentaje_participacion) || 100.0;

      const saldoPendiente = Math.max(0, vTotal - vFacturado);
      const saldoImputable = Math.round(saldoPendiente * (pctPart / 100.0));

      totalSceCop += saldoImputable;

      return {
        ...c,
        saldo_pendiente_ejecutar: saldoPendiente,
        saldo_imputable_proponente: saldoImputable
      };
    });

    return {
      total_sce_cop: totalSceCop,
      contratos: contratosDetalle
    };
  }

  /**
   * Crea o actualiza un perfil de capacidad residual en la BD
   */
  static async guardarPerfil(empresaId, datosPerfil) {
    const smmlv = parseFloat(datosPerfil.smmlv_vigente) || 1423500;
    const factores = this.calcularFactoresKR(datosPerfil, smmlv);

    const query = `
      INSERT INTO capacidad_residual_perfiles (
        empresa_id, nombre_perfil, año_fiscal, smmlv_vigente,
        activo_corriente, pasivo_corriente, activo_total, pasivo_total, patrimonio,
        utilidad_operacional, gastos_intereses, ingresos_operacionales,
        experiencia_obras_smmlv, numero_ingenieros_arquitectos, numero_tecnicos_tecnologos,
        capacidad_operativa_co, experiencia_e, capacidad_tecnica_ct, capacidad_financiera_cf,
        k_bruto_cop, k_bruto_smmlv, actualizado_en
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW()
      )
      RETURNING *;
    `;

    const values = [
      empresaId,
      datosPerfil.nombre_perfil || 'Perfil Principal Obra Pública',
      parseInt(datosPerfil.año_fiscal, 10) || 2025,
      smmlv,
      parseFloat(datosPerfil.activo_corriente) || 0,
      parseFloat(datosPerfil.pasivo_corriente) || 0,
      parseFloat(datosPerfil.activo_total) || 0,
      parseFloat(datosPerfil.pasivo_total) || 0,
      parseFloat(datosPerfil.patrimonio) || 0,
      parseFloat(datosPerfil.utilidad_operacional) || 0,
      parseFloat(datosPerfil.gastos_intereses) || 0,
      parseFloat(datosPerfil.ingresos_operacionales) || 0,
      parseFloat(datosPerfil.experiencia_obras_smmlv) || 0,
      parseInt(datosPerfil.numero_ingenieros_arquitectos, 10) || 0,
      parseInt(datosPerfil.numero_tecnicos_tecnologos, 10) || 0,
      factores.componentes.capacidad_operativa_co.cop,
      factores.componentes.experiencia_e.cop,
      factores.componentes.capacidad_tecnica_ct.cop,
      factores.componentes.capacidad_financiera_cf.cop,
      factores.k_bruto.cop,
      factores.k_bruto.smmlv
    ];

    const res = await dbPostgres.query(query, values);
    return res.rows[0];
  }

  /**
   * Agrega un contrato al inventario de Saldos en Ejecución (SCE)
   */
  static async agregarContratoSCE(perfilId, contratoData) {
    const vTotal = parseFloat(contratoData.valor_total_contrato) || 0;
    const vFact = parseFloat(contratoData.valor_facturado_actas) || 0;
    const pct = parseFloat(contratoData.porcentaje_participacion) || 100.0;
    const saldoPend = Math.max(0, vTotal - vFact);
    const saldoImput = Math.round(saldoPend * (pct / 100.0));

    const res = await dbPostgres.query(`
      INSERT INTO capacidad_residual_contratos_sce (
        perfil_id, empresa_id, entidad_contratante, numero_contrato,
        objeto_contrato, es_estructura_plural, nombre_estructura_plural,
        porcentaje_participacion, valor_total_contrato, valor_facturado_actas,
        saldo_pendiente_ejecutar, saldo_imputable_proponente,
        fecha_inicio, fecha_terminacion_prevista, estado_contrato
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      perfilId,
      contratoData.empresa_id,
      contratoData.entidad_contratante,
      contratoData.numero_contrato,
      contratoData.objeto_contrato,
      contratoData.es_estructura_plural || false,
      contratoData.nombre_estructura_plural || null,
      pct,
      vTotal,
      vFact,
      saldoPend,
      saldoImput,
      contratoData.fecha_inicio || null,
      contratoData.fecha_terminacion_prevista || null,
      contratoData.estado_contrato || 'EN_EJECUCION'
    ]);

    return res.rows[0];
  }

  /**
   * Obtiene el cálculo consolidado y balance de un perfil con sus contratos SCE
   */
  static async getCalculoConsolidado(perfilId) {
    const resPerfil = await dbPostgres.query(`
      SELECT p.*, e.razon_social as empresa_razon_social, e.nit as empresa_nit
      FROM capacidad_residual_perfiles p
      JOIN empresas e ON e.id = p.empresa_id
      WHERE p.id = $1
    `, [perfilId]);

    if (resPerfil.rows.length === 0) return null;
    const perfil = resPerfil.rows[0];

    const resSce = await dbPostgres.query(`
      SELECT * FROM capacidad_residual_contratos_sce
      WHERE perfil_id = $1
      ORDER BY id ASC
    `, [perfilId]);

    const sceData = this.calcularSCE(resSce.rows);
    const smmlv = parseFloat(perfil.smmlv_vigente) || 1423500;
    const kBrutoCop = parseFloat(perfil.k_bruto_cop) || 0;
    const kResidualCop = Math.max(0, kBrutoCop - sceData.total_sce_cop);
    const kResidualSmmlv = parseFloat((kResidualCop / smmlv).toFixed(2));
    const totalSceSmmlv = parseFloat((sceData.total_sce_cop / smmlv).toFixed(2));

    return {
      perfil,
      smmlv,
      k_bruto_cop: kBrutoCop,
      k_bruto_smmlv: parseFloat((kBrutoCop / smmlv).toFixed(2)),
      total_sce_cop: sceData.total_sce_cop,
      total_sce_smmlv: totalSceSmmlv,
      k_residual_disponible_cop: kResidualCop,
      k_residual_disponible_smmlv: kResidualSmmlv,
      contratos_sce: sceData.contratos
    };
  }

  /**
   * Simula el pipeline concurrente de procesos licitatorios y el impacto
   * en la Capacidad Residual (riesgo de rechazo por sobreviniente falta de KR)
   */
  static async simularPipelineConcurrente(perfilId, procesosConcurrentes) {
    const consolidado = await this.getCalculoConsolidado(perfilId);
    if (!consolidado) throw new Error('Perfil no encontrado');

    const kDisponibleInicial = consolidado.k_residual_disponible_cop;
    const smmlv = consolidado.smmlv;

    // Ordenar procesos por fecha de adjudicación estimada o por prioridad
    const listaProcesos = [...procesosConcurrentes].sort((a, b) => {
      if (a.fecha_adjudicacion && b.fecha_adjudicacion) {
        return new Date(a.fecha_adjudicacion) - new Date(b.fecha_adjudicacion);
      }
      return (b.prioridad || 1) - (a.prioridad || 1);
    });

    let kRemanente = kDisponibleInicial;
    const trazabilidad = [];
    let riesgoInhabilitacionDetectado = false;
    let primerProcesoInviable = null;

    listaProcesos.forEach((proc, index) => {
      const presOficial = parseFloat(proc.presupuesto_oficial) || 0;
      const kExigido = parseFloat(proc.k_requerido) || presOficial;
      const esPlural = proc.es_estructura_plural || false;
      const pctParticipacion = parseFloat(proc.porcentaje_participacion) || 100.0;
      const aporteSocioCop = parseFloat(proc.k_aporte_socios_cop) || 0;

      // K que debe respaldar nuestra empresa
      const kRequeridoPropio = esPlural ? Math.max(0, (kExigido * (pctParticipacion / 100.0)) - aporteSocioCop) : kExigido;

      const cumpleIndividual = kRemanente >= kRequeridoPropio;
      const holgura = kRemanente - kRequeridoPropio;

      // Si se adjudica, este proceso pasa a ser un nuevo saldo en ejecución (SCE)
      const impactoSceAlAdjudicar = presOficial * (pctParticipacion / 100.0);
      const kRemanentePostAdjudicacion = Math.max(0, kRemanente - impactoSceAlAdjudicar);

      if (!cumpleIndividual && !riesgoInhabilitacionDetectado) {
        riesgoInhabilitacionDetectado = true;
        primerProcesoInviable = proc.referencia || proc.nombre || `Proceso #${index + 1}`;
      }

      trazabilidad.push({
        paso: index + 1,
        proceso_id: proc.id || `PROC-${index + 1}`,
        referencia: proc.referencia || `LIC-OBRA-2026-${index + 1}`,
        entidad: proc.entidad || 'Entidad Estatal',
        objeto: proc.objeto || 'Obra Pública de Infraestructura',
        presupuesto_oficial: presOficial,
        k_exigido_pliego: kExigido,
        k_requerido_empresa: kRequeridoPropio,
        k_disponible_al_momento: kRemanente,
        cumple: cumpleIndividual,
        holgura_cop: holgura,
        holgura_smmlv: parseFloat((holgura / smmlv).toFixed(2)),
        k_remanente_post_adjudicacion: kRemanentePostAdjudicacion,
        alerta: !cumpleIndividual ? 'CRÍTICO: K_R insuficiente al momento de la adjudicación (Rechazo Insubsanable)' : 'APROBADO'
      });

      // Actualizar k remanente para el siguiente proceso en la cascada
      kRemanente = kRemanentePostAdjudicacion;
    });

    const recomendacionEstrategica = riesgoInhabilitacionDetectado
      ? `ALERTA DE RIESGO CONTRACTUAL: La empresa no cuenta con Capacidad Residual suficiente para adjudicarse todos los procesos en cascada. El proceso '${primerProcesoInviable}' sufrirá rechazo por falta sobreviniente de KR (Art. 2.2.1.1.1.6.4 Dec. 1082/2015). Se recomienda: 1) Presentar propuesta en Consorcio con socio aportante de KR; o 2) Desistir de ofertas con menor margen de rentabilidad.`
      : 'PIPELINE CONCURRENTE VIABLE: La empresa dispone de holgura suficiente de Capacidad Residual para soportar la adjudicación simultánea de todos los procesos evaluados.';

    const resultado = {
      empresa: consolidado.perfil.empresa_razon_social,
      perfil_nombre: consolidado.perfil.nombre_perfil,
      k_residual_inicial_cop: kDisponibleInicial,
      k_residual_inicial_smmlv: consolidado.k_residual_disponible_smmlv,
      procesos_evaluados: listaProcesos.length,
      riesgo_inhabilitacion: riesgoInhabilitacionDetectado,
      proceso_critico: primerProcesoInviable,
      trazabilidad_cascada: trazabilidad,
      recomendacion: recomendacionEstrategica
    };

    // Registrar simulación en base de datos
    await dbPostgres.query(`
      INSERT INTO capacidad_residual_simulaciones (
        empresa_id, perfil_id, nombre_simulacion, k_residual_inicial_cop,
        k_residual_inicial_smmlv, procesos_concurrentes, resultados_analisis
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      consolidado.perfil.empresa_id,
      perfilId,
      `Simulación Pipeline Concurrente (${listaProcesos.length} Procesos)`,
      kDisponibleInicial,
      consolidado.k_residual_disponible_smmlv,
      JSON.stringify(listaProcesos),
      JSON.stringify(resultado)
    ]);

    return resultado;
  }

  /**
   * Genera el Formulario 5 oficial de la ANCP - Colombia Compra Eficiente en PDF
   */
  static async generarFormulario5Pdf(perfilId, procesoInfo = {}, firmantes = {}) {
    const consolidado = await this.getCalculoConsolidado(perfilId);
    if (!consolidado) throw new Error('Perfil no encontrado para generación de Formulario 5');

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

        const p = consolidado.perfil;
        const smmlv = consolidado.smmlv;
        const fCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);

        // Encabezado Oficial CCE
        doc.fontSize(7.5).fillColor('#64748b').text('REPÚBLICA DE COLOMBIA • AGENCIA NACIONAL DE CONTRATACIÓN PÚBLICA - COLOMBIA COMPRA EFICIENTE', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text('FORMULARIO 5 - CAPACIDAD RESIDUAL DE CONTRATACIÓN (K RESIDUAL)', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(7.5).fillColor('#475569').font('Helvetica').text('Pliegos Tipo de Licitación Pública para Infraestructura de Transporte y Obra Pública', { align: 'center' });
        doc.moveDown(0.6);

        // Bloque de Identificación del Proceso y Proponente
        const topY = doc.y;
        doc.rect(36, topY, 540, 50).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(7);

        doc.font('Helvetica-Bold').text('ENTIDAD ESTATAL:', 44, topY + 6).font('Helvetica').text(procesoInfo.entidad || 'INSTITUTO NACIONAL DE VÍAS (INVIAS)', 140, topY + 6);
        doc.font('Helvetica-Bold').text('NÚMERO DE PROCESO:', 44, topY + 16).font('Helvetica').text(procesoInfo.referencia || 'LP-DO-001-2026', 140, topY + 16);
        doc.font('Helvetica-Bold').text('PROPONENTE:', 44, topY + 26).font('Helvetica').text(`${p.empresa_razon_social} (NIT: ${p.empresa_nit})`, 140, topY + 26);
        doc.font('Helvetica-Bold').text('MODALIDAD:', 44, topY + 36).font('Helvetica').text(procesoInfo.es_plural ? `Estructura Plural (${procesoInfo.porcentaje_participacion || 100}%)` : 'Proponente Individual', 140, topY + 36);

        doc.font('Helvetica-Bold').text('SMMLV APLICABLE:', 360, topY + 6).font('Helvetica').text(fCOP(smmlv), 470, topY + 6);
        doc.font('Helvetica-Bold').text('AÑO FISCAL RUP:', 360, topY + 16).font('Helvetica').text(String(p.año_fiscal), 470, topY + 16);
        doc.font('Helvetica-Bold').text('K_R EXIGIDO EN PLIEGO:', 360, topY + 26).font('Helvetica-Bold').fillColor('#1e40af').text(fCOP(procesoInfo.k_requerido || 2500000000), 470, topY + 26);

        doc.y = topY + 58;

        // TABLA 1: FACTORES POSITIVOS DE CAPACIDAD RESIDUAL
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text('1. FACTORES DE CAPACIDAD TÉCNICA, FINANCIERA Y ORGANIZACIONAL:');
        doc.moveDown(0.3);

        const tab1Y = doc.y;
        doc.rect(36, tab1Y, 540, 14).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(6.5).font('Helvetica-Bold');
        doc.text('FACTOR', 44, tab1Y + 3, { width: 170 });
        doc.text('BASE DE ACREDITACIÓN / PARÁMETROS RUP', 220, tab1Y + 3, { width: 180 });
        doc.text('VALOR EN SMMLV', 405, tab1Y + 3, { width: 75, align: 'right' });
        doc.text('VALOR EQUIVALENTE (COP)', 485, tab1Y + 3, { width: 85, align: 'right' });

        const itemsTab1 = [
          {
            nombre: 'Capacidad de Organización (CO)',
            param: `Ingresos Operacionales: ${fCOP(p.ingresos_operacionales || (p.utilidad_operacional * 3))}`,
            smmlv: parseFloat((p.capacidad_operativa_co / smmlv).toFixed(2)),
            cop: p.capacidad_operativa_co
          },
          {
            nombre: 'Experiencia en Obras de Construcción (E)',
            param: `Contratos en RUP: ${p.experiencia_obras_smmlv} SMMLV`,
            smmlv: parseFloat((p.experiencia_e / smmlv).toFixed(2)),
            cop: p.experiencia_e
          },
          {
            nombre: 'Capacidad Técnica (CT)',
            param: `Ingenieros/Arqs: ${p.numero_ingenieros_arquitectos} | Técnicos: ${p.numero_tecnicos_tecnologos}`,
            smmlv: parseFloat((p.capacidad_tecnica_ct / smmlv).toFixed(2)),
            cop: p.capacidad_tecnica_ct
          },
          {
            nombre: 'Capacidad Financiera (CF)',
            param: `Liquidez: ${(p.pasivo_corriente > 0 ? (p.activo_corriente / p.pasivo_corriente).toFixed(2) : '2.0')} | Cap. Trabajo: ${fCOP(p.activo_corriente - p.pasivo_corriente)}`,
            smmlv: parseFloat((p.capacidad_financiera_cf / smmlv).toFixed(2)),
            cop: p.capacidad_financiera_cf
          }
        ];

        let currY = tab1Y + 14;
        itemsTab1.forEach((it, idx) => {
          doc.rect(36, currY, 540, 14).fillAndStroke(idx % 2 === 0 ? '#f8fafc' : '#ffffff', '#e2e8f0');
          doc.fillColor('#0f172a').fontSize(6.5).font('Helvetica-Bold').text(it.nombre, 44, currY + 3, { width: 170 });
          doc.font('Helvetica').text(it.param, 220, currY + 3, { width: 180 });
          doc.text(it.smmlv.toLocaleString('es-CO'), 405, currY + 3, { width: 75, align: 'right' });
          doc.text(fCOP(it.cop), 485, currY + 3, { width: 85, align: 'right' });
          currY += 14;
        });

        // Fila Total K Bruto
        doc.rect(36, currY, 540, 15).fill('#e2e8f0');
        doc.fillColor('#0f172a').fontSize(7).font('Helvetica-Bold');
        doc.text('TOTAL CAPACIDAD BRUTA SUMADA (CO + E + CT + CF):', 44, currY + 4);
        doc.text(consolidado.k_bruto_smmlv.toLocaleString('es-CO') + ' SMMLV', 405, currY + 4, { width: 75, align: 'right' });
        doc.text(fCOP(consolidado.k_bruto_cop), 485, currY + 4, { width: 85, align: 'right' });

        doc.y = currY + 22;

        // TABLA 2: SALDOS DE CONTRATOS EN EJECUCIÓN (SCE)
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text('2. RELACIÓN TAXATIVA DE SALDOS DE CONTRATOS DE OBRA EN EJECUCIÓN (SCE):');
        doc.moveDown(0.3);

        const tab2Y = doc.y;
        doc.rect(36, tab2Y, 540, 14).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(6).font('Helvetica-Bold');
        doc.text('ENTIDAD CONTRATANTE', 42, tab2Y + 4, { width: 110 });
        doc.text('CONTRATO NO.', 155, tab2Y + 4, { width: 80 });
        doc.text('VALOR TOTAL', 240, tab2Y + 4, { width: 65, align: 'right' });
        doc.text('FACTURADO', 310, tab2Y + 4, { width: 65, align: 'right' });
        doc.text('% PART.', 380, tab2Y + 4, { width: 40, align: 'center' });
        doc.text('SALDO IMPUTABLE (COP)', 425, tab2Y + 4, { width: 145, align: 'right' });

        let currY2 = tab2Y + 14;
        if (consolidado.contratos_sce.length === 0) {
          doc.rect(36, currY2, 540, 14).fillAndStroke('#ffffff', '#e2e8f0');
          doc.fillColor('#64748b').fontSize(6.5).font('Helvetica-Oblique').text('No se reportan contratos de obra pública en ejecución a la fecha de corte.', 44, currY2 + 3);
          currY2 += 14;
        } else {
          consolidado.contratos_sce.slice(0, 6).forEach((c, idx) => {
            doc.rect(36, currY2, 540, 14).fillAndStroke(idx % 2 === 0 ? '#f8fafc' : '#ffffff', '#e2e8f0');
            doc.fillColor('#0f172a').fontSize(6).font('Helvetica');
            doc.text(c.entidad_contratante.substring(0, 24), 42, currY2 + 4, { width: 110 });
            doc.text(c.numero_contrato, 155, currY2 + 4, { width: 80 });
            doc.text(fCOP(c.valor_total_contrato), 240, currY2 + 4, { width: 65, align: 'right' });
            doc.text(fCOP(c.valor_facturado_actas), 310, currY2 + 4, { width: 65, align: 'right' });
            doc.text(`${c.porcentaje_participacion}%`, 380, currY2 + 4, { width: 40, align: 'center' });
            doc.font('Helvetica-Bold').text(fCOP(c.saldo_imputable_proponente), 425, currY2 + 4, { width: 145, align: 'right' });
            currY2 += 14;
          });
        }

        // Fila Total SCE
        doc.rect(36, currY2, 540, 15).fill('#fee2e2');
        doc.fillColor('#991b1b').fontSize(7).font('Helvetica-Bold');
        doc.text('TOTAL FACTOR DEDUCTOR SCE (SALDOS EN EJECUCIÓN):', 44, currY2 + 4);
        doc.text(consolidado.total_sce_smmlv.toLocaleString('es-CO') + ' SMMLV', 405, currY2 + 4, { width: 75, align: 'right' });
        doc.text(fCOP(consolidado.total_sce_cop), 485, currY2 + 4, { width: 85, align: 'right' });

        doc.y = currY2 + 20;

        // TABLA 3: RESULTADO FINAL Y BALANCE DE HABILITACIÓN
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text('3. DETERMINACIÓN DEFINITIVA DE CAPACIDAD RESIDUAL (K_R):');
        doc.moveDown(0.3);

        const tab3Y = doc.y;
        doc.rect(36, tab3Y, 540, 42).fillAndStroke('#0f172a', '#0f172a');
        doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica');
        doc.text('FÓRMULA REGLAMENTARIA:', 44, tab3Y + 6);
        doc.font('Helvetica-Bold').text('K_R = (Capacidad de Organización + Experiencia + Cap. Técnica + Cap. Financiera) - SCE', 170, tab3Y + 6);

        doc.font('Helvetica').text('CAPACIDAD RESIDUAL NETA (COP):', 44, tab3Y + 18);
        doc.font('Helvetica-Bold').fontSize(9).text(fCOP(consolidado.k_residual_disponible_cop), 210, tab3Y + 17);

        doc.fontSize(7.5).font('Helvetica').text('CAPACIDAD RESIDUAL NETA (SMMLV):', 44, tab3Y + 30);
        doc.font('Helvetica-Bold').text(`${consolidado.k_residual_disponible_smmlv.toLocaleString('es-CO')} SMMLV`, 210, tab3Y + 30);

        const kExigidoVal = parseFloat(procesoInfo.k_requerido) || 2500000000;
        const cumplePliego = consolidado.k_residual_disponible_cop >= kExigidoVal;

        doc.rect(380, tab3Y + 12, 185, 24).fill(cumplePliego ? '#10b981' : '#ef4444');
        doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
        doc.text(cumplePliego ? 'RESULTADO: HABILITADO (CUMPLE)' : 'RESULTADO: NO HABILITADO', 385, tab3Y + 18, { align: 'center', width: 175 });

        doc.y = tab3Y + 48;

        // Declaración Bajo Gravedad de Juramento
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#0f172a').text('DECLARACIÓN BAJO LA GRAVEDAD DEL JURAMENTO:');
        doc.font('Helvetica').fontSize(6).fillColor('#334155').text(
          'El suscrito Representante Legal y el Revisor Fiscal / Contador Público manifiestan bajo la gravedad del juramento que la totalidad de la información financiera, técnica y de saldos de contratos de obra en ejecución reportada en el presente formulario es veraz y fidedigna, y coincide con los libros de contabilidad oficiales, los soportes contractuales y el Registro Único de Proponentes (RUP), dando cumplimiento al artículo 2.2.1.1.1.6.4 del Decreto 1082 de 2015.',
          { align: 'justify', lineGap: 1.2 }
        );

        // Bloque de Firmas Formales
        doc.moveDown(1.5);
        const sigY = doc.y;
        doc.moveTo(36, sigY).lineTo(250, sigY).stroke('#0f172a');
        doc.moveTo(320, sigY).lineTo(540, sigY).stroke('#0f172a');

        doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text('REPRESENTANTE LEGAL:', 36, sigY + 4);
        doc.font('Helvetica').fontSize(6).text(firmantes.nombre_representante || p.empresa_razon_social, 36, sigY + 13);
        doc.text(`C.C. ${firmantes.cedula_representante || '____________________'}`, 36, sigY + 21);

        doc.font('Helvetica-Bold').fontSize(7).text('REVISOR FISCAL / CONTADOR PÚBLICO:', 320, sigY + 4);
        doc.font('Helvetica').fontSize(6).text(firmantes.nombre_contador || 'Contador Público / Revisor Fiscal', 320, sigY + 13);
        doc.text(`T.P. No. ${firmantes.tarjeta_profesional || '____________-T'} | C.C. ${firmantes.cedula_contador || '____________________'}`, 320, sigY + 21);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = ResidualCapacityEngine;
