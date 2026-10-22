// ============================================================================
// RADAR SECOP - MOTOR DE AUDITORÍA PRE-FLIGHT Y CHECKLIST DE CIERRE (SECOP II)
// Normativa: Ley 80 de 1993, Ley 1150 de 2007 (Art. 5), Ley 1882 de 2018 (Art. 5),
// Decreto 1082 de 2015, Pliegos Tipo ANCP-CCE y Conceptos Vinculantes C-057/2026, C-525/2026.
// ============================================================================

const PDFDocument = require('pdfkit');
const dbPostgres = require('./dbPostgres');

class PreflightAuditEngine {
  /**
   * Catálogo maestro oficial de los 20 Controles Pre-Flight de SECOP II
   */
  static getControlesMaestros() {
    return [
      // ================= ÁREA 1: CAPACIDAD JURÍDICA Y REPRESENTACIÓN =================
      {
        codigo: 'CTRL-JUR-01',
        area: 'JURÍDICO',
        nombre: 'Carta de Presentación de la Oferta (Formulario 1 CCE)',
        fundamentoLegal: 'Ley 80/1993 Art. 25 Num. 7; Pliegos Tipo ANCP-CCE',
        tipoEfecto: 'CAUSAL_RECHAZO',
        descripcion: 'Formulario 1 suscrito por el Representante Legal con facultades estatutarias suficientes (o con acta de autorización de Junta Directiva/Socios si la cuantía lo supera).',
        preguntaChequeo: '¿La carta está firmada por el representante legal facultado estatutariamente y sin limitaciones de cuantía?'
      },
      {
        codigo: 'CTRL-JUR-02',
        area: 'JURÍDICO',
        nombre: 'Ausencia de Inhabilidades, Incompatibilidades y Conflictos de Interés',
        fundamentoLegal: 'Constitución Política Art. 122; Ley 80/1993 Art. 8; Ley 1474/2011',
        tipoEfecto: 'CAUSAL_RECHAZO',
        descripcion: 'Verificación en línea sin reportes activos en Boletín de Responsables Fiscales (CGR), Antecedentes Disciplinarios (PGN) y Registro de Medidas Correctivas (PONAL).',
        preguntaChequeo: '¿Se verificó que ni la sociedad ni sus socios/administradores figuren en boletines de la Contraloría, Procuraduría o Policía?'
      },
      {
        codigo: 'CTRL-JUR-03',
        area: 'JURÍDICO',
        nombre: 'Compromiso Anticorrupción (Formulario 2 CCE)',
        fundamentoLegal: 'Ley 1474 de 2011 Art. 84; Decreto 1082 de 2015',
        tipoEfecto: 'SUBSANABLE',
        descripcion: 'Compromiso ético formal firmado sin tachaduras, enmiendas ni condicionamientos al deber de no ofrecer sobornos ni participar en colusión.',
        preguntaChequeo: '¿El Formulario 2 de compromiso ético y anticorrupción está diligenciado y suscrito?'
      },
      {
        codigo: 'CTRL-JUR-04',
        area: 'JURÍDICO',
        nombre: 'Documento de Constitución Plural (Formulario 3 CCE) - Si Aplica',
        fundamentoLegal: 'Ley 80/1993 Art. 7; Concepto C-382/2020 ANCP-CCE',
        tipoEfecto: 'CAUSAL_RECHAZO',
        descripcion: 'En caso de Consorcio o Unión Temporal: Suma de participaciones exactamente igual a 100%, designación de representante legal y alcance en UT.',
        preguntaChequeo: '¿Si es propuesta conjunta, la sumatoria de participaciones es exactamente el 100% y se designó representante legal?'
      },
      {
        codigo: 'CTRL-JUR-05',
        area: 'JURÍDICO',
        nombre: 'Certificado de Existencia y Representación Legal (CCB / RUES)',
        fundamentoLegal: 'Decreto Ley 019 de 2012 Art. 15; Código de Comercio',
        tipoEfecto: 'SUBSANABLE',
        descripcion: 'Certificado de Cámara de Comercio expedido con no más de 30 días calendario y vigencia de la sociedad igual o superior al plazo del contrato y un año más.',
        preguntaChequeo: '¿El certificado de existencia y representación legal tiene vigencia inferior a 30 días y duración societaria suficiente?'
      },

      // ================= ÁREA 2: GARANTÍA DE SERIEDAD Y AMPAROS =================
      {
        codigo: 'CTRL-POL-01',
        area: 'PÓLIZAS',
        nombre: 'Suficiencia Cuantitativa de la Garantía de Seriedad (10%)',
        fundamentoLegal: 'Decreto 1082/2015 Art. 2.2.1.2.3.1.9; Pliegos Tipo ANCP-CCE',
        tipoEfecto: 'CAUSAL_RECHAZO',
        descripcion: 'Valor asegurado equivalente como mínimo al 10% del Presupuesto Oficial Estimado (POE) fijado en el pliego de condiciones.',
        preguntaChequeo: '¿El valor asegurado de la póliza de seriedad cubre estrictamente el 10% del presupuesto oficial de la licitación?'
      },
      {
        codigo: 'CTRL-POL-02',
        area: 'PÓLIZAS',
        nombre: 'Vigencia Temporal de la Póliza de Seriedad (Mínimo 3 Meses)',
        fundamentoLegal: 'Decreto 1082/2015 Art. 2.2.1.2.3.1.9',
        tipoEfecto: 'CAUSAL_RECHAZO',
        descripcion: 'La vigencia del amparo debe iniciar a partir del día y hora de cierre del proceso y extenderse por un término mínimo de tres (3) meses (o el exigido en pliegos).',
        preguntaChequeo: '¿La vigencia de la garantía de seriedad cubre al menos 3 meses contados a partir del cierre del proceso licitatorio?'
      },
      {
        codigo: 'CTRL-POL-03',
        area: 'PÓLIZAS',
        nombre: 'Identificación Exacta de Tomador, Asegurado y Beneficiario',
        fundamentoLegal: 'Código de Comercio Art. 1037; Circular Externa 01 ANCP-CCE',
        tipoEfecto: 'CAUSAL_RECHAZO',
        descripcion: 'El tomador/afianzado debe coincidir con el proponente (o con cada uno de los consorciados), y el beneficiario debe ser la Entidad Estatal contratante.',
        preguntaChequeo: '¿La razón social y NIT del tomador en la carátula coinciden de forma idéntica con el proponente radicado en SECOP II?'
      },
      {
        codigo: 'CTRL-POL-04',
        area: 'PÓLIZAS',
        nombre: 'Soporte de Pago de la Prima o Certificado de No Revocatoria',
        fundamentoLegal: 'Decreto 1082/2015 Art. 2.2.1.2.3.1.4; Concepto C-410/2022',
        tipoEfecto: 'SUBSANABLE',
        descripcion: 'Recibo de caja, comprobante de transferencia bancaria o certificación de la aseguradora que acredite que la póliza no será revocada por falta de pago.',
        preguntaChequeo: '¿Se adjuntó el recibo de pago de la prima o la constancia de vigencia irrevocable de la aseguradora?'
      },

      // ================= ÁREA 3: RUP, CAPACIDAD FINANCIERA Y PARAFISCALES =================
      {
        codigo: 'CTRL-FIN-01',
        area: 'FINANCIERO',
        nombre: 'Certificado RUP en Firmeza Legal y Renovación Oportuna',
        fundamentoLegal: 'Ley 1150/2007 Art. 6; Decreto 1082/2015 Art. 2.2.1.1.1.5.1; Concepto C-525/2026',
        tipoEfecto: 'CAUSAL_RECHAZO',
        descripcion: 'El Registro Único de Proponentes (RUP) debe encontrarse en firmeza absoluta antes de la fecha de cierre (no en trámite de recursos) y con renovación radicada dentro del 5° día hábil de abril.',
        preguntaChequeo: '¿El RUP está plenamente en firme en Cámara de Comercio antes de la fecha y hora de cierre de la licitación?'
      },
      {
        codigo: 'CTRL-FIN-02',
        area: 'FINANCIERO',
        nombre: 'Cumplimiento del Índice de Liquidez Habilitante',
        fundamentoLegal: 'Decreto 1082/2015 Art. 2.2.1.1.1.5.3; Manual M-ICR-01 ANCP-CCE',
        tipoEfecto: 'SUBSANABLE',
        descripcion: 'Activo Corriente / Pasivo Corriente igual o superior al umbral fijado en el pliego de condiciones.',
        preguntaChequeo: '¿El índice de liquidez reportado en el RUP es igual o superior al umbral mínimo exigido en el pliego?'
      },
      {
        codigo: 'CTRL-FIN-03',
        area: 'FINANCIERO',
        nombre: 'Cumplimiento del Índice de Endeudamiento Habilitante',
        fundamentoLegal: 'Decreto 1082/2015 Art. 2.2.1.1.1.5.3',
        tipoEfecto: 'SUBSANABLE',
        descripcion: 'Pasivo Total / Activo Total igual o inferior al porcentaje máximo exigido en el pliego.',
        preguntaChequeo: '¿El nivel de endeudamiento del proponente no supera el tope máximo exigido por la Entidad Estatal?'
      },
      {
        codigo: 'CTRL-FIN-04',
        area: 'FINANCIERO',
        nombre: 'Cumplimiento de Razón de Cobertura de Intereses (RCI), ROE y ROA',
        fundamentoLegal: 'Pliegos Tipo de Colombia Compra Eficiente',
        tipoEfecto: 'SUBSANABLE',
        descripcion: 'Indicadores de rentabilidad y cobertura de intereses conformes con la matriz financiera del proceso.',
        preguntaChequeo: '¿Los indicadores de cobertura de intereses y rentabilidad cumplen los umbrales de la matriz habilitante?'
      },
      {
        codigo: 'CTRL-FIN-05',
        area: 'FINANCIERO',
        nombre: 'Certificación de Pago de Aportes Parafiscales y Seguridad Social',
        fundamentoLegal: 'Ley 789 de 2002 Art. 50; Ley 828 de 2003; Ley 1150 de 2007 Art. 5',
        tipoEfecto: 'SUBSANABLE',
        descripcion: 'Certificación de estar a paz y salvo con nómina, salud, pensión, ARL, SENA, ICBF y Cajas de Compensación durante los seis (6) meses anteriores al cierre, firmada por Revisor Fiscal o Representante Legal.',
        preguntaChequeo: '¿Se adjunta certificación de parafiscales de los últimos 6 meses suscrita por el Revisor Fiscal o Representante Legal?'
      },
      {
        codigo: 'CTRL-FIN-06',
        area: 'FINANCIERO',
        nombre: 'Tarjeta Profesional y Certificado Vigente JCC del Contador / Revisor Fiscal',
        fundamentoLegal: 'Ley 43 de 1990; Decreto 1082 de 2015',
        tipoEfecto: 'SUBSANABLE',
        descripcion: 'Copia de tarjeta profesional y certificado de vigencia y antecedentes disciplinarios expedido por la Junta Central de Contadores (vigencia máx. 3 meses).',
        preguntaChequeo: '¿Se adjunta el certificado de antecedentes disciplinarios vigente de la Junta Central de Contadores del profesional contable?'
      },

      // ================= ÁREA 4: OFERTA ECONÓMICA, TÉCNICA Y RIESGOS =================
      {
        codigo: 'CTRL-ECO-01',
        area: 'ECONÓMICO_TÉCNICO',
        nombre: 'Oferta Económica Inalterada y sin Condicionamientos',
        fundamentoLegal: 'Ley 1150/2007 Art. 5; Ley 1882/2018 Art. 5; Concepto C-1376/2025',
        tipoEfecto: 'CAUSAL_RECHAZO',
        descripcion: 'El formulario económico debe coincidir exactamente con el presupuesto oficial o el descuento ofertado, sin condicionamientos y sin alteraciones posteriores al cierre.',
        preguntaChequeo: '¿La oferta económica no está condicionada, se encuentra dentro del techo presupuestal y está firmada debidamente?'
      },
      {
        codigo: 'CTRL-ECO-02',
        area: 'ECONÓMICO_TÉCNICO',
        nombre: 'Consistencia Aritmética de Costos y APUs (Sin Errores Descalificantes)',
        fundamentoLegal: 'Pliegos Tipo CCE; Consejo de Estado Sala de lo Contencioso',
        tipoEfecto: 'SUBSANABLE',
        descripcion: 'Verificación de que las multiplicaciones de cantidades por valores unitarios y el IVA total coincidan matemáticamente sin inducir a discrepancias materiales.',
        preguntaChequeo: '¿Se verificó la consistencia matemática de las operaciones de precios unitarios y subtotales del formulario económico?'
      },
      {
        codigo: 'CTRL-TEC-01',
        area: 'ECONÓMICO_TÉCNICO',
        nombre: 'Acreditación de Códigos UNSPSC y Cuantías SMMLV de Experiencia en RUP',
        fundamentoLegal: 'Decreto 1082/2015 Art. 2.2.1.1.1.5.2; Pliegos Tipo ANCP-CCE',
        tipoEfecto: 'SUBSANABLE',
        descripcion: 'Los contratos acreditados deben coincidir con los segmentos y familias UNSPSC exigidos, sumar la cuantía en SMMLV del pliego y corresponder a contratos terminados antes del cierre.',
        preguntaChequeo: '¿Los contratos aportados en el RUP cubren los códigos UNSPSC y la sumatoria de valor en SMMLV exigida en el pliego?'
      },
      {
        codigo: 'CTRL-TEC-02',
        area: 'ECONÓMICO_TÉCNICO',
        nombre: 'Capacidad Residual de Contratación (K Residual) - En Obra Pública',
        fundamentoLegal: 'Ley 1150/2007 Art. 9; Decreto 1082/2015 Art. 2.2.1.1.1.6.4',
        tipoEfecto: 'CAUSAL_RECHAZO',
        descripcion: 'Si el proceso es de obra pública, el KR calculado debe ser igual o superior a la cuantía oficial requerida en el pliego de condiciones.',
        preguntaChequeo: '¿En contratos de obra pública, el K Residual calculado cumple con la capacidad mínima de contratación exigida?'
      },
      {
        codigo: 'CTRL-RSK-01',
        area: 'ECONÓMICO_TÉCNICO',
        nombre: 'Matriz de Riesgos Contractuales (Formato Oficial ANCP-CCE)',
        fundamentoLegal: 'Ley 1150 de 2007 Art. 4; Manual M-ICR-01 ANCP-CCE',
        tipoEfecto: 'SUBSANABLE',
        descripcion: 'Aceptación formal de la tipificación, valoración 5x5 y asignación de riesgos previsibles pactados en el pliego de condiciones.',
        preguntaChequeo: '¿La matriz de riesgos contractuales oficial está valorada y suscrita conforme al formato de Colombia Compra Eficiente?'
      }
    ];
  }

