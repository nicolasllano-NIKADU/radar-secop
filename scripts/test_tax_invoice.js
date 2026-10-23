/**
 * ====================================================================
 * RADAR SECOP - TEST SUITE: FACTURACIÓN DIAN & DEDUCCIONES TRIBUTARIAS
 * Marco Normativo:
 * - Estatuto Tributario Nacional (E.T. Art. 392, 437-1, 462-1)
 * - Ley 1106 de 2006, Art. 6 (Contribución 5% Obra Pública)
 * - Ley 1276 de 2009 (Estampilla Adulto Mayor) y Ley 397 de 1997 (Cultura)
 * - Ley 789 de 2002, Art. 50 (Planilla PILA y Paz y Salvo Parafiscales)
 * ====================================================================
 */

const assert = require('assert');
const taxInvoiceLiquidationEngine = require('../server/taxInvoiceLiquidationEngine');
const dbPostgres = require('../server/dbPostgres');

async function runTestSuite() {
  console.log('🧪 Iniciando Test Suite: Facturación DIAN & Deducciones Tributarias (Ley 1106/2006)...\n');
  let passed = 0;
  let total = 5;

  try {
    // -------------------------------------------------------------
    // PRUEBA 1: Liquidación Estricta de Obra Pública (5% Ley 1106 + AIU Art. 462-1)
    // -------------------------------------------------------------
    console.log('🔹 Prueba 1: Liquidación de acta de obra con 5% Ley 1106, AIU y retenciones...');

    const liqObra = taxInvoiceLiquidationEngine.liquidarCuentaCobroActa({
      valorBruto: 200000000, // 200 Millones COP
      modalidadTributaria: 'OBRA_PUBLICA_AIU',
      porcentajeAIU: 10.0, // 10% utilidad
      amortizacionAnticipoPct: 20.0, // 20% amortización = $40.000.000
      tarifaReteFuentePct: 2.0, // 2% renta
      tarifaReteIcaPorMil: 9.66, // 9.66 x mil
      aplicaReteIva: true,
      aplicaLey1106: true,
      aplicaEstampillaAncianos: true,
      aplicaEstampillaCultura: true,
      pilaVerificada: true
    });

    assert.strictEqual(liqObra.valor_bruto_facturado, 200000000);
    assert.strictEqual(liqObra.amortizacion_anticipo_monto, 40000000);
    assert.strictEqual(liqObra.subtotal_amortizado, 160000000);

    // Base gravable IVA: 10% del subtotal amortizado = $16.000.000
    assert.strictEqual(liqObra.base_gravable_iva, 16000000);
    // IVA 19% sobre $16.000.000 = $3.040.000
    assert.strictEqual(liqObra.iva_liquidado, 3040000);

    // Contribución 5% Obra Pública (Ley 1106): 5% de 200M = $10.000.000
    assert.strictEqual(liqObra.deducciones.contribucion_obra_publica_5pct.monto, 10000000);
    assert.strictEqual(liqObra.deducciones.contribucion_obra_publica_5pct.aplica, true);

    // ReteFuente 2% sobre $160M = $3.200.000
    assert.strictEqual(liqObra.deducciones.retencion_fuente_renta.monto, 3200000);

    // ReteICA 9.66 por mil sobre $160M = $1.545.600
    assert.strictEqual(liqObra.deducciones.rete_ica.monto, 1545600);

    // ReteIVA 15% sobre $3.040.000 = $456.000
    assert.strictEqual(liqObra.deducciones.rete_iva.monto, 456000);

    // Estampilla Ancianos 2% de $200M = $4.000.000
    assert.strictEqual(liqObra.deducciones.estampilla_pro_ancianos.monto, 4000000);

    // Estampilla Cultura 1% de $200M = $2.000.000
    assert.strictEqual(liqObra.deducciones.estampilla_pro_cultura.monto, 2000000);

    // Total deducciones: 10M + 3.2M + 1.5456M + 0.456M + 4M + 2M = 21.201.600
    assert.strictEqual(liqObra.total_deducciones_tributarias, 21201600);

    // Neto a girar: (160.000.000 + 3.040.000) - 21.201.600 = 141.838.400
    assert.strictEqual(liqObra.neto_a_girar_contratista, 141838400);

    // Verificación PILA
    assert.strictEqual(liqObra.verificacion_pila.cumple, true);

    console.log('   ✓ Contribución Ley 1106 (5% estricto de obra): $10.000.000 verificado');
    console.log('   ✓ Base gravable IVA calculada sobre el 10% de AIU (Art. 462-1 E.T.): $16M');
    console.log('   ✓ ReteFuente (2%), ReteICA (9.66‰), ReteIVA (15%) y estampillas territoriales liquidadas con exactitud');
    console.log('   ✓ Neto a girar al contratista auditado: $141.838.400 COP');
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 2: Liquidación de Régimen General vs Exento
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 2: Comparación de régimen general (19% sobre subtotal) vs exento...');

    const liqGeneral = taxInvoiceLiquidationEngine.liquidarCuentaCobroActa({
      valorBruto: 100000000,
      modalidadTributaria: 'GENERAL_IVA_19',
      amortizacionAnticipoPct: 0,
      aplicaLey1106: false,
      aplicaReteIva: true
    });

    assert.strictEqual(liqGeneral.base_gravable_iva, 100000000);
    assert.strictEqual(liqGeneral.iva_liquidado, 19000000);
    assert.strictEqual(liqGeneral.deducciones.contribucion_obra_publica_5pct.monto, 0);

    const liqExento = taxInvoiceLiquidationEngine.liquidarCuentaCobroActa({
      valorBruto: 100000000,
      modalidadTributaria: 'EXENTO_IVA',
      aplicaLey1106: false
    });

    assert.strictEqual(liqExento.iva_liquidado, 0);

    console.log('   ✓ Régimen general IVA 19% ($19M) y exento ($0) validados correctamente');
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 3: Generación de Orden Oficial de Pago en PDF
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 3: Generación de Orden Oficial de Pago para Tesorería en PDF...');

    const pdfData = {
      proceso_numero: 'LP-OBRA-TEST-2026',
      contrato_numero: 'CTO-TEST-889',
      entidad_nombre: 'INSTITUTO NACIONAL DE VÍAS - INVIAS',
      contratista_nombre: 'CONSORCIO VIAL DEL NORTE',
      contratista_nit: '900.876.543-2',
      numero_factura_cuenta: 'FAC-E-0089',
      fecha_emision: '2026-10-20',
      fecha_radicacion: '2026-10-22',
      cufe_dian: 'c8b4f23e7890a12d34e56f7890ab12cd34ef567890ab12cd34ef567890ab12cd',
      tipo_documento: 'FACTURA_ELECTRONICA_DIAN',
      numero_planilla_pila: 'PILA-8877665544',
      cuenta_bancaria: 'Ahorros Bancolombia No. 456-987123-01',
      liquidacion: liqObra
    };

    const pdfBuffer = await taxInvoiceLiquidationEngine.generarOrdenPagoPdf(pdfData);
    assert.ok(Buffer.isBuffer(pdfBuffer));
    assert.ok(pdfBuffer.length > 4000, 'El PDF de orden de pago debe ser superior a 4 KB');

    console.log(`   ✓ Orden de pago en PDF generada exitosamente (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 4: Generación de Libro de Liquidación Tributaria en Excel (.xlsx)
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 4: Generación de Libro de Liquidación Tributaria en Excel (.xlsx)...');

    const xlsxBuffer = await taxInvoiceLiquidationEngine.generarLiquidacionTributariaExcel(pdfData);
    assert.ok(Buffer.isBuffer(xlsxBuffer));
    assert.ok(xlsxBuffer.length > 5000, 'El archivo XLSX debe contener hojas de cálculo y fórmulas');

    console.log(`   ✓ Libro Excel tributario generado exitosamente (${(xlsxBuffer.length / 1024).toFixed(1)} KB)`);
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 5: Persistencia e Integridad en PostgreSQL
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 5: Persistencia e integridad relacional en PostgreSQL...');

    await dbPostgres.query("DELETE FROM facturacion_cuentas_cobro WHERE contrato_numero = 'CTO-TEST-889'");

    const insQuery = `
      INSERT INTO facturacion_cuentas_cobro (
        contrato_numero, proceso_numero, entidad_nombre, contratista_nombre, contratista_nit,
        numero_factura_cuenta, fecha_emision, fecha_radicacion, cufe_dian, tipo_documento,
        modalidad_tributaria, valor_bruto_facturado, porcentaje_aiu, base_gravable_iva, iva_liquidado,
        amortizacion_anticipo_monto, subtotal_amortizado, contribucion_obra_publica_5pct,
        retencion_fuente_renta_pct, retencion_fuente_renta_monto, rete_ica_tarifa_por_mil, rete_ica_monto,
        rete_iva_pct, rete_iva_monto, estampilla_pro_ancianos_pct, estampilla_pro_ancianos_monto,
        estampilla_pro_cultura_pct, estampilla_pro_cultura_monto, total_deducciones_tributarias,
        neto_a_girar_contratista, verificacion_pila_seguridad_social, numero_planilla_pila, estado_pago
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18,
        $19, $20, $21, $22,
        $23, $24, $25, $26,
        $27, $28, $29,
        $30, $31, $32, $33
      ) RETURNING id, numero_factura_cuenta, neto_a_girar_contratista;
    `;

    const insRes = await dbPostgres.query(insQuery, [
      'CTO-TEST-889',
      'LP-OBRA-TEST-2026',
      'INSTITUTO NACIONAL DE VÍAS - INVIAS',
      'CONSORCIO VIAL DEL NORTE',
      '900.876.543-2',
      'FAC-E-0089',
      '2026-10-20',
      '2026-10-22',
      'c8b4f23e7890a12d34e56f7890ab12cd34ef567890ab12cd34ef567890ab12cd',
      'FACTURA_ELECTRONICA_DIAN',
      'OBRA_PUBLICA_AIU',
      200000000,
      10.0,
      16000000,
      3040000,
      40000000,
      160000000,
      10000000,
      2.0,
      3200000,
      9.66,
      1545600,
      15.0,
      456000,
      2.0,
      4000000,
      1.0,
      2000000,
      21201600,
      141838400,
      true,
      'PILA-8877665544',
      'RADICADA'
    ]);

    assert.ok(insRes.rows[0].id > 0);
    assert.strictEqual(insRes.rows[0].numero_factura_cuenta, 'FAC-E-0089');
    assert.strictEqual(parseFloat(insRes.rows[0].neto_a_girar_contratista), 141838400);

    console.log('   ✓ Factura electrónica persistida y leída correctamente en PostgreSQL');
    passed++;

    console.log(`\n=======================================================`);
    console.log(`🎉 TEST SUITE FINALIZADA: ${passed}/${total} PRUEBAS EXITOSAS (100%)`);
    console.log(`=======================================================\n`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR EN TEST SUITE FACTURACIÓN:', error);
    process.exit(1);
  }
}

runTestSuite();
