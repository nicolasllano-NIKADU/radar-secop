const express = require('express');
const router = express.Router();
const multer = require('multer');
const companyManager = require('../companyManager');
const financialEngine = require('../financialEngine');
const rupParser = require('../rupParser');
const allianceRecommender = require('../allianceRecommender');

// Configuración de multer en memoria para subida de PDFs (límite 15MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

// Middleware para inyectar usuario de sesión (temporalmente el admin por defecto)
router.use(async (req, res, next) => {
  try {
    const user = await companyManager.getOrCreateDefaultUser();
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error identificando usuario' });
  }
});

// GET /api/empresas - Lista todas las empresas del usuario con sus indicadores
router.get('/', async (req, res) => {
  try {
    const companies = await companyManager.getCompaniesByUser(req.user.id);
    res.json({ ok: true, data: companies });
  } catch (err) {
    console.error('Error listando empresas:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/empresas - Crea una nueva empresa (propia o aliada)
router.post('/', async (req, res) => {
  try {
    const company = await companyManager.createCompany(req.user.id, req.body);
    res.json({ ok: true, data: company });
  } catch (err) {
    console.error('Error creando empresa:', err);
    res.status(400).json({ ok: false, error: err.message });
  }
});

// POST /api/empresas/:id/financiero - Guarda o actualiza partidas contables y recalcula RUP
router.post('/:id/financiero', async (req, res) => {
  try {
    const empresaId = parseInt(req.params.id, 10);
    const result = await companyManager.saveFinancialData(empresaId, req.body);
    res.json({ ok: true, data: result });
  } catch (err) {
    console.error('Error guardando financiero:', err);
    res.status(400).json({ ok: false, error: err.message });
  }
});

// POST /api/empresas/:id/busqueda - Actualiza palabras clave y filtros de búsqueda
router.post('/:id/busqueda', async (req, res) => {
  try {
    const empresaId = parseInt(req.params.id, 10);
    const result = await companyManager.updateSearchProfile(empresaId, req.body);
    res.json({ ok: true, data: result });
  } catch (err) {
    console.error('Error guardando perfil de búsqueda:', err);
    res.status(400).json({ ok: false, error: err.message });
  }
});

// POST /api/empresas/simular-plural - Simula y consolida un Consorcio o Unión Temporal
router.post('/simular-plural', async (req, res) => {
  try {
    const { miembros = [], requisitos_pliego = null } = req.body;
    
    // Si los miembros vienen con solo ID y porcentaje, enriquecer con sus datos de la BD
    const allCompanies = await companyManager.getCompaniesByUser(req.user.id);
    const enrichedMiembros = miembros.map(m => {
      const found = allCompanies.find(c => c.id === m.empresa_id);
      return {
        empresa_id: m.empresa_id,
        porcentaje: m.porcentaje,
        razon_social: found ? found.razon_social : (m.razon_social || `Empresa ${m.empresa_id}`),
        financiero: found || m.financiero || {}
      };
    });

    const simulacion = financialEngine.aggregatePluralStructure(enrichedMiembros);

    let evaluacion = null;
    if (requisitos_pliego) {
      evaluacion = financialEngine.evaluateAgainstRequirements(simulacion.indicadores, requisitos_pliego);
    }

    res.json({
      ok: true,
      simulacion,
      evaluacion
    });
  } catch (err) {
    console.error('Error en simulación plural:', err);
    res.status(400).json({ ok: false, error: err.message });
  }
});

// POST /api/empresas/upload-rup - Analiza y extrae automáticamente datos de RUP desde PDF
router.post('/upload-rup', upload.single('rup_pdf'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ ok: false, error: 'Debe adjuntar un archivo PDF de RUP o Estados Financieros.' });
    }

    const parsed = await rupParser.parseRUPBuffer(req.file.buffer);
    
    // Opcionalmente, precalcular indicadores con el motor financiero para mostrar en la previsualización
    const indicadores = financialEngine.calculateRatios({
      activo_corriente: parsed.activo_corriente,
      pasivo_corriente: parsed.pasivo_corriente,
      activo_total: parsed.activo_total,
      pasivo_total: parsed.pasivo_total,
      patrimonio: parsed.patrimonio,
      utilidad_operacional: parsed.utilidad_operacional,
      gastos_intereses: parsed.gastos_intereses
    });

    res.json({
      ok: true,
      data: {
        ...parsed,
        indicadores
      }
    });
  } catch (err) {
    console.error('Error procesando PDF de RUP:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/empresas/sugerir-alianza - Recomienda la mejor combinación de consorcio para un pliego
router.post('/sugerir-alianza', async (req, res) => {
  try {
    const { empresa_lider_id, requisitos_pliego = {}, opciones = {} } = req.body;
    const allCompanies = await companyManager.getCompaniesByUser(req.user.id);

    const lider = allCompanies.find(c => c.id === parseInt(empresa_lider_id, 10)) || allCompanies[0];
    if (!lider) {
      return res.status(404).json({ ok: false, error: 'No se encontró la empresa líder' });
    }

    const resultado = allianceRecommender.recommendAlliances(lider, allCompanies, requisitos_pliego, opciones);
    res.json({ ok: true, data: resultado });
  } catch (err) {
    console.error('Error en recomendación de alianzas:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/empresas/:id/experiencia - Lista los contratos acreditados de una empresa
router.get('/:id/experiencia', async (req, res) => {
  try {
    const empresaId = parseInt(req.params.id, 10);
    const contratos = await companyManager.getExperienceByCompany(empresaId);
    res.json({ ok: true, data: contratos });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/empresas/:id/experiencia - Registra un contrato de experiencia RUP
router.post('/:id/experiencia', async (req, res) => {
  try {
    const empresaId = parseInt(req.params.id, 10);
    const contrato = await companyManager.addExperienceContract(empresaId, req.body);
    res.json({ ok: true, data: contrato });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// DELETE /api/empresas/:empresaId/experiencia/:contratoId - Elimina un contrato
router.delete('/:empresaId/experiencia/:contratoId', async (req, res) => {
  try {
    const empresaId = parseInt(req.params.empresaId, 10);
    const contratoId = parseInt(req.params.contratoId, 10);
    await companyManager.deleteExperienceContract(contratoId, empresaId);
    res.json({ ok: true, message: 'Contrato eliminado' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/empresas/evaluar-experiencia - Evalúa matriz de experiencia individual o consorcial
router.post('/evaluar-experiencia', async (req, res) => {
  try {
    const { empresas_ids = [], requisitos_experiencia = {} } = req.body;
    let contratosTotales = [];

    for (const empId of empresas_ids) {
      const contratos = await companyManager.getExperienceByCompany(parseInt(empId, 10));
      contratosTotales.push(...contratos);
    }

    const evaluacion = financialEngine.evaluateExperience(contratosTotales, requisitos_experiencia);
    res.json({ ok: true, data: evaluacion });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// POST /api/empresas/:id/k-residual - Calcula la capacidad residual de obra pública (K Residual)
router.post('/:id/k-residual', async (req, res) => {
  try {
    const empresaId = parseInt(req.params.id, 10);
    const allCompanies = await companyManager.getCompaniesByUser(req.user.id);
    const emp = allCompanies.find(c => c.id === empresaId);
    if (!emp) return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });

    const contratos = await companyManager.getExperienceByCompany(empresaId);
    const expSmmlv = contratos.reduce((sum, c) => sum + (parseFloat(c.valor_contrato_smmlv) || 0), 0);

    // Consultar saldos en ejecución (SCE) reales desde contratos_gestion si no se enviaron manuales
    let sce = req.body.saldos_en_ejecucion !== undefined ? parseFloat(req.body.saldos_en_ejecucion) : null;
    if (sce === null || isNaN(sce)) {
      try {
        const dbPostgres = require('../dbPostgres');
        const sceRes = await dbPostgres.query(`
          SELECT COALESCE(SUM(valor_adjudicado + valor_adicionado), 0) as total_sce
          FROM contratos_gestion
          WHERE empresa_id = $1 AND estado_ejecucion IN ('LEGALIZACION', 'EN_EJECUCION', 'SUSPENDIDO')
        `, [empresaId]);
        sce = parseFloat(sceRes.rows[0]?.total_sce) || 0;
      } catch (e) {
        sce = 0;
      }
    }

    const smmlv = parseFloat(req.body.smmlv_valor) || 1423500;
    const kRes = financialEngine.calculateResidualCapacityK({
      activo_corriente: emp.activo_corriente,
      pasivo_corriente: emp.pasivo_corriente,
      patrimonio: emp.patrimonio,
      experiencia_smmlv: expSmmlv,
      personal_tecnico_score: req.body.personal_tecnico_score || 80,
      indice_liquidez: emp.indice_liquidez,
      indice_endeudamiento: emp.indice_endeudamiento,
      saldos_contratos_ejecucion_cop: sce
    }, smmlv);

    const kRequerido = parseFloat(req.body.k_requerido_cop) || 0;
    const cumple = kRequerido > 0 ? kRes.capacidad_residual_cop >= kRequerido : true;
    const deficit = kRequerido > 0 ? Math.max(0, kRequerido - kRes.capacidad_residual_cop) : 0;
    const holgura = kRequerido > 0 ? kRes.capacidad_residual_cop - kRequerido : kRes.capacidad_residual_cop;

    res.json({
      ok: true,
      data: {
        ...kRes,
        empresa: { id: emp.id, razon_social: emp.razon_social, nit: emp.nit },
        k_requerido_cop: kRequerido,
        cumple,
        deficit_cop: deficit,
        holgura_cop: holgura,
        recomendacion: cumple ?
          '✅ Capacidad Residual suficiente para licitar individualmente según Pliegos Tipo ANCP-CCE.' :
          '⚠️ Capacidad Residual insuficiente. Se requiere conformar estructura plural (Consorcio) o acreditar mayor nómina técnica para subsanar el déficit.'
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/empresas/k-residual-plural - Calcula Capacidad Residual Agregada en Consorcio
router.post('/k-residual-plural', async (req, res) => {
  try {
    const { miembros = [], k_requerido_cop = 0, smmlv_valor = 1423500 } = req.body;
    const allCompanies = await companyManager.getCompaniesByUser(req.user.id);
    const smmlv = parseFloat(smmlv_valor) || 1423500;
    const kReq = parseFloat(k_requerido_cop) || 0;

    let kTotalPlural = 0;
    const desgloseMiembros = [];

    for (const m of miembros) {
      const emp = allCompanies.find(c => c.id === parseInt(m.empresa_id, 10));
      if (!emp) continue;

      const contratos = await companyManager.getExperienceByCompany(emp.id);
      const expSmmlv = contratos.reduce((sum, c) => sum + (parseFloat(c.valor_contrato_smmlv) || 0), 0);

      const kInd = financialEngine.calculateResidualCapacityK({
        activo_corriente: emp.activo_corriente,
        pasivo_corriente: emp.pasivo_corriente,
        patrimonio: emp.patrimonio,
        experiencia_smmlv: expSmmlv,
        personal_tecnico_score: m.personal_tecnico_score || 80,
        indice_liquidez: emp.indice_liquidez,
        indice_endeudamiento: emp.indice_endeudamiento,
        saldos_contratos_ejecucion_cop: m.saldos_en_ejecucion || 0
      }, smmlv);

      kTotalPlural += kInd.capacidad_residual_cop;
      desgloseMiembros.push({
        empresa_id: emp.id,
        razon_social: emp.razon_social,
        porcentaje_participacion: m.porcentaje || 0,
        k_individual_cop: kInd.capacidad_residual_cop,
        k_individual_smmlv: kInd.capacidad_residual_smmlv,
        desglose: kInd.desglose
      });
    }

    const cumple = kReq > 0 ? kTotalPlural >= kReq : true;

    res.json({
      ok: true,
      data: {
        capacidad_residual_plural_cop: kTotalPlural,
        capacidad_residual_plural_smmlv: parseFloat((kTotalPlural / smmlv).toFixed(2)),
        k_requerido_cop: kReq,
        cumple,
        deficit_cop: kReq > 0 ? Math.max(0, kReq - kTotalPlural) : 0,
        holgura_cop: kReq > 0 ? kTotalPlural - kReq : kTotalPlural,
        miembros: desgloseMiembros
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
