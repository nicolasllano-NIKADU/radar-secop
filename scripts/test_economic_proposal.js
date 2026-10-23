/**
 * ====================================================================
 * RADAR SECOP - SUITE DE PRUEBAS DE SOBRES Y PROPUESTAS ECONÓMICAS
 * Marco: Ley 80/1993 • Ley 1150/2007 • Ley 1882/2018 • Pliegos Tipo ANCP-CCE
 * ====================================================================
 */

const engine = require('../server/economicProposalEngine');
const dbPostgres = require('../server/dbPostgres');
const ExcelJS = require('exceljs');
const assert = require('assert');

async function runTestSuite() {
  console.log('======================================================================');
  console.log('🧪 INICIANDO TEST SUITE: GENERADOR DE SOBRES Y OFERTAS ECONÓMICAS CCE');
  console.log('   Marco: Ley 80/1993 • Ley 1882/2018 • Art. 462-1 E.T. • Pliegos Tipo');
  console.log('======================================================================\n');

  // ---------------------------------------------------------
  // TEST 1: Conversión Rigurosa de Números a Letras en Español
  // ---------------------------------------------------------
  console.log('--- TEST 1: Conversión Jurídica de Números a Letras (Pesos M/Cte) ---');
  const t1 = engine.numeroALetras(2500000000);
  assert.strictEqual(t1, 'DOS MIL QUINIENTOS MILLONES DE PESOS M/CTE');
  console.log(`  ✅ $2.500.000.000 -> "${t1}"`);

  const t2 = engine.numeroALetras(100760000);
  assert.strictEqual(t2, 'CIEN MILLONES SETECIENTOS SESENTA MIL PESOS M/CTE');
  console.log(`  ✅ $100.760.000 -> "${t2}"`);

  const t3 = engine.numeroALetras(1000000);
  assert.strictEqual(t3, 'UN MILLÓN DE PESOS M/CTE');
  console.log(`  ✅ $1.000.000 -> "${t3}"`);

  const t4 = engine.numeroALetras(15234500);
  assert.strictEqual(t4, 'QUINCE MILLONES DOSCIENTOS TREINTA Y CUATRO MIL QUINIENTOS PESOS M/CTE');
  console.log(`  ✅ $15.234.500 -> "${t4}"`);

  const t5 = engine.numeroALetras(0);
  assert.strictEqual(t5, 'CERO PESOS M/CTE');
  console.log(`  ✅ $0 -> "${t5}"`);

  // ---------------------------------------------------------
  // TEST 2: Liquidación de Propuesta Económica con AIU e IVA
  // ---------------------------------------------------------
  console.log('\n--- TEST 2: Liquidación Económica, AIU e IVA Art. 462-1 E.T. ---');
  const itemsOferta = [
    { codigo: '1.1', descripcion: 'Localización y replanteo', unidad: 'M2', cantidad: 2000, fase: 'INICIAL', precio_unitario: 10000 },
    { codigo: '2.1', descripcion: 'Concreto zapatas 3000 PSI', unidad: 'M3', cantidad: 100, fase: 'INTERMEDIA', precio_unitario: 500000 },
    { codigo: '3.1', descripcion: 'Pintura y aseo final', unidad: 'GL', cantidad: 1, fase: 'FINAL', precio_unitario: 30000000 }
  ];
  // Subtotal directo = 20M + 50M + 30M = 100.000.000 COP

  const liq = engine.liquidarPropuesta({
    items: itemsOferta,
    aiuConfig: { administracion_pct: 18, imprevistos_pct: 2, utilidad_pct: 5, tarifa_iva_utilidad_pct: 19 },
    proceso: { referencia: 'LP-OBRA-2026-99', entidad: 'INVIAS', objeto: 'Pavimentación vía rural' },
    oferente: { razon_social: 'CONSTRUCTORA COLOMBIANA S.A.S.', nit: '900.123.456-7', representante_legal: 'Ing. Carlos Mendoza', cedula_representante: '79.123.456' },
    banco: { nombre: 'Bancolombia S.A.', tipo: 'Cuenta Corriente', numero: '123-456789-00' },
    ciudad: 'Bogotá D.C.',
    validezDias: 90
  });

  assert.strictEqual(liq.totales.total_directo_cop, 100000000, 'Directo debe ser 100M');
  assert.strictEqual(liq.totales.administracion_cop, 18000000, 'Administración (18%) debe ser 18M');
  assert.strictEqual(liq.totales.imprevistos_cop, 2000000, 'Imprevistos (2%) debe ser 2M');
  assert.strictEqual(liq.totales.utilidad_cop, 5000000, 'Utilidad (5%) debe ser 5M');
  assert.strictEqual(liq.totales.aiu_total_cop, 25000000, 'AIU total (25%) debe ser 25M');
  assert.strictEqual(liq.totales.iva_utilidad_cop, 950000, 'IVA (19% s/ 5M) debe ser 950.000 COP');
  assert.strictEqual(liq.totales.gran_total_oferta_cop, 125950000, 'Gran Total debe ser 125.950.000 COP');
  assert.strictEqual(liq.totales.gran_total_letras, 'CIENTO VEINTICINCO MILLONES NOVECIENTOS CINCUENTA MIL PESOS M/CTE');
  console.log(`  ✅ Directo: $${liq.totales.total_directo_cop} | AIU: $${liq.totales.aiu_total_cop} | IVA: $${liq.totales.iva_utilidad_cop} | Total: $${liq.totales.gran_total_oferta_cop}`);
  console.log(`  ✅ Letras: ${liq.totales.gran_total_letras}`);

  // ---------------------------------------------------------
  // TEST 3: Generación de Sobre Económico Institucional en PDF
  // ---------------------------------------------------------
  console.log('\n--- TEST 3: Generación de Sobre Económico CCE en PDF ---');
  const pdfBuffer = await engine.generarFormularioEconomicoPdf(liq);
  assert.ok(Buffer.isBuffer(pdfBuffer), 'Debe retornar un buffer binario');
  assert.ok(pdfBuffer.length > 3000, `El PDF debe tener contenido sustancial (>3KB), tamaño: ${pdfBuffer.length} bytes`);
  assert.strictEqual(pdfBuffer.slice(0, 4).toString(), '%PDF', 'Debe comenzar con la cabecera %PDF');
  console.log(`  ✅ Sobre Económico PDF generado con éxito: ${pdfBuffer.length} bytes emitidos.`);

  // ---------------------------------------------------------
  // TEST 4: Generación de Plantilla de Presupuesto en Excel (.xlsx)
  // ---------------------------------------------------------
  console.log('\n--- TEST 4: Generación de Libro Excel (.xlsx) con Fórmulas Nativas ---');
  const excelBuffer = await engine.generarPresupuestoExcel(liq);
  assert.ok(Buffer.isBuffer(excelBuffer), 'Debe retornar un buffer de Excel');
  assert.ok(excelBuffer.length > 4000, `El Excel debe tener tamaño válido (>4KB), obtenido: ${excelBuffer.length} bytes`);

  // Parsear el Excel generado para verificar integridad de hojas y fórmulas
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(excelBuffer);
  const sheetNames = wb.worksheets.map(s => s.name);
  assert.ok(sheetNames.includes('1. Carta Económica CCE'), 'Debe contener la hoja de Carta Económica');
  assert.ok(sheetNames.includes('2. Presupuesto y APUs'), 'Debe contener la hoja de Presupuesto y APUs');

  const wsPres = wb.getWorksheet('2. Presupuesto y APUs');
  assert.ok(wsPres.rowCount >= 8, 'Debe contener filas de datos y totales');
  console.log(`  ✅ Libro Excel validado: ${wb.worksheets.length} hojas creadas ("${sheetNames.join('", "')}") con tamaño ${excelBuffer.length} bytes.`);

  // ---------------------------------------------------------
  // TEST 5: Persistencia ACID y Consulta en PostgreSQL
  // ---------------------------------------------------------
  console.log('\n--- TEST 5: Persistencia en PostgreSQL (propuestas_economicas_sobres) ---');
  const refTest = `TEST-SOBRE-CCE-${Date.now()}`;
  const insertSql = `
    INSERT INTO propuestas_economicas_sobres (
      proceso_referencia, entidad, valor_total_oferta, valor_total_letras,
      validez_dias, ciudad_firma, aiu_config, totales_liquidacion,
      items_presupuesto, datos_proponente, datos_banco
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, proceso_referencia, valor_total_oferta;
  `;

  const qInsert = await dbPostgres.query(insertSql, [
    refTest,
    'Instituto Nacional de Vías (INVIAS)',
    liq.totales.gran_total_oferta_cop,
    liq.totales.gran_total_letras,
    liq.validez_dias,
    liq.ciudad_firma,
    JSON.stringify(liq.aiu_desglose),
    JSON.stringify(liq.totales),
    JSON.stringify(liq.items),
    JSON.stringify(liq.oferente),
    JSON.stringify(liq.banco)
  ]);

  const insertedId = qInsert.rows[0].id;
  assert.ok(insertedId > 0, 'Debe retornar ID autoincremental de PostgreSQL');
  console.log(`  ✅ Registro insertado en DB con ID #${insertedId} (Ref: ${refTest})`);

  const qSelect = await dbPostgres.query('SELECT * FROM propuestas_economicas_sobres WHERE id = $1', [insertedId]);
  assert.strictEqual(qSelect.rows.length, 1);
  assert.strictEqual(qSelect.rows[0].proceso_referencia, refTest);
  assert.strictEqual(parseFloat(qSelect.rows[0].valor_total_oferta), 125950000);
  console.log(`  ✅ Integridad referencial verificada: ${qSelect.rows[0].proceso_referencia} | Valor: $${qSelect.rows[0].valor_total_oferta}`);

  // Limpieza
  await dbPostgres.query('DELETE FROM propuestas_economicas_sobres WHERE id = $1', [insertedId]);
  console.log(`  ✅ Limpieza de registro de prueba completada.`);

  console.log('\n======================================================================');
  console.log('🎉 TODOS LOS TESTS DEL GENERADOR DE SOBRES ECONÓMICOS PASARON AL 100%');
  console.log('======================================================================\n');
}

runTestSuite()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error en suite de pruebas:', err);
    process.exit(1);
  });
