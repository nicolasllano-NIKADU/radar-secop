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

const app = express();

app.use(cors());
app.use(express.json());
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
