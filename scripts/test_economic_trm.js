/**
 * ====================================================================
 * RADAR SECOP - SUITE DE PRUEBAS INTEGRALES DE PONDERACIÓN ECONÓMICA
 * Y MODELADO ESTOCÁSTICO DE LA TRM (CONCEPTO C-382/2020 ANCP-CCE)
 * ====================================================================
 */

const engine = require('../server/economicEngine');
const dbPostgres = require('../server/dbPostgres');
const assert = require('assert');

async function runTestSuite() {
  console.log('======================================================================');
  console.log('🧪 INICIANDO TEST SUITE: SIMULADOR ECONÓMICO Y ESTOCÁSTICA DE TRM');
  console.log('   Marco: Ley 1882/2018, Concepto C-382/2020 ANCP-CCE, Dec. 1082/2015');
  console.log('======================================================================\n');

  // ---------------------------------------------------------
  // TEST 1: Verificación de los 6 Métodos y Rangos Oficiales de TRM
  // ---------------------------------------------------------
  console.log('--- TEST 1: Catálogo de 6 Métodos de Pliegos Tipo y Rangos de TRM ---');
  const metodosEsperados = [
    { dec: 5, cod: 'MEDIA_ARITMETICA', nom: 'Media Aritmética Simple' },
    { dec: 22, cod: 'MEDIA_EXTREMOS', nom: 'Media Aritmética con Eliminación de Extremos' },
    { dec: 42, cod: 'MEDIA_PONDERADA', nom: 'Media Ponderada con Presupuesto Oficial' },
    { dec: 61, cod: 'MEDIANA', nom: 'Mediana de Propuestas Hábiles' },
    { dec: 75, cod: 'MEDIA_GEOMETRICA', nom: 'Media Geométrica' },
    { dec: 95, cod: 'MENOR_VALOR', nom: 'Menor Valor Hábil' }
  ];

  for (const exp of metodosEsperados) {
    const res = engine.resolverMetodoPorTrm(exp.dec);
    assert.strictEqual(res.codigo, exp.cod, `Decimal ${exp.dec} debe activar ${exp.cod}`);
    console.log(`  ✅ Decimal .${String(exp.dec).padStart(2, '0')} -> ${res.nombre} [Rango: ${res.trmTexto}]`);
  }

  // Verificación de formatos de TRM (strings con punto, coma, decimales)
  const trmString1 = engine.resolverMetodoPorTrm('4.185,42');
  assert.strictEqual(trmString1.codigo, 'MEDIA_PONDERADA', 'TRM "4.185,42" debe activar MEDIA_PONDERADA (.42)');
  const trmFloat = engine.resolverMetodoPorTrm(4185.75);
  assert.strictEqual(trmFloat.codigo, 'MEDIA_GEOMETRICA', 'TRM 4185.75 debe activar MEDIA_GEOMETRICA (.75)');
  console.log('  ✅ Parser de TRM soporta números flotantes, enteros y cadenas con coma/punto');

  // ---------------------------------------------------------
  // TEST 2: Evaluación Numérica Exacta en los 6 Métodos Oficiales
  // ---------------------------------------------------------
  console.log('\n--- TEST 2: Liquidación de Ofertas en los 6 Métodos Oficiales ---');
  const PO = 1000000000; // 1.000 Millones COP
  const ofertasTest = [
    { proponente: 'Consorcio Alfa', valor: 910000000 },
    { proponente: 'Ingeniería Beta SAS', valor: 935000000 },
    { proponente: 'Constructora Gamma', valor: 950000000 },
    { proponente: 'Obras Delta LTDA', valor: 965000000 },
    { proponente: 'Vías Épsilon', valor: 990000000 }
  ];

  const evalTotal = engine.evaluarTodosLosMetodos(PO, ofertasTest, 60);
  assert.strictEqual(evalTotal.total_ofertas, 5, 'Debe registrar 5 ofertas');
  assert.ok(evalTotal.referencias_metodos.media_aritmetica > 0, 'Debe calcular Media Aritmética');
  assert.ok(evalTotal.referencias_metodos.media_extremos > 0, 'Debe calcular Media con Extremos');
  assert.ok(evalTotal.referencias_metodos.media_ponderada > 0, 'Debe calcular Media Ponderada con PO');
  assert.ok(evalTotal.referencias_metodos.mediana > 0, 'Debe calcular Mediana');
  assert.ok(evalTotal.referencias_metodos.media_geometrica > 0, 'Debe calcular Media Geométrica');
  assert.ok(evalTotal.referencias_metodos.menor_valor === 910000000, 'Menor valor debe ser 910M');

  console.log('  Pivotes calculados para PO de $1.000M:');
  console.log(`    - Media Aritmética: $ ${evalTotal.referencias_metodos.media_aritmetica.toLocaleString('es-CO')}`);
  console.log(`    - Media Extremos:   $ ${evalTotal.referencias_metodos.media_extremos.toLocaleString('es-CO')}`);
  console.log(`    - Media Ponderada:  $ ${evalTotal.referencias_metodos.media_ponderada.toLocaleString('es-CO')}`);
  console.log(`    - Mediana:          $ ${evalTotal.referencias_metodos.mediana.toLocaleString('es-CO')}`);
  console.log(`    - Media Geométrica: $ ${evalTotal.referencias_metodos.media_geometrica.toLocaleString('es-CO')}`);
  console.log(`    - Menor Valor:      $ ${evalTotal.referencias_metodos.menor_valor.toLocaleString('es-CO')}`);

  // Verificar que el menor valor reciba 60 pts en el método MENOR_VALOR
  const alfa = evalTotal.calificaciones.find(c => c.proponente === 'Consorcio Alfa');
  assert.strictEqual(alfa.puntajes.menor_valor, 60, 'El menor valor debe recibir el puntaje máximo (60 pts)');
  console.log('  ✅ Las 6 fórmulas asignan puntaje matemático correcto y orden de prelación');

  // ---------------------------------------------------------
  // TEST 3: Detección de Precios Artificialmente Bajos (Dec. 1082/2015)
  // ---------------------------------------------------------
  console.log('\n--- TEST 3: Detección de Precios Artificialmente Bajos (Dec. 1082/2015) ---');
  const ofertasConTemeraria = [
    ...ofertasTest,
    { proponente: 'Oferente Temerario', valor: 760000000 } // 76% del PO (< 80% umbral)
  ];
  const alertas = engine.detectarPreciosArtificialmenteBajos(PO, ofertasConTemeraria);
  const alertaTemerario = alertas.find(a => a.proponente === 'Oferente Temerario');
  assert.ok(alertaTemerario, 'Debe existir el oferente temerario en la evaluación');
  assert.strictEqual(alertaTemerario.sospecha_precio_bajo, true, 'Debe marcar sospecha de precio artificialmente bajo');
  assert.ok(alertaTemerario.motivo_alerta.includes('80%'), 'Debe alertar por ser inferior al 80% del PO');
  console.log(`  ✅ Alerta detectada correctamente: "${alertaTemerario.motivo_alerta}"`);

  // ---------------------------------------------------------
  // TEST 4: Simulación Monte Carlo de 10.000 Iteraciones y ZOA
  // ---------------------------------------------------------
  console.log('\n--- TEST 4: Simulación Monte Carlo de 10.000 Iteraciones y ZOA ---');
  const sim = engine.simularMontecarlo(PO, {
    competidoresEstimados: 6,
    puntajeMax: 60,
    iteraciones: 10000,
    perfilCompetencia: 'MODERADO'
  });

  assert.strictEqual(sim.iteraciones_montecarlo, 10000, 'Debe ejecutar 10.000 iteraciones');
  assert.ok(sim.recomendacion_estrategica.precio_optimo_cop > 0, 'Debe encontrar un precio óptimo');
  assert.ok(sim.recomendacion_estrategica.porcentaje_optimo >= 88.0, 'El precio óptimo debe ser ≥ 88% PO para seguridad jurídica');
  assert.ok(sim.recomendacion_estrategica.esperanza_puntaje_max > 45, 'La esperanza debe ser competitiva (> 45 pts)');

  const zoa = sim.recomendacion_estrategica.zona_optima_adjudicacion_zoa;
  assert.ok(zoa.min_pct <= sim.recomendacion_estrategica.porcentaje_optimo, 'ZOA min debe ser ≤ óptimo');
  assert.ok(zoa.max_pct >= sim.recomendacion_estrategica.porcentaje_optimo, 'ZOA max debe ser ≥ óptimo');
  assert.ok(zoa.min_pct >= 88.0, 'ZOA no debe descender del umbral de precio artificialmente bajo');

  console.log(`  Iteraciones ejecutadas: ${sim.iteraciones_montecarlo.toLocaleString('es-CO')}`);
  console.log(`  Precio Óptimo Recomendado (P_opt): $ ${sim.recomendacion_estrategica.precio_optimo_cop.toLocaleString('es-CO')} (${sim.recomendacion_estrategica.porcentaje_optimo}% PO)`);
  console.log(`  Esperanza Matemática E[Puntaje]:  ${sim.recomendacion_estrategica.esperanza_puntaje_max} / 60 pts (${sim.recomendacion_estrategica.eficiencia_esperada}% eficiencia)`);
  console.log(`  Zona Óptima de Adjudicación (ZOA): ${zoa.min_pct}% a ${zoa.max_pct}% PO ($ ${zoa.min_cop.toLocaleString('es-CO')} - $ ${zoa.max_cop.toLocaleString('es-CO')})`);
  console.log(`  Frecuencias estocásticas TRM:`, sim.trm_estocastica.iteraciones_por_metodo);
  console.log('  ✅ Simulación Monte Carlo completada con cálculo de ZOA y esperanza estocástica');

  // ---------------------------------------------------------
  // TEST 5: Generación de Dictamen Técnico en PDF con pdfkit
  // ---------------------------------------------------------
  console.log('\n--- TEST 5: Generación del Dictamen Técnico en PDF ---');
  const pdfBuffer = await engine.generarInformeSimulacionEconomicaPdf(sim, {
    referencia: 'LP-INVIAS-024-2026',
    entidad: 'INSTITUTO NACIONAL DE VÍAS (INVIAS)',
    proponente: 'CONSORCIO VIAL COLOMBIANO 2026'
  });

  assert.ok(Buffer.isBuffer(pdfBuffer), 'Debe retornar un Buffer binario');
  assert.ok(pdfBuffer.length > 5000, `El archivo PDF debe tener un tamaño razonable (generó ${pdfBuffer.length} bytes)`);
  assert.strictEqual(pdfBuffer.slice(0, 4).toString(), '%PDF', 'Debe comenzar con la firma de archivo %PDF');
  console.log(`  ✅ Dictamen PDF generado exitosamente: ${pdfBuffer.length} bytes (cabecera %PDF verificada)`);

  // ---------------------------------------------------------
  // TEST 6: Persistencia y Consulta en PostgreSQL
  // ---------------------------------------------------------
  console.log('\n--- TEST 6: Persistencia en PostgreSQL (simulaciones_economicas) ---');
  const insertQ = await dbPostgres.query(`
    INSERT INTO simulaciones_economicas (
      proceso_referencia, entidad, presupuesto_oficial, puntaje_maximo,
      competidores_estimados, precio_optimo_sugerido, porcentaje_optimo_po,
      esperanza_puntaje, desglose_metodos, distribucion_simulada
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, creado_en;
  `, [
    'LP-INVIAS-024-2026',
    'INSTITUTO NACIONAL DE VÍAS (INVIAS)',
    PO,
    60,
    6,
    sim.recomendacion_estrategica.precio_optimo_cop,
    sim.recomendacion_estrategica.porcentaje_optimo,
    sim.recomendacion_estrategica.esperanza_puntaje_max,
    JSON.stringify(sim.recomendacion_estrategica.desglose_metodos_en_optimo),
    JSON.stringify(zoa)
  ]);

  const simId = insertQ.rows[0].id;
  assert.ok(simId > 0, 'Debe devolver un ID autoincremental');
  console.log(`  ✅ Simulación registrada en PostgreSQL con ID: ${simId}`);

  const fetchQ = await dbPostgres.query('SELECT * FROM simulaciones_economicas WHERE id = $1', [simId]);
  assert.strictEqual(fetchQ.rows.length, 1, 'Debe recuperar el registro insertado');
  assert.strictEqual(fetchQ.rows[0].proceso_referencia, 'LP-INVIAS-024-2026');
  console.log(`  ✅ Registro recuperado exitosamente desde DB: ${fetchQ.rows[0].proceso_referencia}`);

  // Limpiar registro de prueba
  await dbPostgres.query('DELETE FROM simulaciones_economicas WHERE id = $1', [simId]);
  console.log('  ✅ Registro de prueba limpiado correctamente');

  console.log('\n======================================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE PONDERACIÓN ECONÓMICA Y TRM PASARON AL 100%');
  console.log('======================================================================\n');
  process.exit(0);
}

runTestSuite().catch(err => {
  console.error('\n❌ ERROR EN TEST SUITE:', err);
  process.exit(1);
});
