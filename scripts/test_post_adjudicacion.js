// ============================================================================
// RADAR SECOP - INTEGRATION TEST: GESTIÓN CONTRACTUAL POST-ADJUDICACIÓN
// Normativa: Ley 80/1993, Ley 1150/2007 (Art. 11), Decreto 1082/2015
// ============================================================================

const postAdjudicacionEngine = require('../server/postAdjudicacionEngine');
const dbPostgres = require('../server/dbPostgres');

async function runTests() {
  console.log('🧪 Iniciando pruebas de Control de Ejecución Contractual y Garantías Post-Adjudicación...\n');
  let testContratoId = null;

  try {
    // 1. Verificación del algoritmo del semáforo de vigencia de pólizas
    console.log('1️⃣ Verificando semáforo de vigencia de pólizas contractuales:');
    const semVencida = postAdjudicacionEngine.calcularSemaforoPoliza(-3);
    const semNivel3 = postAdjudicacionEngine.calcularSemaforoPoliza(4);
    const semNivel2 = postAdjudicacionEngine.calcularSemaforoPoliza(12);
    const semNivel1 = postAdjudicacionEngine.calcularSemaforoPoliza(25);
    const semVigente = postAdjudicacionEngine.calcularSemaforoPoliza(180);

    if (semVencida.nivel !== 'VENCIDA' || semNivel3.nivel !== 'NIVEL_3_EXTRAORDINARIO' ||
        semNivel2.nivel !== 'NIVEL_2_CRITICO' || semNivel1.nivel !== 'NIVEL_1_PREVENTIVO' ||
        semVigente.nivel !== 'VIGENTE') {
      throw new Error('Fallo en la escala semafórica de pólizas');
    }
    console.log('   ✓ Póliza vencida (-3 días): ' + semVencida.texto);
    console.log('   ✓ Póliza en riesgo crítico (4 días): ' + semNivel3.texto);
    console.log('   ✓ Póliza en alerta (12 días): ' + semNivel2.texto);
    console.log('   ✓ Póliza preventiva (25 días): ' + semNivel1.texto);
    console.log('   ✓ Póliza en regla (180 días): ' + semVigente.texto);

    // 2. Preparar datos de prueba en la base de datos (Empresa y Contrato)
    console.log('\n2️⃣ Creando contrato de prueba en PostgreSQL:');
    let empRes = await dbPostgres.query('SELECT id FROM empresas LIMIT 1');
    let empresaId = empRes.rows.length > 0 ? empRes.rows[0].id : null;

    if (!empresaId) {
      const newEmp = await dbPostgres.query(`
        INSERT INTO empresas (nit, razon_social, correo_contacto)
        VALUES ('900999888-1', 'CONSORCIO VIAL COLOMBIA TEST SAS', 'gerencia@consorciovial.co')
        RETURNING id
      `);
      empresaId = newEmp.rows[0].id;
    }

    const valorAdjudicado = 1200000000; // $1.200M COP
    const valorAdicionado = 300000000;  // $300M COP (dentro del tope del 50%)

    const ctrRes = await dbPostgres.query(`
      INSERT INTO contratos_gestion (
        empresa_id, numero_contrato, referencia_proceso, entidad_contratante,
        objeto_contractual, valor_adjudicado, valor_adicionado,
        fecha_suscripcion, plazo_dias, tipo_plazo, estado_ejecucion,
        supervisor_nombre, tiene_registro_presupuestal, numero_rp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, numero_contrato
    `, [
      empresaId,
      'CO1.PCONTRATO.999888',
      'LP-IDU-2026-055',
      'INSTITUTO DE DESARROLLO URBANO (IDU)',
      'CONSTRUCCIÓN Y ADECUACIÓN DE INFRAESTRUCTURA PEATONAL Y REDES',
      valorAdjudicado,
      valorAdicionado,
      '2026-01-15',
      180,
      'DIAS_CALENDARIO',
      'PERFECCIONADO',
      'Ing. Juan Pablo Morales (Supervisor IDU)',
      true,
      'RP-2026-9041'
    ]);

    testContratoId = ctrRes.rows[0].id;
    console.log(`   ✓ Contrato registrado con ID ${testContratoId} (${ctrRes.rows[0].numero_contrato}).`);

    // 3. Registrar las 5 Pólizas Contractuales Obligatorias (Decreto 1082/2015)
    console.log('\n3️⃣ Registrando las 5 pólizas contractuales reglamentarias:');
    const amparos = [
      { tipo: 'CUMPLIMIENTO_CONTRATO', pct: 10, val: 150000000, fin: '2026-12-31' },
      { tipo: 'SALARIOS_PRESTACIONES', pct: 5, val: 75000000, fin: '2029-07-15' },
      { tipo: 'BUEN_MANEJO_ANTICIPO', pct: 100, val: 240000000, fin: '2026-09-30' },
      { tipo: 'ESTABILIDAD_CALIDAD_OBRA', pct: 10, val: 150000000, fin: '2031-07-15' },
      { tipo: 'RESPONSABILIDAD_CIVIL_EXTRACONTRACTUAL', pct: 5, val: 100000000, fin: '2026-10-30' }
    ];

    for (const amp of amparos) {
      const pol = await postAdjudicacionEngine.registrarPoliza(testContratoId, {
        aseguradora: 'SEGUROS DEL ESTADO S.A.',
        numero_poliza: `POL-${Math.floor(Math.random() * 900000 + 100000)}`,
        tipo_amparo: amp.tipo,
        porcentaje_amparado: amp.pct,
        valor_asegurado: amp.val,
        fecha_inicio_vigencia: '2026-01-15',
        fecha_fin_vigencia: amp.fin,
        estado_aprobacion: 'APROBADA'
      });
      console.log(`   ✓ Póliza registrada: ${pol.tipo_amparo} (Vlr: $${pol.valor_asegurado})`);
    }

    // 4. Registro de Actas del Ciclo de Vida Contractual
    console.log('\n4️⃣ Registrando actas contractuales (Inicio, Avances, Liquidación):');
    const actaInicio = await postAdjudicacionEngine.registrarActa({
      contrato_id: testContratoId,
      tipo_acta: 'INICIO',
      numero_acta: 'ACT-001',
      fecha_acta: '2026-01-20',
      porcentaje_avance_fisico: 0,
      porcentaje_avance_financiero: 0,
      valor_acta: 0,
      observaciones: 'Acta de inicio formal una vez aprobadas las pólizas y el RP.'
    });
    console.log(`   ✓ Acta de Inicio creada: No. ${actaInicio.numero_acta}`);

    const actaParcial = await postAdjudicacionEngine.registrarActa({
      contrato_id: testContratoId,
      tipo_acta: 'PARCIAL_RECIBO',
      numero_acta: 'ACT-002-PARCIAL-1',
      fecha_acta: '2026-04-15',
      porcentaje_avance_fisico: 45.5,
      porcentaje_avance_financiero: 40.0,
      valor_acta: 600000000,
      observaciones: 'Recibo parcial de obra civil tramo A y redes hidrosanitarias.'
    });
    console.log(`   ✓ Acta Parcial de Obra creada: No. ${actaParcial.numero_acta} (Avance: 45.5%)`);

    const actaLiq = await postAdjudicacionEngine.registrarActa({
      contrato_id: testContratoId,
      tipo_acta: 'LIQUIDACION',
      numero_acta: 'ACT-LIQ-FINAL',
      fecha_acta: '2026-08-30',
      porcentaje_avance_fisico: 100.0,
      porcentaje_avance_financiero: 100.0,
      valor_acta: 1500000000,
      observaciones: 'Liquidación bilateral de mutuo acuerdo con balance final a satisfacción.'
    });
    console.log(`   ✓ Acta Bilateral de Liquidación creada: No. ${actaLiq.numero_acta}`);

    // 5. Facturación Electrónica y Giros PAC
    console.log('\n5️⃣ Registrando facturas y ejecución de tesorería PAC:');
    const factura1 = await postAdjudicacionEngine.registrarFactura({
      contrato_id: testContratoId,
      numero_factura: 'FE-8891',
      fecha_emision: '2026-04-20',
      fecha_radicacion: '2026-04-22',
      concepto: 'Pago parcial por avance de obra No. 1 según Acta 002',
      valor_bruto: 600000000,
      valor_iva: 114000000,
      valor_retenciones: 24000000,
      valor_neto_girar: 690000000,
      estado_pago: 'RADICADA'
    });
    console.log(`   ✓ Factura radicada: ${factura1.numero_factura} (Neto: $${factura1.valor_neto_girar})`);

    // Actualizar estado de factura 1 a PAGADA
    const factura1Pagada = await postAdjudicacionEngine.actualizarEstadoFactura(factura1.id, {
      estado_pago: 'PAGADA',
      fecha_pago: '2026-05-10',
      comprobante_egreso_no: 'OP-PAC-2026-55441'
    });
    console.log(`   ✓ Factura pagada por Tesorería PAC: ${factura1Pagada.comprobante_egreso_no} (Estado: ${factura1Pagada.estado_pago})`);

    const factura2 = await postAdjudicacionEngine.registrarFactura({
      contrato_id: testContratoId,
      numero_factura: 'FE-9012',
      fecha_emision: '2026-08-31',
      fecha_radicacion: '2026-09-02',
      concepto: 'Liquidación final y saldo contractual según Acta Bilateral',
      valor_bruto: 900000000,
      valor_iva: 171000000,
      valor_retenciones: 36000000,
      valor_neto_girar: 1035000000,
      estado_pago: 'EN_TESORERIA_PAC'
    });
    console.log(`   ✓ Factura radicada en PAC: ${factura2.numero_factura} (Estado: ${factura2.estado_pago})`);

    // 6. Obtención y Validación del Tablero Integral de Ejecución
    console.log('\n6️⃣ Obteniendo Tablero Consolidado de Ejecución Contractual:');
    const tablero = await postAdjudicacionEngine.getTableroEjecucion(testContratoId);

    console.log(`   ✓ Valor Total Vigente: $${tablero.balance_financiero.valor_total_vigente.toLocaleString('es-CO')}`);
    console.log(`   ✓ Tope Legal Adición (50% Ley 80/93): $${tablero.contrato.tope_adicion_50.toLocaleString('es-CO')}`);
    console.log(`   ✓ Saldo Adición Disponible: $${tablero.contrato.saldo_adicion_disponible.toLocaleString('es-CO')}`);
    console.log(`   ✓ Total Facturado Bruto: $${tablero.balance_financiero.total_facturado_bruto.toLocaleString('es-CO')}`);
    console.log(`   ✓ Total Pagado Neto PAC: $${tablero.balance_financiero.total_pagado_neto.toLocaleString('es-CO')}`);
    console.log(`   ✓ Total en Trámite PAC: $${tablero.balance_financiero.total_en_tramite_pac.toLocaleString('es-CO')}`);
    console.log(`   ✓ Pólizas registradas: ${tablero.polizas.length} (Al día: ${tablero.resumen_polizas.al_dia}, En riesgo: ${tablero.resumen_polizas.en_riesgo})`);
    console.log(`   ✓ Actas registradas: ${tablero.actas.length}`);

    if (tablero.balance_financiero.valor_total_vigente !== 1500000000 ||
        tablero.balance_financiero.total_facturado_bruto !== 1500000000 ||
        tablero.contrato.saldo_adicion_disponible !== 300000000 ||
        tablero.polizas.length !== 5 ||
        tablero.actas.length !== 3) {
      throw new Error('Inconsistencia en los balances o datos del tablero consolidado');
    }

    // 7. Generación de Acta Bilateral de Liquidación en PDF
    console.log('\n7️⃣ Generando Acta Bilateral de Liquidación en PDF (pdfkit):');
    const pdfBuffer = await postAdjudicacionEngine.generarActaLiquidacionPdf(testContratoId);
    console.log(`   ✓ PDF generado exitosamente: ${pdfBuffer.length} bytes.`);

    const pdfMagic = pdfBuffer.slice(0, 4).toString('ascii');
    if (pdfMagic !== '%PDF') {
      throw new Error(`El archivo generado no es un PDF válido. Cabecera: ${pdfMagic}`);
    }
    console.log(`   ✓ Cabecera PDF validada: "${pdfMagic}"`);

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE GESTIÓN CONTRACTUAL Y GARANTÍAS POST-ADJUDICACIÓN PASARON EXITOSAMENTE (100%)!\n');

  } catch (err) {
    console.error('\n❌ ERROR EN LA SUITE DE PRUEBAS:', err);
    process.exitCode = 1;
  } finally {
    // Limpieza del contrato de prueba
    if (testContratoId) {
      try {
        await dbPostgres.query('DELETE FROM contratos_gestion WHERE id = $1', [testContratoId]);
        console.log(`🧹 Contrato de prueba ${testContratoId} eliminado limpiamente (ON DELETE CASCADE aplicado).`);
      } catch (cleanErr) {
        console.warn('Advertencia durante limpieza de prueba:', cleanErr.message);
      }
    }
    // Cerrar pool para terminar proceso limpiamente
    await dbPostgres.pool.end();
  }
}

runTests();
