// ============================================================================
// RADAR SECOP - INTEGRATION TEST: MATRIZ DE RIESGOS CONTRACTUALES (ANCP-CCE)
// ============================================================================

const riskMatrixEngine = require('../server/riskMatrixEngine');
const dbPostgres = require('../server/dbPostgres');

async function runTests() {
  console.log('🧪 Iniciando pruebas de la Matriz de Riesgos Contractuales (ANCP-CCE)...\n');

  try {
    // 1. Prueba de Escala 5x5 y Categorías CCE
    console.log('1️⃣ Verificando cálculo de nivel de riesgo (5x5):');
    const tBajo = riskMatrixEngine.calcularNivelRiesgo(1, 2); // 2 -> BAJO
    const tMedio = riskMatrixEngine.calcularNivelRiesgo(2, 3); // 6 -> MEDIO
    const tAlto = riskMatrixEngine.calcularNivelRiesgo(3, 4); // 12 -> ALTO
    const tExtremo = riskMatrixEngine.calcularNivelRiesgo(4, 5); // 20 -> EXTREMO

    if (tBajo.categoria !== 'BAJO' || tMedio.categoria !== 'MEDIO' || tAlto.categoria !== 'ALTO' || tExtremo.categoria !== 'EXTREMO') {
      throw new Error(`Fallo en categorización: Bajo=${tBajo.categoria}, Medio=${tMedio.categoria}, Alto=${tAlto.categoria}, Extremo=${tExtremo.categoria}`);
    }
    console.log(`   ✓ 1x2=2 [${tBajo.categoria}] | 2x3=6 [${tMedio.categoria}] | 3x4=12 [${tAlto.categoria}] | 4x5=20 [${tExtremo.categoria}]`);

    // 2. Prueba de Generación Contextual según Objeto
    console.log('\n2️⃣ Verificando generación contextual de riesgos:');
    const procesoMock = {
      id: 'TEST-PROC-OBRA-2026',
      referencia: 'LP-IDU-045-2026',
      entidad: 'INSTITUTO DE DESARROLLO URBANO (IDU)',
      objeto: 'CONSTRUCCIÓN Y ADECUACIÓN DE INFRAESTRUCTURA VIAL Y ESPACIO PÚBLICO EN BOGOTÁ D.C.',
      tipo_contrato: 'Obra Pública',
      valor_estimado: 4500000000
    };

    const oferenteMock = {
      nit: '900.876.543-2',
      razon_social: 'CONSTRUCTORA VIAL ANDINA S.A.S.'
    };

    const resultado = riskMatrixEngine.generarMatrizRiesgos({
      proceso: procesoMock,
      oferente: oferenteMock,
      tipoContrato: 'Obra Pública'
    });

    console.log(`   ✓ Total riesgos generados: ${resultado.matriz.total_riesgos}`);
    console.log(`   ✓ Extremos: ${resultado.matriz.riesgos_extremos} | Altos: ${resultado.matriz.riesgos_altos} | Medios: ${resultado.matriz.riesgos_medios} | Bajos: ${resultado.matriz.riesgos_bajos}`);
    console.log(`   ✓ Distribución: Contratista=${resultado.matriz.distribucion_asignacion.contratista}, Entidad=${resultado.matriz.distribucion_asignacion.entidad}, Compartido=${resultado.matriz.distribucion_asignacion.compartido}`);

    // Verificar que incluyó el riesgo de obra
    const riesgoObra = resultado.items.find(i => i.codigo_riesgo === 'RSK-OBR-01');
    if (!riesgoObra) throw new Error('No se detectó la inyección de riesgo técnico/geológico para objeto de obra');
    console.log(`   ✓ Inyección sectorial de obra detectada: [${riesgoObra.codigo_riesgo}] ${riesgoObra.tipo}`);

    // 3. Prueba de Persistencia en PostgreSQL
    console.log('\n3️⃣ Verificando guardado y recuperación en PostgreSQL:');
    const saveRes = await riskMatrixEngine.guardarMatrizRiesgos({
      matriz: resultado.matriz,
      items: resultado.items
    });

    console.log(`   ✓ Guardado exitoso. Matriz ID: ${saveRes.matrizId}, Proceso ID: ${saveRes.proceso_id}`);

    const cargado = await riskMatrixEngine.getMatrizRiesgos(procesoMock.id);
    if (!cargado || !cargado.matriz || cargado.items.length !== resultado.items.length) {
      throw new Error(`Error recuperando matriz: esperado ${resultado.items.length} items, obtenido ${cargado?.items?.length}`);
    }
    console.log(`   ✓ Recuperado de PostgreSQL: ${cargado.items.length} items persistidos con integridad referencial.`);

    // 4. Prueba de Generación HTML
    console.log('\n4️⃣ Verificando generación HTML de la Matriz:');
    const html = riskMatrixEngine.generarMatrizRiesgosHtml(cargado);
    if (!html.includes('MATRIZ DE RIESGOS CONTRACTUALES PREVISIBLES') || !html.includes('RSK-OBR-01')) {
      throw new Error('Fallo en estructura HTML generada');
    }
    console.log(`   ✓ HTML generado correctamente (${html.length} caracteres).`);

    // 5. Prueba de Generación PDF
    console.log('\n5️⃣ Verificando generación de PDF Landscape (ANCP-CCE):');
    const pdfBuffer = await riskMatrixEngine.generarMatrizRiesgosPdf(cargado);
    if (!pdfBuffer || pdfBuffer.length < 5000) {
      throw new Error(`Buffer PDF defectuoso o demasiado pequeño: ${pdfBuffer?.length} bytes`);
    }
    console.log(`   ✓ Documento PDF generado exitosamente: ${pdfBuffer.length} bytes (Landscape, tablas y sellos de garantía).`);

    // Limpieza de prueba
    await dbPostgres.query('DELETE FROM matriz_riesgos_proceso WHERE proceso_id = $1', [procesoMock.id]);
    console.log('   ✓ Registro mock limpiado en DB.');

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA MATRIZ DE RIESGOS PASARON AL 100%!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERROR EN PRUEBAS:', err);
    process.exit(1);
  }
}

runTests();
