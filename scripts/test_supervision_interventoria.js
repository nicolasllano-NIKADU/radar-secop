/**
 * ====================================================================
 * RADAR SECOP - TEST SUITE: SUPERVISIÓN E INTERVENTORÍA CONTRACTUAL
 * Ley 1474/2011 Arts. 82 - 85, Decreto 1082/2015, NSR-10, INVIAS
 * ====================================================================
 */

const assert = require('assert');
const supervisionInterventoriaEngine = require('../server/supervisionInterventoriaEngine');
const dbPostgres = require('../server/dbPostgres');

async function runTestSuite() {
  console.log('🧪 Iniciando Test Suite: Supervisión e Interventoría Contractual (Ley 1474/2011)...\n');
  let passed = 0;
  let total = 5;

  try {
    // -------------------------------------------------------------
    // PRUEBA 1: Evaluación Técnica de Ensayos de Calidad (NSR-10 / INVIAS)
    // -------------------------------------------------------------
    console.log('🔹 Prueba 1: Evaluación técnica de ensayos de laboratorio y tolerancias normativas...');

    // 1.1 Concreto Conforme
    const e1 = supervisionInterventoriaEngine.evaluarConformidadEnsayo({
      tipoEnsayo: 'COMPRESION_CONCRETO_28D',
      valorExigido: 3000,
      valorObtenido: 3150,
      unidadMedida: 'PSI'
    });
    assert.strictEqual(e1.resultado_tecnico, 'CONFORME');
    assert.strictEqual(e1.porcentaje_conformidad, 105.0);

    // 1.2 Concreto Observado (entre 85% y 100%)
    const e2 = supervisionInterventoriaEngine.evaluarConformidadEnsayo({
      tipoEnsayo: 'COMPRESION_CONCRETO_28D',
      valorExigido: 3000,
      valorObtenido: 2700,
      unidadMedida: 'PSI'
    });
    assert.strictEqual(e2.resultado_tecnico, 'OBSERVADO');
    assert.strictEqual(e2.porcentaje_conformidad, 90.0);

    // 1.3 Concreto No Conforme (< 85%)
    const e3 = supervisionInterventoriaEngine.evaluarConformidadEnsayo({
      tipoEnsayo: 'COMPRESION_CONCRETO_28D',
      valorExigido: 3000,
      valorObtenido: 2400,
      unidadMedida: 'PSI'
    });
    assert.strictEqual(e3.resultado_tecnico, 'NO_CONFORME');
    assert.strictEqual(e3.porcentaje_conformidad, 80.0);

    // 1.4 Suelos Proctor Modificado
    const e4 = supervisionInterventoriaEngine.evaluarConformidadEnsayo({
      tipoEnsayo: 'DENSIDAD_SUELOS_PROCTOR',
      valorExigido: 95.0,
      valorObtenido: 96.5,
      unidadMedida: '%'
    });
    assert.strictEqual(e4.resultado_tecnico, 'CONFORME');

    console.log('   ✓ Ensayo concreto 3000 PSI evaluado: Conforme (105%), Observado (90%) y No Conforme (80%)');
    console.log('   ✓ Ensayo compactación Proctor 95% evaluado conforme a INVIAS Art. 210');
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 2: Métricas de Desempeño SPI y Atraso de Cronograma
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 2: Cálculo de índice de desempeño SPI y semáforo de contingencia...');
    
    // Obra en cronograma (SPI >= 0.98)
    const desNormal = supervisionInterventoriaEngine.calcularAvanceYDesempeno({
      programadoPct: 50.0,
      realPct: 52.0,
      ensayos: [e1, e4]
    });
    assert.strictEqual(desNormal.semaforo_tiempo, 'EN_CRONOGRAMA');
    assert.strictEqual(desNormal.spi_schedule_performance_index, 1.04);
    assert.strictEqual(desNormal.control_calidad.indice_calidad_pct, 100.0);

    // Obra con atraso crítico (SPI < 0.85)
    const desCritico = supervisionInterventoriaEngine.calcularAvanceYDesempeno({
      programadoPct: 60.0,
      realPct: 45.0, // SPI = 0.75
      ensayos: [e1, e2, e3]
    });
    assert.strictEqual(desCritico.semaforo_tiempo, 'ATRASO_CRITICO');
    assert.strictEqual(desCritico.spi_schedule_performance_index, 0.75);
    assert.strictEqual(desCritico.control_calidad.no_conformes, 1);

    console.log('   ✓ Desempeño favorable SPI 1.04 verificado (EN_CRONOGRAMA)');
    console.log('   ✓ Atraso severo SPI 0.75 verificado (ATRASO_CRITICO exigiendo plan de contingencia)');
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 3: Generación del Informe de Interventoría en PDF
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 3: Generación del Informe Periódico de Interventoría en PDF...');
    const pdfData = {
      proceso_numero: 'LP-OBRA-2026-001',
      contrato_numero: 'CTO-2026-045',
      entidad_nombre: 'INSTITUTO NACIONAL DE VÍAS (INVIAS)',
      contratista_nombre: 'CONSORCIO VIAL ANDINO',
      interventor_nombre: 'INTERVENTORÍA INTEGRAL TÉCNICA S.A.S.',
      periodo_informe: 'Mes 03 (Octubre 2026)',
      desempeno: desNormal,
      bitacora: [
        {
          fecha_registro: '2026-10-15',
          condicion_climatica: 'SOLEADO',
          personal_total: 24,
          maquinaria_activa: 6,
          actividades_ejecutadas: 'Vaciado de concreto en zapatas eje 4 y compactación de terraplén.',
          instrucciones_interventor: 'Se autoriza fundida tras verificar armado de acero.'
        }
      ],
      ensayos: [e1, e4]
    };

    const pdfBuffer = await supervisionInterventoriaEngine.generarInformeInterventoriaPdf(pdfData);
    assert.ok(Buffer.isBuffer(pdfBuffer), 'Debe retornar un Buffer');
    assert.ok(pdfBuffer.length > 3000, `El PDF debe tener un tamaño > 3KB (tiene ${pdfBuffer.length} bytes)`);
    assert.strictEqual(pdfBuffer.slice(0, 4).toString(), '%PDF', 'Debe ser un archivo PDF válido');

    console.log(`   ✓ Informe de Interventoría en PDF generado con éxito (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 4: Generación del Informe de Interventoría en Excel (.xlsx)
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 4: Generación de Libro Excel con Bitácora y Ensayos...');
    const excelBuffer = await supervisionInterventoriaEngine.generarInformeInterventoriaExcel(pdfData);
    assert.ok(Buffer.isBuffer(excelBuffer), 'Debe retornar un Buffer');
    assert.ok(excelBuffer.length > 5000, 'El Excel debe tener un tamaño > 5KB');
    assert.strictEqual(excelBuffer.slice(0, 2).toString(), 'PK', 'Debe ser un archivo Excel válido');

    console.log(`   ✓ Libro Excel de Interventoría generado con éxito (${(excelBuffer.length / 1024).toFixed(1)} KB)`);
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 5: Persistencia en PostgreSQL
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 5: Persistencia en PostgreSQL (bitácora, contratos y ensayos)...');
    
    // Contrato supervisión
    await dbPostgres.query(`
      INSERT INTO interventoria_contratos_supervision (
        proceso_numero, contrato_numero, entidad_nombre, contratista_nombre,
        interventor_nombre, fecha_inicio_supervision, avance_fisico_programado_pct,
        avance_fisico_real_pct, estado_supervision
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (contrato_numero) DO UPDATE SET updated_at = NOW();
    `, [
      'TEST-PROC-INT-001',
      'TEST-CTO-INT-001',
      'INVIAS TEST',
      'CONTRATISTA OBRA TEST',
      'INTERVENTORÍA TEST SAS',
      '2026-08-01',
      50.0,
      52.0,
      'EN_EJECUCION'
    ]);

    // Bitácora
    const resBit = await dbPostgres.query(`
      INSERT INTO interventoria_bitacora_diaria (
        contrato_numero, fecha_registro, condicion_climatica,
        personal_total, maquinaria_activa, frente_obra,
        actividades_ejecutadas, instrucciones_interventor, estado_orden
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `, [
      'TEST-CTO-INT-001',
      '2026-10-15',
      'SOLEADO',
      24,
      6,
      'Frente 1',
      'Actividad de prueba',
      'Instrucción de prueba',
      'CUMPLIDA'
    ]);
    assert.ok(resBit.rows[0].id > 0);

    // Ensayo
    const resEns = await dbPostgres.query(`
      INSERT INTO interventoria_control_calidad_ensayos (
        contrato_numero, tipo_ensayo, localizacion_muestra,
        fecha_toma_muestra, fecha_resultado, valor_diseno_exigido,
        valor_obtenido_laboratorio, unidad_medida, porcentaje_conformidad,
        resultado_tecnico, laboratorio_nombre
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `, [
      'TEST-CTO-INT-001',
      'COMPRESION_CONCRETO_28D',
      'Zapata 4',
      '2026-09-15',
      '2026-10-13',
      3000,
      3150,
      'PSI',
      105.0,
      'CONFORME',
      'Laboratorio Test'
    ]);
    assert.ok(resEns.rows[0].id > 0);

    // Limpieza
    await dbPostgres.query('DELETE FROM interventoria_bitacora_diaria WHERE contrato_numero = $1', ['TEST-CTO-INT-001']);
    await dbPostgres.query('DELETE FROM interventoria_control_calidad_ensayos WHERE contrato_numero = $1', ['TEST-CTO-INT-001']);
    await dbPostgres.query('DELETE FROM interventoria_contratos_supervision WHERE contrato_numero = $1', ['TEST-CTO-INT-001']);

    console.log('   ✓ Registros en bitácora, contratos y ensayos verificados en DB y borrado limpio');
    passed++;

  } catch (err) {
    console.error('❌ Error en test suite de interventoría:', err);
    process.exit(1);
  }

  console.log(`\n=======================================================`);
  console.log(`🎉 TODAS LAS PRUEBAS PASARON EXITOSAMENTE: ${passed}/${total} (100%)`);
  console.log(`=======================================================\n`);
  process.exit(0);
}

runTestSuite();
