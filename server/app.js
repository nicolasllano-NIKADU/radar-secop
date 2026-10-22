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
const competitiveIntelligence = require('./competitiveIntelligence');
const predictiveEngine = require('./predictiveEngine');
const pliegoAuditor = require('./pliegoAuditor');
const bidDocumentGenerator = require('./bidDocumentGenerator');
const scoringEngine = require('./scoringEngine');
const pliegoObservationsEngine = require('./pliegoObservationsEngine');
const evaluationChallengeEngine = require('./evaluationChallengeEngine');
const winRateAnalyticsEngine = require('./winRateAnalyticsEngine');
const riskMatrixEngine = require('./riskMatrixEngine');
const pluralAgreementEngine = require('./pluralAgreementEngine');
const preflightAuditEngine = require('./preflightAuditEngine');
const adendasEngine = require('./adendasEngine');
const postAdjudicacionEngine = require('./postAdjudicacionEngine');
const residualCapacityEngine = require('./residualCapacityEngine');
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

app.get('/api/paa/calendario/:empresaId', async (req, res) => {
  try {
    const calendario = await paaManager.getCalendarioTrimestral(req.params.empresaId);
    res.json({ success: true, calendario });
  } catch (err) {
    console.error('Error obteniendo calendario PAA:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/paa/informe-pdf/:empresaId', async (req, res) => {
  try {
    const pdfBuffer = await paaManager.generarInformeComercialPdf(req.params.empresaId);
    const filename = `Informe_Comercial_PAA_Empresa_${req.params.empresaId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando informe comercial PAA PDF:', err.message);
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

// ==================== MÓDULO: INTELIGENCIA COMPETITIVA & SOCRATA JBJY-VK9H ====================

app.get('/api/competencia/analizar', async (req, res) => {
  try {
    const { entidad, palabra_clave, unspsc, min_valor, limit, force_refresh } = req.query;
    const data = await competitiveIntelligence.analizarMercado({
      entidad: entidad || '',
      palabraClave: palabra_clave || '',
      unspsc: unspsc || '',
      minValor: min_valor ? parseFloat(min_valor) : 10000000,
      limit: limit ? parseInt(limit, 10) : 100,
      forceRefresh: force_refresh === 'true' || force_refresh === '1'
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error analizando competencia:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/competencia/contratista/:nit', async (req, res) => {
  try {
    const { nit } = req.params;
    const data = await competitiveIntelligence.obtenerHistorialContratista(nit);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error consultando contratista:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/competencia/seguimiento', async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const data = await competitiveIntelligence.listarSeguimiento(userId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error listando seguimiento:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/competencia/seguimiento', async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const data = await competitiveIntelligence.agregarSeguimiento(userId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error agregando seguimiento:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/competencia/seguimiento/:id', async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const deleted = await competitiveIntelligence.eliminarSeguimiento(userId, req.params.id);
    res.json({ success: true, deleted });
  } catch (err) {
    console.error('Error eliminando seguimiento:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== MÓDULO: ALERTAS PREDICTIVAS DE PRÓRROGAS Y VENCIMIENTOS ====================

app.get('/api/predictivo/vencimientos', async (req, res) => {
  try {
    const { perfil, entidad, palabra_clave, dias, min_valor, limit, force_refresh } = req.query;
    const data = await predictiveEngine.obtenerVencimientos({
      perfil: perfil || 'NIKADU_IA',
      entidad: entidad || '',
      palabraClave: palabra_clave || '',
      diasHorizonte: dias ? parseInt(dias, 10) : 90,
      minValor: min_valor ? parseFloat(min_valor) : 20000000,
      limit: limit ? parseInt(limit, 10) : 100,
      forceRefresh: force_refresh === 'true' || force_refresh === '1'
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error obteniendo vencimientos predictivos:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/predictivo/incorporar-pipeline', async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const lead = await predictiveEngine.incorporarAlPipeline(userId, req.body);
    res.json({ success: true, data: lead });
  } catch (err) {
    console.error('Error incorporando vencimiento al pipeline:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/predictivo/seguimiento', async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const data = await predictiveEngine.listarSeguimiento(userId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error listando seguimiento de vencimientos:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/predictivo/seguimiento', async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const data = await predictiveEngine.agregarSeguimiento(userId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error agregando vencimiento a seguimiento:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/predictivo/seguimiento/:id', async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const deleted = await predictiveEngine.eliminarSeguimiento(userId, req.params.id);
    res.json({ success: true, deleted });
  } catch (err) {
    console.error('Error eliminando seguimiento de vencimiento:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== MÓDULO: AUDITORÍA DE PLIEGOS (GAP ANALYSIS) Y GENERACIÓN DE OFERTAS ====================

app.post('/api/pliego/auditar', async (req, res) => {
  try {
    const { procesoId, empresaId, miembrosConsorcio, smmlvValor } = req.body;
    if (!procesoId) {
      return res.status(400).json({ success: false, error: 'procesoId es requerido para auditar el pliego' });
    }
    const resultado = await pliegoAuditor.auditarProceso({
      procesoId,
      empresaId: empresaId || null,
      miembrosConsorcio: miembrosConsorcio || null,
      smmlvValor: smmlvValor || 1423500
    });
    res.json({ success: true, data: resultado });
  } catch (err) {
    console.error('Error auditando pliego de condiciones:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/licitacion/generar-documentos', async (req, res) => {
  try {
    const { procesoId, empresaId, consorcio, banco, contador, ciudad } = req.body;

    let proceso = req.body.proceso;
    if (!proceso && procesoId) {
      const dbPostgres = require('./dbPostgres');
      const r = await dbPostgres.query('SELECT * FROM oportunidades WHERE id = $1', [procesoId]);
      proceso = r.rows[0] || {
        id: procesoId,
        referencia: procesoId,
        entidad: 'Entidad Estatal',
        objeto: 'Proceso de selección pública',
        precio_base: 500000000
      };
    }

    let oferente = req.body.oferente;
    if (!oferente) {
      if (empresaId) {
        oferente = await companyManager.getCompanyById(parseInt(empresaId, 10));
      } else {
        const all = await companyManager.getAllCompanies();
        oferente = all.find(c => c.es_propia) || all[0];
      }
    }

    if (!oferente) {
      return res.status(400).json({ success: false, error: 'Se requiere una empresa registrada como proponente' });
    }

    const formulario1Html = bidDocumentGenerator.generarFormulario1Html({
      proceso,
      oferente,
      consorcio,
      banco,
      ciudad: ciudad || 'Bogotá D.C.'
    });

    const formulario2Html = bidDocumentGenerator.generarFormulario2AnticorrupcionHtml({
      proceso,
      oferente,
      consorcio,
      ciudad: ciudad || 'Bogotá D.C.'
    });

    const mipymeHtml = bidDocumentGenerator.generarAcreditacionMipymeHtml({
      proceso,
      oferente,
      consorcio,
      contador,
      ciudad: ciudad || 'Bogotá D.C.'
    });

    res.json({
      success: true,
      data: {
        proceso,
        oferente,
        formulario1Html,
        formulario2Html,
        mipymeHtml
      }
    });
  } catch (err) {
    console.error('Error generando documentos licitatorios:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.all('/api/licitacion/descargar-pdf', async (req, res) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const { procesoId, empresaId } = params;
    let consorcio = params.consorcio;
    if (typeof consorcio === 'string') {
      try { consorcio = JSON.parse(consorcio); } catch(e){}
    }

    let proceso = params.proceso;
    if (!proceso && procesoId) {
      const dbPostgres = require('./dbPostgres');
      const r = await dbPostgres.query('SELECT * FROM oportunidades WHERE id = $1', [procesoId]);
      proceso = r.rows[0] || {
        id: procesoId,
        referencia: procesoId,
        entidad: 'Entidad Estatal',
        objeto: 'Proceso de selección pública'
      };
    }

    let oferente = params.oferente;
    if (!oferente) {
      if (empresaId) {
        oferente = await companyManager.getCompanyById(parseInt(empresaId, 10));
      } else {
        const all = await companyManager.getAllCompanies();
        oferente = all.find(c => c.es_propia) || all[0];
      }
    }

    if (!proceso || !oferente) {
      return res.status(400).json({ success: false, error: 'Datos de proceso u oferente insuficientes para generar PDF' });
    }

    const pdfBuffer = await bidDocumentGenerator.generarPaqueteOfertaPdf({
      proceso,
      oferente,
      consorcio
    });

    const safeRef = (proceso.referencia || 'Oferta').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Propuesta_${safeRef}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando paquete PDF:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== MÓDULO: ESTRATEGIA DE PONDERACIÓN (100 PUNTOS) Y OBSERVACIONES AL PLIEGO ====================

// 1. Simulación de Ponderación Oficial y Desempates (Ley 2069/2020)
app.post('/api/estrategia/puntaje/simular', async (req, res) => {
  try {
    const {
      procesoId,
      empresaId,
      precioOferta,
      acreditaIndustriaNacional,
      esServicio,
      acreditaPersonalDiscapacidad,
      esEmpresaMujeres,
      calidadTecnicaPuntos,
      ponderacionConfig
    } = req.body;

    if (!procesoId) {
      return res.status(400).json({ success: false, error: 'procesoId es requerido' });
    }

    const resultado = await scoringEngine.calcularPuntajeLicitacion({
      procesoId,
      empresaId: empresaId || null,
      precioOferta,
      acreditaIndustriaNacional: acreditaIndustriaNacional !== false,
      esServicio: !!esServicio,
      acreditaPersonalDiscapacidad: !!acreditaPersonalDiscapacidad,
      esEmpresaMujeres: !!esEmpresaMujeres,
      calidadTecnicaPuntos: calidadTecnicaPuntos !== undefined ? parseFloat(calidadTecnicaPuntos) : 15,
      ponderacionConfig
    });

    res.json({ success: true, data: resultado });
  } catch (err) {
    console.error('Error simulando puntaje licitatorio:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/estrategia/puntaje/guardar', async (req, res) => {
  try {
    const guardado = await scoringEngine.guardarEstrategiaPuntaje(req.body);
    res.json({ success: true, data: guardado });
  } catch (err) {
    console.error('Error guardando estrategia de puntaje:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/estrategia/puntaje/:procesoId', async (req, res) => {
  try {
    const { empresaId } = req.query;
    const est = await scoringEngine.getEstrategiaPuntaje(req.params.procesoId, empresaId);
    res.json({ success: true, data: est });
  } catch (err) {
    console.error('Error obteniendo estrategia de puntaje:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Detección y Generación de Observaciones al Pliego Borrador / Definitivo
app.post('/api/pliego/observaciones/analizar', async (req, res) => {
  try {
    const { procesoId, matrizBrechas } = req.body;
    let proceso = req.body.proceso;

    if (!proceso && procesoId) {
      const dbPostgres = require('./dbPostgres');
      const r = await dbPostgres.query('SELECT * FROM oportunidades WHERE id = $1', [procesoId]);
      proceso = r.rows[0] || { id: procesoId, referencia: procesoId, entidad: 'Entidad Estatal' };
    }

    const impugnaciones = pliegoObservationsEngine.detectarClausulasImpugnables({
      proceso: proceso || { id: procesoId, referencia: procesoId },
      matrizBrechas: matrizBrechas || []
    });

    res.json({ success: true, data: impugnaciones });
  } catch (err) {
    console.error('Error analizando observaciones al pliego:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pliego/observaciones/generar', async (req, res) => {
  try {
    const { procesoId, empresaId, titulo, clausulaImpugnada, argumentoJuridico, peticionConcreta, ciudad } = req.body;

    let proceso = req.body.proceso;
    if (!proceso && procesoId) {
      const dbPostgres = require('./dbPostgres');
      const r = await dbPostgres.query('SELECT * FROM oportunidades WHERE id = $1', [procesoId]);
      proceso = r.rows[0] || { id: procesoId, referencia: procesoId, entidad: 'Entidad Estatal', objeto: 'Contratación estatal' };
    }

    let oferente = req.body.oferente;
    if (!oferente) {
      if (empresaId) {
        oferente = await companyManager.getCompanyById(parseInt(empresaId, 10));
      } else {
        const all = await companyManager.getAllCompanies();
        oferente = all.find(c => c.es_propia) || all[0];
      }
    }

    if (!oferente) {
      return res.status(400).json({ success: false, error: 'Se requiere una empresa registrada' });
    }

    const documentoHtml = pliegoObservationsEngine.generarDocumentoObservacionHtml({
      proceso,
      oferente,
      titulo,
      clausulaImpugnada,
      argumentoJuridico,
      peticionConcreta,
      ciudad: ciudad || 'Bogotá D.C.'
    });

    res.json({
      success: true,
      data: {
        proceso,
        oferente,
        titulo,
        documentoHtml
      }
    });
  } catch (err) {
    console.error('Error generando documento de observaciones:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.all('/api/pliego/observaciones/descargar-pdf', async (req, res) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const { procesoId, empresaId, titulo, clausulaImpugnada, argumentoJuridico, peticionConcreta, ciudad } = params;

    let proceso = params.proceso;
    if (!proceso && procesoId) {
      const dbPostgres = require('./dbPostgres');
      const r = await dbPostgres.query('SELECT * FROM oportunidades WHERE id = $1', [procesoId]);
      proceso = r.rows[0] || { id: procesoId, referencia: procesoId, entidad: 'Entidad Estatal' };
    }

    let oferente = params.oferente;
    if (!oferente) {
      if (empresaId) {
        oferente = await companyManager.getCompanyById(parseInt(empresaId, 10));
      } else {
        const all = await companyManager.getAllCompanies();
        oferente = all.find(c => c.es_propia) || all[0];
      }
    }

    if (!proceso || !oferente) {
      return res.status(400).json({ success: false, error: 'Datos de proceso u oferente insuficientes' });
    }

    const pdfBuffer = await pliegoObservationsEngine.generarDocumentoObservacionPdf({
      proceso,
      oferente,
      titulo: titulo || 'Observaciones al Pliego',
      clausulaImpugnada: clausulaImpugnada || 'Cláusula observada en el pliego',
      argumentoJuridico: argumentoJuridico || 'Fundamento legal en Ley 80/1993 y Ley 1150/2007',
      peticionConcreta: peticionConcreta || 'Solicitud de modificación al pliego',
      ciudad: ciudad || 'Bogotá D.C.'
    });

    const safeRef = (proceso.referencia || 'Observacion').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Observacion_${safeRef}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error descargando PDF de observaciones:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pliego/observaciones/guardar', async (req, res) => {
  try {
    const { procesoId, empresaId, tipoObservacion, titulo, clausulaImpugnada, argumentoJuridico, peticionConcreta, documentoGenerado } = req.body;
    const guardada = await pliegoObservationsEngine.guardarObservacion({
      procesoId,
      empresaId,
      tipoObservacion,
      titulo,
      clausulaImpugnada,
      argumentoJuridico,
      peticionConcreta,
      documentoGenerado
    });
    res.json({ success: true, data: guardada });
  } catch (err) {
    console.error('Error guardando observación en historial:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/pliego/observaciones/historial/:procesoId', async (req, res) => {
  try {
    const historial = await pliegoObservationsEngine.listarObservaciones(req.params.procesoId);
    res.json({ success: true, count: historial.length, data: historial });
  } catch (err) {
    console.error('Error listando observaciones de proceso:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== MÓDULO: TRASLADO DEL INFORME DE EVALUACIÓN Y SUBSANACIONES CRUZADAS ====================

app.get('/api/evaluacion/causales-catalogo', (req, res) => {
  try {
    const catalogo = evaluationChallengeEngine.getCatalogCausales();
    res.json({ success: true, count: catalogo.length, data: catalogo });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/evaluacion/generar-memorial', async (req, res) => {
  try {
    const { tipoAccion, procesoId, empresaId, competidor, causalCodigo, titulo, descripcionHechos, fundamentoJuridico, peticionConcreta, ciudad } = req.body;

    let proceso = req.body.proceso;
    if (!proceso && procesoId) {
      const dbPostgres = require('./dbPostgres');
      const r = await dbPostgres.query('SELECT * FROM oportunidades WHERE id = $1', [procesoId]);
      proceso = r.rows[0] || { id: procesoId, referencia: procesoId, entidad: 'Entidad Estatal', objeto: 'Contratación pública' };
    }

    let oferente = req.body.oferente;
    if (!oferente) {
      if (empresaId) {
        oferente = await companyManager.getCompanyById(parseInt(empresaId, 10));
      } else {
        const all = await companyManager.getAllCompanies();
        oferente = all.find(c => c.es_propia) || all[0];
      }
    }

    if (!proceso || !oferente) {
      return res.status(400).json({ success: false, error: 'Datos de proceso u oferente insuficientes' });
    }

    const documentoHtml = evaluationChallengeEngine.generarMemorialEvaluacionHtml({
      tipoAccion: tipoAccion || 'IMPUGNACION_COMPETIDOR',
      proceso,
      oferente,
      competidor,
      causalCodigo,
      titulo: titulo || 'Observaciones al Informe de Evaluación',
      descripcionHechos: descripcionHechos || 'Hechos identificados en la evaluación preliminar.',
      fundamentoJuridico: fundamentoJuridico || 'Ley 1882 de 2018 y Ley 1150 de 2007.',
      peticionConcreta: peticionConcreta || 'Solicitud de exclusión del proponente.',
      ciudad: ciudad || 'Bogotá D.C.'
    });

    res.json({
      success: true,
      data: {
        proceso,
        oferente,
        competidor,
        tipoAccion,
        documentoHtml
      }
    });
  } catch (err) {
    console.error('Error generando memorial de evaluación:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.all('/api/evaluacion/descargar-pdf', async (req, res) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const { tipoAccion, procesoId, empresaId, titulo, descripcionHechos, fundamentoJuridico, peticionConcreta, ciudad } = params;
    let competidor = params.competidor;
    if (typeof competidor === 'string') {
      try { competidor = JSON.parse(competidor); } catch(e){}
    }

    let proceso = params.proceso;
    if (!proceso && procesoId) {
      const dbPostgres = require('./dbPostgres');
      const r = await dbPostgres.query('SELECT * FROM oportunidades WHERE id = $1', [procesoId]);
      proceso = r.rows[0] || { id: procesoId, referencia: procesoId, entidad: 'Entidad Estatal' };
    }

    let oferente = params.oferente;
    if (!oferente) {
      if (empresaId) {
        oferente = await companyManager.getCompanyById(parseInt(empresaId, 10));
      } else {
        const all = await companyManager.getAllCompanies();
        oferente = all.find(c => c.es_propia) || all[0];
      }
    }

    if (!proceso || !oferente) {
      return res.status(400).json({ success: false, error: 'Datos de proceso u oferente insuficientes' });
    }

    const pdfBuffer = await evaluationChallengeEngine.generarMemorialEvaluacionPdf({
      tipoAccion: tipoAccion || 'IMPUGNACION_COMPETIDOR',
      proceso,
      oferente,
      competidor,
      titulo: titulo || 'Observaciones al Informe de Evaluación',
      descripcionHechos: descripcionHechos || 'Hechos observados en la evaluación.',
      fundamentoJuridico: fundamentoJuridico || 'Estatuto General de Contratación Pública.',
      peticionConcreta: peticionConcreta || 'Solicitud de exclusión o habilitación.',
      ciudad: ciudad || 'Bogotá D.C.'
    });

    const prefix = tipoAccion === 'DEFENSA_SUBSANACION' ? 'Subsanacion' : 'Impugnacion';
    const safeRef = (proceso.referencia || 'Evaluacion').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${prefix}_${safeRef}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error descargando PDF de evaluación:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/evaluacion/guardar', async (req, res) => {
  try {
    const { procesoId, empresaId, tipoAccion, competidorNombre, competidorNit, causalCodigo, titulo, descripcionHechos, fundamentoJuridico, peticionConcreta, documentoGenerado } = req.body;
    const guardada = await evaluationChallengeEngine.guardarMemorial({
      procesoId,
      empresaId,
      tipoAccion,
      competidorNombre,
      competidorNit,
      causalCodigo,
      titulo,
      descripcionHechos,
      fundamentoJuridico,
      peticionConcreta,
      documentoGenerado
    });
    res.json({ success: true, data: guardada });
  } catch (err) {
    console.error('Error guardando memorial en historial:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/evaluacion/historial/:procesoId', async (req, res) => {
  try {
    const historial = await evaluationChallengeEngine.listarMemoriales(req.params.procesoId);
    res.json({ success: true, count: historial.length, data: historial });
  } catch (err) {
    console.error('Error listando memoriales de evaluación:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== MÓDULO: TABLERO EJECUTIVO DE WIN RATE & ROI ANALYTICS ====================

app.get('/api/analytics/win-rate', async (req, res) => {
  try {
    const { empresaId, periodo } = req.query;
    const analytics = await winRateAnalyticsEngine.getExecutiveAnalytics(empresaId || null, periodo || 'ALL');
    res.json({ success: true, data: analytics });
  } catch (err) {
    console.error('Error calculando métricas de win rate y analytics:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== MÓDULO: MATRIZ DE RIESGOS CONTRACTUALES (ANCP-CCE) ====================

app.post('/api/riesgos/generar', async (req, res) => {
  try {
    const { proceso, oferente, tipoContrato } = req.body;
    if (!proceso) {
      return res.status(400).json({ success: false, error: 'Faltan datos del proceso de contratación' });
    }

    // Verificar si ya existe guardada en DB
    const procesoId = String(proceso.id || proceso.referencia || 'PROC-001');
    const existente = await riskMatrixEngine.getMatrizRiesgos(procesoId);

    if (existente) {
      return res.json({ success: true, cached: true, ...existente });
    }

    // Si no existe, generarla de cero
    const resultado = riskMatrixEngine.generarMatrizRiesgos({ proceso, oferente, tipoContrato });
    res.json({ success: true, cached: false, ...resultado });
  } catch (err) {
    console.error('Error generando matriz de riesgos:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/riesgos/guardar', async (req, res) => {
  try {
    const { matriz, items } = req.body;
    if (!matriz || !items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Estructura inválida de matriz o items de riesgo' });
    }

    const resultado = await riskMatrixEngine.guardarMatrizRiesgos({ matriz, items });
    res.json({ success: true, ...resultado });
  } catch (err) {
    console.error('Error guardando matriz de riesgos:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/riesgos/:procesoId', async (req, res) => {
  try {
    const data = await riskMatrixEngine.getMatrizRiesgos(req.params.procesoId);
    if (!data) {
      return res.status(404).json({ success: false, error: 'No se encontró matriz de riesgos para este proceso' });
    }
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Error obteniendo matriz de riesgos:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/riesgos/descargar-pdf', async (req, res) => {
  try {
    const { matriz, items } = req.body;
    if (!matriz || !items) {
      return res.status(400).json({ success: false, error: 'Datos insuficientes para exportar PDF' });
    }

    const pdfBuffer = await riskMatrixEngine.generarMatrizRiesgosPdf({ matriz, items });
    const filename = `Matriz_Riesgos_CCE_${(matriz.numero_proceso || 'PROCESO').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando PDF de matriz de riesgos:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/riesgos/descargar-pdf/:procesoId', async (req, res) => {
  try {
    const data = await riskMatrixEngine.getMatrizRiesgos(req.params.procesoId);
    if (!data) {
      return res.status(404).json({ success: false, error: 'Matriz de riesgos no encontrada' });
    }

    const pdfBuffer = await riskMatrixEngine.generarMatrizRiesgosPdf(data);
    const filename = `Matriz_Riesgos_CCE_${(data.matriz.numero_proceso || 'PROCESO').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando PDF de matriz de riesgos:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== MÓDULO: ACUERDOS DE CONSTITUCIÓN PLURAL (FORMULARIO 3 CCE) ====================

app.post('/api/plural/generar-formulario3', async (req, res) => {
  try {
    const { proceso, datosEstructura } = req.body;
    if (!proceso || !datosEstructura) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros requeridos de proceso o estructura plural.' });
    }

    const acuerdo = pluralAgreementEngine.generarAcuerdoPlural({ proceso, datosEstructura });
    res.json({ success: true, acuerdo });
  } catch (err) {
    console.error('Error generando acuerdo plural:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/plural/guardar-formulario3', async (req, res) => {
  try {
    const { acuerdo } = req.body;
    if (!acuerdo || !acuerdo.nombre_estructura) {
      return res.status(400).json({ success: false, error: 'Estructura inválida de acuerdo plural.' });
    }

    const guardado = await pluralAgreementEngine.guardarAcuerdo(acuerdo);
    res.json({ success: true, ...guardado });
  } catch (err) {
    console.error('Error guardando acuerdo plural:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/plural/acuerdos/:procesoId', async (req, res) => {
  try {
    const acuerdos = await pluralAgreementEngine.getAcuerdosPorProceso(req.params.procesoId);
    res.json({ success: true, count: acuerdos.length, data: acuerdos });
  } catch (err) {
    console.error('Error obteniendo acuerdos plurales:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/plural/descargar-pdf', async (req, res) => {
  try {
    const { acuerdo } = req.body;
    if (!acuerdo) {
      return res.status(400).json({ success: false, error: 'No se enviaron los datos del acuerdo para PDF.' });
    }

    const pdfBuffer = await pluralAgreementEngine.generarAcuerdoPdf(acuerdo);
    const filename = `Formulario_3_Constitucion_${(acuerdo.nombre_estructura || 'ESTRUCTURA_PLURAL').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando PDF de acuerdo plural:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/plural/descargar-pdf/:id', async (req, res) => {
  try {
    const acuerdo = await pluralAgreementEngine.getAcuerdoPorId(req.params.id);
    if (!acuerdo) {
      return res.status(404).json({ success: false, error: 'Acuerdo plural no encontrado.' });
    }

    const pdfBuffer = await pluralAgreementEngine.generarAcuerdoPdf(acuerdo);
    const filename = `Formulario_3_Constitucion_${(acuerdo.nombre_estructura || 'ESTRUCTURA_PLURAL').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando PDF de acuerdo plural:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== MÓDULO: AUDITORÍA PRE-FLIGHT Y CHECKLIST DE CIERRE (SECOP II) ====================

app.get('/api/preflight/catalogo', (req, res) => {
  try {
    const catalogo = preflightAuditEngine.getControlesMaestros();
    res.json({ success: true, count: catalogo.length, data: catalogo });
  } catch (err) {
    console.error('Error obteniendo catálogo pre-flight:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/preflight/ejecutar', (req, res) => {
  try {
    const { proceso, oferente, respuestasUsuario } = req.body;
    if (!proceso) {
      return res.status(400).json({ success: false, error: 'Faltan datos del proceso para la auditoría.' });
    }

    const resultado = preflightAuditEngine.ejecutarAuditoriaPreflight({ proceso, oferente, respuestasUsuario });
    res.json({ success: true, ...resultado });
  } catch (err) {
    console.error('Error ejecutando auditoría pre-flight:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/preflight/guardar', async (req, res) => {
  try {
    const { auditoria } = req.body;
    if (!auditoria || !auditoria.proceso_id) {
      return res.status(400).json({ success: false, error: 'Datos incompletos de la auditoría para guardar.' });
    }

    const guardado = await preflightAuditEngine.guardarAuditoria({ auditoria });
    res.json({ success: true, ...guardado });
  } catch (err) {
    console.error('Error guardando auditoría pre-flight:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/preflight/:procesoId', async (req, res) => {
  try {
    const auditoria = await preflightAuditEngine.getAuditoria(req.params.procesoId);
    if (!auditoria) {
      return res.status(404).json({ success: false, error: 'No se encontró auditoría pre-flight previa.' });
    }
    res.json({ success: true, auditoria });
  } catch (err) {
    console.error('Error consultando auditoría pre-flight:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/preflight/descargar-pdf', async (req, res) => {
  try {
    const { auditoria } = req.body;
    if (!auditoria) {
      return res.status(400).json({ success: false, error: 'Faltan datos de la auditoría para generar el PDF.' });
    }

    const pdfBuffer = await preflightAuditEngine.generarCertificadoPdf(auditoria);
    const filename = `Certificado_PreFlight_SECOP_${(auditoria.numero_proceso || 'PROCESO').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando PDF de certificado pre-flight:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/preflight/descargar-pdf/:procesoId', async (req, res) => {
  try {
    const auditoria = await preflightAuditEngine.getAuditoria(req.params.procesoId);
    if (!auditoria) {
      return res.status(404).json({ success: false, error: 'Auditoría no encontrada.' });
    }

    const pdfBuffer = await preflightAuditEngine.generarCertificadoPdf(auditoria);
    const filename = `Certificado_PreFlight_SECOP_${(auditoria.numero_proceso || 'PROCESO').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando PDF de certificado pre-flight:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== MÓDULO: ASISTENTE DE ADENDAS Y CRONOGRAMA DINÁMICO (SECOP II) ====================

app.post('/api/adendas/evaluar', (req, res) => {
  try {
    const { proceso, numeroAdenda, fechaExpedicion, tipoModificacion, fechaCierreAnterior, fechaCierreNueva, descripcionCambios } = req.body;
    if (!proceso) {
      return res.status(400).json({ success: false, error: 'Faltan datos del proceso para evaluar la adenda.' });
    }

    const adendaEvaluada = adendasEngine.evaluarImpactoAdenda({
      proceso,
      numeroAdenda,
      fechaExpedicion,
      tipoModificacion,
      fechaCierreAnterior,
      fechaCierreNueva,
      descripcionCambios
    });

    res.json({ success: true, adenda: adendaEvaluada });
  } catch (err) {
    console.error('Error evaluando adenda:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/adendas/registrar', async (req, res) => {
  try {
    const { adendaData } = req.body;
    if (!adendaData || !adendaData.proceso_id) {
      return res.status(400).json({ success: false, error: 'Faltan datos requeridos de la adenda.' });
    }

    const guardada = await adendasEngine.registrarAdenda(adendaData);
    res.json({ success: true, ...guardada });
  } catch (err) {
    console.error('Error registrando adenda:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/adendas/:procesoId', async (req, res) => {
  try {
    const adendas = await adendasEngine.getAdendasPorProceso(req.params.procesoId);
    res.json({ success: true, count: adendas.length, data: adendas });
  } catch (err) {
    console.error('Error listando adendas del proceso:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/adendas/:id/estado', async (req, res) => {
  try {
    const { estadoGestion } = req.body;
    const actualizada = await adendasEngine.actualizarEstadoAdenda(req.params.id, estadoGestion || 'ACCION_APLICADA');
    res.json({ success: true, ...actualizada });
  } catch (err) {
    console.error('Error actualizando estado de adenda:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/adendas/:id', async (req, res) => {
  try {
    await adendasEngine.eliminarAdenda(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error eliminando adenda:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/adendas/descargar-pdf/:procesoId', async (req, res) => {
  try {
    const adendas = await adendasEngine.getAdendasPorProceso(req.params.procesoId);
    const opp = db.getOpportunityById(req.params.procesoId) || {
      referencia: req.params.procesoId,
      entidad: adendas[0]?.entidad_nombre || 'Entidad Estatal'
    };

    const pdfBuffer = await adendasEngine.generarReporteAdendasPdf(opp, adendas);
    const filename = `Matriz_Adendas_SECOP_${(opp.referencia || 'PROCESO').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando PDF de adendas:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== MÓDULO: CONTROL DE EJECUCIÓN POST-ADJUDICACIÓN, ACTAS Y PAGOS PAC ====================

app.get('/api/post-adjudicacion/contrato/:id/tablero', async (req, res) => {
  try {
    const tablero = await postAdjudicacionEngine.getTableroEjecucion(req.params.id);
    if (!tablero) {
      return res.status(404).json({ success: false, error: 'Contrato no encontrado' });
    }
    res.json({ success: true, data: tablero });
  } catch (err) {
    console.error('Error obteniendo tablero post-adjudicación:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/post-adjudicacion/contrato/:id/actas', async (req, res) => {
  try {
    const { tipo_acta, numero_acta, fecha_acta, porcentaje_avance_fisico, porcentaje_avance_financiero, valor_acta, observaciones } = req.body;
    if (!tipo_acta || !numero_acta || !fecha_acta) {
      return res.status(400).json({ success: false, error: 'Faltan campos obligatorios del acta.' });
    }

    const acta = await postAdjudicacionEngine.registrarActa({
      contrato_id: req.params.id,
      tipo_acta,
      numero_acta,
      fecha_acta,
      porcentaje_avance_fisico,
      porcentaje_avance_financiero,
      valor_acta,
      observaciones
    });

    res.json({ success: true, data: acta });
  } catch (err) {
    console.error('Error registrando acta contractual:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/post-adjudicacion/contrato/:id/pagos', async (req, res) => {
  try {
    const { numero_factura, fecha_emision, fecha_radicacion, concepto, valor_bruto, valor_iva, valor_retenciones, valor_neto_girar, estado_pago, fecha_pago, comprobante_egreso_no } = req.body;
    if (!numero_factura || !fecha_radicacion || !valor_bruto) {
      return res.status(400).json({ success: false, error: 'Faltan campos obligatorios de la factura/pago.' });
    }

    const factura = await postAdjudicacionEngine.registrarFactura({
      contrato_id: req.params.id,
      numero_factura,
      fecha_emision: fecha_emision || fecha_radicacion,
      fecha_radicacion,
      concepto: concepto || 'Facturación mensual por avance contractual',
      valor_bruto,
      valor_iva,
      valor_retenciones,
      valor_neto_girar,
      estado_pago,
      fecha_pago,
      comprobante_egreso_no
    });

    res.json({ success: true, data: factura });
  } catch (err) {
    console.error('Error registrando factura/pago:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/post-adjudicacion/pagos/:id', async (req, res) => {
  try {
    const { estado_pago, fecha_pago, comprobante_egreso_no } = req.body;
    const actualizada = await postAdjudicacionEngine.actualizarEstadoFactura(req.params.id, {
      estado_pago,
      fecha_pago,
      comprobante_egreso_no
    });
    res.json({ success: true, data: actualizada });
  } catch (err) {
    console.error('Error actualizando pago:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/post-adjudicacion/contrato/:id/polizas', async (req, res) => {
  try {
    const { aseguradora, numero_poliza, tipo_amparo, porcentaje_amparado, valor_asegurado, fecha_inicio_vigencia, fecha_fin_vigencia, estado_aprobacion } = req.body;
    if (!aseguradora || !numero_poliza || !tipo_amparo || !valor_asegurado || !fecha_fin_vigencia) {
      return res.status(400).json({ success: false, error: 'Faltan datos obligatorios de la póliza.' });
    }

    const poliza = await postAdjudicacionEngine.registrarPoliza(req.params.id, {
      aseguradora,
      numero_poliza,
      tipo_amparo,
      porcentaje_amparado,
      valor_asegurado,
      fecha_inicio_vigencia: fecha_inicio_vigencia || new Date().toISOString().slice(0, 10),
      fecha_fin_vigencia,
      estado_aprobacion
    });

    res.json({ success: true, data: poliza });
  } catch (err) {
    console.error('Error registrando póliza:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/post-adjudicacion/contrato/:id/liquidacion-pdf', async (req, res) => {
  try {
    const pdfBuffer = await postAdjudicacionEngine.generarActaLiquidacionPdf(req.params.id);
    const filename = `Acta_Liquidacion_Contrato_${req.params.id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando PDF de liquidación:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== MÓDULO: CAPACIDAD RESIDUAL (K RESIDUAL) Y FORMULARIO 5 CCE ====================

app.get('/api/capacidad-residual/perfiles/:empresaId', async (req, res) => {
  try {
    const dbPostgres = require('./dbPostgres');
    const result = await dbPostgres.query(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM capacidad_residual_contratos_sce sce WHERE sce.perfil_id = p.id) as total_contratos_sce,
        (SELECT COALESCE(SUM(saldo_imputable_proponente), 0) FROM capacidad_residual_contratos_sce sce WHERE sce.perfil_id = p.id) as total_sce_cop
      FROM capacidad_residual_perfiles p
      WHERE p.empresa_id = $1
      ORDER BY p.id DESC
    `, [req.params.empresaId]);
    res.json({ success: true, perfiles: result.rows });
  } catch (err) {
    console.error('Error obteniendo perfiles de KR:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/capacidad-residual/perfiles', async (req, res) => {
  try {
    const { empresa_id, ...datosPerfil } = req.body;
    if (!empresa_id) {
      return res.status(400).json({ success: false, error: 'empresa_id es requerido' });
    }
    const perfilGuardado = await residualCapacityEngine.guardarPerfil(empresa_id, datosPerfil);
    res.json({ success: true, perfil: perfilGuardado });
  } catch (err) {
    console.error('Error guardando perfil de KR:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/capacidad-residual/perfiles/:id/calculo', async (req, res) => {
  try {
    const consolidado = await residualCapacityEngine.getCalculoConsolidado(req.params.id);
    if (!consolidado) {
      return res.status(404).json({ success: false, error: 'Perfil de KR no encontrado' });
    }
    res.json({ success: true, consolidado });
  } catch (err) {
    console.error('Error obteniendo cálculo consolidado de KR:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/capacidad-residual/perfiles/:id/contratos-sce', async (req, res) => {
  try {
    const perfilId = req.params.id;
    const contratoData = req.body;
    if (!contratoData.entidad_contratante || !contratoData.numero_contrato || !contratoData.valor_total_contrato) {
      return res.status(400).json({ success: false, error: 'Campos obligatorios incompletos del contrato SCE' });
    }
    const contratoGuardado = await residualCapacityEngine.agregarContratoSCE(perfilId, contratoData);
    res.json({ success: true, contrato: contratoGuardado });
  } catch (err) {
    console.error('Error agregando contrato SCE:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/capacidad-residual/contratos-sce/:id', async (req, res) => {
  try {
    const dbPostgres = require('./dbPostgres');
    await dbPostgres.query('DELETE FROM capacidad_residual_contratos_sce WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Contrato SCE eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando contrato SCE:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/capacidad-residual/simulacion-pipeline', async (req, res) => {
  try {
    const { perfil_id, procesos } = req.body;
    if (!perfil_id || !Array.isArray(procesos) || procesos.length === 0) {
      return res.status(400).json({ success: false, error: 'Se requiere perfil_id y un arreglo no vacío de procesos' });
    }
    const resultado = await residualCapacityEngine.simularPipelineConcurrente(perfil_id, procesos);
    res.json({ success: true, simulacion: resultado });
  } catch (err) {
    console.error('Error en simulación de pipeline concurrente:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/capacidad-residual/generar-formulario5-pdf', async (req, res) => {
  try {
    const { perfil_id, proceso_info, firmantes } = req.body;
    if (!perfil_id) {
      return res.status(400).json({ success: false, error: 'perfil_id es requerido' });
    }
    const pdfBuffer = await residualCapacityEngine.generarFormulario5Pdf(perfil_id, proceso_info || {}, firmantes || {});
    const filename = `Formulario_5_Capacidad_Residual_${perfil_id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando Formulario 5 CCE PDF:', err.message);
    res.status(500).json({ success: false, error: err.message });
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