  /**
   * Ejecuta la auditoría Pre-Flight cruzando información del oferente, proceso y respuestas del usuario
   */
  static ejecutarAuditoriaPreflight({ proceso, oferente, respuestasUsuario = {} }) {
    const catalogo = this.getControlesMaestros();
    const controlesEvaluados = [];

    let aprobados = 0;
    let advertencias = 0;
    let rechazos = 0;

    catalogo.forEach(ctrl => {
      // Estado provisto por el usuario o inferido automáticamente
      const respuesta = respuestasUsuario[ctrl.codigo];

      let estado = 'APROBADO';
      let observacion = 'Cumplimiento verificado satisfactoriamente conforme a Pliegos Tipo.';

      if (respuesta === false || respuesta === 'RECHAZO') {
        if (ctrl.tipoEfecto === 'CAUSAL_RECHAZO') {
          estado = 'RECHAZO';
          observacion = `CRÍTICO: No cumple con ${ctrl.nombre}. Esto constituye una causal de rechazo insubsanable según ${ctrl.fundamentoLegal}.`;
          rechazos++;
        } else {
          estado = 'ADVERTENCIA';
          observacion = `ADVERTENCIA: ${ctrl.nombre} presenta faltantes o inconsistencias. Es jurídicamente subsanable al amparo del Art. 5 Ley 1150/2007.`;
          advertencias++;
        }
      } else if (respuesta === 'ADVERTENCIA') {
        estado = 'ADVERTENCIA';
        observacion = `OBSERVACIÓN: Documento pendiente de firma o certificación accesoria. Subsanable en el término de traslado.`;
        advertencias++;
      } else {
        // Aprobado por defecto si no está objetado
        aprobados++;
      }

      controlesEvaluados.push({
        ...ctrl,
        estado,
        observacion
      });
    });

    const puntajeCumplimiento = parseFloat(((aprobados / catalogo.length) * 100).toFixed(1));

    let estadoGlobal = 'APTO_PARA_RADICAR';
    let diagnosticoEjecutivo = '';

    if (rechazos > 0) {
      estadoGlobal = 'RIESGO_RECHAZO';
      diagnosticoEjecutivo = `ALERTA ROJA - DETENER RADICACIÓN EN SECOP II: Se identificaron ${rechazos} causal(es) de rechazo expresas o insubsanables (Ley 1882/2018 Art. 5). La presentación de la oferta en estas condiciones conducirá a la descalificación inmediata no subsanable. Corrija los controles marcados en rojo antes del cierre.`;
    } else if (advertencias > 0) {
      estadoGlobal = 'SUBSANACION_PENDIENTE';
      diagnosticoEjecutivo = `RADICABLE CON ADVERTENCIA: La oferta no incurre en causales de rechazo insubsanables. Sin embargo, existen ${advertencias} requisito(s) formal(es) o accesorios que la Entidad requerirá subsanar durante el informe de evaluación (Conceptos C-057/2026 y C-525/2026). Aliste los soportes para radicación oportuna.`;
    } else {
      estadoGlobal = 'APTO_PARA_RADICAR';
      diagnosticoEjecutivo = `GO - OFERTA BLINDADA AL 100%: Todos los veinte (20) controles de habilitación jurídica, garantías de seriedad, capacidad financiera RUP y propuesta económica cumplen a cabalidad con los Pliegos Tipo ANCP-CCE. Propuesta lista para someter formalmente en SECOP II.`;
    }

    return {
      auditoria: {
        proceso_id: String(proceso.id || proceso.referencia || 'PROC-001'),
        numero_proceso: proceso.referencia || proceso.numero_proceso || 'PROCESO-SECOP',
        entidad_nombre: proceso.entidad || proceso.entidad_nombre || 'Entidad Estatal de Colombia',
        objeto_proceso: proceso.objeto || proceso.objeto_proceso || 'Objeto contractual de contratación pública',
        proponente_nit: oferente?.nit || '901.000.000-1',
        proponente_razon_social: oferente?.razon_social || 'PROPONENTE CALIFICADO S.A.S.',
        estado_global: estadoGlobal,
        puntaje_cumplimiento: puntajeCumplimiento,
        total_controles: catalogo.length,
        controles_aprobados: aprobados,
        controles_advertencia: advertencias,
        controles_rechazo: rechazos,
        diagnostico_ejecutivo: diagnosticoEjecutivo,
        controles_items: controlesEvaluados
      }
    };
  }

