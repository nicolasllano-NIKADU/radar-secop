/**
 * ====================================================================
 * RADAR SECOP - TEST SUITE: RESTABLECIMIENTO DEL EQUILIBRIO ECONÓMICO
 * Ley 80/1993 Art. 27, Art. 868 C.Co, Consejo de Estado Rad. 18080
 * ====================================================================
 */

const assert = require('assert');
const equilibrioEconomicoEngine = require('../server/equilibrioEconomicoEngine');
const dbPostgres = require('../server/dbPostgres');

async function runTestSuite() {
  console.log('🧪 Iniciando Test Suite: Reclamaciones Económicas y Restablecimiento del Equilibrio Contractual...\n');
  let passed = 0;
  let total = 4;

  try {
    // -------------------------------------------------------------
    // PRUEBA 1: Cálculos Periciales y Tipologías Jurídicas
    // -------------------------------------------------------------
    console.log('🔹 Prueba 1: Simulación de liquidación pericial y jurisprudencia del Consejo de Estado...');
    
    // 1.1 Mayor Permanencia en Obra
    const resMayorPerm = equilibrioEconomicoEngine.calcularRestablecimientoEquilibrio({
      tipologia: 'MAYOR_PERMANENCIA_OBRA',
      valorContrato: 2500000000,
      plazoInicialDias: 180,
      diasMayorPermanencia: 60, // 2 meses de suspensión no imputable
      ipcInicial: 140.0,
      ipcFinal: 154.0, // Factor indexación = 1.10 (10% inflación)
      items: [
        {
          tipo: 'EQUIPO_STANDBY',
          descripcion: 'Retroexcavadora CAT 320 en stand-by de obra',
          tarifaDiariaPlena: 1200000,
          standByPct: 40.0, // 40% según Consejo de Estado
          diasAfectados: 60
        },
        {
          tipo: 'NOMINA_PERSONAL',
          descripcion: 'Residente Técnico de Obra e Inspector',
          salarioBaseMensual: 8000000,
          factorPrestacional: 1.52,
          diasAfectados: 60
        }
      ]
    });

    assert.strictEqual(resMayorPerm.indices_dane.factor_indexacion, 1.1, 'El factor de indexación IPC debe ser exactamente 1.10');
    // Equipo: 1.200.000 * 0.40 * 60 = 28.800.000 COP
    // Nómina: (8.000.000 * 1.52) * (60 / 30) = 24.320.000 COP
    // Total histórico daño emergente = 53.120.000 COP
    // Total indexado = 53.120.000 * 1.10 = 58.432.000 COP
    assert.strictEqual(resMayorPerm.liquidacion.dano_emergente_historico, 53120000, 'El daño emergente histórico debe ser 53.120.000 COP');
    assert.strictEqual(resMayorPerm.liquidacion.dano_emergente_actualizado, 58432000, 'El daño emergente indexado debe ser 58.432.000 COP');
    assert.strictEqual(resMayorPerm.liquidacion.lucro_cesante_actualizado, 0, 'Mayor permanencia no debe computar lucro cesante');
    assert.strictEqual(resMayorPerm.dictamen_pericial.viabilidad, 'ALTA', 'Debe tener viabilidad pericial ALTA');

    // 1.2 Teoría de la Imprevisión vs Hecho del Príncipe (Diferencia doctrinaria)
    const resImprevision = equilibrioEconomicoEngine.calcularRestablecimientoEquilibrio({
      tipologia: 'TEORIA_IMPREVISION',
      valorContrato: 1000000000,
      items: [{ tipo: 'COSTO_GENERAL', valorHistorico: 50000000 }]
    });
    assert.strictEqual(resImprevision.tipologia.reconoceLucroCesante, false, 'Teoría de la Imprevisión busca punto de no pérdida (sin lucro cesante)');

    const resHechoPrincipe = equilibrioEconomicoEngine.calcularRestablecimientoEquilibrio({
      tipologia: 'HECHO_DEL_PRINCIPE',
      valorContrato: 1000000000,
      margenUtilidadEsperadaPct: 5.0,
      items: [{ tipo: 'COSTO_GENERAL', valorHistorico: 50000000 }]
    });
    assert.strictEqual(resHechoPrincipe.tipologia.reconoceLucroCesante, true, 'Hecho del Príncipe exige indemnización integral (con lucro cesante)');
    assert.ok(resHechoPrincipe.liquidacion.lucro_cesante_actualizado > 0, 'Debe liquidar lucro cesante');

    console.log(`   ✓ Mayor Permanencia liquidada: $${resMayorPerm.liquidacion.monto_total_reclamado.toLocaleString('es-CO')} COP indexados al IPC`);
    console.log('   ✓ Stand-by de maquinaria al 40% aplicado correctamente');
    console.log('   ✓ Diferenciación jurídica validada: Imprevisión (Punto no pérdida) vs Hecho del Príncipe (Indemnización integral)');
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 2: Generación del Dictamen Pericial Oficial en PDF (PDFKit)
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 2: Generación de Dictamen Pericial y Solicitud de Conciliación en PDF...');
    const pdfData = {
      proceso_numero: 'LP-OBRA-2026-088',
      contrato_numero: 'CTO-2026-112',
      entidad_nombre: 'INSTITUTO DE DESARROLLO URBANO (IDU)',
      contratista_nombre: 'CONSORCIO MOVILIDAD BOGOTÁ 2026',
      contratista_nit: '901.888.777-2',
      hechos_generadores: 'Suspensión de 60 días en la troncal por retrasos de la entidad en el traslado de redes de acueducto.',
      calculo: resMayorPerm
    };

    const pdfBuffer = await equilibrioEconomicoEngine.generarDictamenReclamacionPdf(pdfData);
    assert.ok(Buffer.isBuffer(pdfBuffer), 'Debe retornar un Buffer');
    assert.ok(pdfBuffer.length > 5000, 'El PDF pericial debe tener un tamaño sustancial (> 5KB)');
    assert.strictEqual(pdfBuffer.slice(0, 4).toString(), '%PDF', 'Debe ser un PDF válido');

    console.log(`   ✓ Dictamen pericial PDF generado exitosamente (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 3: Generación de la Memoria Pericial en Excel (.xlsx)
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 3: Generación de Memoria de Cálculo Pericial en Excel (.xlsx)...');
    const excelBuffer = await equilibrioEconomicoEngine.generarCuadroLiquidacionExcel(pdfData);
    assert.ok(Buffer.isBuffer(excelBuffer), 'Debe retornar un Buffer');
    assert.ok(excelBuffer.length > 5000, 'El Excel debe tener un tamaño sustancial (> 5KB)');
    assert.strictEqual(excelBuffer.slice(0, 2).toString(), 'PK', 'Debe ser un archivo Excel válido (PK zip)');

    console.log(`   ✓ Memoria Excel pericial generada exitosamente (${(excelBuffer.length / 1024).toFixed(1)} KB)`);
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 4: Persistencia y Consultas en PostgreSQL
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 4: Persistencia en PostgreSQL (reclamaciones y anexos)...');
    const insertSql = `
      INSERT INTO reclamaciones_equilibrio_economico (
        proceso_numero, contrato_numero, entidad_nombre, contratista_nombre,
        contratista_nit, tipologia_reclamacion, fundamento_juridico,
        hechos_generadores, valor_contrato_inicial, plazo_inicial_dias,
        plazo_adicional_suspension_dias, fecha_ocurrencia_hechos,
        items_reclamacion, monto_dano_emergente, monto_lucro_cesante,
        monto_indexacion_ipc, monto_total_reclamado, porcentaje_impacto_contrato,
        estado, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *;
    `;

    const resDb = await dbPostgres.query(insertSql, [
      'TEST-PROC-EQ-001',
      'TEST-CTO-EQ-001',
      'AGENCIA NACIONAL TEST',
      'CONSORCIO TEST SAS',
      '900.777.666-4',
      'MAYOR_PERMANENCIA_OBRA',
      'Art. 27 Ley 80 de 1993',
      'Suspensión imputable a la entidad por predios',
      2500000000,
      180,
      60,
      '2026-03-01',
      JSON.stringify(resMayorPerm.items_liquidados),
      resMayorPerm.liquidacion.dano_emergente_historico,
      resMayorPerm.liquidacion.lucro_cesante_historico,
      resMayorPerm.liquidacion.indexacion_ipc_total,
      resMayorPerm.liquidacion.monto_total_reclamado,
      resMayorPerm.liquidacion.porcentaje_impacto_contrato,
      'BORRADOR',
      'Prueba automatizada'
    ]);

    const reclamacionId = resDb.rows[0].id;
    assert.ok(reclamacionId > 0, 'Debe generar un ID válido');

    // Insertar anexo de prueba
    await dbPostgres.query(`
      INSERT INTO reclamaciones_anexos_soporte (reclamacion_id, tipo_documento, nombre_archivo, descripcion)
      VALUES ($1, $2, $3, $4)
    `, [reclamacionId, 'BITACORA_OBRA', 'Acta_Suspension_01.pdf', 'Acta formal de suspensión por predios']);

    // Consultar con subquery
    const checkRes = await dbPostgres.query(`
      SELECT r.*,
        (SELECT COUNT(*) FROM reclamaciones_anexos_soporte a WHERE a.reclamacion_id = r.id) as total_anexos
      FROM reclamaciones_equilibrio_economico r
      WHERE r.id = $1
    `, [reclamacionId]);

    assert.strictEqual(parseInt(checkRes.rows[0].total_anexos, 10), 1, 'Debe registrar 1 anexo asociado');

    // Limpieza
    await dbPostgres.query('DELETE FROM reclamaciones_equilibrio_economico WHERE id = $1', [reclamacionId]);
    console.log(`   ✓ Reclamación guardada (ID: ${reclamacionId}), anexo verificado y borrado limpio`);
    passed++;

  } catch (err) {
    console.error('❌ Error en test suite de equilibrio económico:', err);
    process.exit(1);
  }

  console.log(`\n=======================================================`);
  console.log(`🎉 TODAS LAS PRUEBAS PASARON EXITOSAMENTE: ${passed}/${total} (100%)`);
  console.log(`=======================================================\n`);
  process.exit(0);
}

runTestSuite();
