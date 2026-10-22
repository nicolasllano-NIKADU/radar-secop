const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const config = require('./config');
const db = require('./database');
const scanner = require('./scanner');
const notifier = require('./notifier');
const sourcesCatalog = require('./sources');
const companyRoutes = require('./routes/companyRoutes');
const documentManager = require('./documentManager');
const paaManager = require('./paaManager');
const companyManager = require('./companyManager');
const subsanabilidadEngine = require('./subsanabilidadEngine');
const contractManager = require('./contractManager');
const complianceEngine = require('./complianceEngine');
const reportGenerator = require('./reportGenerator');
const economicEngine = require('./economicEngine');
const pipelineManager = require('./pipelineManager');
const authManager = require('./authManager');
const initDb = require('./initDb');

const app = express();

app.use(cors());
app.use(express.json());
app.use(authManager.authMiddleware());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Módulo 1: Identidad Empresarial, RUP y Simulaciones Plurales
app.use('/api/empresas', companyRoutes);

// Verificación inteligente para entornos serverless/PaaS (Render free tier):
// Si el contenedor se despierta o el usuario entra y el último escaneo tiene más de 45 minutos, escanea en segundo plano
let lastAutoCheckTime = 0;
function triggerAutoSyncIfNeeded() {
  const now = Date.now();
  if (now - lastAutoCheckTime < 5 * 60 * 1000) return; // Evitar chequeos repetidos en ráfaga
  lastAutoCheckTime = now;

  try {
    const stats = db.getStats();
    const ultimoScan = stats.ultimoEscaneo;
    const lastScanTime = ultimoScan && ultimoScan.fecha ? new Date(ultimoScan.fecha).getTime() : 0;
    const elapsedMinutes = (now - lastScanTime) / (60 * 1000);

    if ((elapsedMinutes > 45 || !ultimoScan) && !scanner.isScanning) {
      console.log(`⏰ [Auto-Sync] Último escaneo fue hace ${Math.round(elapsedMinutes)} min. Sincronizando SECOP II en segundo plano...`);
      scanner.runScheduledScan().catch(err => console.warn('⚠️ Error en auto-sync SECOP II:', err.message));
    }
  } catch (err) {
    console.warn('⚠️ Error verificando estado de escaneo:', err.message);
  }
}

// ==================== RUTAS DE LA API ====================