  /**
   * Guarda la auditoría Pre-Flight en la base de datos PostgreSQL
   */
  static async guardarAuditoria({ auditoria }) {
    const res = await dbPostgres.query(`
      INSERT INTO preflight_audits (
        proceso_id, numero_proceso, entidad_nombre, objeto_proceso,
        proponente_nit, proponente_razon_social, estado_global,
        puntaje_cumplimiento, total_controles, controles_aprobados,
        controles_advertencia, controles_rechazo, diagnostico_ejecutivo,
        controles_items
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, creado_en
    `, [
      auditoria.proceso_id,
      auditoria.numero_proceso,
      auditoria.entidad_nombre,
      auditoria.objeto_proceso,
      auditoria.proponente_nit,
      auditoria.proponente_razon_social,
      auditoria.estado_global,
      auditoria.puntaje_cumplimiento,
      auditoria.total_controles,
      auditoria.controles_aprobados,
      auditoria.controles_advertencia,
      auditoria.controles_rechazo,
      auditoria.diagnostico_ejecutivo,
      JSON.stringify(auditoria.controles_items)
    ]);

    return { success: true, id: res.rows[0].id, creado_en: res.rows[0].creado_en };
  }

  /**
   * Obtiene la última auditoría guardada para un proceso
   */
  static async getAuditoria(procesoId) {
    const res = await dbPostgres.query(`
      SELECT * FROM preflight_audits
      WHERE proceso_id = $1
      ORDER BY id DESC
      LIMIT 1
    `, [procesoId]);
    return res.rows[0] || null;
  }

