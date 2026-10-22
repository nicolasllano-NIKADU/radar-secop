/**
 * ====================================================================
 * RADAR SECOP - SUITE DE PRUEBAS DE ANÁLISIS DE PRECIOS UNITARIOS (APU)
 * Marco: Decreto 1082/2015 • Ley 1882/2018 • Pliegos Tipo ANCP-CCE
 * ====================================================================
 */

const engine = require('../server/apuEngine');
const dbPostgres = require('../server/dbPostgres');
const assert = require('assert');

async function runTestSuite() {
  console.log('======================================================================');
  console.log('🧪 INICIANDO TEST SUITE: ANÁLISIS DE PRECIOS UNITARIOS (APU) & DESBALANCE');
  console.log('   Marco: Decreto 1082/2015 Art. 2.2.1.1.2.2.4 • Ley 1882/2018 • Pliegos Tipo');
  console.log('======================================================================\n');

  // ---------------------------------------------------------
  // TEST 1: Clasificación de Desviaciones de Precios Unitarios
  // ---------------------------------------------------------
  console.log('--- TEST 1: Clasificación de Desviaciones de Precios Unitarios ---');
  const cNormal = engine.clasificarDesviacion(5.0);
  assert.strictEqual(cNormal.nivel, 'NORMAL');
  assert.strictEqual(cNormal.alerta, false);
  console.log('  ✅ Desviación +5.0% clasificada como NORMAL (sin alerta)');

  const cAlertaAlto = engine.clasificarDesviacion(18.0);
  assert.strictEqual(cAlertaAlto.nivel, 'ALERTA_SOBRECOSTO');
  assert.strictEqual(cAlertaAlto.alerta, true);
  console.log('  ✅ Desviación +18.0% clasificada como ALERTA_SOBRECOSTO');

  const cCriticoAlto = engine.clasificarDesviacion(32.0);
  assert.strictEqual(cCriticoAlto.nivel, 'CRITICO_SOBREPRECIO');
  assert.strictEqual(cCriticoAlto.alerta, true);
  console.log('  ✅ Desviación +32.0% clasificada como CRITICO_SOBREPRECIO (> +25%)');

  const cAlertaBajo = engine.clasificarDesviacion(-18.5);
  assert.strictEqual(cAlertaBajo.nivel, 'ALERTA_SUBVALORADO');
  assert.strictEqual(cAlertaBajo.alerta, true);
  console.log('  ✅ Desviación -18.5% clasificada como ALERTA_SUBVALORADO');

  const cCriticoBajo = engine.clasificarDesviacion(-30.0);
  assert.strictEqual(cCriticoBajo.nivel, 'CRITICO_PRECIO_BAJO');
  assert.strictEqual(cCriticoBajo.alerta, true);
  console.log('  ✅ Desviación -30.0% clasificada como CRITICO_PRECIO_BAJO (Decreto 1082)');

  // ---------------------------------------------------------
  // TEST 2: Liquidación de Costos Directos, AIU e IVA Art. 462-1 E.T.
  // ---------------------------------------------------------
  console.log('\n--- TEST 2: Liquidación Económica, AIU e IVA s/ Utilidad ---');
  const itemsBase = [
    { codigo: '1.1', descripcion: 'Localización y replanteo', unidad: 'M2', cantidad: 1000, fase: 'INICIAL', precio_unitario_oficial: 10000, precio_unitario_oferta: 10000 },
    { codigo: '2.1', descripcion: 'Concreto estructural', unidad: 'M3', cantidad: 100, fase: 'INTERMEDIA', precio_unitario_oficial: 500000, precio_unitario_oferta: 500000 },
    { codigo: '3.1', descripcion: 'Pintura y acabados', unidad: 'M2', cantidad: 1000, fase: 'FINAL', precio_unitario_oficial: 20000, precio_unitario_oferta: 20000 }
  ];

  // Total directo = (1000*10000) + (100*500000) + (1000*20000) = 10M + 50M + 20M = 80M
  const aiuCfg = { administracion_pct: 18, imprevistos_pct: 2, utilidad_pct: 5, tarifa_iva_utilidad_pct: 19 };
  const res1 = engine.analizarPresupuestoYDesbalance(itemsBase, aiuCfg);

  assert.strictEqual(res1.totales.total_oficial_directo, 80000000, 'Directo oficial debe ser 80.000.000');
  assert.strictEqual(res1.totales.total_oferta_directo, 80000000, 'Directo oferta debe ser 80.000.000');

  // AIU Total = 25% (18+2+5) => 80M * 0.25 = 20.000.000
  assert.strictEqual(res1.totales.aiu_oferta_cop, 20000000, 'AIU oferta (25%) debe ser 20.000.000');

  // IVA s/ Utilidad: Utilidad = 80M * 0.05 = 4.000.000. IVA (19%) = 4.000.000 * 0.19 = 760.000
  assert.strictEqual(res1.totales.iva_utilidad_oferta_cop, 760000, 'IVA especial 19% sobre Utilidad debe ser 760.000 COP');

  // Total con AIU e IVA = 80M + 20M + 760K = 100.760.000
  assert.strictEqual(res1.totales.total_oferta_con_aiu, 100760000, 'Total con AIU e IVA debe ser 100.760.000 COP');
  console.log(`  ✅ Directo: ${res1.totales.total_oferta_directo} | AIU (25%): ${res1.totales.aiu_oferta_cop} | IVA Utilidad (19%): ${res1.totales.iva_utilidad_oferta_cop} | Total: ${res1.totales.total_oferta_con_aiu}`);

  // ---------------------------------------------------------
  // TEST 3: Control y Detección de Front-Loading (Anticipo Encubierto)
  // ---------------------------------------------------------
  console.log('\n--- TEST 3: Detección Estricta de Front-Loading (Fase Inicial Inflada) ---');
  // Proponente infla la fase inicial en un 40% (PO: 10M, Oferta: 14M)
  const itemsFrontLoading = [
    { codigo: '1.1', descripcion: 'Campamento y cerramiento', unidad: 'GL', cantidad: 1, fase: 'INICIAL', precio_unitario_oficial: 10000000, precio_unitario_oferta: 14000000 },
    { codigo: '2.1', descripcion: 'Estructura metálica', unidad: 'KG', cantidad: 5000, fase: 'INTERMEDIA', precio_unitario_oficial: 10000, precio_unitario_oferta: 9200 },
    { codigo: '3.1', descripcion: 'Cielo raso y luminarias', unidad: 'M2', cantidad: 500, fase: 'FINAL', precio_unitario_oficial: 40000, precio_unitario_oferta: 40000 }
  ];

  const resFL = engine.analizarPresupuestoYDesbalance(itemsFrontLoading, aiuCfg);
  assert.strictEqual(resFL.front_loading.tiene_front_loading, true, 'Debe detectar front loading cuando ratio > 1.15');
  assert.ok(resFL.front_loading.front_loading_ratio >= 1.4, `Ratio debe ser 1.40, obtenido: ${resFL.front_loading.front_loading_ratio}`);
  console.log(`  ✅ Front-Loading detectado exitosamente: Ratio=${resFL.front_loading.front_loading_ratio} (${resFL.front_loading.alerta_detalle})`);

  // ---------------------------------------------------------
  // TEST 4: Alerta de Precio Artificialmente Bajo (Decreto 1082)
  // ---------------------------------------------------------
  console.log('\n--- TEST 4: Detección de Precios Artificialmente Bajos (< -25%) ---');
  const itemsBajos = [
    { codigo: '1.1', descripcion: 'Movimiento de tierras', unidad: 'M3', cantidad: 1000, fase: 'INICIAL', precio_unitario_oficial: 50000, precio_unitario_oferta: 32000 }, // -36%
    { codigo: '1.2', descripcion: 'Subbase granular', unidad: 'M3', cantidad: 500, fase: 'INICIAL', precio_unitario_oficial: 80000, precio_unitario_oferta: 50000 }, // -37.5%
    { codigo: '2.1', descripcion: 'Pavimento asfáltico', unidad: 'M3', cantidad: 200, fase: 'FINAL', precio_unitario_oficial: 600000, precio_unitario_oferta: 600000 }
  ];

  const resBajo = engine.analizarPresupuestoYDesbalance(itemsBajos, aiuCfg);
  assert.strictEqual(resBajo.resumen_auditoria.items_criticos_precio_bajo, 2);
  assert.strictEqual(resBajo.resumen_auditoria.estado_dictamen, 'ALERTA_PRECIO_BAJO');
  console.log(`  ✅ Detección Decreto 1082/2015: ${resBajo.resumen_auditoria.items_criticos_precio_bajo} ítems con precio artificialmente bajo. Dictamen: ${resBajo.resumen_auditoria.estado_dictamen}`);

  // ---------------------------------------------------------
  // TEST 5: Generación de Dictamen Oficial de APUs en PDF
  // ---------------------------------------------------------
  console.log('\n--- TEST 5: Generación de Dictamen Técnico en PDF ---');
  const pdfBuffer = await engine.generarDictamenApuPdf(res1, {
    referencia: 'LP-OBRA-2026-001',
    entidad: 'Instituto Nacional de Vías (INVIAS)',
    proponente: 'Consorcio Infraestructura Andina 2026'
  });

  assert.ok(Buffer.isBuffer(pdfBuffer), 'Debe retornar un Buffer binario');
  assert.ok(pdfBuffer.length > 2000, `El PDF debe tener contenido sustancial (> 2KB), tamaño: ${pdfBuffer.length} bytes`);
  assert.strictEqual(pdfBuffer.slice(0, 4).toString(), '%PDF', 'El archivo debe iniciar con la cabecera mágica %PDF');
  console.log(`  ✅ Dictamen PDF generado correctamente: ${pdfBuffer.length} bytes emitidos.`);

  // ---------------------------------------------------------
  // TEST 6: Persistencia y Consulta en PostgreSQL (analisis_apu_proceso)
  // ---------------------------------------------------------
  console.log('\n--- TEST 6: Persistencia y Consulta en PostgreSQL ---');
  const testRef = `TEST-APU-${Date.now()}`;
  const insertSql = `
    INSERT INTO analisis_apu_proceso (
      proceso_referencia, entidad, presupuesto_total_oficial,
      presupuesto_total_oferta, desviacion_global_pct, front_loading_ratio,
      items_analizados, aiu_config, estado_dictamen, resumen_alertas
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, proceso_referencia, estado_dictamen;
  `;

  const qInsert = await dbPostgres.query(insertSql, [
    testRef,
    'Gobernación de Antioquia',
    res1.totales.total_oficial_con_aiu,
    res1.totales.total_oferta_con_aiu,
    res1.totales.desviacion_global_pct,
    res1.front_loading.front_loading_ratio,
    JSON.stringify(res1.items),
    JSON.stringify(res1.aiu_desglose),
    res1.resumen_auditoria.estado_dictamen,
    JSON.stringify({
      total_oficial_directo: res1.totales.total_oficial_directo,
      total_oferta_directo: res1.totales.total_oferta_directo,
      concepto_juridico: res1.resumen_auditoria.concepto_juridico
    })
  ]);

  const insertedId = qInsert.rows[0].id;
  assert.ok(insertedId > 0, 'Debe retornar el ID autoincremental de PostgreSQL');
  console.log(`  ✅ Registro insertado en analisis_apu_proceso: ID #${insertedId} (Ref: ${testRef})`);

  const qSelect = await dbPostgres.query('SELECT * FROM analisis_apu_proceso WHERE id = $1', [insertedId]);
  assert.strictEqual(qSelect.rows.length, 1);
  assert.strictEqual(qSelect.rows[0].proceso_referencia, testRef);
  assert.strictEqual(qSelect.rows[0].estado_dictamen, 'EQUILIBRADO');
  console.log(`  ✅ Registro recuperado con integridad referencial: ${qSelect.rows[0].proceso_referencia} | ${qSelect.rows[0].estado_dictamen}`);

  // Limpieza de prueba
  await dbPostgres.query('DELETE FROM analisis_apu_proceso WHERE id = $1', [insertedId]);
  console.log(`  ✅ Limpieza de registro de prueba completada.`);

  console.log('\n======================================================================');
  console.log('🎉 TODOS LOS TESTS DE AUDITORÍA DE APUs Y DESBALANCE PASARON AL 100%');
  console.log('======================================================================\n');
}

runTestSuite()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error en suite de pruebas:', err);
    process.exit(1);
  });