// 1. Listar oportunidades con filtros avanzados
app.get('/api/oportunidades', (req, res) => {
  try {
    triggerAutoSyncIfNeeded();
    const { search, keyword, fuente, perfil, tipoProceso, minPrice, maxPrice, onlyFavorites, minScore, limit, offset } = req.query;
    const items = db.getOportunidades({
      search,
      keyword,
      fuente,
      perfil,
      tipoProceso,
      minPrice: minPrice ? parseFloat(minPrice) : null,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      onlyFavorites: onlyFavorites === 'true' || onlyFavorites === '1',
      minScore: minScore ? parseInt(minScore, 10) : null,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0
    });
    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint dedicado para escanear Fondo Emprender bajo demanda
app.post('/api/scan/fondo-emprender', async (req, res) => {
  try {
    const fondoEmprender = require('./fondoEmprender');
    const result = await fondoEmprender.scanFondoEmprender();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Obtener detalle de una oportunidad
app.get('/api/oportunidades/:id', (req, res) => {
  try {
    const item = db.getOportunidadById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Oportunidad no encontrada' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Marcar o desmarcar como favorito
app.post('/api/oportunidades/:id/favorito', (req, res) => {
  try {
    const nuevoEstado = db.toggleFavorito(req.params.id);
    if (nuevoEstado === null) return res.status(404).json({ success: false, error: 'No encontrado' });
    res.json({ success: true, favorito: nuevoEstado });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Disparar escaneo manual o ping desde cron-job.org / uptime
app.all(['/api/scan', '/api/cron'], async (req, res) => {
  // Si la petición viene de un cron-job o navegador en segundo plano (GET/HEAD o query async)
  // respondemos de inmediato con ~25 bytes para evitar 'Response data too big' y timeouts en cron-job.org
  if (req.method === 'GET' || req.method === 'HEAD' || req.query.async === 'true') {
    res.status(200).json({ ok: true, scanning: true });
    if (!scanner.isScanning) {
      console.log(`⚡ [Cron Ping - ${req.method}] Petición recibida en ${req.path}. Ejecutando escaneo en segundo plano...`);
      scanner.runScheduledScan().catch(err => {
        console.warn('⚠️ Error en escaneo disparado por cron-job:', err.message);
      });
    } else {
      console.log(`⏳ [Cron Ping - ${req.method}] Escaneo ya en progreso.`);
    }
    return;
  }

  // Si es POST sincrónico (ej. botón 'Escanear' en la UI), ejecutamos y devolvemos resumen compacto (<100 bytes)
  try {
    console.log('⚡ Disparo de escaneo manual recibido vía POST');
    const result = await scanner.runScheduledScan();
    res.json({
      success: result.success !== false,
      ok: true,
      nuevos: result.nuevos || 0,
      total: result.total || 0,
      mensaje: result.message || 'Escaneo completado'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Estadísticas del Radar por Perfil
app.get('/api/stats', (req, res) => {
  try {
    triggerAutoSyncIfNeeded();
    const stats = db.getStats(req.query.perfil);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Fuentes y Fondos Segmentados por Perfil
app.get('/api/sources', (req, res) => {
  const { perfil } = req.query;
  let items = sourcesCatalog;
  if (perfil && perfil !== 'ALL' && perfil !== 'TODOS') {
    items = sourcesCatalog.filter(s => s.perfil === perfil || s.perfil === 'AMBOS');
  }
  res.json({ success: true, count: items.length, data: items });
});

// 7. Listado de Perfiles de Empresa (NIKADU IA & CERABELA)
app.get('/api/profiles', (req, res) => {
  res.json({ success: true, data: Object.values(config.profiles) });
});

// 7. Configuración y prueba de Telegram
app.get('/api/telegram/config', (req, res) => {
  const { botToken, chatId } = notifier.getCredentials();
  res.json({
    configured: !!(botToken && chatId),
    maskedToken: botToken ? `${botToken.slice(0, 6)}...${botToken.slice(-4)}` : '',
    chatId: chatId || ''
  });
});

app.post('/api/telegram/config', (req, res) => {
  try {
    const { botToken, chatId } = req.body;
    notifier.updateCredentials(botToken, chatId);
    res.json({ success: true, message: 'Credenciales guardadas correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/telegram/test', async (req, res) => {
  try {
    const result = await notifier.sendTestMessage();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/telegram/detect', async (req, res) => {
  try {
    const detectedId = await notifier.autoDetectChatId();
    if (detectedId) {
      res.json({ success: true, chatId: detectedId });
    } else {
      res.json({
        success: false,
        error: "No se detectó ningún mensaje. Abre en Telegram https://t.me/SECOP_Agente_bot, presiona 'INICIAR' (o escríbele 'Hola') y vuelve a intentar."
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Reenviar notificación de una oportunidad específica a Telegram
app.post('/api/oportunidades/:id/notificar', async (req, res) => {
  try {
    const item = db.getOportunidadById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Oportunidad no encontrada' });
    const result = await notifier.notifyOportunidad(item);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Módulo de Descarga y Gestión de Pliegos y Documentos (Socrata dmgg-8hin & nbae-kzan)
app.get('/api/documentos/:portafolioId', async (req, res) => {
  try {
    const { portafolioId } = req.params;
    const docs = await documentManager.getDocumentsByPortafolio(portafolioId);
    res.json({ success: true, count: docs.length, data: docs });
  } catch (err) {
    console.error(`⚠️ Error consultando documentos para ${req.params.portafolioId}:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Módulo de Inteligencia Comercial PAA (Dataset Socrata 9sue-ezhx)
app.get('/api/paa', async (req, res) => {
  try {
    const user = await companyManager.getOrCreateDefaultUser();
    const companies = await companyManager.getCompaniesByUser(user.id);
    const empresaId = req.query.empresa_id ? parseInt(req.query.empresa_id, 10) : (companies[0]?.id || 1);
    const mes = req.query.mes || null;
    const minScore = req.query.minScore ? parseInt(req.query.minScore, 10) : 30;

    const items = await paaManager.getPAAOpportunities(empresaId, { mes, minScore });
    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    console.error('Error listando PAA:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/paa/sync', async (req, res) => {
  try {
    const user = await companyManager.getOrCreateDefaultUser();
    const companies = await companyManager.getCompaniesByUser(user.id);
    const empresaId = req.body.empresa_id ? parseInt(req.body.empresa_id, 10) : (companies[0]?.id || 1);
    const empresa = companies.find(c => c.id === empresaId) || companies[0];

    const perfil = {
      palabras_clave: req.body.palabras_clave || ['software', 'inteligencia artificial', 'chatbot', 'automatizacion', 'aplicacion', 'desarrollo a la medida'],
      codigos_unspsc: req.body.codigos_unspsc || ['81111500', '80101500', '43231500'],
      departamentos: ['Bogota', 'Cundinamarca']
    };

    const resultado = await paaManager.syncPAAForCompany(empresa, perfil, req.body.limit || 80);
    res.json({ success: true, data: resultado });
  } catch (err) {
    console.error('Error sincronizando PAA:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Módulo de Auditoría Legal, Subsanabilidad y Causales de Rechazo
app.get('/api/subsanabilidad/catalogo', (req, res) => {
  res.json({ success: true, data: subsanabilidadEngine.getCatalog() });
});

app.post('/api/subsanabilidad/diagnosticar', (req, res) => {
  try {
    const diagnostico = subsanabilidadEngine.diagnoseCompliance(req.body);
    res.json({ success: true, data: diagnostico });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 12. Módulo de Gestión Contractual Post-Adjudicación y Pólizas
app.get('/api/contratos', async (req, res) => {
  try {
    const user = await companyManager.getOrCreateDefaultUser();
    const companies = await companyManager.getCompaniesByUser(user.id);
    const empresaId = req.query.empresa_id ? parseInt(req.query.empresa_id, 10) : (companies[0]?.id || 1);

    const contratos = await contractManager.getContractsByCompany(empresaId);
    res.json({ success: true, count: contratos.length, data: contratos });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/contratos', async (req, res) => {
  try {
    const user = await companyManager.getOrCreateDefaultUser();
    const companies = await companyManager.getCompaniesByUser(user.id);
    const empresaId = req.body.empresa_id ? parseInt(req.body.empresa_id, 10) : (companies[0]?.id || 1);

    const contrato = await contractManager.createContract(empresaId, req.body);
    res.json({ success: true, data: contrato });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/contratos/:id', async (req, res) => {
  try {
    const detalle = await contractManager.getContractDetail(parseInt(req.params.id, 10));
    if (!detalle) return res.status(404).json({ success: false, error: 'Contrato no encontrado' });
    res.json({ success: true, data: detalle });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/contratos/:id/polizas', async (req, res) => {
  try {
    const poliza = await contractManager.addPolicy(parseInt(req.params.id, 10), req.body);
    res.json({ success: true, data: poliza });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/contratos/:id/modificaciones', async (req, res) => {
  try {
    const mod = await contractManager.addModification(parseInt(req.params.id, 10), req.body);
    res.json({ success: true, data: mod });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 13. Módulo de Compliance, Inhabilidades y Riesgos LAFT
app.post('/api/compliance/auditar', async (req, res) => {
  try {
    const user = await companyManager.getOrCreateDefaultUser();
    const companies = await companyManager.getCompaniesByUser(user.id);
    const empresaId = req.body.empresa_id ? parseInt(req.body.empresa_id, 10) : (companies[0]?.id || 1);
    const empresa = companies.find(c => c.id === empresaId) || companies[0];

    const auditData = {
      empresa_id: empresaId,
      nit: req.body.nit || empresa.nit,
      razon_social: req.body.razon_social || empresa.razon_social,
      representante_legal: req.body.representante_legal || 'Representante Legal Registrado',
      documento_representante: req.body.documento_representante || '1010202030',
      miembros_consorcio: req.body.miembros_consorcio || []
    };

    const resultado = await complianceEngine.runComplianceAudit(auditData);
    res.json({ success: true, data: resultado });
  } catch (err) {
    console.error('Error en auditoría compliance:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/compliance/:empresaId/historial', async (req, res) => {
  try {
    const historial = await complianceEngine.getComplianceHistory(parseInt(req.params.empresaId, 10));
    res.json({ success: true, data: historial });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 14. Módulo de Generación y Exportación de Reportes (PDF / Excel)
app.get('/api/reportes/oportunidad/:id/pdf', async (req, res) => {
  try {
    const opp = db.getOportunidadById(req.params.id);
    if (!opp) return res.status(404).json({ success: false, error: 'Oportunidad no encontrada' });

    const pdfBuffer = await reportGenerator.generateOpportunityPdf(opp);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Ficha_${opp.referencia || opp.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando PDF de oportunidad:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reportes/compliance/:id/pdf', async (req, res) => {
  try {
    const dbPostgres = require('./dbPostgres');
    const queryRes = await dbPostgres.query('SELECT * FROM compliance_evaluaciones WHERE id = $1', [parseInt(req.params.id, 10)]);
    if (queryRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Certificado no encontrado' });

    const pdfBuffer = await reportGenerator.generateComplianceCertificatePdf(queryRes.rows[0]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Certificado_Compliance_${queryRes.rows[0].nit_consultado}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando certificado compliance PDF:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reportes/oportunidades/excel', async (req, res) => {
  try {
    const items = db.getOportunidades({ limit: 500 });
    const xlsxBuffer = await reportGenerator.generateOpportunitiesExcel(items);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Radar_SECOP_Oportunidades.xlsx"');
    res.send(xlsxBuffer);
  } catch (err) {
    console.error('Error exportando Excel:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 15. Módulo de Ponderación Económica y Simulación Monte Carlo (Pliegos Tipo ANCP-CCE)
app.get('/api/economico/metodos', (req, res) => {
  res.json({ success: true, data: economicEngine.METODOS });
});

app.post('/api/economico/evaluar', (req, res) => {
  try {
    const { presupuesto_oficial, ofertas = [], puntaje_maximo = 60 } = req.body;
    const po = parseFloat(presupuesto_oficial);
    if (!po || po <= 0) return res.status(400).json({ success: false, error: 'Presupuesto oficial inválido' });

    const alertas = economicEngine.detectarPreciosArtificialmenteBajos(po, ofertas);
    const evaluacion = economicEngine.evaluarTodosLosMetodos(po, ofertas, parseFloat(puntaje_maximo) || 60);

    res.json({
      success: true,
      data: {
        alertas_precios_bajos: alertas,
        evaluacion_metodos: evaluacion
      }
    });
  } catch (err) {
    console.error('Error evaluando ofertas económicas:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/economico/montecarlo', (req, res) => {
  try {
    const {
      presupuesto_oficial,
      competidores_estimados = 6,
      puntaje_maximo = 60,
      iteraciones = 5000,
      perfil_competencia = 'MODERADO',
      oferta_usuario = null
    } = req.body;

    const po = parseFloat(presupuesto_oficial);
    if (!po || po <= 0) return res.status(400).json({ success: false, error: 'Presupuesto oficial inválido' });

    const resultado = economicEngine.simularMontecarlo(po, {
      competidoresEstimados: parseInt(competidores_estimados, 10) || 6,
      puntajeMax: parseFloat(puntaje_maximo) || 60,
      iteraciones: Math.min(10000, Math.max(1000, parseInt(iteraciones, 10) || 5000)),
      perfilCompetencia: perfil_competencia,
      ofertaUsuario: oferta_usuario ? parseFloat(oferta_usuario) : null
    });

    res.json({ success: true, data: resultado });
  } catch (err) {
    console.error('Error en simulación Montecarlo:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/economico/guardar', async (req, res) => {
  try {
    const dbPostgres = require('./dbPostgres');
    const {
      empresa_id,
      proceso_referencia,
      entidad,
      presupuesto_oficial,
      puntaje_maximo = 60,
      competidores_estimados = 6,
      precio_optimo_sugerido,
      porcentaje_optimo_po,
      esperanza_puntaje,
      desglose_metodos,
      distribucion_simulada,
      ofertas_reales
    } = req.body;

    const query = `
      INSERT INTO simulaciones_economicas (
        empresa_id, proceso_referencia, entidad, presupuesto_oficial, puntaje_maximo,
        competidores_estimados, precio_optimo_sugerido, porcentaje_optimo_po, esperanza_puntaje,
        desglose_metodos, distribucion_simulada, ofertas_reales
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;
    const values = [
      empresa_id ? parseInt(empresa_id, 10) : null,
      proceso_referencia || 'SIM-DIRECTA',
      entidad || 'N/A',
      parseFloat(presupuesto_oficial),
      parseFloat(puntaje_maximo),
      parseInt(competidores_estimados, 10) || 6,
      precio_optimo_sugerido ? parseFloat(precio_optimo_sugerido) : null,
      porcentaje_optimo_po ? parseFloat(porcentaje_optimo_po) : null,
      esperanza_puntaje ? parseFloat(esperanza_puntaje) : null,
      desglose_metodos ? JSON.stringify(desglose_metodos) : null,
      distribucion_simulada ? JSON.stringify(distribucion_simulada) : null,
      ofertas_reales ? JSON.stringify(ofertas_reales) : null
    ];

    const insertRes = await dbPostgres.query(query, values);
    res.json({ success: true, data: insertRes.rows[0] });
  } catch (err) {
    console.error('Error guardando simulación económica:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/economico/historial', async (req, res) => {
  try {
    const dbPostgres = require('./dbPostgres');
    const q = req.query.empresa_id 
      ? await dbPostgres.query('SELECT * FROM simulaciones_economicas WHERE empresa_id = $1 ORDER BY creado_en DESC LIMIT 50', [parseInt(req.query.empresa_id, 10)])
      : await dbPostgres.query('SELECT * FROM simulaciones_economicas ORDER BY creado_en DESC LIMIT 50');
    res.json({ success: true, data: q.rows });
  } catch (err) {
    console.error('Error listando historial económico:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 16. Módulo de Pipeline Kanban y Gestión Comercial en Equipo (Módulo 6)
app.get('/api/pipeline', async (req, res) => {
  try {
    const data = await pipelineManager.getPipeline(req.query.empresa_id);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error obteniendo pipeline:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pipeline', async (req, res) => {
  try {
    const nuevo = await pipelineManager.addProceso(req.body);
    res.json({ success: true, data: nuevo });
  } catch (err) {
    console.error('Error creando proceso en pipeline:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/pipeline/:id/fase', async (req, res) => {
  try {
    const { fase, autor } = req.body;
    const actualizado = await pipelineManager.updateFase(req.params.id, fase, autor);
    if (!actualizado) return res.status(404).json({ success: false, error: 'Proceso no encontrado' });
    res.json({ success: true, data: actualizado });
  } catch (err) {
    console.error('Error actualizando fase:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/pipeline/:id/go-nogo', async (req, res) => {
  try {
    const { decision, autor } = req.body;
    const actualizado = await pipelineManager.updateGoNoGo(req.params.id, decision, autor);
    if (!actualizado) return res.status(404).json({ success: false, error: 'Proceso no encontrado' });
    res.json({ success: true, data: actualizado });
  } catch (err) {
    console.error('Error actualizando Go/No-Go:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pipeline/:id/tareas', async (req, res) => {
  try {
    const nuevaTarea = await pipelineManager.addTask(req.params.id, req.body);
    res.json({ success: true, data: nuevaTarea });
  } catch (err) {
    console.error('Error agregando tarea a pipeline:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/pipeline/tareas/:taskId', async (req, res) => {
  try {
    const { completada } = req.body;
    const tarea = await pipelineManager.toggleTask(req.params.taskId, completada);
    res.json({ success: true, data: tarea });
  } catch (err) {
    console.error('Error actualizando tarea:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pipeline/:id/bitacora', async (req, res) => {
  try {
    const { autor, comentario } = req.body;
    const bitacora = await pipelineManager.addBitacora(req.params.id, autor, comentario);
    res.json({ success: true, data: bitacora });
  } catch (err) {
    console.error('Error agregando comentario a bitácora:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/pipeline/:id', async (req, res) => {
  try {
    const ok = await pipelineManager.deleteProceso(req.params.id);
    res.json({ success: ok });
  } catch (err) {
    console.error('Error eliminando proceso de pipeline:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 17. Módulo de Autenticación SaaS y Multi-Tenancy (JWT + Bcrypt + RBAC)
app.get('/api/auth/roles', (req, res) => {
  res.json({ success: true, data: authManager.ROLES });
});

app.post('/api/auth/registro', async (req, res) => {
  try {
    const result = await authManager.register(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error en registro:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const result = await authManager.login(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error en login:', err.message);
    res.status(401).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/me', authManager.requireAuth(), async (req, res) => {
  try {
    const profile = await authManager.getProfile(req.user.id);
    if (!profile) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    res.json({ success: true, data: profile });
  } catch (err) {
    console.error('Error en perfil:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/cambiar-empresa', authManager.requireAuth(), async (req, res) => {
  try {
    const { empresa_id } = req.body;
    const result = await authManager.switchCompany(req.user.id, empresa_id);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error cambiando empresa:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Healthcheck oficial para Docker, Kubernetes y monitores de uptime
app.get('/api/health', async (req, res) => {
  try {
    const dbPostgres = require('./dbPostgres');
    await dbPostgres.query('SELECT 1');
    res.json({
      status: 'UP',
      servicio: 'Radar SECOP B2B SaaS',
      timestamp: new Date().toISOString(),
      database: 'PostgreSQL 18 CONNECTED',
      uptime: Math.round(process.uptime())
    });
  } catch (err) {
    res.status(503).json({
      status: 'DEGRADED',
      servicio: 'Radar SECOP B2B SaaS',
      database: err.message,
      uptime: Math.round(process.uptime())
    });
  }
});

// Fallback PWA para cualquier ruta web (compatible con Express 5)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ==================== INICIALIZACIÓN Y PROGRAMADOR CRON ====================

const server = app.listen(config.port, async () => {
  console.log(`=======================================================`);
  console.log(`🚀 RADAR SECOP - NIKADU IA ACTIVO`);
  console.log(`🌐 Servidor Web & PWA: http://localhost:${config.port}`);
  console.log(`⏰ Escaneo programado: cada hora cron [${config.cronSchedule}]`);
  console.log(`=======================================================`);

  // Asegurar migraciones automáticas idempotentes
  initDb.runAllMigrations().catch(err => console.warn('Aviso: Inicialización de DB diferida:', err.message));

  // Configurar tarea cron cada hora
  cron.schedule(config.cronSchedule, () => {
    console.log('⏰ Ejecutando escaneo automático horario de SECOP II...');
    scanner.runScheduledScan();
  });

  // Sincronización al iniciar si la base de datos está vacía o si han pasado más de 45 min
  const stats = db.getStats();
  if (stats.totalOportunidades === 0) {
    console.log('🌱 Base de datos vacía. Ejecutando primer escaneo de inicialización silencioso...');
    scanner.runScheduledScan({ notifyTelegram: false });
  } else {
    triggerAutoSyncIfNeeded();
  }
});

module.exports = { app, server };
