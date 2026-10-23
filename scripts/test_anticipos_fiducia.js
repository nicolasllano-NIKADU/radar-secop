/**
 * ====================================================================
 * RADAR SECOP - TEST SUITE: MÓDULO DE ANTICIPOS Y CUENTA FIDUCIA
 * Ley 80/1993, Ley 1474/2011 Art. 91, Decreto 1082/2015
 * ====================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const anticiposFiduciaEngine = require('../server/anticiposFiduciaEngine');
const dbPostgres = require('../server/dbPostgres');

async function runTestSuite() {
  console.log('🧪 Iniciando Test Suite: Anticipos y Manejo de Cuenta Fiducia (Ley 1474/2011)...\n');
  let passed = 0;
  let total = 5;

  try {
    // -------------------------------------------------------------
    // PRUEBA 1: Simulación de Cronograma de Amortización Mensual
    // -------------------------------------------------------------
    console.log('🔹 Prueba 1: Simulación de amortización mensual y rendimientos fiduciarios...');
    const valorContrato = 1200000000; // $1.200 Millones COP
    const anticipoPct = 20.0; // 20% = $240 Millones COP
    const plazoMeses = 6;
    const tasaRendimiento = 9.5; // 9.5% E.A.

    const simulacion = anticiposFiduciaEngine.simularPlanAmortizacion({
      valorContrato,
      anticipoPct,
      plazoMeses,
      tasaRendimientoFiduciarioAnual: tasaRendimiento
    });

    assert.strictEqual(simulacion.anticipo_monto, 240000000, 'El monto del anticipo debe ser $240.000.000');
    assert.strictEqual(simulacion.cronograma_actas.length, 6, 'Debe generar exactamente 6 actas mensuales');
    assert.strictEqual(simulacion.saldo_final_pendiente, 0, 'El saldo final debe amortizarse al 100% ($0.00)');
    assert.strictEqual(simulacion.total_amortizado, 240000000, 'El total amortizado debe ser igual al monto del anticipo');
    assert.strictEqual(simulacion.semaforo, 'EXITOSO', 'El semáforo de amortización debe ser EXITOSO');
    assert.ok(simulacion.rendimientos_totales_proyectados > 0, 'Los rendimientos financieros deben ser mayores a 0');

    console.log(`   ✓ Simulación exitosa: 6 actas, $${simulacion.total_amortizado.toLocaleString('es-CO')} amortizados al 100%, saldo $${simulacion.saldo_final_pendiente}`);
    console.log(`   ✓ Rendimientos fiduciarios proyectados para DGCPTN: $${simulacion.rendimientos_totales_proyectados.toLocaleString('es-CO')}`);
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 2: Validación de Plan de Inversión y Reglas Legales
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 2: Validación de topes legales (Ley 80 Art. 40 y Ley 1474 Art. 91)...');

    // 2.1 Anticipo ilegal (> 50% Ley 80)
    const valExceso = anticiposFiduciaEngine.validarPlanInversion({
      valorContrato: 100000000,
      anticipoMonto: 60000000, // 60%
      rubros: []
    });
    assert.strictEqual(valExceso.es_valido, false, 'No debe ser válido si supera el 50%');
    assert.ok(valExceso.alertas.some(a => a.severidad === 'CRITICA'), 'Debe emitir alerta CRITICA por superar el 50% legal');

    // 2.2 Intento de cobrar comisiones fiduciarias al anticipo (Violación Art. 91 Ley 1474)
    const valComision = anticiposFiduciaEngine.validarPlanInversion({
      valorContrato: 500000000,
      anticipoMonto: 100000000,
      rubros: [
        { codigo: 'CAMPAMENTO_SENALIZACION', nombre: 'Campamento', valor: 85000000 },
        { codigo: 'COMISIONES_FIDUCIARIAS', nombre: 'Comisión Fiduciaria', valor: 15000000 }
      ]
    });
    assert.ok(valComision.alertas.some(a => a.severidad === 'GRAVE'), 'Debe emitir alerta GRAVE por imputar comisión fiduciaria');

    // 2.3 Plan conforme y balanceado
    const valValido = anticiposFiduciaEngine.validarPlanInversion({
      valorContrato: 1200000000,
      anticipoMonto: 240000000,
      rubros: [
        { codigo: 'CAMPAMENTO_SENALIZACION', nombre: 'Campamento y Cerramiento', valor: 30000000, justificacion: 'Montaje de caseta' },
        { codigo: 'ACOPIO_MATERIALES', nombre: 'Acopio de Acero y Cemento', valor: 120000000, justificacion: 'Compra de 40 ton de acero' },
        { codigo: 'MAQUINARIA_EQUIPOS', nombre: 'Movilización Retroexcavadora', valor: 50000000, justificacion: 'Transporte cama baja' },
        { codigo: 'NOMINA_ARRANQUE', nombre: 'Nómina Inicial Frente 1', valor: 30000000, justificacion: 'Operarios y cuadrilla' },
        { codigo: 'ENSAYOS_LABORATORIO', nombre: 'Estudios de Suelos y Mezclas', valor: 10000000, justificacion: 'Calibración de probetas' }
      ]
    });
    assert.strictEqual(valValido.balanceado, true, 'El plan debe estar balanceado (suma rubros = anticipo)');
    assert.strictEqual(valValido.es_valido, true, 'El plan debe ser válido');
    assert.strictEqual(valValido.diferencia, 0, 'La diferencia debe ser $0');

    console.log('   ✓ Detección de anticipo > 50% bloqueado correctamente');
    console.log('   ✓ Detección de comisión fiduciaria no imputable advertida según Ley 1474');
    console.log(`   ✓ Plan balanceado validado: 5 rubros por $${valValido.suma_rubros.toLocaleString('es-CO')} aprobados`);
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 3: Generación de Dictamen Oficial en PDF (PDFKit)
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 3: Generación del Dictamen Oficial de Anticipos en PDF...');
    const pdfData = {
      proceso_numero: 'LIC-OBRA-2026-042',
      contrato_numero: 'CTO-2026-088',
      entidad_nombre: 'INSTITUTO NACIONAL DE VÍAS (INVIAS)',
      contratista_nombre: 'CONSORCIO VIAL ANDINO 2026',
      contratista_nit: '901.884.221-5',
      fiduciaria_nombre: 'FIDUCIARIA LA PREVISORA S.A.',
      numero_encargo_patrimonio: 'PA-INVIAS-088-2026',
      tipo_instrumento: 'PATRIMONIO_AUTÓNOMO IRREVOCABLE',
      valor_contrato: 1200000000,
      anticipo_porcentaje: 20.0,
      anticipo_monto: 240000000,
      plazo_meses: 6,
      tasa_rendimiento_anual: 9.5,
      rubros: valValido.rubros_analizados,
      simulacion: simulacion
    };

    const pdfBuffer = await anticiposFiduciaEngine.generarPlanAmortizacionPdf(pdfData);
    assert.ok(Buffer.isBuffer(pdfBuffer), 'Debe retornar un Buffer');
    assert.ok(pdfBuffer.length > 5000, `El PDF debe tener un tamaño sustancial (> 5KB, tiene ${pdfBuffer.length} bytes)`);
    assert.strictEqual(pdfBuffer.slice(0, 4).toString(), '%PDF', 'El encabezado debe ser un archivo PDF válido (%PDF)');

    console.log(`   ✓ Dictamen PDF institucional generado con éxito (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 4: Generación de Cronograma de Amortización en Excel (.xlsx)
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 4: Generación de Cronograma de Amortización en Excel con fórmulas nativas...');
    const excelBuffer = await anticiposFiduciaEngine.generarPlanAmortizacionExcel(pdfData);
    assert.ok(Buffer.isBuffer(excelBuffer), 'Debe retornar un Buffer');
    assert.ok(excelBuffer.length > 5000, `El Excel debe tener un tamaño sustancial (> 5KB, tiene ${excelBuffer.length} bytes)`);
    assert.strictEqual(excelBuffer.slice(0, 2).toString(), 'PK', 'El encabezado debe ser un archivo Office Open XML válido (PK)');

    console.log(`   ✓ Archivo Excel .xlsx generado con éxito (${(excelBuffer.length / 1024).toFixed(1)} KB)`);
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 5: Persistencia Completa en PostgreSQL y Consultas
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 5: Persistencia en PostgreSQL (planes y amortizaciones mensuales)...');
    
    // Insertar plan de prueba
    const insertSql = `
      INSERT INTO anticipos_planes_inversion (
        proceso_numero, contrato_numero, entidad_nombre, contratista_nombre,
        contratista_nit, valor_contrato, anticipo_porcentaje, anticipo_monto,
        fiduciaria_nombre, numero_encargo_patrimonio, tipo_instrumento,
        fecha_constitucion, fecha_desembolso, plazo_meses, tasa_rendimiento_anual,
        rubros_inversion, estado, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *;
    `;
    const resPlan = await dbPostgres.query(insertSql, [
      'TEST-PROCESO-001',
      'TEST-CTO-001',
      'ALCALDÍA MAYOR TEST',
      'CONSTRUCTORA TEST SAS',
      '900.999.888-1',
      500000000,
      20.0,
      100000000,
      'FIDUCIARIA BANCOLOMBIA',
      'PA-TEST-123',
      'PATRIMONIO_AUTONOMO',
      '2026-01-15',
      '2026-01-20',
      5,
      9.5,
      JSON.stringify(valValido.rubros_analizados),
      'ACTIVO',
      'Plan de prueba automatizada'
    ]);

    const planId = resPlan.rows[0].id;
    assert.ok(planId > 0, 'El plan debe guardarse con un ID autoincremental');

    // Insertar acta mensual
    const insertActaSql = `
      INSERT INTO anticipos_amortizaciones_mensuales (
        plan_id, numero_acta, fecha_acta, valor_bruto_acta,
        porcentaje_amortizacion, valor_amortizado, saldo_anticipo_previo,
        saldo_anticipo_restante, porcentaje_ejecucion_acumulada,
        rendimientos_generados_mes, rendimientos_reintegrados_tesoro,
        reintegro_soporte_num, estado_acta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;
    const resActa = await dbPostgres.query(insertActaSql, [
      planId,
      1,
      '2026-02-28',
      100000000,
      20.0,
      20000000,
      100000000,
      80000000,
      20.0,
      712500,
      712500,
      'SOPORTE-DGCPTN-001',
      'APROBADA'
    ]);
    assert.strictEqual(resActa.rows[0].numero_acta, 1, 'El número de acta debe ser 1');
    assert.strictEqual(Number(resActa.rows[0].saldo_anticipo_restante), 80000000, 'El saldo restante debe ser $80.000.000');

    // Consultar detalle con JOIN/subquery
    const resHistorial = await dbPostgres.query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM anticipos_amortizaciones_mensuales a WHERE a.plan_id = p.id) as total_actas
      FROM anticipos_planes_inversion p
      WHERE p.id = $1
    `, [planId]);

    assert.strictEqual(parseInt(resHistorial.rows[0].total_actas, 10), 1, 'Debe registrar 1 acta asociada');

    // Limpieza del registro de prueba
    await dbPostgres.query('DELETE FROM anticipos_planes_inversion WHERE id = $1', [planId]);

    console.log(`   ✓ Plan guardado (ID: ${planId}), acta asociada verificada y borrado limpio`);
    passed++;

  } catch (err) {
    console.error('❌ Error en test suite:', err);
    process.exit(1);
  }

  console.log(`\n=======================================================`);
  console.log(`🎉 TODAS LAS PRUEBAS PASARON EXITOSAMENTE: ${passed}/${total} (100%)`);
  console.log(`=======================================================\n`);
  process.exit(0);
}

runTestSuite();
