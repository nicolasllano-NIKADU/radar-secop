const PDFDocument = require('pdfkit');
const dbPostgres = require('./dbPostgres');
const companyManager = require('./companyManager');

class EvaluationChallengeEngine {
  /**
   * Catálogo Oficial de Causales de Impugnación y Subsanabilidad (ANCP-CCE)
   */
  getCatalogCausales() {
    return [
      {
        codigo: 'GARANTIA_EXTEMPORANEA',
        tipoAccion: 'IMPUGNACION_COMPETIDOR',
        titulo: 'Expedición Extemporánea de la Garantía de Seriedad de la Oferta',
        causalRechazo: true,
        fundamentoLegal: 'Ley 1882 de 2018 Art. 5 Parágrafo 3 y Concepto C-1376 de 2025 de ANCP-CCE',
        resumen: 'La póliza fue emitida con fecha u hora posterior al cierre del proceso de selección.',
        argumentoEstandar: `El parágrafo 3 del artículo 5 de la Ley 1882 de 2018 consagra que la no entrega de la garantía de seriedad de la oferta junto con la propuesta no será subsanable. La doctrina unificada de la Agencia Nacional de Contratación Pública (Concepto C-1376 de 2025) ha determinado que el hecho habilitante reside en que la póliza de seguro se haya constituido y expedido ANTES de la fecha y hora límites para la presentación de ofertas. Si la carátula de la póliza o el certificado de la aseguradora revela una hora o fecha posterior al cierre, la falencia es materialmente insubsanable, pues no es lícito constituir hechos habilitantes con posterioridad al vencimiento del plazo de presentación de ofertas.`,
        peticionEstandar: `Declarar el RECHAZO y la DESCALIFICACIÓN INMEDIATA de la propuesta presentada por el competidor, excluyéndolo del orden de elegibilidad en cumplimiento estricto del artículo 5 de la Ley 1882 de 2018.`
      },
      {
        codigo: 'MODIFICACION_OFERTA_ECONOMICA',
        tipoAccion: 'IMPUGNACION_COMPETIDOR',
        titulo: 'Modificación o Variación Indebida de la Oferta Económica',
        causalRechazo: true,
        fundamentoLegal: 'Ley 1882 de 2018 Art. 5 y Concepto C-518 de 2025 de ANCP-CCE',
        resumen: 'El competidor pretende corregir precios, modificar valores unitarios o alterar el valor total de su oferta durante el término de subsanabilidad.',
        argumentoEstandar: `El artículo 5 de la Ley 1882 de 2018 dispone expresamente que en ningún caso la entidad estatal podrá permitir que se subsanen asuntos que afecten la asignación de puntaje, y prohíbe de manera taxativa la modificación, adición o mejora de la oferta económica inicial. Los precios propuestos son inalterables y definitivos. Admitir correcciones en hojas de cálculo, cambios en precios unitarios o justificaciones que varíen el valor ofertado vulnera el principio de igualdad entre proponentes y la selección objetiva (Ley 80 de 1993, Art. 24 y 29).`,
        peticionEstandar: `Rechazar las pretensiones de modificación económica formuladas por el oferente y proceder al rechazo definitivo de su propuesta por vulneración del principio de inalterabilidad de la oferta económica.`
      },
      {
        codigo: 'PUNTAJE_POSTERIOR_AL_CIERRE',
        tipoAccion: 'IMPUGNACION_COMPETIDOR',
        titulo: 'Acreditación Extemporánea de Criterios de Asignación de Puntaje',
        causalRechazo: false, // Descuenta puntaje
        fundamentoLegal: 'Ley 1150 de 2007 Art. 5 Parágrafo 1 y Decreto 1082 de 2015',
        resumen: 'El competidor allegó certificaciones técnicas, de calidad o de personal con posterioridad al cierre para sumar puntos.',
        argumentoEstandar: `De conformidad con el parágrafo 1 del artículo 5 de la Ley 1150 de 2007, todos los requisitos necesarios para la ponderación de la oferta deben encontrarse acreditados al momento del cierre del proceso. La entidad no tiene la facultad legal de otorgar puntaje técnico, ambiental o de calidad con base en documentos o aclaraciones que hayan sido radicados extemporáneamente en el traslado del informe de evaluación.`,
        peticionEstandar: `Revocar la asignación de puntaje otorgada en el informe de evaluación en los criterios objeto de controversia, reduciendo la calificación del proponente y recomponiendo el orden de elegibilidad definitivo.`
      },
      {
        codigo: 'NO_SUBSANACION_OPORTUNA',
        tipoAccion: 'IMPUGNACION_COMPETIDOR',
        titulo: 'Preclusión del Término de Traslado sin Subsanar en Debida Forma',
        causalRechazo: true,
        fundamentoLegal: 'Ley 1882 de 2018 Art. 5 y Sentencia Consejo de Estado Sección Tercera (Exp. 44654)',
        resumen: 'El proponente no subsanó el requisito requerido dentro del plazo perentorio de traslado del informe de evaluación.',
        argumentoEstandar: `El término de traslado del informe de evaluación es preclusivo y perentorio. La jurisprudencia uniforme del Consejo de Estado y las directrices de ANCP-CCE establecen que si un proponente no allega los documentos requeridos dentro de la ventana de traslado, precluye de pleno derecho su oportunidad procesal para hacerlo. La administración no puede admitir subsanaciones tardías en audiencias posteriores sin viciar el procedimiento licitatorio.`,
        peticionEstandar: `Tener por no subsanado el requisito habilitante requerido y declarar formalmente el rechazo de la propuesta por vencimiento del plazo legal de traslado.`
      },
      {
        codigo: 'REORGANIZACION_DOCUMENTAL_DEFENSA',
        tipoAccion: 'DEFENSA_SUBSANACION',
        titulo: 'Subsanación mediante Reorganización Documental de la Oferta Inicial',
        causalRechazo: false,
        fundamentoLegal: 'Concepto C-431 de 2026 de ANCP-CCE y Ley 1882 de 2018 Art. 5',
        resumen: 'Reclasificación de contratos o documentos contenidos en la oferta inicial para cumplir requisitos habilitantes.',
        argumentoEstandar: `De acuerdo con la doctrina unificada de la Agencia Nacional de Contratación Pública (Concepto C-431 de 2026 sobre reorganización documental), es jurídicamente procedente y obligatorio para la entidad aceptar que documentos o contratos aportados inicialmente para evaluación técnica sean reclasificados y valorados como experiencia habilitante, toda vez que dicha documentación reposaba de forma íntegra en la oferta antes del cierre del proceso y no se está adicionando información nueva ni alterando la propuesta. En virtud del principio de prevalencia del derecho sustancial sobre el formal (Constitución Política Art. 228 y Ley 80 de 1993 Art. 25.15), solicitamos la habilitación correspondiente.`,
        peticionEstandar: `Reclasificar el soporte contractual incorporado en la oferta original y tener por acreditado y cumplido al 100% el requisito de experiencia habilitante, declarando plenamente habilitada nuestra propuesta.`
      },
      {
        codigo: 'ACLARACION_POLIZA_DEFENSA',
        tipoAccion: 'DEFENSA_SUBSANACION',
        titulo: 'Subsanación de Aspectos Formales de la Póliza de Seriedad',
        causalRechazo: false,
        fundamentoLegal: 'Concepto C-1376 de 2025 de ANCP-CCE y Ley 1882 de 2018 Art. 5',
        resumen: 'Aclaración de recibos de pago o formalidades de la garantía expedida con anterioridad al cierre.',
        argumentoEstandar: `Constatado fehacientemente que la garantía de seriedad de la oferta fue expedida y entró en vigor antes de la fecha y hora de cierre del proceso, las presuntas falencias en el recibo de pago de la prima, errores tipográficos en el número del proceso o anexos de clausulado general constituyen defectos puramente formales y subsanables según el Concepto C-1376 de 2025. Se aporta la ratificación emitida por la compañía aseguradora donde se certifica que la propuesta se encuentra debidamente amparada.`,
        peticionEstandar: `Tener por subsanado el aspecto formal de la garantía de seriedad de la oferta y mantener en firme la calificación jurídica habilitante de nuestra propuesta.`
      }
    ];
  }

