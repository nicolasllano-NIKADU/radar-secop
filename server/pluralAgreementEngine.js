// ============================================================================
// RADAR SECOP - MOTOR DE ACUERDOS DE CONSTITUCIÓN PLURAL (FORMULARIO 3 CCE)
// Normativa: Ley 80 de 1993 (Art. 7), Ley 1150 de 2007, Ley 1882 de 2018,
// Estatuto Tributario (Art. 18) y Pliegos Tipo de Colombia Compra Eficiente (ANCP-CCE).
// ============================================================================

const PDFDocument = require('pdfkit');
const dbPostgres = require('./dbPostgres');

class PluralAgreementEngine {
  /**
   * Pondera indicadores financieros según la participación de los miembros (Pliegos Tipo CCE)
   */
  static calcularIndicadoresPonderados(integrantes) {
    let liquidezPond = 0;
    let endeudamientoPond = 0;
    let rciPond = 0;
    let roePond = 0;
    let roaPond = 0;

    let totalPatrimonio = 0;
    let totalActivoCorriente = 0;
    let totalPasivoCorriente = 0;
    let totalActivoTotal = 0;
    let totalPasivoTotal = 0;

    integrantes.forEach(m => {
      const p = parseFloat(m.porcentaje || 0) / 100;
      const fin = m.indicadores_financieros || {};

      // Indicadores directos ponderados
      liquidezPond += (parseFloat(fin.indice_liquidez || fin.liquidez || 1.5) * p);
      endeudamientoPond += (parseFloat(fin.indice_endeudamiento || fin.endeudamiento || 50) * p);
      rciPond += (parseFloat(fin.cobertura_interes || fin.rci || 5.0) * p);
      roePond += (parseFloat(fin.rentabilidad_patrimonio || fin.roe || 10) * p);
      roaPond += (parseFloat(fin.rentabilidad_activo || fin.roa || 8) * p);

      // Balances consolidados proporcionales
      totalPatrimonio += (parseFloat(fin.patrimonio || 1000000000) * p);
      totalActivoCorriente += (parseFloat(fin.activo_corriente || 500000000) * p);
      totalPasivoCorriente += (parseFloat(fin.pasivo_corriente || 200000000) * p);
      totalActivoTotal += (parseFloat(fin.activo_total || 1500000000) * p);
      totalPasivoTotal += (parseFloat(fin.pasivo_total || 500000000) * p);
    });

    return {
      indice_liquidez: parseFloat(liquidezPond.toFixed(2)),
      indice_endeudamiento: parseFloat(endeudamientoPond.toFixed(2)),
      cobertura_intereses: parseFloat(rciPond.toFixed(2)),
      rentabilidad_patrimonio: parseFloat(roePond.toFixed(2)),
      rentabilidad_activo: parseFloat(roaPond.toFixed(2)),
      capital_trabajo: Math.round(totalActivoCorriente - totalPasivoCorriente),
      patrimonio_consolidado: Math.round(totalPatrimonio)
    };
  }