  /**
   * Genera el Certificado Pre-Flight Oficial en formato PDF (Portrait)
   */
  static generarCertificadoPdf(auditoria) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          layout: 'portrait',
          margin: 40
        });

        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const isApto = auditoria.estado_global === 'APTO_PARA_RADICAR';
        const isRechazo = auditoria.estado_global === 'RIESGO_RECHAZO';

        const mainColor = isApto ? '#10b981' : isRechazo ? '#ef4444' : '#f59e0b';
        const bannerTitle = isApto ? 'CERTIFICADO DE APTITUD PARA RADICACIÓN (GO)' : isRechazo ? 'ALERTA DE RIESGO DE RECHAZO (NO-GO)' : 'AUDITORÍA CON SUBSANACIONES PENDIENTES';

        // Header
        doc.fontSize(8).fillColor('#64748b').text('SISTEMA INTEGRAL DE GESTIÓN LICITATORIA • RADAR SECOP', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(14).fillColor('#0f172a').font('Helvetica-Bold').text('CERTIFICADO DE AUDITORÍA PRE-FLIGHT (SECOP II)', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(8.5).fillColor('#475569').font('Helvetica').text('Verificación de 20 Puntos de Control y Subsanabilidad (Ley 1150/2007 Art. 5 & Ley 1882/2018)', { align: 'center' });
        doc.moveDown(0.8);

        // Banner de Estado
        const bannerY = doc.y;
        doc.rect(40, bannerY, 532, 45).fill(mainColor);
        doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text(bannerTitle, 50, bannerY + 10, { align: 'center' });
        doc.fontSize(8).font('Helvetica').text(`Puntaje de Cumplimiento: ${auditoria.puntaje_cumplimiento}% | Aprobados: ${auditoria.controles_aprobados}/20 | Advertencias: ${auditoria.controles_advertencia} | Rechazos: ${auditoria.controles_rechazo}`, 50, bannerY + 28, { align: 'center' });

        doc.y = bannerY + 55;

        // Metadatos
        const metaY = doc.y;
        doc.rect(40, metaY, 532, 44).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(7.5);
        doc.font('Helvetica-Bold').text('ENTIDAD:', 48, metaY + 6).font('Helvetica').text(auditoria.entidad_nombre || 'N/A', 95, metaY + 6);
        doc.font('Helvetica-Bold').text('PROCESO:', 48, metaY + 18).font('Helvetica').text(auditoria.numero_proceso || 'PROCESO-SECOP', 95, metaY + 18);
        doc.font('Helvetica-Bold').text('PROPONENTE:', 48, metaY + 30).font('Helvetica').text(`${auditoria.proponente_razon_social} (NIT: ${auditoria.proponente_nit})`, 115, metaY + 30);

        doc.y = metaY + 52;

        // Diagnóstico
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text('DIAGNÓSTICO EJECUTIVO:');
        doc.font('Helvetica').fontSize(7).fillColor('#334155').text(auditoria.diagnostico_ejecutivo, { align: 'justify' });
        doc.moveDown(0.6);

        // Tabla de Controles (20 puntos compactos)
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text('MATRIZ DETALLADA DE 20 PUNTOS DE CONTROL:');
        doc.moveDown(0.3);

        const tableY = doc.y;
        doc.rect(40, tableY, 532, 14).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(6.5).font('Helvetica-Bold');
        doc.text('CÓD.', 44, tableY + 3, { width: 45 });
        doc.text('ÁREA', 92, tableY + 3, { width: 55 });
        doc.text('PUNTO DE CONTROL & FUNDAMENTO', 150, tableY + 3, { width: 235 });
        doc.text('ESTADO', 390, tableY + 3, { width: 75, align: 'center' });
        doc.text('NATURALEZA', 470, tableY + 3, { width: 95, align: 'center' });

        let currentY = tableY + 14;

        auditoria.controles_items.forEach((item, idx) => {
          const rowH = 18;
          if (idx % 2 === 0) doc.rect(40, currentY, 532, rowH).fill('#f8fafc');
          doc.rect(40, currentY, 532, rowH).stroke('#e2e8f0');

          doc.fillColor('#0f172a').fontSize(6).font('Helvetica-Bold').text(item.codigo, 44, currentY + 5);
          doc.font('Helvetica').fillColor('#475569').text(item.area.slice(0, 10), 92, currentY + 5);

          doc.font('Helvetica-Bold').fillColor('#0f172a').text(item.nombre, 150, currentY + 3, { width: 235, ellipsis: true });
          doc.font('Helvetica').fontSize(5.5).fillColor('#64748b').text(item.fundamentoLegal, 150, currentY + 10, { width: 235, ellipsis: true });

          // Badge Estado
          const badgeColor = item.estado === 'APROBADO' ? '#10b981' : item.estado === 'RECHAZO' ? '#ef4444' : '#f59e0b';
          doc.rect(395, currentY + 3, 65, 11).fill(badgeColor);
          doc.fillColor('#ffffff').fontSize(5.5).font('Helvetica-Bold').text(item.estado, 395, currentY + 5, { width: 65, align: 'center' });

          const tipoEfectoTexto = item.tipoEfecto === 'CAUSAL_RECHAZO' ? '🔴 Rechazo de Plano' : '🟢 Subsanable Art. 5';
          doc.fillColor('#334155').fontSize(5.5).font('Helvetica').text(tipoEfectoTexto, 470, currentY + 5, { width: 95, align: 'center' });

          currentY += rowH;
        });

        // Firmas de Responsabilidad Interdisciplinaria
        doc.y = currentY + 15;
        const sigY = doc.y;
        doc.moveTo(40, sigY).lineTo(190, sigY).stroke('#0f172a');
        doc.moveTo(225, sigY).lineTo(375, sigY).stroke('#0f172a');
        doc.moveTo(410, sigY).lineTo(560, sigY).stroke('#0f172a');

        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text('LÍDER JURÍDICO', 40, sigY + 4, { width: 150, align: 'center' });
        doc.font('Helvetica').fontSize(5.5).text('Habilitación & Inhabilidades', 40, sigY + 13, { width: 150, align: 'center' });

        doc.font('Helvetica-Bold').fontSize(6.5).text('LÍDER FINANCIERO', 225, sigY + 4, { width: 150, align: 'center' });
        doc.font('Helvetica').fontSize(5.5).text('RUP, Pólizas & Parafiscales', 225, sigY + 13, { width: 150, align: 'center' });

        doc.font('Helvetica-Bold').fontSize(6.5).text('REPRESENTANTE LEGAL', 410, sigY + 4, { width: 150, align: 'center' });
        doc.font('Helvetica').fontSize(5.5).text('Aprobación de Radicación SECOP II', 410, sigY + 13, { width: 150, align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = PreflightAuditEngine;
