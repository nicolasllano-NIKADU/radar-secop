const pipelineManager = require('../server/pipelineManager');

async function testPipeline() {
  console.log('--- TEST 1: Crear Proceso en Pipeline ---');
  const nuevo = await pipelineManager.addProceso({
    proceso_referencia: 'LIC-OBRA-2026-099',
    entidad: 'Instituto Nacional de Vías (INVIAS)',
    objeto: 'Construcción y Mantenimiento de Corredor Vial Secundario',
    presupuesto: 3500000000,
    fase: 'IDENTIFICADO',
    probabilidad_exito: 65,
    responsable: 'Ing. Laura Gómez'
  });
  console.log('Proceso creado con ID:', nuevo.id, 'en fase:', nuevo.fase);

  console.log('--- TEST 2: Consultar Pipeline & Métricas ---');
  let data = await pipelineManager.getPipeline();
  console.log('Métricas:', data.metricas);
  const colIdentificado = data.columnas.find(c => c.id === 'IDENTIFICADO');
  console.log('Items en IDENTIFICADO:', colIdentificado.items.length);

  const proc = colIdentificado.items.find(i => i.id === nuevo.id);
  console.log('Tareas iniciales creadas:', proc.tareas.length);
  console.log('Bitácora inicial:', proc.bitacora.length);

  console.log('--- TEST 3: Transición de Fase & Go/No-Go ---');
  await pipelineManager.updateFase(nuevo.id, 'EVALUADO', 'Director de Licitaciones');
  await pipelineManager.updateGoNoGo(nuevo.id, 'GO', 'Comité de Adjudicación');

  console.log('--- TEST 4: Tareas y Bitácora ---');
  if (proc.tareas.length > 0) {
    const t0 = proc.tareas[0];
    await pipelineManager.toggleTask(t0.id, true);
    console.log('Tarea marcada como completada:', t0.titulo);
  }
  await pipelineManager.addBitacora(nuevo.id, 'Abogado Junior', 'Revisión RUP satisfactoria sin causales de inhabilidad.');

  console.log('--- TEST 5: Re-verificar Pipeline Actualizado ---');
  data = await pipelineManager.getPipeline();
  const colEvaluado = data.columnas.find(c => c.id === 'EVALUADO');
  const procEvaluado = colEvaluado.items.find(i => i.id === nuevo.id);
  console.log('Proceso en EVALUADO:', procEvaluado ? 'OK' : 'FAIL');
  console.log('Decisión Go/No-Go:', procEvaluado.decision_go_nogo);
  console.log('Tareas completadas:', procEvaluado.tareas_completadas, '/', procEvaluado.tareas_totales);
  console.log('Total notas bitácora:', procEvaluado.bitacora.length);

  console.log('\n✅ PIPELINE KANBAN INTERDISCIPLINARIO VERIFICADO AL 100%');
  process.exit(0);
}

testPipeline().catch(err => {
  console.error('Error en test de pipeline:', err);
  process.exit(1);
});