  /**
   * Genera el borrador formal del acuerdo plural con validaciones jurídicas
   */
  static generarAcuerdoPlural({ proceso, datosEstructura }) {
    const {
      nombre_estructura,
      tipo_estructura = 'UNION_TEMPORAL', // CONSORCIO, UNION_TEMPORAL
      duracion_meses = 24,
      domicilio_contractual = 'Bogotá D.C.',
      rep_legal_nombre,
      rep_legal_cedula,
      rep_legal_ciudad_exp = 'Bogotá D.C.',
      rep_suplente_nombre,
      rep_suplente_cedula,
      modalidad_facturacion = 'NIT_PROPIO', // NIT_PROPIO, FACTURACION_INDIVIDUAL, MIEMBRO_LIDER
      miembro_facturador,
      integrantes = []
    } = datosEstructura;

    if (!nombre_estructura || nombre_estructura.trim().length === 0) {
      throw new Error('Debe especificar la denominación o nombre de la estructura plural.');
    }

    if (!Array.isArray(integrantes) || integrantes.length < 2) {
      throw new Error('Una estructura plural (Consorcio o Unión Temporal) debe contar con al menos dos (2) integrantes.');
    }

    // Validar sumatoria del 100%
    const sumaPorcentajes = integrantes.reduce((acc, it) => acc + (parseFloat(it.porcentaje) || 0), 0);
    if (Math.abs(sumaPorcentajes - 100) > 0.01) {
      throw new Error(`La sumatoria de participaciones de los integrantes debe ser exactamente 100%. Suma actual: ${sumaPorcentajes.toFixed(2)}%`);
    }

    if (!rep_legal_nombre || !rep_legal_cedula) {
      throw new Error('Debe designar el Representante Legal Principal con su número de documento de identidad.');
    }

    // Si es Unión Temporal, verificar que cada integrante tenga definidos sus términos de ejecución
    if (tipo_estructura === 'UNION_TEMPORAL') {
      integrantes.forEach(it => {
        if (!it.alcance_actividades || it.alcance_actividades.trim().length === 0) {
          it.alcance_actividades = 'Ejecución integral de actividades técnicas, operativas y administrativas asignadas en proporción a su porcentaje de participación.';
        }
      });
    }

    const indicadoresPonderados = this.calcularIndicadoresPonderados(integrantes);

    const acuerdoDatos = {
      proceso_id: String(proceso.id || proceso.referencia || 'PROC-001'),
      numero_proceso: proceso.referencia || proceso.numero_proceso || 'PROCESO-SECOP',
      entidad_nombre: proceso.entidad || proceso.entidad_nombre || 'Entidad Estatal de Colombia',
      objeto_proceso: proceso.objeto || proceso.objeto_proceso || 'Objeto contractual de contratación pública',
      nombre_estructura: nombre_estructura.toUpperCase().trim(),
      tipo_estructura,
      duracion_meses: parseInt(duracion_meses, 10) || 24,
      domicilio_contractual,
      rep_legal_nombre,
      rep_legal_cedula,
      rep_legal_ciudad_exp,
      rep_suplente_nombre: rep_suplente_nombre || 'No designado',
      rep_suplente_cedula: rep_suplente_cedula || 'N/A',
      modalidad_facturacion,
      miembro_facturador: miembro_facturador || integrantes[0]?.razon_social || 'A definir con NIT propio',
      integrantes,
      indicadores_ponderados: indicadoresPonderados,
      estado: 'BORRADOR'
    };

    const documentoHtml = this.generarAcuerdoHtml(acuerdoDatos);
    acuerdoDatos.documento_html = documentoHtml;

    return acuerdoDatos;
  }

