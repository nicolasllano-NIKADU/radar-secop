const scoringEngine = require('../server/scoringEngine');
const pliegoObservationsEngine = require('../server/pliegoObservationsEngine');
const companyManager = require('../server/companyManager');
const dbPostgres = require('../server/dbPostgres');

async function testSuite() {
  console.log('========================================================');
  console.log('🧪 TEST: MATRIZ DE 100 PUNTOS, DESEMPATES Y OBSERVACIONES AL PLIEGO');
  console.log('========================================================\n');

  try {
    const user = await companyManager.getOrCreateDefaultUser();
    const companies = await companyManager.getCompaniesByUser(user.id);
    const emp = companies[0] || { id: 1, razon_social: 'Proponente Test', nit: '900123456' };

    console.log(`🏢 Empresa evaluada: ${emp.razon_social} (NIT: ${emp.nit})`);

    // 1. Simulación de 100 Puntos
    console.log('\n--- 1. SIMULACIÓN DE MATRIZ DE PONDERACIÓN (100 PUNTOS) ---');
    const mockProcesoId = 'CO1.BDOS.TEST.PUNTOS.01';

    const puntajeRes = await scoringEngine.calcularPuntajeLicitacion({
      procesoId: mockProcesoId,
      empresaId: emp.id,
      precioOferta: 950000000,
      acreditaIndustriaNacional: true,
      esServicio: false,
      acreditaPersonalDiscapacidad: true,
      esEmpresaMujeres: true,
      calidadTecnicaPuntos: 18,
      ponderacionConfig: {
        presupuestoOficial: 1000000000
      }
    });

    console.log(`📊 Puntaje Total Calculado: ${puntajeRes.calificacion.puntajeTotal} / 100 pts`);
    console.log(`   - Oferta Económica: ${puntajeRes.calificacion.puntajeEconomico} pts`);
    console.log(`   - Industria Nacional (Ley 816): ${puntajeRes.calificacion.puntajeIndustriaNacional} pts`);
    console.log(`   - Factor Técnico / Calidad: ${puntajeRes.calificacion.puntajeCalidad} pts`);
    console.log(`   - Personal con Discapacidad (Dec. 392): ${puntajeRes.calificacion.puntajeDiscapacidad} pts`);
    console.log(`   - Enfoque de Género / Mujeres (Dec. 1860): ${puntajeRes.calificacion.puntajeMujeres} pts`);
    console.log(`🚦 Veredicto Competitivo: ${puntajeRes.calificacion.nivelBadge}`);

    if (puntajeRes.calificacion.puntajeTotal < 80) {
      throw new Error('Puntaje total fuera de rango esperado');
    }

    console.log('\n--- 2. SIMULADOR OFICIAL DE DESEMPATE (LEY 2069/2020 ART. 35) ---');
    console.log(`🛡️ Score de Blindaje ante Empates: ${puntajeRes.desempate.blindajeDesempateScore}%`);
    console.log(`⚖️ Dictamen: ${puntajeRes.desempate.diagnostico}`);
    puntajeRes.desempate.arbolDesempate.forEach(c => {
      console.log(`   [${c.aplica ? '✅ APLICA' : '⚪ NO APLICA'}] Regla ${c.orden}: ${c.criterio} (${c.fundamento})`);
    });

    // 2. Guardar Estrategia en DB
    console.log('\n--- 3. PERSISTENCIA DE ESTRATEGIA EN DB ---');
    const savedStrat = await scoringEngine.guardarEstrategiaPuntaje({
      proceso_id: mockProcesoId,
      empresa_id: emp.id,
      puntaje_economico: puntajeRes.calificacion.puntajeEconomico,
      puntaje_industria_nacional: puntajeRes.calificacion.puntajeIndustriaNacional,
      puntaje_discapacidad: puntajeRes.calificacion.puntajeDiscapacidad,
      puntaje_mipyme_mujeres: puntajeRes.calificacion.puntajeMujeres,
      puntaje_calidad_tecnica: puntajeRes.calificacion.puntajeCalidad,
      puntaje_total: puntajeRes.calificacion.puntajeTotal,
      criterios_desempate: puntajeRes.desempate
    });
    console.log(`✅ Estrategia guardada con ID: ${savedStrat.id} (Puntaje Total: ${savedStrat.puntaje_total})`);

    const loadedStrat = await scoringEngine.getEstrategiaPuntaje(mockProcesoId, emp.id);
    if (!loadedStrat || parseFloat(loadedStrat.puntaje_total) !== puntajeRes.calificacion.puntajeTotal) {
      throw new Error('Discrepancia en estrategia cargada de DB');
    }
    console.log('✅ Verificación de lectura DB correcta.');

    // 3. Detección de Cláusulas Impugnables
    console.log('\n--- 4. DETECCIÓN AUTOMÁTICA DE OBSERVACIONES AL PLIEGO ---');
    const mockMatrizBrechas = [
      {
        requisito: 'Índice de Liquidez',
        criterioExigido: '≥ 2.80',
        valorOferente: '1.85',
        resultado: 'NO_CUMPLE'
      },
      {
        requisito: 'Experiencia Específica (SMMLV)',
        criterioExigido: '≥ 1.200 SMMLV',
        valorOferente: '400 SMMLV',
        resultado: 'NO_CUMPLE'
      },
      {
        requisito: 'Garantía de Seriedad de la Oferta',
        criterioExigido: 'Póliza + Recibo de pago de prima antes del cierre',
        valorOferente: 'Póliza preexistente',
        resultado: 'SUBSANABLE'
      }
    ];

    const clausulas = pliegoObservationsEngine.detectarClausulasImpugnables({
      proceso: { id: mockProcesoId, referencia: mockProcesoId, entidad: 'Alcaldía Mayor de Bogotá' },
      matrizBrechas: mockMatrizBrechas
    });

    console.log(`🔍 Cláusulas impugnables detectadas: ${clausulas.length}`);
    clausulas.forEach((c, idx) => {
      console.log(`   ${idx + 1}. [${c.tipo}] ${c.titulo}`);
      console.log(`      Cláusula: "${c.clausula}"`);
      console.log(`      Petición: ${c.peticion}`);
    });

    if (clausulas.length < 3) {
      throw new Error('Detección insuficiente de cláusulas impugnables');
    }

    // 4. Generación de Memorial Formal de Observaciones (HTML y PDF)
    console.log('\n--- 5. GENERACIÓN DE MEMORIAL FORMAL (HTML Y PDF) ---');
    const obsTest = clausulas[0];
    const obsHtml = pliegoObservationsEngine.generarDocumentoObservacionHtml({
      proceso: { id: mockProcesoId, referencia: mockProcesoId, entidad: 'Alcaldía Mayor de Bogotá', objeto: 'Mantenimiento vial' },
      oferente: emp,
      titulo: obsTest.titulo,
      clausulaImpugnada: obsTest.clausula,
      argumentoJuridico: obsTest.argumento,
      peticionConcreta: obsTest.peticion,
      ciudad: 'Bogotá D.C.'
    });

    console.log(`✅ Escrito HTML generado (${obsHtml.length} caracteres)`);
    if (!obsHtml.includes('MEMORIAL DE OBSERVACIONES Y SOLICITUD DE MODIFICACIÓN')) {
      throw new Error('HTML de observaciones no contiene el título legal');
    }

    const obsPdf = await pliegoObservationsEngine.generarDocumentoObservacionPdf({
      proceso: { id: mockProcesoId, referencia: mockProcesoId, entidad: 'Alcaldía Mayor de Bogotá', objeto: 'Mantenimiento vial' },
      oferente: emp,
      titulo: obsTest.titulo,
      clausulaImpugnada: obsTest.clausula,
      argumentoJuridico: obsTest.argumento,
      peticionConcreta: obsTest.peticion,
      ciudad: 'Bogotá D.C.'
    });

    console.log(`✅ Memorial PDF compilado exitosamente: ${obsPdf.length} bytes`);
    const pdfHeader = obsPdf.slice(0, 5).toString('ascii');
    if (pdfHeader !== '%PDF-') {
      throw new Error('El buffer generado no es un PDF válido');
    }
    console.log(`📄 Encabezado PDF validado: "${pdfHeader}"`);

    // 5. Guardado en Historial DB
    console.log('\n--- 6. HISTORIAL DE OBSERVACIONES EN DB ---');
    const savedObs = await pliegoObservationsEngine.guardarObservacion({
      procesoId: mockProcesoId,
      empresaId: emp.id,
      tipoObservacion: 'BORRADOR',
      titulo: obsTest.titulo,
      clausulaImpugnada: obsTest.clausula,
      argumentoJuridico: obsTest.argumento,
      peticionConcreta: obsTest.peticion,
      documentoGenerado: obsHtml
    });
    console.log(`✅ Observación guardada en DB con ID: ${savedObs.id}`);

    const hist = await pliegoObservationsEngine.listarObservaciones(mockProcesoId);
    console.log(`📋 Total observaciones listadas en historial: ${hist.length}`);
    if (hist.length === 0) throw new Error('No se listaron observaciones de DB');

    console.log('\n========================================================');
    console.log('🎉 TODOS LOS TESTS DE PONDERACIÓN Y OBSERVACIONES PASARON EXITOSAMENTE!');
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ Error en el test:', err);
    process.exit(1);
  } finally {
    await dbPostgres.pool.end();
  }
}

testSuite();
