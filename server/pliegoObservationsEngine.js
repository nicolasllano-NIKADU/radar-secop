const PDFDocument = require('pdfkit');
const dbPostgres = require('./dbPostgres');
const companyManager = require('./companyManager');

class PliegoObservationsEngine {
  /**
   * Analiza un pliego de condiciones y detecta cláusulas susceptibles de impugnación jurídica
   */
  detectarClausulasImpugnables({ proceso, matrizBrechas = [] }) {
    const impugnacionesSugeridas = [];

    // 1. Análisis de requisitos habilitantes en la matriz de brechas
    matrizBrechas.forEach(item => {
      // Brecha de liquidez o endeudamiento con exigencia excesiva
      if (item.requisito === 'Índice de Liquidez' && item.resultado === 'NO_CUMPLE') {
        impugnacionesSugeridas.push({
          tipo: 'FINANCIERA_DESPROPORCIONADA',
          titulo: 'Desproporción en el Índice de Liquidez Exigido',
          clausula: `Requisito Habilitante Financiero: Índice de Liquidez ${item.criterioExigido}`,
          argumento: `El índice de liquidez solicitado excede los parámetros estándar fijados por Colombia Compra Eficiente (ANCP-CCE) en los Pliegos Tipo y la Guía de Capacidad Financiera. Los indicadores financieros constituyen condiciones de aptitud habilitante y no factores de descarte artificial (Ley 1150 de 2007, Art. 5; Decreto 1082 de 2015). Exigir un umbral superior sin justificación en el estudio del sector vulnera el principio de libre concurrencia (Ley 80 de 1993, Art. 24).`,
          peticion: `Ajustar el requisito habilitante de Índice de Liquidez al estándar proporcional de 1.50 o permitir su acreditación mediante estructura plural consorcial sin castigo operativo.`
        });
      }

      if (item.requisito === 'Experiencia Específica (SMMLV)' && item.resultado === 'NO_CUMPLE') {
        impugnacionesSugeridas.push({
          tipo: 'EXPERIENCIA_RESTRICTIVA',
          titulo: 'Solicitud de Reclasificación y Flexibilización de Experiencia',
          clausula: `Requisito de Experiencia Mínima: ${item.criterioExigido}`,
          argumento: `De conformidad con la Ley 1150 de 2007 (Art. 6.1) y la doctrina unificada de ANCP-CCE (Concepto C-431 de 2026 sobre reorganización documental), la entidad debe permitir la acreditación de experiencia mediante contratos del sector privado y contratos ejecutados en consorcio, sin restringir arbitrariamente los códigos UNSPSC conexos al objeto principal del contrato.`,
          peticion: `Ampliar el espectro de códigos UNSPSC admitidos para acreditar la experiencia y permitir la sumatoria de contratos en estructura plural sin exigir que cada integrante cumpla el 100% individualmente.`
        });
      }

      if (item.requisito === 'Garantía de Seriedad de la Oferta') {
        impugnacionesSugeridas.push({
          tipo: 'SUBSANABILIDAD_POLIZA',
          titulo: 'Aclaración sobre Subsanabilidad de la Garantía de Seriedad',
          clausula: 'Presentación de Póliza de Seriedad y Recibo de Pago de Prima',
          argumento: `Conforme al artículo 5 de la Ley 1882 de 2018 y el Concepto Vinculante C-1376 de 2025 de ANCP-CCE, existe una distinción sustancial entre el hecho constitutivo de la garantía (su expedición antes del cierre) y la prueba formal de la misma. Cualquier inconsistencia en el certificado de pago o clausulado general es un defecto subsanable que no da lugar al rechazo de plano de la propuesta.`,
          peticion: `Consagrar expresamente en el pliego definitivo que las aclaraciones sobre la póliza de seriedad de la oferta gozan del término legal de traslado para su subsanación.`
        });
      }
    });

    // 2. Impugnaciones normativas de pliegos tipo universales
    impugnacionesSugeridas.push({
      tipo: 'EXPERIENCIA_PUBLICA_VS_PRIVADA',
      titulo: 'Prohibición de Excluir la Experiencia Contractual Privada',
      clausula: 'Acreditación de experiencia exclusivamente en el sector público',
      argumento: `El artículo 6 de la Ley 1150 de 2007 y el Decreto 1082 de 2015 establecen que el Registro Único de Proponentes (RUP) certifica con plena validez la experiencia proveniente tanto de contratos públicos como privados. Limitar la participación a quienes hayan contratado previamente con el Estado constituye una causal de nulidad por violación del principio de igualdad y libre concurrencia (Consejo de Estado, Sección Tercera, Rad. 44654).`,
      peticion: `Eliminar cualquier cláusula que limite la experiencia habilitante a contratos estatales y aceptar expresamente contratos celebrados con personas jurídicas de derecho privado.`
    });

    impugnacionesSugeridas.push({
      tipo: 'DESGLOSE_AIU',
      titulo: 'Publicación Completa del Estudio de Mercado y Desglose de Precios',
      clausula: 'Presupuesto Oficial Global sin Desglose de Costos Directos e Indirectos',
      argumento: `En cumplimiento del principio de transparencia (Ley 80 de 1993, Art. 24) y el artículo 2.2.1.1.2.1.1 del Decreto 1082 de 2015, la entidad está en la obligación de poner a disposición de los oferentes el cálculo de precios unitarios, los costos de mano de obra y el análisis de AIU (Administración, Imprevistos y Utilidades) que sustentan el valor estimado del contrato.`,
      peticion: `Publicar como anexo técnico modificatorio la matriz detallada de análisis de precios unitarios (APU) que permita a los proponentes calibrar sus ofertas económicas de manera sustentada.`
    });

    return impugnacionesSugeridas;
  }

