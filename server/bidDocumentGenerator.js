// ============================================================================
// RADAR SECOP - MOTOR DE GENERACIÓN DE DOCUMENTOS JURÍDICOS OFICIALES
// Normativa: Ley 80/1993 (Art. 8, 9), Ley 1150/2007 (Art. 5, 18), Ley 1882/2018,
// Ley 789/2002 (Art. 50), Ley 828/2003 (Art. 9), Ley 2069/2020 y Pliegos Tipo ANCP-CCE.
// ============================================================================

const PDFDocument = require('pdfkit');
const dbPostgres = require('./dbPostgres');
const companyManager = require('./companyManager');

class BidDocumentGenerator {
  /**
   * Formulario 1: Carta de Presentación de la Oferta (HTML)
   */
  generarFormulario1Html({ proceso, oferente, consorcio = null, banco = null, ciudad = 'Bogotá D.C.' }) {
    const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const esConsorcio = consorcio && consorcio.esPlural;

    let bloqueProponente = `
      <p><b>Razón Social del Proponente:</b> ${oferente.razon_social}<br>
      <b>NIT:</b> ${oferente.nit}<br>
      <b>Representante Legal:</b> ${oferente.representante_legal || 'Representante Legal'}<br>
      <b>Cédula de Ciudadanía:</b> ${oferente.cedula_representante || 'C.C. No indicada'}<br>
      <b>Domicilio Contractual:</b> ${oferente.ciudad || ciudad}<br>
      <b>Correo Electrónico de Notificaciones:</b> ${oferente.email || 'notificaciones@empresa.com'}<br>
      <b>Teléfono:</b> ${oferente.telefono || '300 000 0000'}</p>
    `;

    if (esConsorcio) {
      bloqueProponente = `
        <p><b>Estructura Plural:</b> ${consorcio.nombreConsorcio || 'CONSORCIO ' + proceso.referencia}<br>
        <b>Tipo:</b> ${consorcio.tipo || 'Consorcio (Ley 80 de 1993, Art. 7)'}<br>
        <b>Representante Legal de la Estructura Plural:</b> ${consorcio.representante || oferente.representante_legal}<br>
        <b>Integrantes y Participación:</b></p>
        <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 11pt; margin: 10px 0;">
          <thead><tr style="background: #f1f5f9;"><th>Integrante</th><th>NIT</th><th>Participación (%)</th></tr></thead>
          <tbody>
            ${(consorcio.miembros || []).map(m => `
              <tr><td>${m.razon_social}</td><td>${m.nit}</td><td style="text-align: center;">${m.porcentaje}%</td></tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const bancoInfo = banco || {
      nombre: 'Bancolombia S.A.',
      tipo: 'Cuenta Corriente',
      numero: '001-234567-89'
    };

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Formulario 1 - Carta de Presentación de la Oferta</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #111; margin: 40px; }
    h1 { font-size: 13pt; text-align: center; text-transform: uppercase; margin-bottom: 20px; }
    .fecha { text-align: right; margin-bottom: 20px; }
    .legal-clause { margin-bottom: 12px; text-align: justify; }
    .signature-area { margin-top: 50px; }
  </style>
</head>
<body>
  <div class="fecha">${ciudad}, ${fechaHoy}</div>

  <p>Señores<br>
  <b>${(proceso.entidad || 'Entidad Estatal').toUpperCase()}</b><br>
  Dirección de Contratación / Comité Evaluador de Selección<br>
  ${ciudad}</p>

  <p><b>Referencia:</b> Proceso de Selección No. ${proceso.referencia || proceso.id}<br>
  <b>Objeto:</b> ${proceso.objeto || proceso.nombre || 'Contratación estatal'}</p>

  <h1>FORMULARIO 1: CARTA DE PRESENTACIÓN DE LA PROPUESTA</h1>

  <div class="legal-clause">
    El suscrito, obrando en calidad de representante legal ${esConsorcio ? 'del consorcio proponente' : 'de la sociedad proponente'}, presenta oferta formal e irrevocable para el proceso licitatorio de la referencia, de conformidad con la Ley 80 de 1993, la Ley 1150 de 2007, la Ley 1882 de 2018 y las directrices vinculantes de la Agencia Nacional de Contratación Pública - Colombia Compra Eficiente (ANCP-CCE).
  </div>

  ${bloqueProponente}

  <div class="legal-clause">
    <b>DECLARACIONES JURAMENTADAS VINCULANTES:</b>
    <ol>
      <li>Declaro bajo la gravedad del juramento que la empresa que represento, sus directivos y socios, no se encuentran incursos en causales de inhabilidad, incompatibilidad o conflicto de interés previstas en los artículos 8 y 9 de la Ley 80 de 1993, el artículo 18 de la Ley 1150 de 2007, la Ley 1474 de 2011 y el artículo 122 de la Constitución Política.</li>
      <li>Declaro que he revisado exhaustivamente el Pliego de Condiciones, los Anexos Técnicos y las Adendas publicadas en SECOP II, y acepto incondicionalmente todos los requerimientos y condiciones en ellos estipulados.</li>
      <li>Manifiesto que la presente oferta económica es vinculante y cuenta con un término de validez de noventa (90) días calendario, prorrogables de conformidad con la ley.</li>
      <li>Garantizo que toda la información consignada en la propuesta y sus anexos es veraz, verificable y goza de plena vigencia y firmeza en el Registro Único de Proponentes (RUP).</li>
      <li>Autorizo irrevocablemente que cualquier pago derivado de la eventual adjudicación y ejecución contractual sea consignado en la siguiente cuenta bancaria:<br>
      <b>Entidad Financiera:</b> ${bancoInfo.nombre}<br>
      <b>Tipo de Cuenta:</b> ${bancoInfo.tipo}<br>
      <b>Número de Cuenta:</b> ${bancoInfo.numero}</li>
    </ol>
  </div>

  <div class="signature-area">
    <p>Atentamente,</p>
    <br><br>
    <p>____________________________________________________<br>
    <b>${esConsorcio ? consorcio.representante : (oferente.representante_legal || 'Representante Legal')}</b><br>
    C.C. No. ${oferente.cedula_representante || '____________________'}<br>
    Representante Legal ${esConsorcio ? 'Consorcial' : oferente.razon_social}<br>
    NIT: ${oferente.nit}</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Formulario 2: Compromiso Anticorrupción (HTML)
   */
  generarFormulario2AnticorrupcionHtml({ proceso, oferente, ciudad = 'Bogotá D.C.' }) {
    const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Formulario 2 - Compromiso Anticorrupción</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #111; margin: 40px; }
    h1 { font-size: 13pt; text-align: center; text-transform: uppercase; margin-bottom: 20px; }
    .fecha { text-align: right; margin-bottom: 20px; }
    .legal-clause { margin-bottom: 12px; text-align: justify; }
    .signature-area { margin-top: 50px; }
  </style>
</head>
<body>
  <div class="fecha">${ciudad}, ${fechaHoy}</div>

  <p>Señores<br>
  <b>${(proceso.entidad || 'Entidad Estatal').toUpperCase()}</b><br>
  ${ciudad}</p>

  <h1>FORMULARIO 2: COMPROMISO ANTICORRUPCIÓN (ANCP-CCE)</h1>

  <div class="legal-clause">
    El suscrito, <b>${oferente.representante_legal || 'Representante Legal'}</b>, identificado con cédula de ciudadanía No. ${oferente.cedula_representante || '___________'}, en mi condición de Representante Legal de <b>${oferente.razon_social}</b>, con NIT ${oferente.nit}, en el marco del Proceso de Selección No. <b>${proceso.referencia || proceso.id}</b>, manifiesto de forma irrevocable el compromiso indeclinable de mi representada con los principios de transparencia, ética pública y legalidad estricta.
  </div>

  <div class="legal-clause">
    <b>COMPROMISOS FORMALES:</b>
    <ol>
      <li>Nos comprometemos a no ofrecer, no dar, no prometer directa ni indirectamente dádivas, beneficios o recompensas a ningún servidor público, contratista o asesor de <b>${proceso.entidad}</b>, con el propósito de inducir o influir en la evaluación, selección o adjudicación de la presente contratación.</li>
      <li>Nos obligamos a no realizar acuerdos ilícitos de colusión, fijación de precios, repartición de mercado o prácticas restrictivas de la competencia con ningún otro proponente o participante en el proceso licitatorio.</li>
      <li>Declaramos que los precios y costos consignados en la oferta son independientes y reflejan condiciones reales y sostenibles de mercado.</li>
      <li>Nos comprometemos a denunciar inmediatamente ante la Fiscalía General de la Nación, la Procuraduría y la Contraloría cualquier intento de soborno, extorsión o desviación ética del cual tengamos conocimiento durante las etapas precontractual, contractual o poscontractual.</li>
    </ol>
  </div>

  <div class="signature-area">
    <p>En constancia de lo anterior, se suscribe el presente compromiso:</p>
    <br><br>
    <p>____________________________________________________<br>
    <b>${oferente.representante_legal || 'Representante Legal'}</b><br>
    C.C. No. ${oferente.cedula_representante || '____________________'}<br>
    ${oferente.razon_social}<br>
    NIT: ${oferente.nit}</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Formulario 2 (Anexo): Manifestación de Acreditación Mipyme e Industria Nacional (HTML)
   * Normativa: Ley 2069 de 2020, Decreto 957 de 2019 y Decreto 1860 de 2021
   */
  generarAcreditacionMipymeHtml({ oferente, sector = 'Servicios', tamano = 'Pequeña Empresa', contador = {}, ciudad = 'Bogotá D.C.' }) {
    const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Certificación de Calidad de Mipyme y Fomento Nacional</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #111; margin: 40px; }
    h1 { font-size: 12.5pt; text-align: center; text-transform: uppercase; margin-bottom: 20px; }
    .fecha { text-align: right; margin-bottom: 20px; }
    .legal-clause { margin-bottom: 12px; text-align: justify; }
    .signature-area { margin-top: 50px; }
  </style>
</head>
<body>
  <div class="fecha">${ciudad}, ${fechaHoy}</div>

  <h1>CERTIFICACIÓN DE CONDICIÓN DE MIPYME E INDUSTRIA NACIONAL<br>
  <span style="font-size: 10pt; font-weight: normal;">(Ley 2069 de 2020, Decreto 957 de 2019 y Decreto 1860 de 2021)</span></h1>

  <div class="legal-clause">
    El suscrito Representante Legal y el Contador Público / Revisor Fiscal de <b>${oferente.razon_social}</b>, con NIT ${oferente.nit}, certificamos bajo la gravedad del juramento que la empresa ostenta formal y materialmente la condición de <b>${tamano.toUpperCase()}</b> dentro del sector económico de <b>${sector.toUpperCase()}</b>, de acuerdo con los rangos de Ingresos por Actividades Ordinarias anuales establecidos en el Decreto 957 de 2019.
  </div>

  <div class="legal-clause">
    En virtud de lo anterior, solicitamos a la Entidad Contratante la aplicación plena de los criterios de preferencia, desempate y fomento de la industria y el empleo nacional contemplados en el artículo 2.2.1.2.4.2.14 del Decreto 1082 de 2015, modificado por el Decreto 1860 de 2021, así como los beneficios del artículo 35 de la Ley 2069 de 2020.
  </div>

  <div class="signature-area" style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px;">
    <div>
      <p>_____________________________________<br>
      <b>${oferente.representante_legal || 'Representante Legal'}</b><br>
      C.C. No. ${oferente.cedula_representante || '____________'}<br>
      Representante Legal<br>
      ${oferente.razon_social}</p>
    </div>
    <div>
      <p>_____________________________________<br>
      <b>${contador.nombre || 'Contador Público / Revisor Fiscal'}</b><br>
      C.C. No. ${contador.cedula || '____________________'}<br>
      Tarjeta Profesional No. ${contador.tarjeta_profesional || 'TP-__________-T'}<br>
      Junta Central de Contadores</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Formulario 4: Certificación de Aportes a Seguridad Social y Parafiscales (HTML)
   * Normativa: Art. 50 Ley 789 de 2002, Art. 9 Ley 828 de 2003 y doctrina ANCP-CCE
   */
  generarFormulario4ParafiscalesHtml({ proceso, oferente, firmantes = {}, ciudad = 'Bogotá D.C.' }) {
    const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const tieneRevisorFiscal = firmantes.tiene_revisor_fiscal !== false;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Formulario 4 - Certificación de Pagos Seguridad Social y Parafiscales</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #111; margin: 40px; }
    h1 { font-size: 12.5pt; text-align: center; text-transform: uppercase; margin-bottom: 20px; }
    .fecha { text-align: right; margin-bottom: 20px; }
    .legal-clause { margin-bottom: 12px; text-align: justify; }
    .signature-area { margin-top: 50px; }
  </style>
</head>
<body>
  <div class="fecha">${ciudad}, ${fechaHoy}</div>

  <p>Señores<br>
  <b>${(proceso.entidad || 'Entidad Estatal').toUpperCase()}</b><br>
  Dirección de Contratación / Comité Evaluador<br>
  ${ciudad}</p>

  <p><b>Referencia:</b> Proceso de Selección No. ${proceso.referencia || proceso.id}<br>
  <b>Objeto:</b> ${proceso.objeto || proceso.nombre || 'Contratación estatal'}</p>

  <h1>FORMULARIO 4: CERTIFICACIÓN DE CUMPLIMIENTO EN EL PAGO DE APORTES A LA SEGURIDAD SOCIAL Y PARAFISCALES<br>
  <span style="font-size: 10pt; font-weight: normal;">(Artículo 50 de la Ley 789 de 2002 y Artículo 9 de la Ley 828 de 2003)</span></h1>

  <div class="legal-clause">
    En cumplimiento de lo dispuesto por el artículo 50 de la Ley 789 de 2002, el suscrito <b>${tieneRevisorFiscal ? (firmantes.nombre_revisor_fiscal || 'Revisor Fiscal') : (oferente.representante_legal || 'Representante Legal')}</b>, ${tieneRevisorFiscal ? 'en mi condición de Revisor Fiscal debidamente inscrito en el registro mercantil' : 'en mi calidad de Representante Legal y Contador Público independiente'} de <b>${oferente.razon_social}</b>, con NIT ${oferente.nit}:
  </div>

  <div class="legal-clause" style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 4px;">
    <b>CERTIFICA BAJO LA GRAVEDAD DEL JURAMENTO:</b><br><br>
    Que la sociedad <b>${oferente.razon_social}</b> ha cumplido a cabalidad, durante los seis (6) meses anteriores a la fecha de cierre del presente proceso de selección, con el pago oportuno de la totalidad de sus obligaciones por concepto de:
    <ul>
      <li><b>Sistema General de Seguridad Social Integral:</b> Aportes en Salud (EPS), Pensiones (Fondos Administradores) y Riesgos Laborales (ARL).</li>
      <li><b>Aportes Parafiscales Obligatorios:</b> Pagos correspondientes al Servicio Nacional de Aprendizaje (SENA), Instituto Colombiano de Bienestar Familiar (ICBF) y Cajas de Compensación Familiar (CCF).</li>
    </ul>
    Lo anterior respecto de la totalidad del personal vinculado contractualmente a la empresa mediante contrato laboral, conforme a las planillas PILA verificadas en los libros contables oficiales.
  </div>

  <div class="signature-area" style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px;">
    <div>
      <p>_____________________________________<br>
      <b>${oferente.representante_legal || 'Representante Legal'}</b><br>
      C.C. No. ${oferente.cedula_representante || '____________'}<br>
      Representante Legal<br>
      ${oferente.razon_social}</p>
    </div>
    <div>
      <p>_____________________________________<br>
      <b>${firmantes.nombre_revisor_fiscal || firmantes.nombre_contador || 'Revisor Fiscal / Contador'}</b><br>
      C.C. No. ${firmantes.cedula_contador || '____________________'}<br>
      Tarjeta Profesional No. ${firmantes.tarjeta_profesional || 'TP-__________-T'}<br>
      Junta Central de Contadores<br>
      ${tieneRevisorFiscal ? '(Revisor Fiscal Titular)' : '(Contador Público Independiente)'}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Genera el Formulario 1 en PDF Oficial
   */
  async generarFormulario1Pdf({ proceso, oferente, consorcio = null, banco = null, ciudad = 'Bogotá D.C.' }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'LETTER', layout: 'portrait', margin: 40 });
        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
        const esConsorcio = consorcio && consorcio.esPlural;

        // Membrete CCE
        doc.fontSize(8).fillColor('#64748b').text('REPÚBLICA DE COLOMBIA • CONTRATACIÓN ESTATAL (PLIEGOS TIPO)', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(12).fillColor('#0f172a').font('Helvetica-Bold').text('FORMULARIO 1: CARTA DE PRESENTACIÓN DE LA PROPUESTA', { align: 'center' });
        doc.moveDown(0.8);

        doc.fontSize(8.5).font('Helvetica').fillColor('#334155');
        doc.text(`${ciudad}, ${fechaHoy}`, { align: 'right' });
        doc.moveDown(0.5);

        doc.font('Helvetica-Bold').text('Señores:');
        doc.text((proceso.entidad || 'Entidad Estatal').toUpperCase());
        doc.font('Helvetica').text('Comité Evaluador de Selección / Dirección de Contratación');
        doc.text(ciudad);
        doc.moveDown(0.8);

        // Cuadro Resumen Proceso
        const topY = doc.y;
        doc.rect(40, topY, 532, 38).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(8);
        doc.font('Helvetica-Bold').text('PROCESO No.:', 48, topY + 6).font('Helvetica').text(proceso.referencia || proceso.id, 140, topY + 6);
        doc.font('Helvetica-Bold').text('OBJETO:', 48, topY + 18).font('Helvetica').text((proceso.objeto || proceso.nombre || 'Contratación estatal').substring(0, 85) + '...', 140, topY + 18, { width: 420 });

        doc.y = topY + 48;

        doc.font('Helvetica').fontSize(8).fillColor('#1e293b').text(
          `El suscrito, obrando en calidad de representante legal ${esConsorcio ? 'del consorcio proponente' : 'de la sociedad proponente'}, presenta oferta formal e irrevocable para el proceso licitatorio de la referencia, de conformidad con la Ley 80 de 1993, la Ley 1150 de 2007, la Ley 1882 de 2018 y las directrices vinculantes de la Agencia Nacional de Contratación Pública - Colombia Compra Eficiente (ANCP-CCE).`,
          { align: 'justify', lineGap: 1.5 }
        );
        doc.moveDown(0.6);

        // Declaraciones
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('DECLARACIONES FORMALES BAJO LA GRAVEDAD DEL JURAMENTO:');
        doc.moveDown(0.3);

        const declaraciones = [
          '1. Inexistencia de Inhabilidades: Declaro que la empresa, directivos y socios no se encuentran incursos en causales de inhabilidad, incompatibilidad o conflicto de interés previstas en los artículos 8 y 9 de la Ley 80 de 1993, artículo 18 de la Ley 1150 de 2007, Ley 1474 de 2011 y artículo 122 de la Constitución Política.',
          '2. Conocimiento y Aceptación de Pliegos: He revisado exhaustivamente el Pliego de Condiciones, Anexos Técnicos y Adendas publicadas en SECOP II, y acepto incondicionalmente todos sus requerimientos.',
          '3. Validez de la Oferta: La propuesta es vinculante y cuenta con una vigencia mínima de noventa (90) días calendario, contados a partir del cierre del proceso.',
          '4. Veracidad y Firmeza RUP: Garantizo que toda la información aportada es verídica, comprobable y goza de plena firmeza en el Registro Único de Proponentes (RUP).',
          `5. Cuenta Bancaria para Pagos: Autorizo que los desembolsos contractuales se giren a: ${banco?.nombre || 'Bancolombia S.A.'} - Cuenta ${banco?.tipo || 'Corriente'} No. ${banco?.numero || '001-234567-89'}.`
        ];

        doc.font('Helvetica').fontSize(7.5).fillColor('#334155');
        declaraciones.forEach(dec => {
          doc.text(dec, { align: 'justify', lineGap: 1.2 });
          doc.moveDown(0.4);
        });

        // Firma
        doc.moveDown(2);
        const sigY = doc.y;
        doc.moveTo(40, sigY).lineTo(280, sigY).stroke('#0f172a');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text(oferente.representante_legal || 'Representante Legal', 40, sigY + 4);
        doc.font('Helvetica').fontSize(7).text(`C.C. ${oferente.cedula_representante || '____________________'}`);
        doc.text(`Proponente: ${esConsorcio ? consorcio.nombreConsorcio : oferente.razon_social}`);
        doc.text(`NIT: ${oferente.nit}`);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Genera el Formulario 2 (Mipyme e Industria Nacional) en PDF Oficial
   */
  async generarFormulario2MipymePdf({ oferente, sector = 'Servicios', tamano = 'Pequeña Empresa', contador = {}, ciudad = 'Bogotá D.C.' }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'LETTER', layout: 'portrait', margin: 40 });
        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

        doc.fontSize(8).fillColor('#64748b').text('REPÚBLICA DE COLOMBIA • AGENCIA NACIONAL DE CONTRATACIÓN PÚBLICA (ANCP-CCE)', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text('FORMULARIO 2: CERTIFICACIÓN DE CONDICIÓN DE MIPYME E INDUSTRIA NACIONAL', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(7.5).fillColor('#475569').font('Helvetica').text('Ley 2069 de 2020 (Art. 35), Decreto 957 de 2019 y Decreto 1860 de 2021', { align: 'center' });
        doc.moveDown(1);

        doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(`${ciudad}, ${fechaHoy}`, { align: 'right' });
        doc.moveDown(1);

        doc.font('Helvetica').fontSize(8.5).fillColor('#1e293b').text(
          `El suscrito Representante Legal y el Contador Público / Revisor Fiscal de ${oferente.razon_social}, identificada con NIT ${oferente.nit}, certificamos bajo la gravedad del juramento que la empresa ostenta formal y materialmente la condición de ${tamano.toUpperCase()} dentro del sector económico de ${sector.toUpperCase()}, de conformidad con los rangos de Ingresos por Actividades Ordinarias anuales fijados en el Decreto 957 de 2019.`,
          { align: 'justify', lineGap: 1.5 }
        );
        doc.moveDown(1);

        doc.text(
          'En virtud de dicha calidad, solicitamos a la Entidad Estatal la aplicación plena de los criterios de preferencia, desempate y fomento a la producción y empleo de origen nacional regulados en el artículo 2.2.1.2.4.2.14 del Decreto 1082 de 2015, modificado por el Decreto 1860 de 2021, así como los incentivos de la Ley 2069 de 2020.',
          { align: 'justify', lineGap: 1.5 }
        );

        // Firmas conjuntas
        doc.moveDown(4);
        const sigY = doc.y;
        doc.moveTo(40, sigY).lineTo(250, sigY).stroke('#0f172a');
        doc.moveTo(320, sigY).lineTo(530, sigY).stroke('#0f172a');

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text('REPRESENTANTE LEGAL:', 40, sigY + 4);
        doc.font('Helvetica').fontSize(6.5).text(oferente.representante_legal || 'Representante Legal', 40, sigY + 14);
        doc.text(`C.C. ${oferente.cedula_representante || '____________'}`, 40, sigY + 23);
        doc.text(oferente.razon_social, 40, sigY + 32);

        doc.font('Helvetica-Bold').fontSize(7.5).text('CONTADOR PÚBLICO / REVISOR FISCAL:', 320, sigY + 4);
        doc.font('Helvetica').fontSize(6.5).text(contador.nombre || 'Contador Público / Revisor Fiscal', 320, sigY + 14);
        doc.text(`C.C. ${contador.cedula || '____________________'}`, 320, sigY + 23);
        doc.text(`T.P. No. ${contador.tarjeta_profesional || 'TP-__________-T'} (Junta Central de Contadores)`, 320, sigY + 32);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Genera el Formulario 4 (Aportes Parafiscales y Seguridad Social) en PDF Oficial
   */
  async generarFormulario4ParafiscalesPdf({ proceso, oferente, firmantes = {}, ciudad = 'Bogotá D.C.' }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'LETTER', layout: 'portrait', margin: 40 });
        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
        const tieneRevisorFiscal = firmantes.tiene_revisor_fiscal !== false;

        doc.fontSize(8).fillColor('#64748b').text('REPÚBLICA DE COLOMBIA • CONTRATACIÓN PÚBLICA SECOP II', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text('FORMULARIO 4: CERTIFICACIÓN DE PAGO DE APORTES A SEGURIDAD SOCIAL Y PARAFISCALES', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(7.5).fillColor('#475569').font('Helvetica').text('Artículo 50 de la Ley 789 de 2002 y Artículo 9 de la Ley 828 de 2003', { align: 'center' });
        doc.moveDown(1);

        doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(`${ciudad}, ${fechaHoy}`, { align: 'right' });
        doc.moveDown(0.5);

        doc.font('Helvetica-Bold').text('Señores:');
        doc.text((proceso.entidad || 'Entidad Estatal').toUpperCase());
        doc.font('Helvetica').text('Comité Evaluador de Selección / Dirección de Contratación');
        doc.text(ciudad);
        doc.moveDown(0.8);

        // Cuadro Resumen Proceso
        const topY = doc.y;
        doc.rect(40, topY, 532, 34).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(7.5);
        doc.font('Helvetica-Bold').text('PROCESO No.:', 48, topY + 6).font('Helvetica').text(proceso.referencia || proceso.id, 140, topY + 6);
        doc.font('Helvetica-Bold').text('PROPONENTE:', 48, topY + 18).font('Helvetica').text(`${oferente.razon_social} (NIT: ${oferente.nit})`, 140, topY + 18);

        doc.y = topY + 44;

        // Declaración Formal
        doc.font('Helvetica').fontSize(8).fillColor('#1e293b').text(
          `En estricto cumplimiento del artículo 50 de la Ley 789 de 2002 y el artículo 9 de la Ley 828 de 2003, el suscrito ${tieneRevisorFiscal ? (firmantes.nombre_revisor_fiscal || 'Revisor Fiscal') : (oferente.representante_legal || 'Representante Legal')}, en condición de ${tieneRevisorFiscal ? 'Revisor Fiscal debidamente inscrito en el registro mercantil' : 'Representante Legal y Contador Público independiente'} de la sociedad ${oferente.razon_social}, con NIT ${oferente.nit}:`,
          { align: 'justify', lineGap: 1.5 }
        );
        doc.moveDown(0.8);

        // Cuadro Certificación
        const certY = doc.y;
        doc.rect(40, certY, 532, 95).fillAndStroke('#eff6ff', '#bfdbfe');
        doc.fillColor('#1e40af').fontSize(8).font('Helvetica-Bold');
        doc.text('CERTIFICA BAJO LA GRAVEDAD DEL JURAMENTO:', 48, certY + 8);
        doc.font('Helvetica').fontSize(7.5).fillColor('#1e3a8a');
        doc.text(
          `Que ${oferente.razon_social} se encuentra a paz y salvo y ha realizado oportuna y completamente, durante los seis (6) meses anteriores a la fecha de cierre del presente proceso de selección, la totalidad de los pagos y aportes correspondientes a:`,
          48, certY + 22, { width: 516, align: 'justify', lineGap: 1.2 }
        );
        doc.font('Helvetica-Bold').text('1. Sistema General de Seguridad Social Integral:', 48, certY + 48).font('Helvetica').text('Salud (EPS), Pensiones y Riesgos Laborales (ARL).', 260, certY + 48);
        doc.font('Helvetica-Bold').text('2. Aportes Parafiscales Obligatorios:', 48, certY + 62).font('Helvetica').text('SENA, Instituto Colombiano de Bienestar Familiar (ICBF) y Cajas de Compensación Familiar.', 260, certY + 62);
        doc.font('Helvetica').fontSize(7).text(
          'Lo anterior respecto de la totalidad del personal vinculado contractualmente mediante relación laboral, según planillas PILA verificadas en libros oficiales.',
          48, certY + 78, { width: 516, align: 'justify' }
        );

        doc.y = certY + 110;

        // Firmas
        doc.moveDown(2);
        const sigY = doc.y;
        doc.moveTo(40, sigY).lineTo(250, sigY).stroke('#0f172a');
        doc.moveTo(320, sigY).lineTo(530, sigY).stroke('#0f172a');

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text('REPRESENTANTE LEGAL:', 40, sigY + 4);
        doc.font('Helvetica').fontSize(6.5).text(oferente.representante_legal || 'Representante Legal', 40, sigY + 14);
        doc.text(`C.C. ${oferente.cedula_representante || '____________'}`, 40, sigY + 23);
        doc.text(oferente.razon_social, 40, sigY + 32);

        doc.font('Helvetica-Bold').fontSize(7.5).text(tieneRevisorFiscal ? 'REVISOR FISCAL:' : 'CONTADOR PÚBLICO:', 320, sigY + 4);
        doc.font('Helvetica').fontSize(6.5).text(firmantes.nombre_revisor_fiscal || firmantes.nombre_contador || 'Revisor Fiscal Titular', 320, sigY + 14);
        doc.text(`C.C. ${firmantes.cedula_contador || '____________________'}`, 320, sigY + 23);
        doc.text(`T.P. No. ${firmantes.tarjeta_profesional || 'TP-__________-T'} (Junta Central de Contadores)`, 320, sigY + 32);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Genera el paquete de oferta completo en formato PDF compilado (Foliado)
   */
  async generarPaqueteOfertaPdf({ proceso, oferente, consorcio = null, banco = null, contador = {} }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'LETTER' });
        const buffers = [];

        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const esConsorcio = consorcio && consorcio.esPlural;
        const nombreProponente = esConsorcio ? consorcio.nombreConsorcio : oferente.razon_social;
        const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

        // PÁGINA 1: PORTADA INSTITUCIONAL DE LA OFERTA
        doc.rect(40, 40, 532, 712).stroke('#0f172a');
        doc.rect(48, 48, 516, 696).stroke('#d4af37');

        doc.moveDown(4);
        doc.fontSize(9).fillColor('#64748b').text('REPÚBLICA DE COLOMBIA • CONTRATACIÓN ESTATAL', { align: 'center' });
        doc.moveDown(0.8);
        doc.fontSize(16).fillColor('#0f172a').font('Helvetica-Bold').text('OFERTA FORMAL DE CONTRATACIÓN', { align: 'center' });
        doc.moveDown(0.4);
        doc.fontSize(11).fillColor('#d4af37').text(`PROCESO: ${proceso.referencia || proceso.id}`, { align: 'center' });

        doc.moveDown(3);
        doc.fontSize(10).fillColor('#0f172a').font('Helvetica-Bold').text('ENTIDAD CONTRATANTE:', { align: 'center' });
        doc.font('Helvetica').fontSize(9).text(proceso.entidad, { align: 'center' });

        doc.moveDown(1.5);
        doc.font('Helvetica-Bold').text('PROPONENTE:', { align: 'center' });
        doc.font('Helvetica').fontSize(9).text(nombreProponente, { align: 'center' });
        doc.text(`NIT: ${oferente.nit}`, { align: 'center' });

        doc.moveDown(1.5);
        doc.font('Helvetica-Bold').text('OBJETO DEL CONTRATO:', { align: 'center' });
        doc.font('Helvetica').fontSize(8.5).text(proceso.objeto || proceso.nombre, { align: 'center', width: 440 });

        doc.moveDown(3);
        doc.fontSize(8).fillColor('#64748b').text('Generado mediante Plataforma SaaS Radar SECOP - Nikadu AI', { align: 'center' });
        doc.text(fechaHoy, { align: 'center' });

        // PÁGINA 2: FORMULARIO 1 (CARTA DE PRESENTACIÓN)
        doc.addPage();
        doc.fontSize(8).fillColor('#64748b').text('FORMULARIO OFICIAL CCE • PÁGINA 2 DE 5', { align: 'right' });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text('FORMULARIO 1: CARTA DE PRESENTACIÓN DE LA PROPUESTA', { align: 'center' });
        doc.moveDown(0.8);
        doc.fontSize(8).font('Helvetica').fillColor('#334155');
        doc.text(`Fecha: ${fechaHoy} | Referencia: ${proceso.referencia || proceso.id}`);
        doc.text(`Entidad: ${proceso.entidad}`);
        doc.text(`Proponente: ${nombreProponente} (NIT: ${oferente.nit})`);
        doc.moveDown(0.8);
        doc.text('El suscrito, en calidad de representante legal, presenta oferta formal e irrevocable para el proceso licitatorio de la referencia, manifestando bajo la gravedad del juramento que la sociedad no se encuentra incursa en causales de inhabilidad o incompatibilidad del Estatuto General de Contratación de la Administración Pública (Ley 80/1993, Ley 1150/2007, Ley 1882/2018).');
        doc.moveDown(0.6);
        doc.text('Manifestamos conocer y aceptar incondicionalmente el pliego de condiciones, especificaciones técnicas y adendas expedidas en SECOP II. Declaramos una vigencia de oferta de noventa (90) días calendario.');
        doc.moveDown(2);
        doc.text('____________________________________________________');
        doc.font('Helvetica-Bold').text(oferente.representante_legal || 'Representante Legal');
        doc.font('Helvetica').text(`C.C. ${oferente.cedula_representante || '____________________'}`);
        doc.text(nombreProponente);

        // PÁGINA 3: FORMULARIO 2 (COMPROMISO ANTICORRUPCIÓN)
        doc.addPage();
        doc.fontSize(8).fillColor('#64748b').text('FORMULARIO OFICIAL CCE • PÁGINA 3 DE 5', { align: 'right' });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text('FORMULARIO 2: COMPROMISO ANTICORRUPCIÓN', { align: 'center' });
        doc.moveDown(0.8);
        doc.fontSize(8).font('Helvetica').fillColor('#334155');
        doc.text('Nos comprometemos formal e irrevocablemente a no ofrecer, dar ni prometer dádivas o ventajas indebidas a los servidores públicos ni intermediarios de la entidad, ni concertar pactos colusorios o restrictivos de la libre competencia con otros proponentes, garantizando transparencia estricta.');
        doc.moveDown(2);
        doc.text('____________________________________________________');
        doc.font('Helvetica-Bold').text(oferente.representante_legal || 'Representante Legal');
        doc.font('Helvetica').text(`C.C. ${oferente.cedula_representante || '____________________'}`);
        doc.text(nombreProponente);

        // PÁGINA 4: ACREDITACIÓN MIPYME (LEY 2069/2020)
        doc.addPage();
        doc.fontSize(8).fillColor('#64748b').text('FORMULARIO OFICIAL CCE • PÁGINA 4 DE 5', { align: 'right' });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text('FORMULARIO 2 (ANEXO): ACREDITACIÓN DE MIPYME E INDUSTRIA NACIONAL', { align: 'center' });
        doc.moveDown(0.8);
        doc.fontSize(8).font('Helvetica').fillColor('#334155');
        doc.text(`Certificamos que ${oferente.razon_social} ostenta la condición de Pequeña Empresa de conformidad con el Decreto 957 de 2019, solicitando la aplicación de los criterios de preferencia y desempate nacional de la Ley 2069 de 2020 y Decreto 1860 de 2021.`);
        doc.moveDown(2);
        doc.text('_____________________________________           _____________________________________');
        doc.font('Helvetica-Bold').text('Representante Legal                             Contador Público / Revisor Fiscal');
        doc.font('Helvetica').text(`${oferente.representante_legal || 'Representante Legal'}                     ${contador.nombre || 'Revisor Fiscal Titular'}`);

        // PÁGINA 5: FORMULARIO 4 (APORTES SEGURIDAD SOCIAL ART. 50 LEY 789/2002)
        doc.addPage();
        doc.fontSize(8).fillColor('#64748b').text('FORMULARIO OFICIAL CCE • PÁGINA 5 DE 5', { align: 'right' });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text('FORMULARIO 4: CERTIFICACIÓN DE APORTES A SEGURIDAD SOCIAL Y PARAFISCALES', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(7.5).fillColor('#475569').font('Helvetica').text('(Artículo 50 de la Ley 789 de 2002 y Artículo 9 de la Ley 828 de 2003)', { align: 'center' });
        doc.moveDown(0.8);
        doc.fontSize(8).font('Helvetica').fillColor('#334155');
        doc.text(`El suscrito Revisor Fiscal / Contador certifica que ${oferente.razon_social} ha realizado oportuna y completamente durante los seis (6) meses previos al cierre del proceso el pago de aportes al Sistema de Seguridad Social (Salud, Pensión, ARL) y Aportes Parafiscales (SENA, ICBF, Cajas de Compensación Familiar) respecto de la totalidad de su nómina.`);
        doc.moveDown(2);
        doc.text('_____________________________________           _____________________________________');
        doc.font('Helvetica-Bold').text('Representante Legal                             Revisor Fiscal / Contador');
        doc.font('Helvetica').text(`${oferente.representante_legal || 'Representante Legal'}                     ${contador.nombre || 'Revisor Fiscal Titular'} - TP ${contador.tarjeta_profesional || 'TP-98765-T'}`);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = new BidDocumentGenerator();
