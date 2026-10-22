const PDFDocument = require('pdfkit');
const dbPostgres = require('./dbPostgres');
const companyManager = require('./companyManager');

class BidDocumentGenerator {
  /**
   * Genera el Formulario 1: Carta de Presentación de la Oferta (Pliegos Tipo ANCP-CCE)
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
            ${consorcio.miembros.map(m => `
              <tr><td>${m.razon_social}</td><td>${m.nit}</td><td style="text-align: center;">${m.porcentaje}%</td></tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const bancoInfo = banco || {
      nombre: 'Bancolombia S.A.',
      tipo: 'Cuenta Corriente',
      numero: '000-000000-00'
    };

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Formulario 1 - Carta de Presentación de la Oferta</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #111; margin: 40px; }
    h1 { font-size: 14pt; text-align: center; text-transform: uppercase; margin-bottom: 24px; }
    .fecha { text-align: right; margin-bottom: 20px; }
    .legal-clause { margin-bottom: 12px; text-align: justify; }
    .signature-area { margin-top: 50px; }
  </style>
</head>
<body>
  <div class="fecha">${ciudad}, ${fechaHoy}</div>

  <p>Señores<br>
  <b>${proceso.entidad.toUpperCase()}</b><br>
  Dirección de Contratación / Comité Evaluador<br>
  ${ciudad}</p>

  <p><b>Referencia:</b> Proceso de Selección No. ${proceso.referencia}<br>
  <b>Objeto:</b> ${proceso.objeto}</p>

  <h1>FORMULARIO 1: CARTA DE PRESENTACIÓN DE LA PROPUESTA</h1>

  <div class="legal-clause">
    El suscrito, obrando en calidad de representante legal ${esConsorcio ? 'del consorcio proponente' : 'de la sociedad proponente'}, presenta oferta formal e irrevocable para el proceso licitatorio de la referencia, de conformidad con la Ley 80 de 1993, la Ley 1150 de 2007, la Ley 1882 de 2018 y las directrices vinculantes de la Agencia Nacional de Contratación Pública - Colombia Compra Eficiente (ANCP-CCE).
  </div>

  ${bloqueProponente}

  <div class="legal-clause">
    <b>DECLARACIONES JURAMENTADAS VINCULANTES:</b>
    <ol>
      <li>Declaro bajo la gravedad del juramento que la empresa que represento, sus directivos y socios, no se encuentran incursos en causales de inhabilidad, incompatibilidad o conflicto de interés previstas en los artículos 8 y 9 de la Ley 80 de 1993, el artículo 18 de la Ley 1150 de 2007 y el artículo 122 de la Constitución Política.</li>
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
    <b>${esConsorcio ? consorcio.representante : oferente.representante_legal}</b><br>
    C.C. No. ${oferente.cedula_representante || '____________________'}<br>
    Representante Legal ${esConsorcio ? 'Consorcial' : oferente.razon_social}<br>
    NIT: ${oferente.nit}</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Genera el Formulario 2: Compromiso Anticorrupción (Pliegos Tipo)
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
    h1 { font-size: 14pt; text-align: center; text-transform: uppercase; margin-bottom: 24px; }
    .fecha { text-align: right; margin-bottom: 20px; }
    .legal-clause { margin-bottom: 12px; text-align: justify; }
    .signature-area { margin-top: 50px; }
  </style>
</head>
<body>
  <div class="fecha">${ciudad}, ${fechaHoy}</div>

  <p>Señores<br>
  <b>${proceso.entidad.toUpperCase()}</b><br>
  ${ciudad}</p>

  <h1>FORMULARIO 2: COMPROMISO ANTICORRUPCIÓN (ANCP-CCE)</h1>

  <div class="legal-clause">
    El suscrito, <b>${oferente.representante_legal || 'Representante Legal'}</b>, identificado con cédula de ciudadanía No. ${oferente.cedula_representante || '___________'}, en mi condición de Representante Legal de <b>${oferente.razon_social}</b>, con NIT ${oferente.nit}, en el marco del Proceso de Selección No. <b>${proceso.referencia}</b>, manifiesto de forma irrevocable el compromiso indeclinable de mi representada con los principios de transparencia, ética pública y legalidad estricta.
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
   * Genera Manifestación de Acreditación Mipyme (Ley 2069/2020 y Decreto 1860/2021)
   */
  generarAcreditacionMipymeHtml({ oferente, sector = 'Servicios', tamano = 'Pequeña Empresa', ciudad = 'Bogotá D.C.' }) {
    const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Certificación de Calidad de Mipyme y Fomento Nacional</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #111; margin: 40px; }
    h1 { font-size: 13pt; text-align: center; text-transform: uppercase; margin-bottom: 24px; }
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

  <div class="signature-area" style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 70px;">
    <div>
      <p>_____________________________________<br>
      <b>${oferente.representante_legal || 'Representante Legal'}</b><br>
      C.C. No. ${oferente.cedula_representante || '____________'}<br>
      Representante Legal<br>
      ${oferente.razon_social}</p>
    </div>
    <div>
      <p>_____________________________________<br>
      <b>Contador Público / Revisor Fiscal</b><br>
      C.C. No. __________________________<br>
      Tarjeta Profesional No. ______________-T<br>
      Junta Central de Contadores</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Genera el paquete de oferta completo en formato PDF compilado
   */
  async generarPaqueteOfertaPdf({ proceso, oferente, consorcio = null }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 45, size: 'A4' });
        const buffers = [];

        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Portada Institucional
        doc.rect(45, 45, 505, 710).stroke('#1e293b');
        doc.rect(55, 55, 485, 690).stroke('#d4af37');