  /**
   * Genera el escrito formal de impugnación o subsanación en formato HTML
   */
  generarMemorialEvaluacionHtml({
    tipoAccion = 'IMPUGNACION_COMPETIDOR',
    proceso,
    oferente,
    competidor = null,
    causalCodigo,
    titulo,
    descripcionHechos,
    fundamentoJuridico,
    peticionConcreta,
    ciudad = 'Bogotá D.C.'
  }) {
    const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const esImpugnacion = tipoAccion === 'IMPUGNACION_COMPETIDOR';

    const asuntoTexto = esImpugnacion
      ? `OBSERVACIONES AL INFORME DE EVALUACIÓN: SOLICITUD FORMAL DE RECHAZO DE LA PROPUESTA DEL OFERENTE ${(competidor?.nombre || 'COMPETIDOR').toUpperCase()}`
      : `SUBSANACIÓN DOCUMENTAL AL INFORME DE EVALUACIÓN: RESPUESTA FORMAL A REQUERIMIENTO DE HABILITACIÓN`;

    const tituloMemorial = esImpugnacion
      ? `MEMORIAL DE OBSERVACIONES E IMPUGNACIÓN AL INFORME DE EVALUACIÓN`
      : `MEMORIAL FORMAL DE SUBSANACIÓN DOCUMENTAL`;

    const bloqueCompetidor = esImpugnacion && competidor
      ? `<div style="background: #f1f5f9; padding: 10px; border-left: 3px solid #e11d48; margin-bottom: 15px;">
           <b>PROPONENTE IMPUGNADO:</b> ${competidor.nombre}<br>
           <b>NIT / IDENTIFICACIÓN:</b> ${competidor.nit || 'No reportado'}<br>
           <b>CAUSAL INVOCADA:</b> ${titulo}
         </div>`
      : '';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${asuntoTexto}</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #111; margin: 40px; }
    h1 { font-size: 13pt; text-align: center; text-transform: uppercase; margin-bottom: 20px; font-weight: bold; }
    .fecha { text-align: right; margin-bottom: 25px; }
    .destinatario { margin-bottom: 20px; line-height: 1.4; }
    .referencia { margin-bottom: 20px; padding: 10px; background: #f8fafc; border-left: 3px solid #0f172a; }
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
    Comité Asesor y Evaluador de Contratación / Ordenador del Gasto<br>
    ${ciudad}
  </div>

  <div class="referencia">
    <b>PROCESO DE SELECCIÓN:</b> ${proceso.referencia || proceso.id}<br>
    <b>OBJETO:</b> ${proceso.objeto || 'Contratación estatal'}<br>
    <b>ASUNTO:</b> ${asuntoTexto}
  </div>

  <h1>${tituloMemorial}</h1>

  <div class="parrafo-legal">
    El suscrito, <b>${oferente.representante_legal || 'Representante Legal'}</b>, mayor de edad, identificado como aparece al pie de mi firma, en mi calidad de representante legal de la sociedad proponente <b>${oferente.razon_social}</b>, con NIT <b>${oferente.nit}</b>, encontrándome dentro del término legal y perentorio de traslado del informe preliminar de evaluación de ofertas (Artículo 5 de la Ley 1150 de 2007 y Artículo 5 de la Ley 1882 de 2018), me permito presentar ante ustedes el siguiente memorial formal de ${esImpugnacion ? 'impugnación y observaciones' : 'subsanación y aclaración'}:
  </div>

  ${bloqueCompetidor}

  <div class="seccion-titulo">I. HECHOS Y ANTECEDENTES RELEVANTES</div>
  <div class="parrafo-legal">
    ${descripcionHechos}
  </div>

  <div class="seccion-titulo">II. FUNDAMENTOS DE DERECHO Y DOCTRINA VINCULANTE ANCP-CCE</div>
  <div class="parrafo-legal">
    ${fundamentoJuridico}
  </div>

  <div class="cita-jurisprudencial">
    "El principio de selección objetiva consagrado en el artículo 24 y 29 de la Ley 80 de 1993 y el artículo 5 de la Ley 1150 de 2007 impone a la administración pública el deber inexcusable de verificar el acatamiento riguroso de las causales de rechazo. Conceder habilitaciones o permitir subsanaciones por fuera de los límites de la ley quebranta el principio de igualdad y vulnera la confianza legítima de los demás competidores."
  </div>

  <div class="seccion-titulo">III. PETICIÓN CONCRETA</div>
  <div class="parrafo-legal">
    Por las razones de orden legal, fáctico y probatorio anteriormente expuestas, solicitamos respetuosamente al Comité Asesor y Evaluador:
  </div>

  <div class="parrafo-legal">
    <b>PETICIÓN PRINCIPAL:</b> ${peticionConcreta}
  </div>

  <div class="parrafo-legal">
    Confiamos plenamente en que la administración ajustará su actuación a los mandatos estrictos de la Constitución Política y del Estatuto General de Contratación Pública, garantizando la prevalencia del interés general y la selección objetiva de la oferta más favorable.
  </div>

  <div class="firma">
    Atentamente,<br><br><br>
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
   * Compila el memorial en formato binario PDF (pdfkit)
   */
  async generarMemorialEvaluacionPdf({
    tipoAccion = 'IMPUGNACION_COMPETIDOR',
    proceso,
    oferente,
    competidor = null,
    titulo,
    descripcionHechos,
    fundamentoJuridico,
    peticionConcreta,
    ciudad = 'Bogotá D.C.'
  }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
        const buffers = [];

        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
        const esImpugnacion = tipoAccion === 'IMPUGNACION_COMPETIDOR';

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
        doc.font('Helvetica-Bold').text(esImpugnacion ? 'ASUNTO: IMPUGNACIÓN Y OBSERVACIONES AL INFORME DE EVALUACIÓN' : 'ASUNTO: SUBSANACIÓN DOCUMENTAL AL INFORME DE EVALUACIÓN');
        doc.moveDown(1.5);

        // Título del memorial
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text(
          esImpugnacion ? 'MEMORIAL FORMAL DE IMPUGNACIÓN AL INFORME DE EVALUACIÓN' : 'MEMORIAL FORMAL DE SUBSANACIÓN DOCUMENTAL',
          { align: 'center' }
        );
        doc.moveDown(1);

        if (esImpugnacion && competidor) {
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#be123c').text(`PROPONENTE OBJETO DE IMPUGNACIÓN: ${competidor.nombre} (NIT: ${competidor.nit || 'No reportado'})`);
          doc.font('Helvetica').text(`CAUSAL LEGAL: ${titulo}`);
          doc.moveDown(1);
        }

        // Cuerpo legal
        doc.fontSize(10).font('Helvetica').fillColor('#334155');
        doc.text(`El suscrito, en calidad de representante legal de ${oferente.razon_social} (NIT: ${oferente.nit}), dentro del término perentorio de traslado del informe de evaluación (Art. 5 Ley 1150/2007 y Art. 5 Ley 1882/2018), presenta formalmente el presente memorial:`);
        doc.moveDown(1);

        // I. Hechos
        doc.font('Helvetica-Bold').text('I. HECHOS Y ANTECEDENTES:');
        doc.font('Helvetica').text(descripcionHechos, { align: 'justify' });
        doc.moveDown(1);

        // II. Argumentos
        doc.font('Helvetica-Bold').text('II. FUNDAMENTOS JURÍDICOS Y DOCTRINA ANCP-CCE:');
        doc.font('Helvetica').text(fundamentoJuridico, { align: 'justify' });
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
   * Guarda un memorial en la base de datos
   */
  async guardarMemorial({
    procesoId,
    empresaId,
    tipoAccion,
    competidorNombre,
    competidorNit,
    causalCodigo,
    titulo,
    descripcionHechos,
    fundamentoJuridico,
    peticionConcreta,
    documentoGenerado
  }) {
    const res = await dbPostgres.query(`
      INSERT INTO impugnaciones_evaluacion
      (proceso_id, empresa_id, tipo_accion, competidor_nombre, competidor_nit, causal_codigo,
       titulo, descripcion_hechos, fundamento_juridico, peticion_concreta, documento_generado)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `, [
      procesoId,
      empresaId,
      tipoAccion,
      competidorNombre || null,
      competidorNit || null,
      causalCodigo,
      titulo,
      descripcionHechos,
      fundamentoJuridico,
      peticionConcreta,
      documentoGenerado
    ]);

    return res.rows[0];
  }

  /**
   * Lista el historial de impugnaciones y subsanaciones de un proceso
   */
  async listarMemoriales(procesoId) {
    const res = await dbPostgres.query(`
      SELECT i.*, e.razon_social as empresa_nombre
      FROM impugnaciones_evaluacion i
      LEFT JOIN empresas e ON e.id = i.empresa_id
      WHERE i.proceso_id = $1
      ORDER BY i.creado_en DESC;
    `, [procesoId]);

    return res.rows;
  }
}

module.exports = new EvaluationChallengeEngine();
