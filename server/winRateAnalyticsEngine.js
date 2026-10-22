const dbPostgres = require('./dbPostgres');

class WinRateAnalyticsEngine {
  /**
   * Genera el tablero analítico ejecutivo de Win Rate, Embudo Licitatorio y ROI
   */
  async getExecutiveAnalytics(empresaId = null, periodo = 'ALL') {
    let whereClauses = [];
    let params = [];

    if (empresaId) {
      whereClauses.push(`p.empresa_id = $${params.length + 1}`);
      params.push(parseInt(empresaId, 10));
    }

    if (periodo === 'CURRENT_YEAR') {
      whereClauses.push(`EXTRACT(YEAR FROM p.creado_en) = EXTRACT(YEAR FROM CURRENT_DATE)`);
    } else if (periodo === 'LAST_90_DAYS') {
      whereClauses.push(`p.creado_en >= CURRENT_DATE - INTERVAL '90 days'`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT p.*, e.razon_social as empresa_nombre
      FROM pipeline_procesos p
      LEFT JOIN empresas e ON e.id = p.empresa_id
      ${whereSql}
      ORDER BY p.actualizado_en DESC;
    `;

    const res = await dbPostgres.query(query, params);
    const rows = res.rows;

    // Si no hay procesos suficientes en el pipeline, alimentar con datos de contratos_gestion para contexto histórico
    let contratosHistoricos = [];
    try {
      const qContratos = `SELECT * FROM contratos_gestion ${empresaId ? 'WHERE empresa_id = $1' : ''}`;
      const resContratos = await dbPostgres.query(qContratos, empresaId ? [parseInt(empresaId, 10)] : []);
      contratosHistoricos = resContratos.rows;
    } catch (e) {
      console.warn('Aviso leyendo contratos históricos:', e.message);
    }

    // 1. Cálculos de KPIs Clave
    const totalProcesos = rows.length;
    let adjudicados = rows.filter(r => r.fase === 'ADJUDICADO').length;
    let perdidos = rows.filter(r => ['PERDIDO', 'DESIERTO'].includes(r.fase)).length;
    let enCurso = rows.filter(r => !['ADJUDICADO', 'PERDIDO', 'DESIERTO'].includes(r.fase)).length;

    // Integrar contratos adjudicados históricos si el pipeline está naciendo
    if (adjudicados === 0 && contratosHistoricos.length > 0) {
      adjudicados = contratosHistoricos.length;
    }

    const totalCerrados = adjudicados + perdidos;
    const winRateOportunidades = totalCerrados > 0 ? Number(((adjudicados / totalCerrados) * 100).toFixed(1)) : 0;

    let montoTotalPipeline = 0;
    let montoPonderadoPipeline = 0;
    let montoAdjudicado = 0;
    let montoPerdido = 0;
    let costoTotalEstructuracion = 0;

    rows.forEach(r => {
      const pres = parseFloat(r.presupuesto) || 0;
      const prob = parseInt(r.probabilidad_exito, 10) || 50;
      const costo = parseFloat(r.costo_preparacion_estimado) || (pres * 0.015); // Fallback: 1.5% del valor

      costoTotalEstructuracion += costo;

      if (!['ADJUDICADO', 'PERDIDO', 'DESIERTO'].includes(r.fase)) {
        montoTotalPipeline += pres;
        montoPonderadoPipeline += pres * (prob / 100);
      } else if (r.fase === 'ADJUDICADO') {
        montoAdjudicado += parseFloat(r.valor_ofertado) || pres;
      } else if (['PERDIDO', 'DESIERTO'].includes(r.fase)) {
        montoPerdido += pres;
      }
    });

    // Sumar montos de contratos adjudicados registrados
    if (montoAdjudicado === 0 && contratosHistoricos.length > 0) {
      montoAdjudicado = contratosHistoricos.reduce((s, c) => s + (parseFloat(c.valor_adjudicado) || 0), 0);
    }

    const montoTotalOfertadoCerrado = montoAdjudicado + montoPerdido;
    const winRateFinanciero = montoTotalOfertadoCerrado > 0 ? Number(((montoAdjudicado / montoTotalOfertadoCerrado) * 100).toFixed(1)) : (adjudicados > 0 ? 100 : 0);

    // Estimación de Utilidad Operativa del Contratista (AIU Utilidad típica: 8% del monto adjudicado)
    const utilidadOperativaEstimada = Math.round(montoAdjudicado * 0.08);
    const costoLicitatorioFinal = Math.max(costoTotalEstructuracion, 10000000); // Mínimo de referencia
    const roiLicitatorioNeto = Number((((utilidadOperativaEstimada - costoLicitatorioFinal) / costoLicitatorioFinal) * 100).toFixed(1));

    // 2. Embudo de Conversión Licitatoria (Funnel)
    const funnelFases = [
      {
        etapa: 'Identificado en Radar',
        codigo: 'IDENTIFICADO',
        icono: '🔍',
        cantidad: totalProcesos,
        volumenCOP: rows.reduce((s, r) => s + (parseFloat(r.presupuesto) || 0), 0),
        porcentajeRetencion: 100
      },
      {
        etapa: 'Aprobación Go / No-Go',
        codigo: 'EVALUADO',
        icono: '⚖️',
        cantidad: rows.filter(r => r.decision_go_nogo === 'GO' || ['EVALUADO', 'EN_PREPARACION', 'PRESENTADO', 'SUBSANACION', 'ADJUDICADO', 'PERDIDO'].includes(r.fase)).length,
        volumenCOP: rows.filter(r => r.decision_go_nogo === 'GO' || r.fase !== 'IDENTIFICADO').reduce((s, r) => s + (parseFloat(r.presupuesto) || 0), 0)
      },
      {
        etapa: 'Estructuración Legal & Técnica',
        codigo: 'EN_PREPARACION',
        icono: '📝',
        cantidad: rows.filter(r => ['EN_PREPARACION', 'PRESENTADO', 'SUBSANACION', 'ADJUDICADO', 'PERDIDO'].includes(r.fase)).length,
        volumenCOP: rows.filter(r => ['EN_PREPARACION', 'PRESENTADO', 'SUBSANACION', 'ADJUDICADO', 'PERDIDO'].includes(r.fase)).reduce((s, r) => s + (parseFloat(r.presupuesto) || 0), 0)
      },
      {
        etapa: 'Oferta Radicada en SECOP II',
        codigo: 'PRESENTADO',
        icono: '🚀',
        cantidad: rows.filter(r => ['PRESENTADO', 'SUBSANACION', 'ADJUDICADO', 'PERDIDO'].includes(r.fase)).length,
        volumenCOP: rows.filter(r => ['PRESENTADO', 'SUBSANACION', 'ADJUDICADO', 'PERDIDO'].includes(r.fase)).reduce((s, r) => s + (parseFloat(r.presupuesto) || 0), 0)
      },
      {
        etapa: 'Adjudicado (Ganado)',
        codigo: 'ADJUDICADO',
        icono: '🏆',
        cantidad: adjudicados,
        volumenCOP: montoAdjudicado
      }
    ];

    // Calcular tasas de conversión
    funnelFases.forEach((f, idx) => {
      if (idx > 0 && funnelFases[0].cantidad > 0) {
        f.porcentajeRetencion = Number(((f.cantidad / funnelFases[0].cantidad) * 100).toFixed(1));
      } else if (idx === 0) {
        f.porcentajeRetencion = 100;
      } else {
        f.porcentajeRetencion = 0;
      }
    });

    // 3. Segmentación por Modalidad de Contratación
    const modalidadesMap = {};
    rows.forEach(r => {
      const mod = r.modalidad || 'LICITACION_PUBLICA';
      if (!modalidadesMap[mod]) {
        modalidadesMap[mod] = { modalidad: mod, total: 0, adjudicados: 0, perdidos: 0, montoAdjudicado: 0, montoTotal: 0 };
      }
      modalidadesMap[mod].total++;
      modalidadesMap[mod].montoTotal += parseFloat(r.presupuesto) || 0;
      if (r.fase === 'ADJUDICADO') {
        modalidadesMap[mod].adjudicados++;
        modalidadesMap[mod].montoAdjudicado += parseFloat(r.valor_ofertado) || parseFloat(r.presupuesto) || 0;
      } else if (['PERDIDO', 'DESIERTO'].includes(r.fase)) {
        modalidadesMap[mod].perdidos++;
      }
    });

    const segmentacionModalidad = Object.values(modalidadesMap).map(m => {
      const cerradosMod = m.adjudicados + m.perdidos;
      const winRate = cerradosMod > 0 ? Number(((m.adjudicados / cerradosMod) * 100).toFixed(1)) : 0;
      return {
        ...m,
        winRate
      };
    });

    // 4. Segmentación por Tipo de Oferente (Individual vs Consorcio)
    const individual = rows.filter(r => (r.tipo_proponente || 'INDIVIDUAL') === 'INDIVIDUAL');
    const plural = rows.filter(r => (r.tipo_proponente || '') === 'CONSORCIO');

    const indAdj = individual.filter(r => r.fase === 'ADJUDICADO').length;
    const indCerr = individual.filter(r => ['ADJUDICADO', 'PERDIDO', 'DESIERTO'].includes(r.fase)).length;
    const pluAdj = plural.filter(r => r.fase === 'ADJUDICADO').length;
    const pluCerr = plural.filter(r => ['ADJUDICADO', 'PERDIDO', 'DESIERTO'].includes(r.fase)).length;

    const segmentacionProponente = {
      individual: {
        total: individual.length,
        adjudicados: indAdj,
        winRate: indCerr > 0 ? Number(((indAdj / indCerr) * 100).toFixed(1)) : 0
      },
      consorcio: {
        total: plural.length,
        adjudicados: pluAdj,
        winRate: pluCerr > 0 ? Number(((pluAdj / pluCerr) * 100).toFixed(1)) : 0
      }
    };

    // 5. Distribución de Motivos de Pérdida
    const motivosMap = {
      'PRECIO': 0,
      'DESCALIFICACION_FINANCIERA': 0,
      'DESCALIFICACION_EXPERIENCIA': 0,
      'EMPATE_DESEMPATE': 0,
      'DESIERTO': 0,
      'OTRO': 0
    };

    rows.filter(r => ['PERDIDO', 'DESIERTO'].includes(r.fase)).forEach(r => {
      const m = r.motivo_perdida || (r.fase === 'DESIERTO' ? 'DESIERTO' : 'PRECIO');
      motivosMap[m] = (motivosMap[m] || 0) + 1;
    });

    const motivosPerdida = Object.entries(motivosMap).map(([motivo, count]) => ({
      motivo,
      count,
      porcentaje: perdidos > 0 ? Number(((count / perdidos) * 100).toFixed(1)) : 0
    }));

    // 6. Proyecciones Temporales Run-Rate (30, 60, 90, 180 días)
    const now = new Date().getTime();
    const runRate = { d30: 0, d60: 0, d90: 0, d180: 0 };

    rows.filter(r => !['ADJUDICADO', 'PERDIDO', 'DESIERTO'].includes(r.fase)).forEach(r => {
      if (r.fecha_cierre) {
        const diffDays = Math.round((new Date(r.fecha_cierre).getTime() - now) / (1000 * 60 * 60 * 24));
        const pond = (parseFloat(r.presupuesto) || 0) * ((parseInt(r.probabilidad_exito, 10) || 50) / 100);
        if (diffDays <= 30 && diffDays >= 0) runRate.d30 += pond;
        if (diffDays <= 60 && diffDays >= 0) runRate.d60 += pond;
        if (diffDays <= 90 && diffDays >= 0) runRate.d90 += pond;
        if (diffDays <= 180 && diffDays >= 0) runRate.d180 += pond;
      }
    });

    // 7. Diagnóstico Algorítmico y Recomendaciones Estratégicas
    const recomendaciones = [];
    if (winRateOportunidades >= 40) {
      recomendaciones.push({
        tipo: 'POSITIVO',
        titulo: 'Tasa de Éxito de Alto Desempeño',
        mensaje: `Tu Win Rate del ${winRateOportunidades}% se sitúa por encima del promedio del mercado nacional (22% en SECOP II). Mantener la disciplina en el filtro Go/No-Go.`
      });
    } else if (winRateOportunidades > 0) {
      recomendaciones.push({
        tipo: 'ALERTA',
        titulo: 'Margen de Optimización en la Conversión de Ofertas',
        mensaje: `Win Rate actual en ${winRateOportunidades}%. Se recomienda utilizar el Simulador de Fórmulas CCE y Monte Carlo para afinar el precio de adjudicación frente a la TRM.`
      });
    } else {
      recomendaciones.push({
        tipo: 'INFO',
        titulo: 'Pipeline en Fase de Acumulación y Calificación',
        mensaje: 'Avanza en la radicación de ofertas para consolidar la muestra estadística y calibrar la tasa de éxito por entidad.'
      });
    }

    if (motivosMap['PRECIO'] > 0) {
      recomendaciones.push({
        tipo: 'ESTRATEGICO',
        titulo: 'Pérdida por Precio de Competidor',
        mensaje: 'Se registran pérdidas por descuento de competidores. Incorporar el Módulo de Inteligencia Competitiva para anticipar los descuentos medianos de rivales recurrentes.'
      });
    }

    if (roiLicitatorioNeto > 100) {
      recomendaciones.push({
        tipo: 'FINANCIERO',
        titulo: 'Excelente Retorno de Inversión (ROI)',
        mensaje: `Por cada $ 1 COP invertido en estructuración y pólizas, la cartera proyecta generar $ ${(roiLicitatorioNeto / 100).toFixed(1)} COP en utilidad neta contratada.`
      });
    }

    return {
      kpis: {
        totalProcesos,
        adjudicados,
        perdidos,
        enCurso,
        winRateOportunidades,
        winRateFinanciero,
        montoTotalPipeline: Math.round(montoTotalPipeline),
        montoPonderadoPipeline: Math.round(montoPonderadoPipeline),
        montoAdjudicado: Math.round(montoAdjudicado),
        montoPerdido: Math.round(montoPerdido),
        costoTotalEstructuracion: Math.round(costoTotalEstructuracion),
        utilidadOperativaEstimada,
        roiLicitatorioNeto
      },
      funnel: funnelFases,
      segmentacionModalidad,
      segmentacionProponente,
      motivosPerdida,
      runRateProyeccion: {
        d30: Math.round(runRate.d30),
        d60: Math.round(runRate.d60),
        d90: Math.round(runRate.d90),
        d180: Math.round(runRate.d180)
      },
      recomendaciones
    };
  }
}

module.exports = new WinRateAnalyticsEngine();