  /**
   * Genera el HTML formateado oficial de Formulario 3 CCE para previsualización e impresión
   */
  static generarAcuerdoHtml(acuerdo) {
    const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const esUnionTemporal = acuerdo.tipo_estructura === 'UNION_TEMPORAL';
    const tipoLabel = esUnionTemporal ? 'UNIÓN TEMPORAL' : 'CONSORCIO';

    const integrantesFilas = acuerdo.integrantes.map((it, idx) => `
      <tr>
        <td style="text-align: center; font-weight: bold; font-size: 11px;">${idx + 1}</td>
        <td style="font-size: 11px;"><b>${it.razon_social}</b><br><span style="color: #64748b;">NIT: ${it.nit}</span></td>
        <td style="font-size: 11px;">${it.representante_legal || 'Representante Legal'}<br><span style="color: #64748b;">C.C. ${it.cedula_representante || 'N/A'}</span></td>
        <td style="text-align: center; font-weight: bold; font-size: 12px; color: #0f172a;">${it.porcentaje}%</td>
        <td style="font-size: 11px; text-align: justify;">${it.alcance_actividades || 'Cumplimiento solidario de las obligaciones contractuales.'}</td>
      </tr>
    `).join('');

    const facturacionTexto = acuerdo.modalidad_facturacion === 'NIT_PROPIO'
      ? `En cumplimiento del Artículo 18 del Estatuto Tributario y el Decreto 1625 de 2016, la facturación del contrato se efectuará a nombre del <b>${tipoLabel} ${acuerdo.nombre_estructura}</b>, para lo cual se tramitará oportunamente el Número de Identificación Tributaria (NIT) especial ante la Dirección de Impuestos y Aduanas Nacionales (DIAN), designando como responsable de la administración de la cuenta bancaria conjunta a <b>${acuerdo.miembro_facturador}</b>.`
      : acuerdo.modalidad_facturacion === 'FACTURACION_INDIVIDUAL'
      ? `Cada uno de los integrantes del <b>${tipoLabel}</b> facturará de manera individual y directa a la Entidad Estatal contratante en estricta proporción a su porcentaje de participación contractual (${acuerdo.integrantes.map(m => `${m.razon_social}: ${m.porcentaje}%`).join(', ')}), asumiendo individualmente las retenciones en la fuente e IVA correspondientes.`
      : `La facturación del valor total del contrato se realizará por intermedio del integrante líder <b>${acuerdo.miembro_facturador}</b>, quien distribuirá los ingresos y costos a los demás miembros según los porcentajes de participación pactados.`;

    const clausulaResponsabilidad = esUnionTemporal
      ? `De conformidad con el Artículo 7 de la Ley 80 de 1993, los integrantes de la <b>UNIÓN TEMPORAL</b> responden solidariamente por el cumplimiento total de la propuesta y del contrato. Sin embargo, para efectos de la imposición de multas, sanciones e indemnizaciones por incumplimiento, la responsabilidad se distribuirá y graduará individualmente de acuerdo con el porcentaje de participación y los términos y actividades de ejecución descritos en la Cláusula Cuarta de este documento.`
      : `De conformidad con el Artículo 7 de la Ley 80 de 1993, las actuaciones, hechos y omisiones que se presenten en desarrollo de la propuesta y del contrato afectarán a todos y cada uno de los integrantes del <b>CONSORCIO</b> de forma <b>SOLIDARIA, MANCOMUNADA E ILIMITADA</b>, tanto en el cumplimiento del objeto como en la imposición de cualquier multa, cláusula penal o sanción administrativa.`;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Formulario 3 - Documento de Constitución de ${tipoLabel}</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.5; color: #111; margin: 40px; background: #fff; }
    h1 { font-size: 13pt; text-align: center; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; }
    h2 { font-size: 11pt; text-align: center; text-transform: uppercase; font-weight: bold; margin-bottom: 24px; color: #334155; }
    .fecha { text-align: right; margin-bottom: 16px; font-size: 10pt; }
    .header-box { border: 1px solid #94a3b8; background: #f8fafc; padding: 12px; margin-bottom: 20px; font-size: 10pt; }
    .header-box b { text-transform: uppercase; }
    .legal-clause { margin-bottom: 14px; text-align: justify; text-indent: 20px; }
    .legal-clause b { text-transform: uppercase; }
    .table-container { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 10pt; }
    .table-container th { background: #0f172a; color: #ffffff; padding: 6px 8px; border: 1px solid #334155; text-align: left; font-size: 9pt; text-transform: uppercase; }
    .table-container td { padding: 6px 8px; border: 1px solid #cbd5e1; vertical-align: top; }
    .fin-box { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f1f5f9; padding: 10px; border: 1px solid #cbd5e1; margin-bottom: 16px; font-size: 9pt; }
    .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; page-break-inside: avoid; }
    .sig-card { border-top: 1px solid #000; padding-top: 6px; font-size: 9.5pt; }
  </style>
</head>
<body>
  <div class="fecha">${acuerdo.domicilio_contractual}, ${fecha}</div>

  <div class="header-box">
    <b>ENTIDAD ESTATAL:</b> ${acuerdo.entidad_nombre}<br>
    <b>PROCESO DE SELECCIÓN:</b> ${acuerdo.numero_proceso}<br>
    <b>OBJETO:</b> ${acuerdo.objeto_proceso}
  </div>

  <h1>FORMULARIO 3: DOCUMENTO DE CONSTITUCIÓN DEL PROPONENTE PLURAL</h1>
  <h2>DOCUMENTO PRIVADO DE CONSTITUCIÓN DE LA ${tipoLabel} "${acuerdo.nombre_estructura}"</h2>

  <div class="legal-clause">
    Entre los suscritos, a saber: ${acuerdo.integrantes.map(it => `<b>${it.representante_legal || 'Representante Legal'}</b>, mayor de edad y domiciliado en Colombia, identificado con Cédula de Ciudadanía No. ${it.cedula_representante || '___________'}, en su condición de representante legal de la sociedad <b>${it.razon_social}</b>, con NIT ${it.nit}`).join('; ')}, manifestamos formalmente bajo la gravedad del juramento que hemos acordado constituir una estructura asociativa plural regida por la Ley 80 de 1993, la Ley 1150 de 2007, la Ley 1882 de 2018 y las directrices vinculantes de la Agencia Nacional de Contratación Pública - Colombia Compra Eficiente (ANCP-CCE), de acuerdo con las siguientes cláusulas:
  </div>

  <div class="legal-clause">
    <b>CLÁUSULA PRIMERA. CONSTITUCIÓN Y DENOMINACIÓN:</b> Las partes constituyen para todos los efectos legales y contractuales una <b>${tipoLabel}</b> que se denominará formalmente <b>"${acuerdo.nombre_estructura}"</b>, con domicilio contractual fijado en la ciudad de <b>${acuerdo.domicilio_contractual}</b>.
  </div>

  <div class="legal-clause">
    <b>CLÁUSULA SEGUNDA. OBJETO DEL PROPONENTE PLURAL:</b> El objeto exclusivo del presente acuerdo es la preparación, presentación conjunta de la propuesta, suscripción del contrato en caso de adjudicación, así como la cabal ejecución, entrega y liquidación bilateral del contrato derivado del Proceso de Selección No. <b>${acuerdo.numero_proceso}</b>, cuyo objeto es: <i>"${acuerdo.objeto_proceso}"</i>.
  </div>

  <div class="legal-clause">
    <b>CLÁUSULA TERCERA. DURACIÓN Y VIGENCIA:</b> La duración de la presente ${tipoLabel} será igual al término que transcurra entre la presentación de la propuesta y la adjudicación, el plazo total de ejecución del contrato, el término legal de liquidación contractual y <b>un (1) año adicional</b> contados a partir del perfeccionamiento de dicha liquidación, de conformidad con lo exigido en los pliegos de condiciones tipo.
  </div>

  <div class="legal-clause">
    <b>CLÁUSULA CUARTA. PORCENTAJES DE PARTICIPACIÓN Y TÉRMINOS DE EJECUCIÓN:</b> Los integrantes convienen que la participación en los derechos, obligaciones y utilidades del contrato se distribuye de la siguiente manera:
  </div>

  <table class="table-container">
    <thead>
      <tr>
        <th style="width: 25px; text-align: center;">No.</th>
        <th style="width: 170px;">Integrante / NIT</th>
        <th style="width: 140px;">Representante Legal</th>
        <th style="width: 70px; text-align: center;">Participación</th>
        <th>Actividades / Alcance Operativo</th>
      </tr>
    </thead>
    <tbody>
      ${integrantesFilas}
    </tbody>
  </table>

  <div class="legal-clause">
    <b>CLÁUSULA QUINTA. RESPONSABILIDAD ANTE LA ENTIDAD ESTATAL:</b> ${clausulaResponsabilidad}
  </div>

  <div class="legal-clause">
    <b>CLÁUSULA SEXTA. DESIGNACIÓN DE LA REPRESENTACIÓN LEGAL:</b> Los integrantes designan de común acuerdo como <b>REPRESENTANTE LEGAL PRINCIPAL</b> de la ${tipoLabel} a: <b>${acuerdo.rep_legal_nombre}</b>, identificado con Cédula de Ciudadanía No. <b>${acuerdo.rep_legal_cedula}</b> de ${acuerdo.rep_legal_ciudad_exp}, y como <b>REPRESENTANTE LEGAL SUPLENTE</b> a <b>${acuerdo.rep_suplente_nombre}</b>, identificado con Cédula No. <b>${acuerdo.rep_suplente_cedula}</b>. El representante legal queda investido de facultades plenas, expresas e irrevocables para representar a la estructura plural ante la Entidad Estatal, suscribir la oferta, atender requerimientos y subsanaciones, interponer recursos, firmar el contrato principal, sus adiciones, modificaciones y el acta de liquidación definitiva, sin limitación de cuantía.
  </div>

  <div class="legal-clause">
    <b>CLÁUSULA SÉPTIMA. RÉGIMEN TRIBUTARIO Y FACTURACIÓN:</b> ${facturacionTexto}
  </div>

  <div class="legal-clause">
    <b>CLÁUSULA OCTAVA. INALTERABILIDAD Y PROHIBICIÓN DE CESIÓN:</b> De conformidad con el Artículo 7 de la Ley 80 de 1993, la composición de los integrantes y los porcentajes de participación aquí estipulados no podrán ser modificados, ni cedidos parcial o totalmente, sin la autorización previa, expresa y escrita de la Entidad Estatal contratante.
  </div>

  <div class="legal-clause">
    <b>CLÁUSULA NOVENA. CAPACIDAD FINANCIERA CONSOLIDADA PONDERADA:</b> En cumplimiento de las matrices de evaluación de Pliegos Tipo ANCP-CCE, los integrantes certifican que su capacidad financiera ponderada acreditada mediante el Registro Único de Proponentes (RUP) es la siguiente:
  </div>

  <div class="fin-box">
    <div><b>Índice de Liquidez:</b> ${acuerdo.indicadores_ponderados?.indice_liquidez || 'N/A'}</div>
    <div><b>Índice de Endeudamiento:</b> ${acuerdo.indicadores_ponderados?.indice_endeudamiento || 'N/A'}%</div>
    <div><b>Cobertura de Intereses:</b> ${acuerdo.indicadores_ponderados?.cobertura_intereses || 'N/A'}</div>
    <div><b>Rentabilidad Patrimonio (ROE):</b> ${acuerdo.indicadores_ponderados?.rentabilidad_patrimonio || 'N/A'}%</div>
    <div><b>Rentabilidad Activo (ROA):</b> ${acuerdo.indicadores_ponderados?.rentabilidad_activo || 'N/A'}%</div>
    <div><b>Capital de Trabajo:</b> $ ${new Intl.NumberFormat('es-CO').format(acuerdo.indicadores_ponderados?.capital_trabajo || 0)} COP</div>
  </div>

  <div class="legal-clause">
    <b>CLÁUSULA DÉCIMA. MANIFESTACIÓN BAJO GRAVEDAD DE JURAMENTO:</b> Cada uno de los integrantes declara formalmente bajo la gravedad del juramento que ni ellos, ni sus representantes legales, socios o administradores, se encuentran incursos en causales de inhabilidad o incompatibilidad para contratar con el Estado (Artículo 8 Ley 80/1993), ni en conflicto de interés alguno.
  </div>

  <p>En constancia de lo anterior, se firma en la ciudad de ${acuerdo.domicilio_contractual}, a los ${new Date().getDate()} días del mes de ${new Date().toLocaleDateString('es-CO', { month: 'long' })} de ${new Date().getFullYear()}.</p>

  <div class="signature-grid">
    <div class="sig-card">
      <b>REPRESENTANTE LEGAL DESIGNADO:</b><br>
      Firma: ________________________________<br>
      Nombre: ${acuerdo.rep_legal_nombre}<br>
      C.C. No. ${acuerdo.rep_legal_cedula} de ${acuerdo.rep_legal_ciudad_exp}<br>
      Representante Legal de la ${tipoLabel}
    </div>

    ${acuerdo.integrantes.map(it => `
      <div class="sig-card">
        <b>POR ${it.razon_social.toUpperCase()}:</b><br>
        Firma: ________________________________<br>
        Representante: ${it.representante_legal || 'Representante Legal'}<br>
        C.C. No. ${it.cedula_representante || '___________'}<br>
        NIT: ${it.nit} (Participación: ${it.porcentaje}%)
      </div>
    `).join('')}
  </div>
</body>
</html>
    `;
  }

  /**
   * Genera el documento PDF formal oficial con diseño corporativo (Portrait)
   */
  static generarAcuerdoPdf(acuerdo) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          layout: 'portrait',
          margin: 45
        });

        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const esUnionTemporal = acuerdo.tipo_estructura === 'UNION_TEMPORAL';
        const tipoLabel = esUnionTemporal ? 'UNIÓN TEMPORAL' : 'CONSORCIO';

        // Encabezado
        doc.fontSize(8).fillColor('#64748b').text('REPÚBLICA DE COLOMBIA • CONTRATACIÓN PÚBLICA (ANCP-CCE)', { align: 'center' });
        doc.moveDown(0.4);
        doc.fontSize(13).fillColor('#0f172a').font('Helvetica-Bold').text('FORMULARIO 3: DOCUMENTO DE CONSTITUCIÓN DE PROPONENTE PLURAL', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#d97706').font('Helvetica-Bold').text(`DOCUMENTO PRIVADO DE CONSTITUCIÓN DE ${tipoLabel} "${acuerdo.nombre_estructura}"`, { align: 'center' });
        doc.moveDown(1);

        // Cuadro de Referencia
        const startY = doc.y;
        doc.rect(45, startY, 522, 50).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(8);
        doc.font('Helvetica-Bold').text('ENTIDAD CONTRATANTE:', 55, startY + 8).font('Helvetica').text(acuerdo.entidad_nombre || 'N/A', 170, startY + 8);
        doc.font('Helvetica-Bold').text('PROCESO DE SELECCIÓN:', 55, startY + 22).font('Helvetica').text(acuerdo.numero_proceso || 'PROCESO-SECOP', 170, startY + 22);
        doc.font('Helvetica-Bold').text('OBJETO DEL PROCESO:', 55, startY + 36).font('Helvetica').text((acuerdo.objeto_proceso || '').slice(0, 85) + '...', 170, startY + 36);

        doc.y = startY + 62;
        doc.moveDown(0.5);

        // Cláusulas
        const writeClause = (title, body) => {
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text(title, { align: 'justify' });
          doc.font('Helvetica').fontSize(8).fillColor('#334155').text(body, { align: 'justify', lineGap: 1.5 });
          doc.moveDown(0.8);
        };

        writeClause('CLÁUSULA PRIMERA. CONSTITUCIÓN Y DENOMINACIÓN:', 
          `Las partes constituyen una estructura asociativa plural bajo la modalidad de ${tipoLabel} denominada formalmente "${acuerdo.nombre_estructura}", con domicilio contractual en la ciudad de ${acuerdo.domicilio_contractual}, regida por el Artículo 7 de la Ley 80 de 1993, la Ley 1150 de 2007, la Ley 1882 de 2018 y las directrices vinculantes de Colombia Compra Eficiente.`);

        writeClause('CLÁUSULA SEGUNDA. OBJETO DEL PROPONENTE PLURAL:', 
          `El objeto exclusivo del presente acuerdo es la presentación conjunta de la propuesta en el proceso de selección No. ${acuerdo.numero_proceso}, la suscripción del contrato en caso de adjudicación, así como su cabal ejecución, entrega y liquidación bilateral.`);

        writeClause('CLÁUSULA TERCERA. DURACIÓN Y VIGENCIA:', 
          `La duración de la presente ${tipoLabel} comprenderá el término del proceso licitatorio, el plazo de ejecución contractual, el período legal de liquidación y un (1) año adicional contados a partir del acta de liquidación.`);

        // Tabla de Integrantes
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('CLÁUSULA CUARTA. PORCENTAJES DE PARTICIPACIÓN Y TÉRMINOS DE EJECUCIÓN:');
        doc.moveDown(0.4);

        const tableY = doc.y;
        doc.rect(45, tableY, 522, 16).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
        doc.text('INTEGRANTE / NIT', 50, tableY + 4, { width: 170 });
        doc.text('REPRESENTANTE', 225, tableY + 4, { width: 130 });
        doc.text('PART.', 360, tableY + 4, { width: 45, align: 'center' });
        doc.text('ALCANCE / ACTIVIDADES', 410, tableY + 4, { width: 150 });

        let rowY = tableY + 16;
        acuerdo.integrantes.forEach((it, idx) => {
          const rowHeight = 24;
          if (idx % 2 === 0) doc.rect(45, rowY, 522, rowHeight).fill('#f8fafc');
          doc.rect(45, rowY, 522, rowHeight).stroke('#cbd5e1');

          doc.fillColor('#0f172a').fontSize(7).font('Helvetica-Bold').text(it.razon_social, 50, rowY + 3, { width: 170 });
          doc.font('Helvetica').fillColor('#64748b').text(`NIT: ${it.nit}`, 50, rowY + 12);

          doc.font('Helvetica').fillColor('#0f172a').text(it.representante_legal || 'Representante Legal', 225, rowY + 4, { width: 130, ellipsis: true });
          doc.font('Helvetica-Bold').text(`${it.porcentaje}%`, 360, rowY + 6, { width: 45, align: 'center' });

          doc.font('Helvetica').fontSize(6.5).fillColor('#334155').text(it.alcance_actividades || 'Cumplimiento solidario.', 410, rowY + 3, { width: 150, height: 18, ellipsis: true });

          rowY += rowHeight;
        });

        doc.y = rowY + 10;

        const respTexto = esUnionTemporal
          ? 'De conformidad con el Artículo 7 de la Ley 80 de 1993, los integrantes responden solidariamente por el cumplimiento total de la propuesta y del contrato. Para efectos de sanciones por incumplimiento, la responsabilidad se graduará conforme al porcentaje de participación y los términos de ejecución de la Cláusula Cuarta.'
          : 'De conformidad con el Artículo 7 de la Ley 80 de 1993, las actuaciones y omisiones afectarán a todos los integrantes del CONSORCIO de forma SOLIDARIA, MANCOMUNADA E ILIMITADA en todas las obligaciones y sanciones contractuales.';

        writeClause('CLÁUSULA QUINTA. RESPONSABILIDAD ANTE LA ENTIDAD ESTATAL:', respTexto);

        writeClause('CLÁUSULA SEXTA. REPRESENTACIÓN LEGAL:', 
          `Se designa como REPRESENTANTE LEGAL PRINCIPAL a ${acuerdo.rep_legal_nombre} (C.C. ${acuerdo.rep_legal_cedula} de ${acuerdo.rep_legal_ciudad_exp}) y como SUPLENTE a ${acuerdo.rep_suplente_nombre} (C.C. ${acuerdo.rep_suplente_cedula}), con facultades plenas para presentar oferta, celebrar el contrato, suscribir actas y firmar la liquidación definitiva.`);

        const factTexto = acuerdo.modalidad_facturacion === 'NIT_PROPIO'
          ? `Facturación en cabeza de la ${tipoLabel} con NIT propio expedido por la DIAN (Art. 18 Estatuto Tributario). Administrador de cuenta: ${acuerdo.miembro_facturador}.`
          : `Facturación individualizada de cada integrante en proporción a su porcentaje de participación.`;

        writeClause('CLÁUSULA SÉPTIMA. FACTURACIÓN Y TRIBUTACIÓN:', factTexto);

        writeClause('CLÁUSULA OCTAVA. INALTERABILIDAD:', 
          'Prohibición de modificar integrantes o porcentajes sin autorización previa y escrita de la Entidad Estatal.');

        // Salto de página para firmas si es necesario
        if (doc.y > 620) {
          doc.addPage();
        }

        doc.moveDown(1);
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('FIRMAS VINCULANTES DE ACEPTACIÓN:');
        doc.moveDown(1.5);

        // Bloque de firmas
        const sigY = doc.y;
        doc.moveTo(45, sigY).lineTo(280, sigY).stroke('#0f172a');
        doc.moveTo(310, sigY).lineTo(540, sigY).stroke('#0f172a');

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text('REPRESENTANTE LEGAL DESIGNADO:', 45, sigY + 4);
        doc.font('Helvetica').fontSize(7).text(`${acuerdo.rep_legal_nombre} (C.C. ${acuerdo.rep_legal_cedula})`, 45, sigY + 14);
        doc.text(`Representante Legal ${tipoLabel}`, 45, sigY + 23);

        const lider = acuerdo.integrantes[0];
        doc.font('Helvetica-Bold').fontSize(7.5).text(`POR ${lider.razon_social.toUpperCase()}:`, 310, sigY + 4);
        doc.font('Helvetica').fontSize(7).text(`${lider.representante_legal || 'Representante Legal'} (NIT: ${lider.nit})`, 310, sigY + 14);
        doc.text(`Participación: ${lider.porcentaje}%`, 310, sigY + 23);

        if (acuerdo.integrantes.length > 1) {
          const sigY2 = sigY + 45;
          doc.moveTo(45, sigY2).lineTo(280, sigY2).stroke('#0f172a');
          const segundo = acuerdo.integrantes[1];
          doc.font('Helvetica-Bold').fontSize(7.5).text(`POR ${segundo.razon_social.toUpperCase()}:`, 45, sigY2 + 4);
          doc.font('Helvetica').fontSize(7).text(`${segundo.representante_legal || 'Representante Legal'} (NIT: ${segundo.nit})`, 45, sigY2 + 14);
          doc.text(`Participación: ${segundo.porcentaje}%`, 45, sigY2 + 23);
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Guarda o actualiza el acuerdo plural en la base de datos PostgreSQL
   */
  static async guardarAcuerdo(acuerdo) {
    const res = await dbPostgres.query(`
      INSERT INTO acuerdos_plurales_cce (
        proceso_id, numero_proceso, entidad_nombre, objeto_proceso,
        nombre_estructura, tipo_estructura, duracion_meses, domicilio_contractual,
        rep_legal_nombre, rep_legal_cedula, rep_legal_ciudad_exp,
        rep_suplente_nombre, rep_suplente_cedula, modalidad_facturacion,
        miembro_facturador, integrantes, indicadores_ponderados, documento_html, estado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id, creado_en
    `, [
      acuerdo.proceso_id,
      acuerdo.numero_proceso,
      acuerdo.entidad_nombre,
      acuerdo.objeto_proceso,
      acuerdo.nombre_estructura,
      acuerdo.tipo_estructura,
      acuerdo.duracion_meses,
      acuerdo.domicilio_contractual,
      acuerdo.rep_legal_nombre,
      acuerdo.rep_legal_cedula,
      acuerdo.rep_legal_ciudad_exp,
      acuerdo.rep_suplente_nombre,
      acuerdo.rep_suplente_cedula,
      acuerdo.modalidad_facturacion,
      acuerdo.miembro_facturador,
      JSON.stringify(acuerdo.integrantes),
      JSON.stringify(acuerdo.indicadores_ponderados),
      acuerdo.documento_html,
      acuerdo.estado || 'BORRADOR'
    ]);

    return { success: true, id: res.rows[0].id, creado_en: res.rows[0].creado_en };
  }

  /**
   * Obtiene los acuerdos plurales registrados para un proceso
   */
  static async getAcuerdosPorProceso(procesoId) {
    const res = await dbPostgres.query(`
      SELECT * FROM acuerdos_plurales_cce
      WHERE proceso_id = $1
      ORDER BY id DESC
    `, [procesoId]);
    return res.rows;
  }

  /**
   * Obtiene un acuerdo plural por su ID
   */
  static async getAcuerdoPorId(id) {
    const res = await dbPostgres.query(`
      SELECT * FROM acuerdos_plurales_cce
      WHERE id = $1
    `, [id]);
    return res.rows[0] || null;
  }
}

module.exports = PluralAgreementEngine;
