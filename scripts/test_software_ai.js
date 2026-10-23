/**
 * ====================================================================
 * RADAR SECOP - TEST SUITE: SUITE DE SOFTWARE, CONSULTORÍA & SERVICIOS DE IA
 * Marco Normativo y Técnico:
 * - Ley 1150 de 2007, Art. 2 Numeral 3 (Concurso de Méritos para TI y Consultoría)
 * - Guía Oficial de CCE para Estimación por Factor Multiplicador (Decreto 1082/2015)
 * - Estatuto Tributario: Art. 476 Numerales 23 y 24 (Exclusión de IVA Cloud y Software)
 * - Ley 23 de 1982 y Ley 1450 de 2011, Art. 20 (Cesión de Derechos Patrimoniales de Autor)
 * ====================================================================
 */

const assert = require('assert');
const softwareAIEngine = require('../server/softwareAIEngine');
const dbPostgres = require('../server/dbPostgres');

async function runTestSuite() {
  console.log('🧪 Iniciando Test Suite: Software, Consultoría & Servicios de Inteligencia Artificial...\n');
  let passed = 0;
  let total = 6;

  try {
    // -------------------------------------------------------------
    // PRUEBA 1: Factor Multiplicador CCE Oficial (Decreto 1082/2015)
    // -------------------------------------------------------------
    console.log('🔹 Prueba 1: Cálculo del Factor Multiplicador de Consultoría y TI (CCE)...');

    const fmResult = softwareAIEngine.calcularFactorMultiplicador({
      factorPrestacionalPct: 52.0,
      factorCostosIndirectosPct: 25.0,
      factorUtilidadHonorariosPct: 15.0
    });

    assert.strictEqual(fmResult.factor_multiplicador, 1.92);
    assert.strictEqual(fmResult.factor_prestacional_pct, 52.0);
    assert.strictEqual(fmResult.factor_costos_indirectos_pct, 25.0);
    assert.strictEqual(fmResult.factor_utilidad_honorarios_pct, 15.0);

    console.log('   ✓ Factor Multiplicador CCE verificado: FM = 1.920x (Prestacional 52%, Indirectos 25%, Honorarios 15%)');
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 2: Presupuestación Integral de Software & Tokens de IA
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 2: Presupuestación de equipo técnico, sprints y consumo de tokens de IA...');

    const rolesTest = [
      { rol: 'AI Solutions Architect', nivel: 'LEAD', salarioBaseMes: 12000000, dedicacionPct: 100 },
      { rol: 'Senior Fullstack Engineer', nivel: 'SENIOR', salarioBaseMes: 8000000, dedicacionPct: 100 },
      { rol: 'DevOps & SRE Specialist', nivel: 'SENIOR', salarioBaseMes: 8000000, dedicacionPct: 50 }
    ];

    // Costo directo mes: 12M + 8M + 4M = 24M
    // Con FM 1.92: 24M * 1.92 = 46.080.000 COP/mes
    // En 6 meses: 46.080.000 * 6 = 276.480.000 COP

    const estimacion = softwareAIEngine.estimarPresupuestoSoftwareIA({
      roles: rolesTest,
      factorMultiplicador: 1.92,
      duracionMeses: 6,
      sprintsTotales: 12,
      consumoCloudTokens: {
        tokens_llm_millon: 100, // 100 M tokens
        costo_por_millon_cop: 200000, // $20.000.000
        infraestructura_cloud_mes: 5000000, // 5M * 6 = $30.000.000
        vector_db_y_herramientas: 6000000 // $6.000.000
      }
    });

    assert.strictEqual(estimacion.resumen_personal.costo_directo_salarios_mes, 24000000);
    assert.strictEqual(estimacion.resumen_personal.costo_total_personal_mes, 46080000);
    assert.strictEqual(estimacion.resumen_personal.costo_total_personal_proyecto, 276480000);

    // Cloud: 20M + 30M + 6M = 56.000.000
    assert.strictEqual(estimacion.resumen_cloud_ia.costo_total_cloud_tokens, 56000000);

    // Presupuesto total: 276.480.000 + 56.000.000 = 332.480.000
    assert.strictEqual(estimacion.presupuesto_total_estimado, 332480000);
    assert.strictEqual(estimacion.costo_promedio_por_sprint, 27706666.67);

    // Verificación de blindaje tributario de TI
    assert.strictEqual(estimacion.regimen_tributario_sugerido.exclusion_iva_cloud, true);
    assert.strictEqual(estimacion.regimen_tributario_sugerido.contribucion_obra_ley_1106, false);

    console.log('   ✓ Nómina de desarrollo calculada con exactitud: $276.480.000 COP');
    console.log('   ✓ Cómputo Cloud y Tokens de IA auditados: $56.000.000 COP');
    console.log('   ✓ Presupuesto Total consolidado: $332.480.000 COP (Costo/Sprint: $27.706.666 COP)');
    console.log('   ✓ Blindaje tributario validado: Exclusión IVA Art. 476 y NO aplica Ley 1106');
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 3: Supervisión Pericial de SLAs & Métricas de Modelos de IA
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 3: Evaluación de Acuerdos de Nivel de Servicio (SLAs) y calidad de IA...');

    // Caso A: Conforme óptimo
    const slasOptimo = softwareAIEngine.evaluarSlasYCalidadIA({
      uptimeReal: 99.98,
      uptimeMeta: 99.90,
      latenciaRealMs: 120,
      latenciaMetaMs: 200,
      mttrRealHoras: 0.8,
      mttrMetaHoras: 2.0,
      codeCoveragePct: 91.5,
      vulnerabilidadesCriticas: 0,
      precisionModeloIaPct: 95.5,
      f1ScoreIaPct: 94.8,
      tasaAlucinacionIaPct: 0.8
    });

    assert.strictEqual(slasOptimo.estado_global, 'CONFORME_OPTIMO');
    assert.strictEqual(slasOptimo.es_penalizable, false);
    assert.strictEqual(slasOptimo.fallas_detectadas.length, 0);

    // Caso B: Incumplimiento penalizable
    const slasFalla = softwareAIEngine.evaluarSlasYCalidadIA({
      uptimeReal: 98.50, // Falla Uptime
      uptimeMeta: 99.90,
      latenciaRealMs: 350, // Falla latencia
      latenciaMetaMs: 200,
      vulnerabilidadesCriticas: 3, // Falla seguridad
      tasaAlucinacionIaPct: 4.5 // Falla alucinación
    });

    assert.strictEqual(slasFalla.estado_global, 'PENALIZABLE_SLA_INCUMPLIDO');
    assert.strictEqual(slasFalla.es_penalizable, true);
    assert.ok(slasFalla.fallas_detectadas.length >= 3);

    console.log('   ✓ SLA Óptimo validado (Uptime 99.98%, Latencia 120ms, Alucinación 0.8%, Coverage 91.5%)');
    console.log('   ✓ Detección de incumplimiento de SLA y riesgo de penalización verificado');
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 4: Calificación de Personal para Concurso de Méritos (Ley 1150)
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 4: Calificación técnica de equipo para Concurso de Méritos...');

    const perfilesTest = [
      {
        profesional: 'Dra. Elena Gómez',
        rol: 'Directora de Proyecto & IA',
        posgrado: 'Doctorado en Ciencias de la Computación',
        mesesExperiencia: 72,
        certificaciones: ['PMP', 'Google Cloud Certified Professional ML Engineer', 'Scrum Master']
      },
      {
        profesional: 'Ing. Carlos Medina',
        rol: 'Arquitecto Cloud & DevOps',
        posgrado: 'Maestría en Seguridad de la Información',
        mesesExperiencia: 65,
        certificaciones: ['AWS Certified Solutions Architect', 'CKA Kubernetes']
      }
    ];

    const calif = softwareAIEngine.evaluarEquipoConcursoMeritos({ perfiles: perfilesTest });

    assert.ok(calif.puntaje_total_concurso >= 70.0);
    assert.strictEqual(calif.dictamen_habilitacion, 'HABILITADO_ALTO_PUNTAJE');
    assert.strictEqual(calif.perfiles_evaluados.length, 2);

    console.log(`   ✓ Equipo técnico evaluado: Puntaje obtenido ${calif.puntaje_total_concurso}/100 pts (${calif.dictamen_habilitacion})`);
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 5: Generación de Dictamen Técnico en PDF y Memoria Excel
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 5: Generación de Dictamen Técnico PDF y Memoria en Excel (.xlsx)...');

    const pdfData = {
      proceso_numero: 'CM-TI-TEST-2026',
      contrato_numero: 'CTO-TI-TEST-99',
      entidad_nombre: 'MINISTERIO DE LAS TIC - MINTIC',
      contratista_nombre: 'NIKADU IA S.A.S.',
      contratista_nit: '901.888.777-1',
      nombre_proyecto: 'Agentes Inteligentes y Analítica de Datos para Gestión Pública',
      estimacion,
      slas: slasOptimo
    };

    const pdfBuffer = await softwareAIEngine.generarDictamenTecnicoSoftwarePdf(pdfData);
    assert.ok(Buffer.isBuffer(pdfBuffer));
    assert.ok(pdfBuffer.length > 4000, 'El PDF técnico debe ser superior a 4 KB');

    const xlsxBuffer = await softwareAIEngine.generarMemoriaCosteoSoftwareExcel(pdfData);
    assert.ok(Buffer.isBuffer(xlsxBuffer));
    assert.ok(xlsxBuffer.length > 5000, 'El archivo XLSX debe contener hojas de cálculo y fórmulas');

    console.log(`   ✓ Dictamen técnico PDF generado exitosamente (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
    console.log(`   ✓ Memoria de costeo Excel generada exitosamente (${(xlsxBuffer.length / 1024).toFixed(1)} KB)`);
    passed++;

    // -------------------------------------------------------------
    // PRUEBA 6: Persistencia e Integridad Relacional en PostgreSQL
    // -------------------------------------------------------------
    console.log('\n🔹 Prueba 6: Persistencia e integridad en las 4 tablas de PostgreSQL...');

    await dbPostgres.query("DELETE FROM tech_ai_proyectos_estimacion WHERE contrato_numero = 'CTO-TI-TEST-99'");

    // 6.1 Insertar proyecto
    const insProj = `
      INSERT INTO tech_ai_proyectos_estimacion (
        contrato_numero, proceso_numero, entidad_nombre, contratista_nombre, contratista_nit,
        nombre_proyecto_software, modalidad_estimacion, roles_equipo, factor_multiplicador_calculado,
        costo_total_personal_mes, costo_total_personal_proyecto, duracion_meses, sprints_totales,
        consumo_cloud_tokens, costo_total_cloud_tokens, presupuesto_total_estimado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, contrato_numero, presupuesto_total_estimado;
    `;

    const projRes = await dbPostgres.query(insProj, [
      'CTO-TI-TEST-99',
      'CM-TI-TEST-2026',
      'MINISTERIO DE LAS TIC - MINTIC',
      'NIKADU IA S.A.S.',
      '901.888.777-1',
      'Agentes Inteligentes y Analítica de Datos para Gestión Pública',
      'FACTOR_MULTIPLICADOR_CCE',
      JSON.stringify(rolesTest),
      1.920,
      46080000,
      276480000,
      6,
      12,
      JSON.stringify({ tokens_millon: 100 }),
      56000000,
      332480000
    ]);

    const projId = projRes.rows[0].id;
    assert.ok(projId > 0);
    assert.strictEqual(parseFloat(projRes.rows[0].presupuesto_total_estimado), 332480000);

    // 6.2 Insertar SLAs
    const insSla = `
      INSERT INTO tech_ai_metricas_sla_calidad (
        contrato_numero, proyecto_id, periodo_evaluacion, uptime_disponibilidad_pct,
        latencia_promedio_ms, mttr_tiempo_recuperacion_horas, code_coverage_pct,
        vulnerabilidades_owasp_criticas, precision_modelo_ia_pct, f1_score_ia_pct,
        tasa_alucinacion_ia_pct, cumplimiento_global_sla
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id;
    `;

    const slaRes = await dbPostgres.query(insSla, [
      'CTO-TI-TEST-99',
      projId,
      'Mes 01 - Fase Inferencia',
      99.98,
      120,
      0.8,
      91.5,
      0,
      95.5,
      94.8,
      0.8,
      'CONFORME_OPTIMO'
    ]);
    assert.ok(slaRes.rows[0].id > 0);

    // 6.3 Insertar Propiedad Intelectual
    const insPi = `
      INSERT INTO tech_ai_propiedad_intelectual (
        contrato_numero, proyecto_id, tipo_cesion, reserva_derechos_morales,
        repositorio_git_url, estado_certificacion
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
    `;

    const piRes = await dbPostgres.query(insPi, [
      'CTO-TI-TEST-99',
      projId,
      'CESION_PATRIMONIAL_TOTAL_LEY_1450',
      true,
      'https://github.com/nikadu-ia/proyecto-mintic.git',
      'CERTIFICADO_Y_ENTREGADO'
    ]);
    assert.ok(piRes.rows[0].id > 0);

    console.log('   ✓ Proyecto, métricas de SLA y certificado de propiedad intelectual persistidos en PostgreSQL');
    passed++;

    console.log(`\n=======================================================`);
    console.log(`🎉 TEST SUITE FINALIZADA: ${passed}/${total} PRUEBAS EXITOSAS (100%)`);
    console.log(`=======================================================\n`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR EN TEST SUITE SOFTWARE & IA:', error);
    process.exit(1);
  }
}

runTestSuite();
