const winRateAnalyticsEngine = require('../server/winRateAnalyticsEngine');
const pipelineManager = require('../server/pipelineManager');
const companyManager = require('../server/companyManager');
const dbPostgres = require('../server/dbPostgres');

async function testAnalytics() {
  console.log('========================================================');
  console.log('🧪 TEST: TABLERO EJECUTIVO DE WIN RATE & ROI ANALYTICS');
  console.log('========================================================\n');

  try {
    const user = await companyManager.getOrCreateDefaultUser();
    const companies = await companyManager.getCompaniesByUser(user.id);
    const emp = companies[0] || { id: 1, razon_social: 'Empresa Test', nit: '900123456' };

    console.log(`🏢 Empresa evaluada: ${emp.razon_social} (NIT: ${emp.nit})`);

    // 1. Asegurar datos en pipeline para pruebas
    const p1 = await pipelineManager.addProceso({
      empresa_id: emp.id,
      proceso_referencia: 'TEST-WIN-01',
      entidad: 'Alcaldía de Medellín',
      objeto: 'Plataforma de Analítica e Inteligencia Artificial',
      presupuesto: 600000000,
      fase: 'ADJUDICADO',
      decision_go_nogo: 'GO',
      probabilidad_exito: 100,
      responsable: 'Comité Directivo'
    });

    const p2 = await pipelineManager.addProceso({
      empresa_id: emp.id,
      proceso_referencia: 'TEST-WIN-02',
      entidad: 'Empresas Públicas de Medellín',
      objeto: 'Automatización de Procesos RPA',
      presupuesto: 400000000,
      fase: 'PERDIDO',
      decision_go_nogo: 'GO',
      probabilidad_exito: 20,
      responsable: 'Equipo Licitatorio'
    });

    const p3 = await pipelineManager.addProceso({
      empresa_id: emp.id,
      proceso_referencia: 'TEST-WIN-03',
      entidad: 'MinTIC Colombia',
      objeto: 'Desarrollo de Software a la Medida',
      presupuesto: 1200000000,
      fase: 'PRESENTADO',
      decision_go_nogo: 'GO',
      probabilidad_exito: 75,
      responsable: 'Director Comercial'
    });

    // Actualizar columnas avanzadas si aplican
    await dbPostgres.query(`
      UPDATE pipeline_procesos 
      SET modalidad = 'SELECCION_ABREVIADA', tipo_proponente = 'INDIVIDUAL', valor_ofertado = 585000000 
      WHERE id = $1;
    `, [p1.id]);

    await dbPostgres.query(`
      UPDATE pipeline_procesos 
      SET modalidad = 'LICITACION_PUBLICA', tipo_proponente = 'CONSORCIO', motivo_perdida = 'PRECIO' 
      WHERE id = $1;
    `, [p2.id]);

    await dbPostgres.query(`
      UPDATE pipeline_procesos 
      SET modalidad = 'LICITACION_PUBLICA', tipo_proponente = 'INDIVIDUAL' 
      WHERE id = $1;
    `, [p3.id]);

    console.log('✅ Procesos de prueba integrados en el pipeline.');

    // 2. Ejecutar motor de analítica
    console.log('\n--- 2. CÁLCULO DE KPIS EJECUTIVOS ---');
    const analytics = await winRateAnalyticsEngine.getExecutiveAnalytics(emp.id);

    console.log(`📈 Total Procesos: ${analytics.kpis.totalProcesos}`);
    console.log(`🏆 Procesos Adjudicados: ${analytics.kpis.adjudicados}`);
    console.log(`❌ Procesos Perdidos: ${analytics.kpis.perdidos}`);
    console.log(`⏳ Procesos en Curso: ${analytics.kpis.enCurso}`);
    console.log(`🎯 Win Rate por Oportunidades: ${analytics.kpis.winRateOportunidades}%`);
    console.log(`💰 Win Rate Financiero (COP): ${analytics.kpis.winRateFinanciero}%`);
    console.log(`💵 Monto Adjudicado: $ ${analytics.kpis.montoAdjudicado.toLocaleString('es-CO')} COP`);
    console.log(`💼 Monto Activo en Pipeline: $ ${analytics.kpis.montoTotalPipeline.toLocaleString('es-CO')} COP`);
    console.log(`⚖️ Monto Ponderado al Riesgo: $ ${analytics.kpis.montoPonderadoPipeline.toLocaleString('es-CO')} COP`);
    console.log(`🛠️ Costo Estimado de Licitación: $ ${analytics.kpis.costoTotalEstructuracion.toLocaleString('es-CO')} COP`);
    console.log(`📊 Utilidad Operativa Estimada (8%): $ ${analytics.kpis.utilidadOperativaEstimada.toLocaleString('es-CO')} COP`);
    console.log(`🚀 ROI Neto Licitatorio: ${analytics.kpis.roiLicitatorioNeto}%`);

    if (analytics.kpis.winRateOportunidades <= 0) {
      throw new Error('Cálculo de Win Rate erróneo');
    }

    // 3. Embudo de Conversión Licitatoria
    console.log('\n--- 3. EMBUDO DE CONVERSIÓN LICITATORIA (FUNNEL) ---');
    analytics.funnel.forEach((f, idx) => {
      console.log(`   ${f.icono} Paso ${idx + 1}: ${f.etapa} -> ${f.cantidad} procesos ($ ${f.volumenCOP.toLocaleString('es-CO')} COP) [${f.porcentajeRetencion}% retención]`);
    });

    if (analytics.funnel.length !== 5) {
      throw new Error('Embudo incompleto');
    }

    // 4. Segmentaciones
    console.log('\n--- 4. SEGMENTACIONES POR MODALIDAD Y PROPONENTE ---');
    console.log('Modalidades:');
    analytics.segmentacionModalidad.forEach(m => {
      console.log(`   • ${m.modalidad}: ${m.total} procesos | ${m.adjudicados} ganados | Win Rate: ${m.winRate}%`);
    });

    console.log('Estructura Proponente:');
    console.log(`   • Individual: ${analytics.segmentacionProponente.individual.total} procs | Win Rate: ${analytics.segmentacionProponente.individual.winRate}%`);
    console.log(`   • Consorcio: ${analytics.segmentacionProponente.consorcio.total} procs | Win Rate: ${analytics.segmentacionProponente.consorcio.winRate}%`);

    // 5. Proyecciones Run-Rate y Recomendaciones
    console.log('\n--- 5. PROYECCIONES RUN-RATE & RECOMENDACIONES ESTRATÉGICAS ---');
    console.log(`   • Run-rate a 30 días: $ ${analytics.runRateProyeccion.d30.toLocaleString('es-CO')} COP`);
    console.log(`   • Run-rate a 60 días: $ ${analytics.runRateProyeccion.d60.toLocaleString('es-CO')} COP`);
    console.log(`   • Run-rate a 90 días: $ ${analytics.runRateProyeccion.d90.toLocaleString('es-CO')} COP`);

    console.log('\nRecomendaciones Algorítmicas:');
    analytics.recomendaciones.forEach((r, idx) => {
      console.log(`   [${r.tipo}] ${idx + 1}. ${r.titulo}: ${r.mensaje}`);
    });

    if (analytics.recomendaciones.length === 0) {
      throw new Error('No se generaron recomendaciones estratégicas');
    }

    console.log('\n========================================================');
    console.log('🎉 TODOS LOS TESTS DE WIN RATE & ANALYTICS PASARON EXITOSAMENTE!');
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ Error en el test de analytics:', err);
    process.exit(1);
  } finally {
    await dbPostgres.pool.end();
  }
}

testAnalytics();
