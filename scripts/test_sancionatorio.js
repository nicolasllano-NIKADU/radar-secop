/**
 * ====================================================================
 * RADAR SECOP - TEST SUITE: PROCEDIMIENTOS SANCIONATORIOS Y DEBIDO PROCESO
 * Marco Normativo:
 * - Ley 1474 de 2011, Art. 86 (Procedimiento administrativo sancionatorio)
 * - Ley 80 de 1993, Art. 17 (Caducidad) y Art. 18 (Cláusula Penal Pecuniaria)
 * - Consejo de Estado Sección Tercera (Sentencias de Unificación Rad. 41719 y Rad. 24900)
 * ====================================================================
 */

const assert = require('assert');
const sancionatorioEngine = require('../server/sancionatorioEngine');
const dbPostgres = require('../server/dbPostgres');

async function runTestSuite() {
  console.log('🧪 Iniciando Test Suite: Procedimientos Sancionatorios y Debido Proceso (Art. 86 Ley 1474)...\n');
  let passed = 0;
  let total = 5;

  try {
    // -------------------------------------------------------------
    // PRUEBA 1: Tasación con Límite Jurisprudencial del 10% (Consejo de Estado)
    // -------------------------------------------------------------
    console.log('🔹 Prueba 1: Tasación proporcional de multas con tope legal del 10%...');

    // Caso A: Mora que excede el tope legal
    const tasacionTope = sancionatorioEngine.tasarSancionProporcional({
      valorContrato: 1000000000, // 1.000 Millones COP
      tipologiaSancion: 'MULTA_DIARIA_MORA',
      diasMora: 150, // 150 días * 0.1% = 15% bruto (150 Millones)
      porcentajeDiario: 0.1,
      topeMaximoPct: 10.0
    });

    assert.strictEqual(tasacionTope.monto_calculado_bruto, 150000000);
    assert.strictEqual(tasacionTope.monto_final_tasado, 100000000); // Truncado al 10%
    assert.strictEqual(tasacionTope.excedio_tope_legal, true);
    assert.strictEqual(tasacionTope.porcentaje_sobre_contrato, 10.0);

    // Caso B: Mora dentro del límite proporcional
    const tasacionNormal = sancionatorioEngine.tasarSancionProporcional({
      valorContrato: 500000000, // 500 Millones COP
      tipologiaSancion: 'MULTA_DIARIA_MORA',
      diasMora: 20, // 20 días * 0.1% = 2% (10 Millones)
      porcentajeDiario: 0.1,
      topeMaximoPct: 10.0
    });

    assert.strictEqual(tasacionNormal.monto_calculado_bruto, 10000000);
    assert.strictEqual(tasacionNormal.monto_final_tasado, 10000000);
    assert.strictEqual(tasacionNormal.excedio_tope_legal, false);
    assert.strictEqual(tasacionNormal.porcentaje_sobre_contrato, 2.0);

    console.log('   ✓ Truncamiento legal al 10% verificado: $150M reducidos a $100M según Consejo de Estado Rad. 41719');
    console.log('   ✓ Tasación proporcional estándar verificada: $10M equivalentes al 2.0% del contrato');
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 2: Análisis Pericial de Eximentes de Responsabilidad
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 2: Evaluación pericial de eximentes de responsabilidad contractual...');

    const eximentesResult = sancionatorioEngine.tasarSancionProporcional({
      valorContrato: 800000000,
      tipologiaSancion: 'MULTA_DIARIA_MORA',
      diasMora: 30,
      eximentesAlegados: ['FUERZA_MAYOR', 'MORA_ENTIDAD', 'HECHO_TERCERO']
    });

    assert.strictEqual(eximentesResult.eximentes_evaluados.length, 3);
    assert.ok(eximentesResult.eximentes_evaluados.some(e => e.eximente === 'FUERZA_MAYOR' && e.solidez === 'ALTA'));
    assert.ok(eximentesResult.eximentes_evaluados.some(e => e.eximente === 'MORA_ENTIDAD' && e.fundamento.includes('non adimpleti')));

    console.log('   ✓ Eximentes jurídicos analizados (Fuerza Mayor, Mora de la Entidad y Hecho de Tercero)');
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 3: Generación del Memorial de Descargos en PDF
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 3: Generación del Memorial de Descargos para Audiencia en PDF...');

    const pdfData = {
      proceso_numero: 'LP-OBRA-TEST-2026',
      contrato_numero: 'CTO-TEST-889',
      entidad_nombre: 'INSTITUTO NACIONAL DE VÍAS - INVIAS',
      contratista_nombre: 'CONSORCIO VIAL DEL NORTE',
      contratista_nit: '900.876.543-2',
      aseguradora_nombre: 'SEGUROS DEL ESTADO S.A.',
      numero_poliza_cumplimiento: 'POL-CUMP-778899',
      fecha_citacion: '2026-11-05',
      hechos_imputados: 'Presunto retraso de 25 días en la terminación de subbase granular.',
      argumentos_defensa: 'Lluvias torrenciales atípicas certificadas por IDEAM y suspensión de cantera.',
      tasacion: tasacionNormal
    };

    const pdfBuffer = await sancionatorioEngine.generarAlegatosDescargosPdf(pdfData);
    assert.ok(Buffer.isBuffer(pdfBuffer));
    assert.ok(pdfBuffer.length > 5000, 'El PDF debe tener contenido estructurado superior a 5 KB');

    console.log(`   ✓ PDF de memorial de descargos generado exitosamente (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 4: Generación de Cuadro Pericial de Tasación en Excel (.xlsx)
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 4: Generación de Cuadro Pericial de Multas en Excel (.xlsx)...');

    const xlsxBuffer = await sancionatorioEngine.generarCuadroSancionesExcel(pdfData);
    assert.ok(Buffer.isBuffer(xlsxBuffer));
    assert.ok(xlsxBuffer.length > 5000, 'El archivo XLSX debe contener hojas de cálculo y fórmulas');

    console.log(`   ✓ Libro Excel pericial generado exitosamente (${(xlsxBuffer.length / 1024).toFixed(1)} KB)`);
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 5: Persistencia e Integridad en PostgreSQL
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 5: Persistencia e integridad relacional en PostgreSQL...');

    // Limpiar pruebas anteriores del mismo contrato
    await dbPostgres.query("DELETE FROM sancionatorio_expedientes WHERE contrato_numero = 'CTO-TEST-889'");

    // Insertar expediente
    const insExpQuery = `
      INSERT INTO sancionatorio_expedientes (
        proceso_numero, contrato_numero, entidad_nombre, contratista_nombre, contratista_nit,
        aseguradora_nombre, numero_poliza_cumplimiento, tipologia_sancion, fecha_citacion_audiencia,
        fecha_hechos_informe, hechos_imputados_interventoria, valor_contrato_base, dias_mora_imputados,
        porcentaje_multa_diario, tope_maximo_multa_pct, monto_multa_tasada, argumentos_defensa_contratista,
        eximentes_responsabilidad, estado_proceso
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id, contrato_numero, monto_multa_tasada, estado_proceso;
    `;

    const expRes = await dbPostgres.query(insExpQuery, [
      'LP-OBRA-TEST-2026',
      'CTO-TEST-889',
      'INSTITUTO NACIONAL DE VÍAS - INVIAS',
      'CONSORCIO VIAL DEL NORTE',
      '900.876.543-2',
      'SEGUROS DEL ESTADO S.A.',
      'POL-CUMP-778899',
      'MULTA_DIARIA_MORA',
      '2026-11-05',
      '2026-10-15',
      'Presunto retraso de 25 días en la terminación de subbase granular.',
      500000000,
      20,
      0.1,
      10.0,
      10000000,
      'Lluvias torrenciales atípicas certificadas por IDEAM y suspensión de cantera.',
      JSON.stringify(['FUERZA_MAYOR', 'HECHO_TERCERO']),
      'AUDIENCIA_CITADA'
    ]);

    const expedienteId = expRes.rows[0].id;
    assert.ok(expedienteId > 0);
    assert.strictEqual(expRes.rows[0].contrato_numero, 'CTO-TEST-889');

    // Insertar actuación procesal vinculada
    const actRes = await dbPostgres.query(
      `INSERT INTO sancionatorio_actuaciones (
        expediente_id, fecha_actuacion, tipo_actuacion, descripcion_actuacion, documento_soporte_nombre
      ) VALUES ($1, $2, $3, $4, $5) RETURNING id;`,
      [
        expedienteId,
        '2026-11-05',
        'AUTO_CITACION_AUDIENCIA',
        'Citación formal a la audiencia del Art. 86 con vinculación a Seguros del Estado S.A.',
        'Auto_Citacion_001.pdf'
      ]
    );

    assert.ok(actRes.rows[0].id > 0);

    // Consulta relacional con count de actuaciones
    const checkExp = await dbPostgres.query(
      `SELECT e.*, (SELECT COUNT(*) FROM sancionatorio_actuaciones a WHERE a.expediente_id = e.id) as total_actuaciones
       FROM sancionatorio_expedientes e WHERE e.id = $1`,
      [expedienteId]
    );

    assert.strictEqual(checkExp.rows.length, 1);
    assert.strictEqual(parseInt(checkExp.rows[0].total_actuaciones, 10), 1);
    assert.strictEqual(parseFloat(checkExp.rows[0].monto_multa_tasada), 10000000);

    console.log('   ✓ Expediente sancionatorio y actuación procesal persistidos y verificados en PostgreSQL');
    passed++;

    console.log(`\n=======================================================`);
    console.log(`🎉 TEST SUITE FINALIZADA: ${passed}/${total} PRUEBAS EXITOSAS (100%)`);
    console.log(`=======================================================\n`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR EN TEST SUITE SANCIONATORIO:', error);
    process.exit(1);
  }
}

runTestSuite();