  /**
   * Genera el escrito formal de observaciones en HTML
   */
  generarDocumentoObservacionHtml({
    proceso,
    oferente,
    titulo,
    clausulaImpugnada,
    argumentoJuridico,
    peticionConcreta,
    ciudad = 'Bogotá D.C.'
  }) {
    const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Escrito Formal de Observaciones al Pliego</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #111; margin: 40px; }
    h1 { font-size: 13pt; text-align: center; text-transform: uppercase; margin-bottom: 20px; font-weight: bold; }
    .fecha { text-align: right; margin-bottom: 25px; }
    .destinatario { margin-bottom: 20px; line-height: 1.4; }
    .referencia { margin-bottom: 25px; padding: 10px; background: #f8fafc; border-left: 3px solid #0f172a; }
    .seccion-titulo { font-weight: bold; text-transform: uppercase; margin-top: 18px; margin-bottom: 8px; font-size: 11pt; }
    .parrafo-legal { text-align: justify; margin-bottom: 12px; }
    .cita-jurisprudencial { margin: 15px 30px; font-style: italic; color: #334155; border-left: 2px solid #cbd5e1; padding-left: 12px; }
    .firma { margin-top: 50px; }
  </style>
</head>
<body>
  <div class="fecha">${ciudad}, ${fechaHoy}</div>

  <div class="destinatario">
    Señores<br>
    <b>${(proceso.entidad || 'ENTIDAD ESTATAL').toUpperCase()}</b><br>
    Comité Evaluador y Estructurador / Ordenador del Gasto<br>
    Dirección de Contratación Pública<br>
    ${ciudad}
  </div>

  <div class="referencia">
    <b>PROCESO DE SELECCIÓN:</b> ${proceso.referencia || proceso.id}<br>
    <b>OBJETO:</b> ${proceso.objeto || 'Contratación estatal'}<br>
    <b>ASUNTO:</b> OBSERVACIONES JURÍDICAS Y TÉCNICAS AL PLIEGO DE CONDICIONES
  </div>

  <h1>MEMORIAL DE OBSERVACIONES Y SOLICITUD DE MODIFICACIÓN AL PLIEGO</h1>

  <div class="parrafo-legal">
    El suscrito, <b>${oferente.representante_legal || 'Representante Legal'}</b>, mayor de edad, identificado como aparece al pie de mi firma, obrando en mi calidad de representante legal de la sociedad <b>${oferente.razon_social}</b>, identificada con NIT <b>${oferente.nit}</b>, con domicilio contractual en ${ciudad}, en ejercicio del derecho fundamental de petición y de participación ciudadana en la contratación pública (Artículo 270 de la Constitución Política y Artículo 24 Numeral 5 de la Ley 80 de 1993), me permito presentar las siguientes <b>OBSERVACIONES FORMALES</b> al pliego de condiciones de la referencia:
  </div>

  <div class="seccion-titulo">I. CLÁUSULA OBJETO DE CONTROVERSIA</div>
  <div class="parrafo-legal">
    Se controvierte puntualmente la siguiente exigencia contenida en los documentos del proceso:
  </div>
  <div class="cita-jurisprudencial">
    "${clausulaImpugnada}"
  </div>

  <div class="seccion-titulo">II. FUNDAMENTOS JURÍDICOS Y DOCTRINARIOS</div>
  <div class="parrafo-legal">
    ${argumentoJuridico}
  </div>

  <div class="parrafo-legal">
    Es menester recordar que los principios de <b>Transparencia, Selección Objetiva y Libre Concurrencia</b> (Artículos 24 y 29 de la Ley 80 de 1993 y Artículo 2 de la Ley 1150 de 2007) imponen a la entidad estatal el deber ineludible de estructurar requisitos proporcionales y razonables. La jurisprudencia consolidada de la Sección Tercera del Consejo de Estado y las directrices vinculantes de la Agencia Nacional de Contratación Pública - Colombia Compra Eficiente (ANCP-CCE) han reiterado de forma pacífica que:
  </div>

  <div class="cita-jurisprudencial">
    "La discrecionalidad de la entidad estatal para fijar requisitos habilitantes no equivale a arbitrariedad. Las exigencias que superen el estándar estricto de idoneidad y que tengan como efecto práctico la restricción del mercado o la exclusión injustificada de oferentes habilitados en el RUP, vician de ilegalidad la actuación administrativa."
  </div>

  <div class="seccion-titulo">III. PETICIÓN CONCRETA</div>
  <div class="parrafo-legal">
    Con base en los fundamentos fácticos y jurídicos expuestos, solicitamos de manera formal y respetuosa al Comité Evaluador y al Ordenador del Gasto:
  </div>

  <div class="parrafo-legal">
    <b>ÚNICO:</b> ${peticionConcreta}
  </div>

  <div class="parrafo-legal">
    Manifestamos nuestra permanente disposición de concurrir al presente proceso licitatorio con una propuesta seria, técnica y económicamente solvente que garantice los fines esenciales del Estado y la optimización de los recursos públicos.
  </div>

  <div class="firma">
    Cordialmente,<br><br><br>
    ___________________________________________________<br>
    <b>${oferente.representante_legal || 'Representante Legal'}</b><br>
    C.C. No. ${oferente.cedula_representante || '____________________'}<br>
    Representante Legal<br>
    <b>${oferente.razon_social}</b><br>
    NIT: ${oferente.nit}<br>
    Correo Electrónico: ${oferente.email || 'notificaciones@empresa.com'}<br>
    Teléfono: ${oferente.telefono || '300 000 0000'}
  </div>
</body>
</html>
    `;
  }

  /**
   * Genera el memorial formal en formato binario PDF (pdfkit)
   */
  async generarDocumentoObservacionPdf({ proceso, oferente, titulo, clausulaImpugnada, argumentoJuridico, peticionConcreta, ciudad = 'Bogotá D.C.' }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
        const buffers = [];

        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

        // Encabezado
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text(oferente.razon_social.toUpperCase(), { align: 'right' });
        doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(`NIT: ${oferente.nit} | ${ciudad}`, { align: 'right' });
        doc.moveDown(1.5);

        doc.fontSize(10).font('Helvetica').fillColor('#0f172a').text(`${ciudad}, ${fechaHoy}`, { align: 'right' });
        doc.moveDown(1);

        doc.font('Helvetica-Bold').text('Señores:');
        doc.text((proceso.entidad || 'ENTIDAD ESTATAL').toUpperCase());
        doc.font('Helvetica').text('Comité Evaluador y Estructurador / Dirección de Contratación');
        doc.text(ciudad);
        doc.moveDown(1);

        // Caja de Referencia
        doc.font('Helvetica-Bold').text(`PROCESO: ${proceso.referencia || proceso.id}`);
        doc.font('Helvetica').text(`OBJETO: ${proceso.objeto || 'Contratación pública'}`);
        doc.font('Helvetica-Bold').text('ASUNTO: OBSERVACIONES Y SOLICITUD DE MODIFICACIÓN AL PLIEGO DE CONDICIONES');
        doc.moveDown(1.5);

        // Título del memorial
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('MEMORIAL FORMAL DE OBSERVACIONES AL PLIEGO', { align: 'center' });
        doc.moveDown(1);

        // Cuerpo legal
        doc.fontSize(10).font('Helvetica').fillColor('#334155');
        doc.text(`El suscrito, en calidad de representante legal de ${oferente.razon_social} (NIT: ${oferente.nit}), en ejercicio del derecho de petición y participación ciudadana consagrado en el artículo 24 numeral 5 de la Ley 80 de 1993 y la Ley 1150 de 2007, presenta formalmente las siguientes observaciones:`);
        doc.moveDown(1);

        // I. Cláusula
        doc.font('Helvetica-Bold').text('I. CLÁUSULA OBSERVADA:');
        doc.font('Helvetica-Oblique').fillColor('#475569').text(`"${clausulaImpugnada}"`);
        doc.moveDown(1);

        // II. Argumento
        doc.font('Helvetica-Bold').fillColor('#334155').text('II. SUSTENTO JURÍDICO Y DOCTRINARIO:');
        doc.font('Helvetica').text(argumentoJuridico, { align: 'justify' });
        doc.moveDown(1);

        // III. Petición
        doc.font('Helvetica-Bold').text('III. SOLICITUD CONCRETA:');
        doc.font('Helvetica').text(peticionConcreta, { align: 'justify' });
        doc.moveDown(2);

        // Firma
        doc.text('Atentamente,');
        doc.moveDown(2);
        doc.text('____________________________________________________');
        doc.font('Helvetica-Bold').text(oferente.representante_legal || 'Representante Legal');
        doc.font('Helvetica').text(`C.C. ${oferente.cedula_representante || '____________________'}`);
        doc.text(`Representante Legal de ${oferente.razon_social}`);
        doc.text(`NIT: ${oferente.nit}`);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Guarda una observación generada en la base de datos
   */
  async guardarObservacion({ procesoId, empresaId, tipoObservacion = 'BORRADOR', titulo, clausulaImpugnada, argumentoJuridico, peticionConcreta, documentoGenerado }) {
    const res = await dbPostgres.query(`
      INSERT INTO observaciones_pliego 
      (proceso_id, empresa_id, tipo_observacion, titulo, clausula_impugnada, argumento_juridico, peticion_concreta, documento_generado)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `, [
      procesoId,
      empresaId,
      tipoObservacion,
      titulo,
      clausulaImpugnada,
      argumentoJuridico,
      peticionConcreta,
      documentoGenerado
    ]);

    return res.rows[0];
  }

  /**
   * Lista el historial de observaciones radicadas para un proceso
   */
  async listarObservaciones(procesoId) {
    const res = await dbPostgres.query(`
      SELECT o.*, e.razon_social as empresa_nombre
      FROM observaciones_pliego o
      LEFT JOIN empresas e ON e.id = o.empresa_id
      WHERE o.proceso_id = $1
      ORDER BY o.creado_en DESC;
    `, [procesoId]);

    return res.rows;
  }
}

module.exports = new PliegoObservationsEngine();
