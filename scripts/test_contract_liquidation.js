/**
 * ====================================================================
 * RADAR SECOP - TEST SUITE: LIQUIDACIÓN FINAL DE CONTRATOS Y BALANCES
 * Ley 80/1993 Art. 60, Ley 1150/2007 Art. 11, Decreto 1082/2015
 * ====================================================================
 */

const assert = require('assert');
const contractLiquidationEngine = require('../server/contractLiquidationEngine');
const dbPostgres = require('../server/dbPostgres');

async function runTestSuite() {
  console.log('🧪 Iniciando Test Suite: Liquidación Final de Contratos y Cierre de Balances (Ley 80 Art. 60)...\n');
  let passed = 0;
  let total = 4;

  try {
    // -------------------------------------------------------------
    // PRUEBA 1: Conciliación Contable y Balance Financiero
    // -------------------------------------------------------------
    console.log('🔹 Prueba 1: Conciliación de balance contable, retenciones y amparos poscontractuales...');
    
    // Contrato de $1.000M + $200M adición = $1.200M
    // Ejecutado: $1.200M, Pagado: $1.100M -> Saldo ejecucion = $100M
    // Anticipo: $240M, Amortizado: $240M -> Saldo anticipo = 0
    // Retención en garantía a devolver: $30M
    // Deducción por multas: $5M
    // Saldo neto = (100M + 30M) - (0 + 5M) = $125M a favor del contratista
    const balance = contractLiquidationEngine.liquidarContratoBalance({
      valorInicial: 1000000000,
      adiciones: 200000000,
      valorEjecutado: 1200000000,
      valorPagado: 1100000000,
      anticipoConcedido: 240000000,
      anticipoAmortizado: 240000000,
      retencionesGarantia: 30000000,
      multasODeducciones: 5000000
    });

    assert.strictEqual(balance.balance_financiero.valor_contrato_final, 1200000000, 'Valor final debe ser 1.200.000.000 COP');
    assert.strictEqual(balance.balance_financiero.porcentaje_ejecucion, 100, 'Ejecución debe ser 100%');
    assert.strictEqual(balance.anticipo_balance.totalmente_amortizado, true, 'El anticipo debe estar 100% amortizado');
    assert.strictEqual(balance.cierre_financiero.saldo_neto_final, 125000000, 'El saldo neto a favor debe ser 125.000.000 COP');
    assert.strictEqual(balance.cierre_financiero.direccion_saldo, 'A_FAVOR_CONTRATISTA', 'Debe ser A_FAVOR_CONTRATISTA');

    // Validar amparos poscontractuales
    assert.strictEqual(balance.amparos_poscontractuales.length, 2, 'Debe exigir 2 amparos poscontractuales');
    const amparoEstabilidad = balance.amparos_poscontractuales.find(a => a.amparo === 'ESTABILIDAD_Y_CALIDAD_OBRA');
    assert.strictEqual(amparoEstabilidad.porcentaje, 20, 'Amparo de estabilidad debe ser 20%');
    assert.strictEqual(amparoEstabilidad.vigenciaAnos, 5, 'Vigencia de estabilidad debe ser 5 años');

    console.log(`   ✓ Balance conciliado: Contrato final $${balance.balance_financiero.valor_contrato_final.toLocaleString('es-CO')} COP`);
    console.log(`   ✓ Saldo neto liquidado: $${balance.cierre_financiero.saldo_neto_final.toLocaleString('es-CO')} COP (${balance.cierre_financiero.direccion_saldo})`);
    console.log(`   ✓ Amparos poscontractuales validados: Estabilidad 5 años ($${amparoEstabilidad.valorAsegurado.toLocaleString('es-CO')} COP)`);
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 2: Generación del Acta de Liquidación en PDF (PDFKit)
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 2: Generación de Acta Formal de Liquidación Bilateral en PDF...');
    const pdfData = {
      proceso_numero: 'LP-OBRA-2026-001',
      contrato_numero: 'CTO-2026-045',
      entidad_nombre: 'INSTITUTO NACIONAL DE VÍAS (INVIAS)',
      contratista_nombre: 'CONSORCIO VIAL ANDINO',
      contratista_nit: '901.456.789-1',
      interventor_nombre: 'INTERVENTORÍA INTEGRAL S.A.S.',
      fecha_terminacion: '2026-09-30',
      fecha_liquidacion: '2026-10-15',
      liquidacion: balance
    };

    const pdfBuffer = await contractLiquidationEngine.generarActaLiquidacionPdf(pdfData);
    assert.ok(Buffer.isBuffer(pdfBuffer), 'Debe retornar un Buffer');
    assert.ok(pdfBuffer.length > 3000, `El PDF del acta debe tener un tamaño > 3KB (tiene ${pdfBuffer.length} bytes)`);
    assert.strictEqual(pdfBuffer.slice(0, 4).toString(), '%PDF', 'Debe ser un archivo PDF válido');

    console.log(`   ✓ Acta formal de liquidación en PDF emitida con éxito (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 3: Generación del Balance Financiero en Excel (.xlsx)
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 3: Generación del Balance Financiero de Liquidación en Excel...');
    const excelBuffer = await contractLiquidationEngine.generarBalanceLiquidacionExcel(pdfData);
    assert.ok(Buffer.isBuffer(excelBuffer), 'Debe retornar un Buffer');
    assert.ok(excelBuffer.length > 5000, 'El Excel debe tener un tamaño > 5KB');
    assert.strictEqual(excelBuffer.slice(0, 2).toString(), 'PK', 'Debe ser un archivo Excel válido');

    console.log(`   ✓ Balance de liquidación en Excel emitido con éxito (${(excelBuffer.length / 1024).toFixed(1)} KB)`);
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 4: Persistencia y Consultas en PostgreSQL
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 4: Persistencia en PostgreSQL (contratos_liquidaciones_finales)...');
    const insertSql = `
      INSERT INTO contratos_liquidaciones_finales (
        proceso_numero, contrato_numero, entidad_nombre, contratista_nombre,
        contratista_nit, tipo_liquidacion, fecha_terminacion_contrato,
        fecha_acta_liquidacion, valor_contrato_inicial, valor_adiciones,
        valor_contrato_final, valor_total_ejecutado, valor_total_pagado,
        valor_anticipo_concedido, valor_anticipo_amortizado, valor_anticipo_pendiente,
        valor_retenciones_garantia, valor_descuentos_sanciones, saldo_neto_final,
        direccion_saldo, amparos_poscontractuales, salvedades_contratista,
        estado, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *;
    `;

    const resDb = await dbPostgres.query(insertSql, [
      'TEST-PROC-LIQ-001',
      'TEST-CTO-LIQ-001',
      'ALCALDÍA TEST',
      'CONTRATISTA TEST SAS',
      '900.123.999-0',
      'MUTUO_ACUERDO_BILATERAL',
      '2026-09-30',
      '2026-10-15',
      1000000000,
      200000000,
      1200000000,
      1200000000,
      1100000000,
      240000000,
      240000000,
      0,
      30000000,
      5000000,
      125000000,
      'A_FAVOR_CONTRATISTA',
      JSON.stringify(balance.amparos_poscontractuales),
      'Sin salvedades de prueba',
      'FIRMADA',
      'Prueba automatizada'
    ]);

    const liqId = resDb.rows[0].id;
    assert.ok(liqId > 0, 'Debe generar un ID válido');

    // Consultar
    const checkRes = await dbPostgres.query('SELECT * FROM contratos_liquidaciones_finales WHERE id = $1', [liqId]);
    assert.strictEqual(checkRes.rows[0].contrato_numero, 'TEST-CTO-LIQ-001');
    assert.strictEqual(Number(checkRes.rows[0].saldo_neto_final), 125000000);

    // Borrado limpio
    await dbPostgres.query('DELETE FROM contratos_liquidaciones_finales WHERE id = $1', [liqId]);
    console.log(`   ✓ Liquidación guardada (ID: ${liqId}), verificada en DB y borrado limpio`);
    passed++;

  } catch (err) {
    console.error('❌ Error en test suite de liquidación:', err);
    process.exit(1);
  }

  console.log(`\n=======================================================`);
  console.log(`🎉 TODAS LAS PRUEBAS PASARON EXITOSAMENTE: ${passed}/${total} (100%)`);
  console.log(`=======================================================\n`);
  process.exit(0);
}

runTestSuite();
