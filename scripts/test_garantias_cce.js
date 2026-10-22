/**
 * ====================================================================
 * RADAR SECOP - SUITE DE PRUEBAS DE VERIFICACIÓN DE GARANTÍAS Y PÓLIZAS
 * Marco: Decreto 1082/2015 • Ley 80/1993 • Pliegos Tipo ANCP-CCE
 * ====================================================================
 */

const engine = require('../server/garantiasEngine');
const dbPostgres = require('../server/dbPostgres');
const assert = require('assert');

async function runTestSuite() {
  console.log('======================================================================');
  console.log('🧪 INICIANDO TEST SUITE: MATRIZ DE GARANTÍAS Y PÓLIZAS CCE');
  console.log('   Marco: Decreto 1082/2015 • Ley 80/1993 • Ley 1150/2007 • Pliegos Tipo');
  console.log('======================================================================\n');

  // ---------------------------------------------------------
  // TEST 1: Catálogo de 6 Amparos Reglamentarios
  // ---------------------------------------------------------
  console.log('--- TEST 1: Catálogo Maestro de Amparos Decreto 1082/2015 ---');
  const catalogo = engine.CATALOGO_AMPAROS;
  const amparosEsperados = [
    'SERIEDAD_OFERTA',
    'CUMPLIMIENTO_CONTRATO',
    'BUEN_MANEJO_ANTICIPO',
    'PAGO_SALARIOS_PRESTACIONES',
    'ESTABILIDAD_CALIDAD_OBRA',
    'RESPONSABILIDAD_CIVIL_EXTRACONTRACTUAL'
  ];

  for (const cod of amparosEsperados) {
    assert.ok(catalogo[cod], `Debe existir el amparo reglamentario ${cod}`);
    console.log(`  ✅ [${cod}] ${catalogo[cod].nombre} (${catalogo[cod].fundamentoLegal})`);
  }

  // ---------------------------------------------------------
  // TEST 2: Cálculo de Requisitos para Proceso de Obra ($2.500M COP)
  // ---------------------------------------------------------
  console.log('\n--- TEST 2: Liquidación de Requisitos Reglamentarios CCE ---');
  const PO = 2500000000; // 2.500 Millones COP
  const PLAZO_MESES = 12;
  const ANTICIPO_PCT = 30; // 30% anticipo = 750M
  const fechaHoy = new Date();

  const reqs = engine.calcularRequisitosObligatorios({
    presupuestoOficial: PO,
    valorContrato: PO,
    plazoMeses: PLAZO_MESES,
    anticipoPorcentaje: ANTICIPO_PCT,
    tipoProceso: 'OBRA_PUBLICA',
    fechaBase: fechaHoy
  });

  assert.ok(reqs.amparos_requeridos.length === 6, 'Debe generar los 6 amparos');

  // Validaciones cuantitativas exactas
  const aSeriedad = reqs.amparos_requeridos.find(a => a.codigo === 'SERIEDAD_OFERTA');
  assert.strictEqual(aSeriedad.valor_minimo_cop, 250000000, 'Seriedad debe ser 10% de 2.500M = 250M');
  assert.strictEqual(aSeriedad.dias_minimos, 90, 'Seriedad debe exigir 90 días calendario');

  const aCumplimiento = reqs.amparos_requeridos.find(a => a.codigo === 'CUMPLIMIENTO_CONTRATO');
  assert.strictEqual(aCumplimiento.valor_minimo_cop, 500000000, 'Cumplimiento en obra debe ser 20% de 2.500M = 500M');

  const aAnticipo = reqs.amparos_requeridos.find(a => a.codigo === 'BUEN_MANEJO_ANTICIPO');
  assert.strictEqual(aAnticipo.valor_minimo_cop, 750000000, 'Buen manejo debe ser 100% del anticipo = 750M');

  const aSalarios = reqs.amparos_requeridos.find(a => a.codigo === 'PAGO_SALARIOS_PRESTACIONES');
  assert.strictEqual(aSalarios.valor_minimo_cop, 250000000, 'Salarios en obra debe ser 10% = 250M');

  const aEstabilidad = reqs.amparos_requeridos.find(a => a.codigo === 'ESTABILIDAD_CALIDAD_OBRA');
  assert.strictEqual(aEstabilidad.valor_minimo_cop, 250000000, 'Estabilidad de obra civil debe ser 10% = 250M');

  const aRce = reqs.amparos_requeridos.find(a => a.codigo === 'RESPONSABILIDAD_CIVIL_EXTRACONTRACTUAL');
  assert.ok(aRce.valor_minimo_cop >= 569400000, 'RCE debe respetar piso de 400 SMMLV para cuantías > 1.500M');

  console.log(`  Presupuesto Oficial: $ ${PO.toLocaleString('es-CO')} COP`);
  console.log(`    - Seriedad de la Oferta:      $ ${aSeriedad.valor_minimo_cop.toLocaleString('es-CO')} (${aSeriedad.porcentaje_exigido}%)`);
  console.log(`    - Cumplimiento de Contrato:   $ ${aCumplimiento.valor_minimo_cop.toLocaleString('es-CO')} (${aCumplimiento.porcentaje_exigido}%)`);
  console.log(`    - Buen Manejo del Anticipo:   $ ${aAnticipo.valor_minimo_cop.toLocaleString('es-CO')} (100% Anticipo)`);
  console.log(`    - Salarios y Prestaciones:    $ ${aSalarios.valor_minimo_cop.toLocaleString('es-CO')} (${aSalarios.porcentaje_exigido}%)`);
  console.log(`    - Estabilidad de la Obra:     $ ${aEstabilidad.valor_minimo_cop.toLocaleString('es-CO')} (5 años C.C.)`);
  console.log(`    - Responsabilidad Civil (RCE):$ ${aRce.valor_minimo_cop.toLocaleString('es-CO')} (Piso SMMLV)`);
  console.log('  ✅ Requisitos reglamentarios calculados matemáticamente exactos');

  // ---------------------------------------------------------
  // TEST 3: Detección de Déficit de Valor Asegurado
  // ---------------------------------------------------------
  console.log('\n--- TEST 3: Detección de Déficit en Valor Asegurado ---');
  const polizasConDeficitValor = [
    {
      tipo_amparo: 'SERIEDAD_OFERTA',
      valor_asegurado: 150000000, // Deficitario: 150M < 250M (Faltan 100M)
      fecha_fin: aSeriedad.fecha_fin_requerida,
      aseguradora: 'Aseguradora Alfa'
    }
  ];

  const evalDeficitValor = engine.evaluarSuficienciaGarantias(reqs, polizasConDeficitValor);
  const itemDeficitValor = evalDeficitValor.amparos.find(a => a.codigo === 'SERIEDAD_OFERTA');
  assert.strictEqual(itemDeficitValor.cumple_valor, false, 'No debe cumplir en valor asegurado');
  assert.strictEqual(itemDeficitValor.deficit_cop, 100000000, 'El déficit debe ser exactamente $100M');
  assert.strictEqual(itemDeficitValor.estado, 'DEFICIT_VALOR');
  console.log(`  ✅ Déficit de valor detectado: Faltan $ ${itemDeficitValor.deficit_cop.toLocaleString('es-CO')} COP en Seriedad.`);

  // ---------------------------------------------------------
  // TEST 4: Detección de Déficit en Vigencia Temporal
  // ---------------------------------------------------------
  console.log('\n--- TEST 4: Detección de Déficit en Vigencia Temporal ---');
  const fechaCorta = new Date(fechaHoy);
  fechaCorta.setDate(fechaCorta.getDate() + 60); // 60 días (se exigen 90 días)

  const polizasConDeficitVigencia = [
    {
      tipo_amparo: 'SERIEDAD_OFERTA',
      valor_asegurado: 250000000, // Valor completo
      fecha_fin: fechaCorta.toISOString().slice(0, 10), // Vigencia corta
      aseguradora: 'Aseguradora Beta'
    }
  ];

  const evalDeficitVigencia = engine.evaluarSuficienciaGarantias(reqs, polizasConDeficitVigencia);
  const itemDeficitVigencia = evalDeficitVigencia.amparos.find(a => a.codigo === 'SERIEDAD_OFERTA');
  assert.strictEqual(itemDeficitVigencia.cumple_vigencia, false, 'No debe cumplir en vigencia temporal');
  assert.strictEqual(itemDeficitVigencia.estado, 'DEFICIT_VIGENCIA');
  assert.ok(itemDeficitVigencia.dias_margen_vigencia < 0, 'El margen de días debe ser negativo');
  console.log(`  ✅ Déficit de vigencia detectado: Faltan ${Math.abs(itemDeficitVigencia.dias_margen_vigencia)} días para completar los 90 días.`);

  // ---------------------------------------------------------
  // TEST 5: Verificación 100% Conforme (Aprobación Plena)
  // ---------------------------------------------------------
  console.log('\n--- TEST 5: Verificación Conforme al 100% (Aprobación Plena) ---');
  const polizasConformes = reqs.amparos_requeridos.map(r => ({
    tipo_amparo: r.codigo,
    codigo: r.codigo,
    valor_asegurado: r.valor_minimo_cop,
    fecha_fin: r.fecha_fin_requerida,
    aseguradora: 'Seguros del Estado S.A.',
    numero_poliza: 'POL-1082-2026-OK'
  }));

  const evalPlena = engine.evaluarSuficienciaGarantias(reqs, polizasConformes);
  assert.strictEqual(evalPlena.resumen_auditoria.veredicto_global, 'APROBADO_CONFORME');
  assert.strictEqual(evalPlena.resumen_auditoria.porcentaje_cumplimiento, 100);
  assert.strictEqual(evalPlena.resumen_auditoria.amparos_con_deficit, 0);
  console.log(`  Veredicto: ${evalPlena.resumen_auditoria.veredicto_global}`);
  console.log(`  Suficiencia: ${evalPlena.resumen_auditoria.porcentaje_cumplimiento}% Conforme`);
  console.log('  ✅ Todos los amparos evaluados como CONFORME bajo Decreto 1082/2015');

  // ---------------------------------------------------------
  // TEST 6: Generación de Dictamen Técnico Oficial en PDF
  // ---------------------------------------------------------
  console.log('\n--- TEST 6: Generación de Dictamen Técnico Oficial en PDF ---');
  const pdfBuffer = await engine.generarDictamenGarantiasPdf(evalPlena, {
    referencia: 'LP-INVIAS-OBRA-088-2026',
    entidad: 'INSTITUTO NACIONAL DE VÍAS (INVIAS)',
    proponente: 'CONSORCIO VIAL COLOMBIA 2026'
  });

  assert.ok(Buffer.isBuffer(pdfBuffer), 'Debe ser un Buffer binario');
  assert.ok(pdfBuffer.length > 4000, `Debe tener tamaño razonable (generó ${pdfBuffer.length} bytes)`);
  assert.strictEqual(pdfBuffer.slice(0, 4).toString(), '%PDF', 'Debe comenzar con la firma %PDF');
  console.log(`  ✅ Dictamen PDF generado exitosamente: ${pdfBuffer.length} bytes (Cabecera %PDF verificada)`);

  // ---------------------------------------------------------
  // TEST 7: Persistencia y Consulta en PostgreSQL
  // ---------------------------------------------------------
  console.log('\n--- TEST 7: Persistencia en PostgreSQL (matriz_garantias_verificacion) ---');
  const insertQ = await dbPostgres.query(`
    INSERT INTO matriz_garantias_verificacion (
      proceso_referencia, entidad, presupuesto_oficial, valor_oferta_contrato,
      plazo_ejecucion_meses, anticipo_porcentaje, estado_global,
      puntaje_cumplimiento, amparos_items, observaciones_juridicas
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, creado_en;
  `, [
    'LP-INVIAS-OBRA-088-2026',
    'INSTITUTO NACIONAL DE VÍAS (INVIAS)',
    PO,
    PO,
    PLAZO_MESES,
    ANTICIPO_PCT,
    evalPlena.resumen_auditoria.veredicto_global,
    evalPlena.resumen_auditoria.porcentaje_cumplimiento,
    JSON.stringify(evalPlena.amparos),
    evalPlena.resumen_auditoria.concepto_juridico
  ]);

  const registroId = insertQ.rows[0].id;
  assert.ok(registroId > 0, 'Debe devolver ID generado');
  console.log(`  ✅ Registro insertado en PostgreSQL con ID: ${registroId}`);

  const fetchQ = await dbPostgres.query('SELECT * FROM matriz_garantias_verificacion WHERE id = $1', [registroId]);
  assert.strictEqual(fetchQ.rows.length, 1);
  assert.strictEqual(fetchQ.rows[0].proceso_referencia, 'LP-INVIAS-OBRA-088-2026');
  console.log(`  ✅ Verificación recuperada desde base de datos: Estado ${fetchQ.rows[0].estado_global}`);

  // Limpiar registro de prueba
  await dbPostgres.query('DELETE FROM matriz_garantias_verificacion WHERE id = $1', [registroId]);
  console.log('  ✅ Registro de prueba limpiado correctamente');

  console.log('\n======================================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE VERIFICACIÓN DE GARANTÍAS PASARON AL 100%');
  console.log('======================================================================\n');
  process.exit(0);
}

runTestSuite().catch(err => {
  console.error('\n❌ ERROR EN TEST SUITE DE GARANTÍAS:', err);
  process.exit(1);
});
