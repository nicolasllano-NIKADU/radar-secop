const evaluationChallengeEngine = require('../server/evaluationChallengeEngine');
const companyManager = require('../server/companyManager');
const dbPostgres = require('../server/dbPostgres');

async function runTest() {
  console.log('========================================================');
  console.log('🧪 TEST: INFORME DE EVALUACIÓN, SUBSANACIONES E IMPUGNACIONES');
  console.log('========================================================\n');

  try {
    const user = await companyManager.getOrCreateDefaultUser();
    const companies = await companyManager.getCompaniesByUser(user.id);
    const emp = companies[0] || { id: 1, razon_social: 'Oferente Colombia S.A.S.', nit: '900999888' };

    console.log(`🏢 Empresa evaluadora/defensora: ${emp.razon_social} (NIT: ${emp.nit})`);

    // 1. Catálogo Legal de Causales ANCP-CCE
    console.log('\n--- 1. CONSULTA DE CATÁLOGO LEGAL DE CAUSALES ---');
    const causales = evaluationChallengeEngine.getCatalogCausales();
    console.log(`📋 Total de causales jurídicas tipificadas: ${causales.length}`);
    causales.forEach((c, idx) => {
      console.log(`   ${idx + 1}. [${c.tipoAccion}] ${c.titulo}`);
      console.log(`      Fundamento: ${c.fundamentoLegal}`);
    });

    if (causales.length < 5) throw new Error('Catálogo de causales incompleto');

    // 2. Memorial de Impugnación de Competidor (Ataque por Póliza Extemporánea)
    console.log('\n--- 2. GENERACIÓN DE MEMORIAL DE IMPUGNACIÓN (ATAQUE A COMPETIDOR) ---');
    const mockProceso = {
      id: 'CO1.BDOS.EVAL.2026.01',
      referencia: 'LIC-2026-0099',
      entidad: 'Gobernación de Cundinamarca',
      objeto: 'Construcción y dotación de centro de salud'
    };

    const mockCompetidor = {
      nombre: 'CONSORCIO SALUD CUNDINAMARCA 2026',
      nit: '901.888.777-1'
    };

    const causalGarantia = causales.find(c => c.codigo === 'GARANTIA_EXTEMPORANEA');
    const hechosImpugnacion = `
      1. El cierre del proceso y presentación de ofertas estaba fijado perentoriamente para el día 15 de marzo de 2026 a las 10:00 a.m.
      2. Revisada la carátula de la póliza de seriedad aportada por el competidor en SECOP II, se constató que la hora de emisión por parte de la aseguradora fue las 10:47 a.m. del mismo día.
      3. El comité evaluador incurrió en error manifiesto al habilitar jurídicamente la propuesta bajo la consideración de que era un defecto subsanable.
    `;

    const htmlImpugnacion = evaluationChallengeEngine.generarMemorialEvaluacionHtml({
      tipoAccion: 'IMPUGNACION_COMPETIDOR',
      proceso: mockProceso,
      oferente: emp,
      competidor: mockCompetidor,
      causalCodigo: causalGarantia.codigo,
      titulo: causalGarantia.titulo,
      descripcionHechos: hechosImpugnacion,
      fundamentoJuridico: causalGarantia.argumentoEstandar,
      peticionConcreta: causalGarantia.peticionEstandar,
      ciudad: 'Bogotá D.C.'
    });

    console.log(`✅ Escrito de impugnación HTML generado (${htmlImpugnacion.length} caracteres)`);
    if (!htmlImpugnacion.includes('SOLICITUD FORMAL DE RECHAZO DE LA PROPUESTA DEL OFERENTE')) {
      throw new Error('El escrito de impugnación no contiene el encabezado de rechazo');
    }

    // 3. Memorial de Subsanación Documental (Defensa propia bajo Concepto C-431/2026)
    console.log('\n--- 3. GENERACIÓN DE MEMORIAL DE SUBSANACIÓN DOCUMENTAL (DEFENSA) ---');
    const causalDefensa = causales.find(c => c.codigo === 'REORGANIZACION_DOCUMENTAL_DEFENSA');
    const hechosSubsanacion = `
      1. En el informe preliminar de evaluación, la entidad calificó como "NO HABILITADO" el componente de experiencia al considerar que el contrato No. 120 de 2024 fue aportado en la carpeta de puntaje de calidad y no en la carpeta de experiencia básica.
      2. El contrato reposaba físicamente en el expediente electrónico de SECOP II antes del cierre.
      3. En aplicación del Concepto C-431 de 2026 de Colombia Compra Eficiente, se solicita la reorganización probatoria para computarlo como experiencia habilitante.
    `;

    const htmlSubsanacion = evaluationChallengeEngine.generarMemorialEvaluacionHtml({
      tipoAccion: 'DEFENSA_SUBSANACION',
      proceso: mockProceso,
      oferente: emp,
      causalCodigo: causalDefensa.codigo,
      titulo: causalDefensa.titulo,
      descripcionHechos: hechosSubsanacion,
      fundamentoJuridico: causalDefensa.argumentoEstandar,
      peticionConcreta: causalDefensa.peticionEstandar,
      ciudad: 'Bogotá D.C.'
    });

    console.log(`✅ Escrito de subsanación HTML generado (${htmlSubsanacion.length} caracteres)`);
    if (!htmlSubsanacion.includes('MEMORIAL FORMAL DE SUBSANACIÓN DOCUMENTAL')) {
      throw new Error('El escrito no contiene el encabezado de subsanación');
    }

    // 4. Compilación PDF Oficial
    console.log('\n--- 4. COMPILACIÓN DE MEMORIAL EN PDF BINARIO (PDFKIT) ---');
    const pdfBuffer = await evaluationChallengeEngine.generarMemorialEvaluacionPdf({
      tipoAccion: 'IMPUGNACION_COMPETIDOR',
      proceso: mockProceso,
      oferente: emp,
      competidor: mockCompetidor,
      titulo: causalGarantia.titulo,
      descripcionHechos: hechosImpugnacion,
      fundamentoJuridico: causalGarantia.argumentoEstandar,
      peticionConcreta: causalGarantia.peticionEstandar,
      ciudad: 'Bogotá D.C.'
    });

    console.log(`✅ Memorial PDF compilado exitosamente: ${pdfBuffer.length} bytes`);
    const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
    if (pdfHeader !== '%PDF-') throw new Error('El buffer generado no es un PDF válido');
    console.log(`📄 Encabezado validado: "${pdfHeader}"`);

    // 5. Persistencia en Base de Datos PostgreSQL
    console.log('\n--- 5. PERSISTENCIA EN TABLA impugnaciones_evaluacion ---');
    const saved = await evaluationChallengeEngine.guardarMemorial({
      procesoId: mockProceso.id,
      empresaId: emp.id,
      tipoAccion: 'IMPUGNACION_COMPETIDOR',
      competidorNombre: mockCompetidor.nombre,
      competidorNit: mockCompetidor.nit,
      causalCodigo: causalGarantia.codigo,
      titulo: causalGarantia.titulo,
      descripcionHechos: hechosImpugnacion,
      fundamentoJuridico: causalGarantia.argumentoEstandar,
      peticionConcreta: causalGarantia.peticionEstandar,
      documentoGenerado: htmlImpugnacion
    });
    console.log(`✅ Memorial guardado en DB con ID: ${saved.id}`);

    const list = await evaluationChallengeEngine.listarMemoriales(mockProceso.id);
    console.log(`📋 Total memoriales listados para el proceso: ${list.length}`);
    if (list.length === 0) throw new Error('No se recuperaron memoriales de la base de datos');

    console.log('\n========================================================');
    console.log('🎉 TODOS LOS TESTS DE EVALUACIÓN Y SUBSANACIONES CRUZADAS PASARON EXITOSAMENTE!');
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ Error en el test:', err);
    process.exit(1);
  } finally {
    await dbPostgres.pool.end();
  }
}

runTest();
