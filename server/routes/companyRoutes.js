const express = require('express');
const router = express.Router();
const companyManager = require('../companyManager');
const financialEngine = require('../financialEngine');

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

module.exports = router;
