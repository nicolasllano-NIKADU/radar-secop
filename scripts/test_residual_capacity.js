// ============================================================================
// RADAR SECOP - INTEGRATION TEST: CAPACIDAD RESIDUAL (K RESIDUAL) Y FORMULARIO 5 CCE
// Normativa: Ley 80/1993, Ley 1150/2007, Decreto 1082/2015 (Art. 2.2.1.1.1.6.4)
// y Guía Metodológica de Capacidad Residual de ANCP - Colombia Compra Eficiente.
// ============================================================================

const residualCapacityEngine = require('../server/residualCapacityEngine');
const dbPostgres = require('../server/dbPostgres');

async function runTests() {
  console.log('🧪 Iniciando pruebas de Capacidad Residual (K_R), SCE y Formulario 5 CCE...\n');
  let testPerfilId = null;
  let testEmpresaId = null;

  try {
    // 1. Verificación matemática de los Factores Oficiales CCE (CO, E, CT, CF)
    console.log('1️⃣ Verificando algoritmos y fórmulas reglamentarias CCE:');
    const smmlv2026 = 1423500;
    const datosPrueba = {
      activo_corriente: 4500000000,
      pasivo_corriente: 1500000000,
      patrimonio: 6000000000,
      activo_total: 7500000000,
      pasivo_total: 1500000000,
      utilidad_operacional: 850000000,
      gastos_intereses: 120000000,
      ingresos_operacionales: 9500000000, // ~6.673 SMMLV
      experiencia_obras_smmlv: 6000,
      numero_ingenieros_arquitectos: 5,
      numero_tecnicos_tecnologos: 3
    };

    const factores = residualCapacityEngine.calcularFactoresKR(datosPrueba, smmlv2026);

    console.log(`   ✓ Capacidad de Organización (CO): $${factores.componentes.capacidad_operativa_co.cop.toLocaleString('es-CO')} (${factores.componentes.capacidad_operativa_co.smmlv} SMMLV)`);
    console.log(`   ✓ Experiencia en Obras (E): $${factores.componentes.experiencia_e.cop.toLocaleString('es-CO')} (${factores.componentes.experiencia_e.smmlv} SMMLV)`);
    console.log(`   ✓ Capacidad Técnica (CT): $${factores.componentes.capacidad_tecnica_ct.cop.toLocaleString('es-CO')} (${factores.componentes.capacidad_tecnica_ct.smmlv} SMMLV)`);
    console.log(`   ✓ Capacidad Financiera (CF): $${factores.componentes.capacidad_financiera_cf.cop.toLocaleString('es-CO')} (${factores.componentes.capacidad_financiera_cf.smmlv} SMMLV)`);
    console.log(`   ✓ Capacidad Bruta Sumada: $${factores.k_bruto.cop.toLocaleString('es-CO')} (${factores.k_bruto.smmlv} SMMLV)`);

    if (factores.componentes.capacidad_tecnica_ct.smmlv !== ((5 * 40) + (3 * 20))) {
      throw new Error('Fallo en la ponderación de la nómina técnica CT');
    }
    if (factores.k_bruto.cop <= 0 || factores.k_bruto.smmlv <= 0) {
      throw new Error('Fallo en el cálculo de la capacidad bruta consolidada');
    }

    // 2. Crear Empresa y Perfil de KR en PostgreSQL
    console.log('\n2️⃣ Creando perfil de capacidad residual en PostgreSQL:');
    let empRes = await dbPostgres.query('SELECT id FROM empresas LIMIT 1');
    testEmpresaId = empRes.rows.length > 0 ? empRes.rows[0].id : null;

    if (!testEmpresaId) {
      const newEmp = await dbPostgres.query(`
        INSERT INTO empresas (nit, razon_social, correo_contacto)
        VALUES ('901888777-2', 'CONSTRUCTORA DE INFRAESTRUCTURA Y VÍAS S.A.S.', 'licitaciones@civias.co')
        RETURNING id
      `);
      testEmpresaId = newEmp.rows[0].id;
    }

    const perfilGuardado = await residualCapacityEngine.guardarPerfil(testEmpresaId, {
      ...datosPrueba,
      nombre_perfil: 'Perfil Prueba Licitación Pliegos Tipo',
      año_fiscal: 2025,
      smmlv_vigente: smmlv2026
    });

    testPerfilId = perfilGuardado.id;
    console.log(`   ✓ Perfil registrado con ID ${testPerfilId}: "${perfilGuardado.nombre_perfil}"`);
    console.log(`   ✓ K Bruto registrado: $${parseFloat(perfilGuardado.k_bruto_cop).toLocaleString('es-CO')} COP`);

    // 3. Registrar Contratos en Ejecución (Factor Deductor SCE)
    console.log('\n3️⃣ Registrando contratos en ejecución individuales y en consorcio (SCE):');
    
    // Contrato 1: Individual (100% participación)
    // Total $2.000M, Facturado $800M -> Saldo imputable = $1.200M
    const sce1 = await residualCapacityEngine.agregarContratoSCE(testPerfilId, {
      empresa_id: testEmpresaId,
      entidad_contratante: 'INSTITUTO NACIONAL DE VÍAS (INVIAS)',
      numero_contrato: 'CTR-INVIAS-2025-110',
      objeto_contrato: 'Mantenimiento periódico corredor troncal central',
      valor_total_contrato: 2000000000,
      valor_facturado_actas: 800000000,
      porcentaje_participacion: 100.0,
      es_estructura_plural: false
    });
    console.log(`   ✓ Contrato Individual agregado: Saldo Imputable = $${sce1.saldo_imputable_proponente.toLocaleString('es-CO')} COP`);

    // Contrato 2: En Consorcio / Unión Temporal (35% participación)
    // Total $4.000M, Facturado $1.000M -> Pendiente $3.000M * 35% = $1.050M imputable
    const sce2 = await residualCapacityEngine.agregarContratoSCE(testPerfilId, {
      empresa_id: testEmpresaId,
      entidad_contratante: 'INSTITUTO DE DESARROLLO URBANO (IDU)',
      numero_contrato: 'IDU-LP-2025-442',
      objeto_contrato: 'Construcción calzada vehicular transmilenio',
      valor_total_contrato: 4000000000,
      valor_facturado_actas: 1000000000,
      porcentaje_participacion: 35.0,
      es_estructura_plural: true,
      nombre_estructura_plural: 'CONSORCIO VIAL BOGOTÁ 2025'
    });
    console.log(`   ✓ Contrato Plural agregado (35%): Saldo Imputable = $${sce2.saldo_imputable_proponente.toLocaleString('es-CO')} COP`);

    // 4. Verificación del Cálculo Consolidado (K_R = K_Bruto - SCE)
    console.log('\n4️⃣ Verificando cálculo consolidado de Capacidad Residual:');
    const consolidado = await residualCapacityEngine.getCalculoConsolidado(testPerfilId);

    const sceTotalEsperado = 1200000000 + 1050000000; // $2.250.000.000 COP
    console.log(`   ✓ Total SCE Deductor Calculado: $${consolidado.total_sce_cop.toLocaleString('es-CO')} COP`);
    console.log(`   ✓ Capacidad Residual Neta Disponible (K_R): $${consolidado.k_residual_disponible_cop.toLocaleString('es-CO')} COP (${consolidado.k_residual_disponible_smmlv} SMMLV)`);

    if (consolidado.total_sce_cop !== sceTotalEsperado) {
      throw new Error(`Inconsistencia en SCE total: esperado ${sceTotalEsperado}, obtenido ${consolidado.total_sce_cop}`);
    }
    if (consolidado.k_residual_disponible_cop !== (consolidado.k_bruto_cop - sceTotalEsperado)) {
      throw new Error('Fallo en la resta de Capacidad Residual Neta K_R');
    }

    // 5. Simulación Predictiva de Pipeline Concurrente (Efecto Cascada y Desgaste de KR)
    console.log('\n5️⃣ Ejecutando simulación de pipeline concurrente (3 procesos simultáneos):');
    const procesosSimulacion = [
      {
        id: 'SIM-PROC-01',
        referencia: 'LP-INVIAS-091-2026',
        entidad: 'INVIAS',
        objeto: 'Pavimentación variante occidental',
        presupuesto_oficial: 3000000000,
        k_requerido: 3000000000,
        fecha_adjudicacion: '2026-11-15'
      },
      {
        id: 'SIM-PROC-02',
        referencia: 'LP-GOB-CUND-055-2026',
        entidad: 'GOBERNACIÓN DE CUNDINAMARCA',
        objeto: 'Rehabilitación puente vehicular',
        presupuesto_oficial: 4500000000,
        k_requerido: 4500000000,
        fecha_adjudicacion: '2026-11-25'
      },
      {
        id: 'SIM-PROC-03',
        referencia: 'LP-ALC-MED-102-2026',
        entidad: 'ALCALDÍA DE MEDELLÍN',
        objeto: 'Construcción vía urbana tramo 4',
        presupuesto_oficial: 8000000000,
        k_requerido: 8000000000,
        fecha_adjudicacion: '2026-12-05'
      }
    ];

    const simResultado = await residualCapacityEngine.simularPipelineConcurrente(testPerfilId, procesosSimulacion);

    console.log(`   ✓ Procesos evaluados en cascada: ${simResultado.procesos_evaluados}`);
    console.log(`   ✓ Riesgo de inhabilitación sobreviniente detectado: ${simResultado.riesgo_inhabilitacion ? 'SÍ ⚠️' : 'NO ✅'}`);
    if (simResultado.proceso_critico) {
      console.log(`   ✓ Proceso crítico de quiebre de KR: ${simResultado.proceso_critico}`);
    }
    console.log(`   ✓ Recomendación estratégica: ${simResultado.recomendacion.substring(0, 110)}...`);

    if (!simResultado.trazabilidad_cascada || simResultado.trazabilidad_cascada.length !== 3) {
      throw new Error('Fallo en la trazabilidad del pipeline concurrente');
    }

    // 6. Generación de Formulario 5 Oficial ANCP-CCE en PDF
    console.log('\n6️⃣ Generando Formulario 5 Oficial ANCP-CCE en PDF (pdfkit):');
    const pdfBuffer = await residualCapacityEngine.generarFormulario5Pdf(testPerfilId, {
      entidad: 'INSTITUTO NACIONAL DE VÍAS (INVIAS)',
      referencia: 'LP-DO-001-2026',
      k_requerido: 3500000000
    }, {
      nombre_representante: 'Ing. Carlos Alberto Mendoza',
      cedula_representante: '79.888.999 de Bogotá',
      nombre_contador: 'Dra. Martha Cecilia Gómez',
      tarjeta_profesional: '154820-T',
      cedula_contador: '52.333.444 de Bogotá'
    });

    console.log(`   ✓ Formulario 5 PDF generado: ${pdfBuffer.length} bytes.`);
    const pdfHeader = pdfBuffer.slice(0, 4).toString('ascii');
    if (pdfHeader !== '%PDF') {
      throw new Error(`Encabezado PDF inválido: ${pdfHeader}`);
    }
    console.log(`   ✓ Cabecera binaria validada: "${pdfHeader}"`);

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE CAPACIDAD RESIDUAL (K_R) Y FORMULARIO 5 PASARON EXITOSAMENTE (100%)!\n');

  } catch (err) {
    console.error('\n❌ ERROR EN LA SUITE DE PRUEBAS DE CAPACIDAD RESIDUAL:', err);
    process.exitCode = 1;
  } finally {
    // Limpieza de datos de prueba
    if (testPerfilId) {
      try {
        await dbPostgres.query('DELETE FROM capacidad_residual_perfiles WHERE id = $1', [testPerfilId]);
        console.log(`🧹 Perfil de prueba ${testPerfilId} y sus contratos SCE eliminados limpiamente (CASCADE).`);
      } catch (cleanErr) {
        console.warn('Advertencia durante limpieza:', cleanErr.message);
      }
    }
    await dbPostgres.pool.end();
  }
}

runTests();