        doc.moveDown(6);
        doc.fontSize(10).fillColor('#64748b').text('REPÚBLICA DE COLOMBIA • CONTRATACIÓN ESTATAL', { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(18).fillColor('#0f172a').font('Helvetica-Bold').text('OFERTA FORMAL DE CONTRATACIÓN', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#d4af37').text(`PROCESO: ${proceso.referencia}`, { align: 'center' });

        doc.moveDown(4);
        doc.fontSize(11).fillColor('#1e293b').font('Helvetica-Bold').text('ENTIDAD CONTRATANTE:', { align: 'center' });
        doc.font('Helvetica').text(proceso.entidad, { align: 'center' });

        doc.moveDown(2);
        doc.font('Helvetica-Bold').text('PROPONENTE:', { align: 'center' });
        doc.font('Helvetica').text(consorcio?.esPlural ? consorcio.nombreConsorcio : oferente.razon_social, { align: 'center' });
        doc.text(`NIT: ${oferente.nit}`, { align: 'center' });

        doc.moveDown(2);
        doc.font('Helvetica-Bold').text('OBJETO DEL PROCESO:', { align: 'center' });
        doc.font('Helvetica').fontSize(10).text(proceso.objeto, { align: 'center' });

        doc.moveDown(5);
        doc.fontSize(9).fillColor('#94a3b8').text('Generado automáticamente por Radar SECOP B2B SaaS', { align: 'center' });
        doc.text(new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }), { align: 'center' });

        // Página 2: Formulario 1
        doc.addPage();
        doc.fontSize(13).fillColor('#0f172a').font('Helvetica-Bold').text('FORMULARIO 1: CARTA DE PRESENTACIÓN DE LA PROPUESTA', { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(10).font('Helvetica').fillColor('#334155');
        doc.text(`Ciudad: Bogotá D.C. | Fecha: ${new Date().toLocaleDateString('es-CO')}`);
        doc.text(`Entidad: ${proceso.entidad}`);
        doc.text(`Referencia: ${proceso.referencia}`);
        doc.moveDown(1);
        doc.text('El suscrito, en calidad de representante legal, presenta propuesta formal para la ejecución del contrato de la referencia, declarando bajo juramento que no nos encontramos incursos en causales de inhabilidad o incompatibilidad conforme al Estatuto General de Contratación Pública (Ley 80/1993, Ley 1150/2007 y Ley 1882/2018).');
        doc.moveDown(1);
        doc.text('Manifestamos que conocemos y aceptamos íntegramente el pliego de condiciones, las especificaciones técnicas y las adendas emitidas por la entidad.');
        doc.moveDown(3);
        doc.text('________________________________________________');
        doc.font('Helvetica-Bold').text(oferente.representante_legal || 'Representante Legal');
        doc.font('Helvetica').text(`C.C. ${oferente.cedula_representante || '____________________'}`);
        doc.text(`Proponente: ${oferente.razon_social} (NIT: ${oferente.nit})`);

        // Página 3: Formulario 2
        doc.addPage();
        doc.fontSize(13).fillColor('#0f172a').font('Helvetica-Bold').text('FORMULARIO 2: COMPROMISO ANTICORRUPCIÓN', { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(10).font('Helvetica').fillColor('#334155');
        doc.text('Nos comprometemos formalmente a no ofrecer, dar ni prometer beneficios indebidos a los servidores públicos encargados del proceso de contratación, ni celebrar pactos colusorios con otros competidores en observancia estricta de las directrices vinculantes de Colombia Compra Eficiente.');
        doc.moveDown(3);
        doc.text('________________________________________________');
        doc.font('Helvetica-Bold').text(oferente.representante_legal || 'Representante Legal');
        doc.font('Helvetica').text(`Proponente: ${oferente.razon_social}`);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = new BidDocumentGenerator();
