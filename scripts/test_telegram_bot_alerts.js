/**
 * ====================================================================
 * RADAR SECOP - SUITE DE PRUEBAS DE TELEGRAM BOT & NOTIFICACIONES PUSH
 * Marco: Ley 1882/2018 (Adendas), Ley 80/93 (Evaluación), Dec. 1082/2015 (Garantías)
 * ====================================================================
 */

const telegramBotEngine = require('../server/telegramBotEngine');
const dbPostgres = require('../server/dbPostgres');
const assert = require('assert');

async function runTestSuite() {
  console.log('======================================================================');
  console.log('🧪 INICIANDO TEST SUITE: TELEGRAM BOT Y ALERTAS PUSH EN TIEMPO REAL');
  console.log('   Marco: SECOP II • Ley 1882/2018 • Ley 80/1993 • Decreto 1082/2015');
  console.log('======================================================================\n');

  const DUMMY_CHAT_ID = '123456789';

  // ---------------------------------------------------------
  // TEST 1: Configuración de Canales y Segmentación de Alertas
  // ---------------------------------------------------------
  console.log('--- TEST 1: Gestión de Canales Corporativos de Telegram ---');
  const nuevoCanal = await telegramBotEngine.guardarCanal({
    alias: 'Canal Licitaciones Infraestructura Vial',
    chat_id: '-1001987654321',
    alertar_oportunidades_fit: true,
    score_minimo_fit: 80,
    alertar_adendas_cronograma: true,
    alertar_evaluacion_traslado: true,
    alertar_polizas_vencimiento: true
  });

  assert.ok(nuevoCanal.id, 'Debe retornar el ID del canal creado');
  assert.strictEqual(nuevoCanal.chat_id, '-1001987654321');
  console.log(`  ✅ Canal registrado: "${nuevoCanal.alias}" [ID: ${nuevoCanal.id}, Chat: ${nuevoCanal.chat_id}]`);

  const canalesList = await telegramBotEngine.listarCanales();
  assert.ok(canalesList.length > 0, 'Debe haber al menos un canal registrado');
  const canalEncontrado = canalesList.find(c => c.id === nuevoCanal.id);
  assert.ok(canalEncontrado, 'El canal debe aparecer en la lista');
  console.log(`  ✅ Lista de canales consultada exitosamente (${canalesList.length} canales activos)`);

  // ---------------------------------------------------------
  // TEST 2: Suscripción de Proceso a Alertas en Tiempo Real
  // ---------------------------------------------------------
  console.log('\n--- TEST 2: Suscripción de Procesos Licitatorios Específicos ---');
  const suscrip = await telegramBotEngine.suscribirProceso({
    proceso_id: 'PROC-TEST-INV-001',
    numero_proceso: 'LP-INVIAS-099-2026',
    entidad: 'INSTITUTO NACIONAL DE VÍAS (INVIAS)',
    objeto: 'Construcción y pavimentación corredor perimetral',
    chat_id: DUMMY_CHAT_ID
  });

  assert.ok(suscrip.id, 'Debe retornar la suscripción creada');
  console.log(`  ✅ Proceso suscrito a alertas push: ${suscrip.numero_proceso} -> Chat: ${suscrip.chat_id}`);

  const suscripciones = await telegramBotEngine.listarSuscripciones();
  const subFound = suscripciones.find(s => s.proceso_id === 'PROC-TEST-INV-001');
  assert.ok(subFound, 'El proceso debe estar en la lista de monitoreo activo');
  console.log(`  ✅ Verificada presencia en la lista de monitoreo en tiempo real`);

  // ---------------------------------------------------------
  // TEST 3: Formateo y Generación de Alertas Especializadas
  // ---------------------------------------------------------
  console.log('\n--- TEST 3: Validación de Formatos de Alertas Especializadas ---');

  // 3.1: Alerta de Oportunidad de Alta Afinidad
  console.log('  3.1 Alerta de Oportunidad High-Fit:');
  const itemOportunidad = {
    id: 'OP-2026-001',
    referencia: 'LP-IDU-042-2026',
    entidad: 'INSTITUTO DE DESARROLLO URBANO (IDU)',
    precio_base: 4500000000,
    score_relevancia: 95,
    descripcion: 'Mantenimiento integral de puentes peatonales y malla vial troncal',
    departamento: 'Bogotá D.C.',
    fecha_cierre: '2026-11-30T17:00:00Z',
    url: 'https://community.secop.gov.co/proceso/OP-2026-001'
  };
  const resOportunidad = await telegramBotEngine.notificarOportunidadAltaAfinidad(itemOportunidad);
  assert.ok(Array.isArray(resOportunidad), 'Debe retornar arreglo de resultados de envío');
  console.log('    ✅ Alerta High-Fit procesada y registrada en bitácora');

  // 3.2: Alerta Crítica de Adenda y Cronograma (Ley 1882/2018)
  console.log('  3.2 Alerta Crítica de Adenda y Modificación de Cronograma:');
  const adendaCritica = {
    numero_adenda: '02',
    numero_proceso: 'LP-INVIAS-099-2026',
    entidad_nombre: 'INSTITUTO NACIONAL DE VÍAS (INVIAS)',
    tipo_modificacion: 'Prórroga de Cierre y Modificación de Pliegos',
    fecha_cierre_anterior: new Date(Date.now() + 86400000 * 2), // 2 días (menos de 3 días = alerta Ley 1882)
    fecha_cierre_nueva: new Date(Date.now() + 86400000 * 10),
    dias_prorroga: 8,
    descripcion_cambios: 'Se amplía el plazo de cierre en 8 días y se ajustan índices financieros del RUP.',
    impacto_poliza_seriedad: true,
    cumplimiento_ley_1882: true
  };
  const resAdenda = await telegramBotEngine.notificarAdendaCronograma(adendaCritica, {
    referencia: 'LP-INVIAS-099-2026',
    entidad: 'INVIAS',
    url: 'https://secop.gov.co/adenda/02'
  });
  assert.ok(Array.isArray(resAdenda), 'Debe retornar resultados de envío');
  console.log('    ✅ Alerta de Adenda con evaluación de Ley 1882/2018 procesada');

  // 3.3: Alerta de Informe de Evaluación y Plazo de Observaciones
  console.log('  3.3 Alerta de Informe de Evaluación (Término Legal de Traslado):');
  const informeEval = {
    proceso_referencia: 'LP-INVIAS-099-2026',
    entidad: 'INVIAS',
    fecha_publicacion: '22 de Octubre de 2026',
    dias_traslado: 5,
    posicion_ranking: 1
  };
  const resEval = await telegramBotEngine.notificarInformeEvaluacion(informeEval);
  assert.ok(Array.isArray(resEval), 'Debe retornar resultados de envío');
  console.log('    ✅ Alerta de Informe de Evaluación y traslado de 5 días hábiles procesada');

  // 3.4: Alerta Preventiva de Garantías y Pólizas (Decreto 1082/2015)
  console.log('  3.4 Alerta Preventiva de Vencimiento de Garantía:');
  const polizaVence = {
    contrato_id: 'CTR-OBRA-2025-88',
    amparo: 'Buen Manejo del Anticipo y Salarios',
    numero_poliza: 'POL-SEGUROS-COL-998822',
    aseguradora: 'Seguros del Estado S.A.',
    dias_restantes: 7,
    fecha_fin: new Date(Date.now() + 86400000 * 7)
  };
  const resPoliza = await telegramBotEngine.notificarAlertaPolizaVencimiento(polizaVence, {
    numero_contrato: 'CTR-OBRA-2025-88',
    entidad: 'ALCALDÍA DE MEDELLÍN'
  });
  assert.ok(Array.isArray(resPoliza), 'Debe retornar resultados de envío');
  console.log('    ✅ Alerta de semáforo de póliza procesada con criticidad');

  // ---------------------------------------------------------
  // TEST 4: Despachador de Comandos del Bot (/start, /resumen, /ping)
  // ---------------------------------------------------------
  console.log('\n--- TEST 4: Despacho de Comandos de Telegram Bot ---');
  
  // Comando /start
  const cmdStart = await telegramBotEngine.procesarComandoTelegram({
    message: {
      chat: { id: DUMMY_CHAT_ID },
      text: '/start'
    }
  });
  assert.ok(cmdStart, 'Debe procesar comando /start');
  console.log('  ✅ Comando /start procesado (Bienvenida y detección de Chat ID)');

  // Comando /resumen
  const cmdResumen = await telegramBotEngine.procesarComandoTelegram({
    message: {
      chat: { id: DUMMY_CHAT_ID },
      text: '/resumen'
    }
  });
  assert.ok(cmdResumen, 'Debe procesar comando /resumen');
  console.log('  ✅ Comando /resumen procesado (Estadísticas ejecutivas del pipeline)');

  // Comando /ping
  const cmdPing = await telegramBotEngine.procesarComandoTelegram({
    message: {
      chat: { id: DUMMY_CHAT_ID },
      text: '/ping'
    }
  });
  assert.ok(cmdPing, 'Debe procesar comando /ping');
  console.log('  ✅ Comando /ping procesado (Diagnóstico de latencia)');

  // ---------------------------------------------------------
  // TEST 5: Auditoría y Bitácora Histórica en PostgreSQL
  // ---------------------------------------------------------
  console.log('\n--- TEST 5: Bitácora de Notificaciones en PostgreSQL ---');
  const historial = await telegramBotEngine.consultarHistorial(20);
  assert.ok(historial.length > 0, 'Debe haber registros en telegram_notificaciones_log');
  console.log(`  ✅ Bitácora histórica consultada: ${historial.length} eventos registrados`);
  console.log(`  Último evento en log: [${historial[0].tipo_alerta}] ${historial[0].titulo} (Chat: ${historial[0].chat_id})`);

  // ---------------------------------------------------------
  // TEST 6: Limpieza Controlada de Registros de Prueba
  // ---------------------------------------------------------
  console.log('\n--- TEST 6: Limpieza Controlada de Prueba ---');
  await telegramBotEngine.eliminarCanal(nuevoCanal.id);
  await telegramBotEngine.eliminarSuscripcion(suscrip.id);
  await dbPostgres.query(`DELETE FROM telegram_notificaciones_log WHERE chat_id IN ($1, $2)`, [DUMMY_CHAT_ID, '-1001987654321']);
  console.log('  ✅ Registros de prueba limpiados exitosamente');

  console.log('\n======================================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE TELEGRAM BOT & PUSH NOTIFIER PASARON AL 100%');
  console.log('======================================================================\n');
  process.exit(0);
}

runTestSuite().catch(err => {
  console.error('\n❌ ERROR EN TEST SUITE DE TELEGRAM:', err);
  process.exit(1);
});
