const dbPostgres = require('./dbPostgres');
const companyManager = require('./companyManager');

class ScoringEngine {
  /**
   * Simula y calcula el desglose de los 100 puntos de evaluación oficial ANCP-CCE
   */
  async calcularPuntajeLicitacion({
    procesoId,
    empresaId,
    precioOferta = null,
    acreditaIndustriaNacional = true,
    esServicio = false,
    acreditaPersonalDiscapacidad = false,
    esEmpresaMujeres = false,
    calidadTecnicaPuntos = 15,
    ponderacionConfig = null
  }) {
    // 1. Obtener datos de la empresa y del proceso
    let opp = null;
    try {
      const oppRes = await dbPostgres.query(`SELECT * FROM oportunidades WHERE id = $1`, [procesoId]);
      if (oppRes.rows.length > 0) opp = oppRes.rows[0];
    } catch (e) {
      console.warn('Aviso buscando proceso para ponderación:', e.message);
    }

    if (!opp) {
      opp = {
        id: procesoId,
        referencia: procesoId,
        entidad: 'Entidad Estatal',
        objeto: 'Contratación estatal',
        precio_base: 500000000,
        modalidad: 'Licitación Pública'
      };
    }

    let empresa = null;
    if (empresaId) {
      empresa = await companyManager.getCompanyById(parseInt(empresaId, 10));
    } else {
      const all = await companyManager.getAllCompanies();
      empresa = all.find(c => c.es_propia) || all[0];
    }

    if (!empresa) {
      empresa = {
        id: 1,
        razon_social: 'Proponente Colombia S.A.S.',
        nit: '901000000',
        tamano_empresa: 'MIPYME'
      };
    }

    // 2. Configuración de Ponderación (Pliegos Tipo Estándar)
    // Regla ANCP-CCE: Bienes suele ser 60 Eco / 20 Ind. Nac / 20 Calidad; Servicios suele ser 60-70 Eco / 10-20 Ind / 10-20 Calidad
    const maxEconomico = ponderacionConfig?.maxEconomico || 60.0;
    const maxIndustriaNacional = ponderacionConfig?.maxIndustriaNacional || (esServicio ? 10.0 : 20.0);
    const maxCalidadTecnica = ponderacionConfig?.maxCalidadTecnica || (100.0 - maxEconomico - maxIndustriaNacional);

    const po = parseFloat(ponderacionConfig?.presupuestoOficial || opp.precio_base || 1000000000);
    const oferta = parseFloat(precioOferta) || (po * 0.98); // Estimación del 2% de descuento típico

    // A. Puntaje Económico (Modelo estándar de Pliegos Tipo ANCP-CCE)
    let puntajeEconomico = 0;
    if (oferta > po) {
      // Oferta artificialmente alta que sobrepasa el Presupuesto Oficial: 0 puntos
      puntajeEconomico = 0;
    } else if (oferta > 0) {
      // Proporcionalidad competitiva estándar: descuentos racionales (0% a 15%) obtienen entre 55 y 60 pts
      const holgura = (po - oferta) / po;
      puntajeEconomico = Number((maxEconomico * (1.0 - Math.min(0.2, holgura * 0.5))).toFixed(2));
      if (puntajeEconomico > maxEconomico) puntajeEconomico = maxEconomico;
      if (puntajeEconomico < 0) puntajeEconomico = 0;
    }

    // B. Puntaje Apoyo a la Industria Nacional (Ley 816/2003 y Decreto 1082/2015)
    let puntajeIndustriaNacional = 0;
    let descIndustriaNacional = '';
    if (acreditaIndustriaNacional) {
      puntajeIndustriaNacional = maxIndustriaNacional;
      descIndustriaNacional = `Acredita 100% componente o servicio nacional bajo Ley 816 de 2003. Asignación del puntaje máximo (${maxIndustriaNacional} pts).`;
    } else {
      puntajeIndustriaNacional = Number((maxIndustriaNacional * 0.5).toFixed(2));
      descIndustriaNacional = `Componente extranjero con tratado de libre comercio o incorporación nacional parcial (50% de los puntos: ${puntajeIndustriaNacional} pts).`;
    }

    // C. Factor de Calidad Técnica / Factor Ambiental
    const puntajeCalidad = Math.min(maxCalidadTecnica, parseFloat(calidadTecnicaPuntos) || 0);

    // D. Puntaje Adicional: Personal en Condición de Discapacidad (Decreto 392 de 2018)
    const puntajeDiscapacidad = acreditaPersonalDiscapacidad ? 1.0 : 0.0;

    // E. Criterio Mipyme y Empresas de Mujeres (Ley 2069 de 2020 Art. 34 y Decreto 1860 de 2021)
    const esMipyme = ['MICRO', 'PEQUEÑA', 'MEDIANA', 'MIPYME'].includes((empresa.tamano_empresa || '').toUpperCase());
    let puntajeMujeres = 0;
    if (esEmpresaMujeres) {
      puntajeMujeres = 0.5; // Bonificación de puntaje en convocatorias con enfoque de género
    }

    // Total Acumulado (Puede llegar a 101.5 con los factores de inclusión social)
    const puntajeTotal = Number((
      puntajeEconomico +
      puntajeIndustriaNacional +
      puntajeCalidad +
      puntajeDiscapacidad +
      puntajeMujeres
    ).toFixed(2));

    // Nivel de competitividad
    let nivelCompetitivo = 'ALTO';
    let nivelBadge = '🟢 ALTAMENTE COMPETITIVO (CANDIDATO A GANADOR)';
    let color = '#10b981';

    if (puntajeTotal < 85) {
      nivelCompetitivo = 'BAJO';
      nivelBadge = '🔴 RIESGO DE PERDER POR PONDERACIÓN';
      color = '#ef4444';
    } else if (puntajeTotal < 95) {
      nivelCompetitivo = 'MEDIO';
      nivelBadge = '🟡 COMPETITIVO CONDICIONADO A DESCUENTO';
      color = '#f59e0b';
    }

    // 3. Simulación de Criterios de Desempate (Ley 2069 de 2020 Art. 35)
    const arbolDesempate = [
      {
        orden: 1,
        criterio: 'Mayor puntaje en el factor técnico / calidad',
        aplica: puntajeCalidad >= (maxCalidadTecnica * 0.9),
        detalle: `Puntaje técnico acreditado: ${puntajeCalidad} / ${maxCalidadTecnica} pts.`,
        fundamento: 'Ley 2069 de 2020 Art. 35 Numeral 1'
      },
      {
        orden: 2,
        criterio: 'Proponente con calidad de Mipyme Nacional',
        aplica: esMipyme,
        detalle: esMipyme ? `Acredita condición de ${empresa.tamano_empresa || 'MIPYME'} bajo Ley 2069/2020.` : 'No acredita certificación Mipyme.',
        fundamento: 'Ley 2069 de 2020 Art. 35 Numeral 2'
      },
      {
        orden: 3,
        criterio: 'Vinculación laboral de personas con discapacidad',
        aplica: acreditaPersonalDiscapacidad,
        detalle: acreditaPersonalDiscapacidad ? 'Acredita nómina con >=10% personal con discapacidad por más de 1 año.' : 'No acreditado.',
        fundamento: 'Decreto 392 de 2018 y Ley 2069 de 2020 Art. 35 Numeral 3'
      },
      {
        orden: 4,
        criterio: 'Empresa liderada por mujeres / mayoría de socias mujeres',
        aplica: esEmpresaMujeres,
        detalle: esEmpresaMujeres ? 'Acredita control y representación legal femenina bajo Decreto 1860 de 2021.' : 'No acreditado.',
        fundamento: 'Decreto 1860 de 2021 y Ley 2069 de 2020 Art. 35 Numeral 4'
      },
      {
        orden: 5,
        criterio: 'Vinculación de población en reincorporación / víctimas del conflicto',
        aplica: false,
        detalle: 'Acreditación facultativa de nómina de reincorporados.',
        fundamento: 'Ley 1448 de 2011 y Ley 2069 de 2020 Numeral 5'
      },
      {
        orden: 6,
        criterio: 'Primer proponente en radicar la oferta en SECOP II (Orden cronológico)',
        aplica: true,
        detalle: 'Estrategia de radicación temprana recomendada en las primeras 2 horas de apertura.',
        fundamento: 'Directriz ANCP-CCE SECOP II Criterio Residual'
      }
    ];

    const criteriosFavorables = arbolDesempate.filter(c => c.aplica).length;
    const blindajeDesempateScore = Math.round((criteriosFavorables / arbolDesempate.length) * 100);

    return {
      proceso: {
        id: opp.id,
        referencia: opp.referencia || opp.id,
        entidad: opp.entidad,
        presupuestoOficial: po,
        ofertaSimulada: oferta
      },
      oferente: {
        id: empresa.id,
        razon_social: empresa.razon_social,
        nit: empresa.nit,
        tamano: empresa.tamano_empresa || 'MIPYME'
      },
      calificacion: {
        puntajeTotal,
        puntajeEconomico,
        puntajeIndustriaNacional,
        puntajeCalidad,
        puntajeDiscapacidad,
        puntajeMujeres,
        maxEconomico,
        maxIndustriaNacional,
        maxCalidadTecnica,
        nivelCompetitivo,
        nivelBadge,
        color
      },
      desgloseCriterios: [
        {
          criterio: 'Oferta Económica',
          puntosAsignados: puntajeEconomico,
          puntosMaximos: maxEconomico,
          fundamento: 'Fórmulas de evaluación económica ANCP-CCE (Pliegos Tipo)',
          detalle: `Oferta simulada de $ ${oferta.toLocaleString('es-CO')} frente a PO de $ ${po.toLocaleString('es-CO')}.`
        },
        {
          criterio: 'Apoyo a la Industria Nacional',
          puntosAsignados: puntajeIndustriaNacional,
          puntosMaximos: maxIndustriaNacional,
          fundamento: 'Ley 816 de 2003 y Decreto 1082 de 2015',
          detalle: descIndustriaNacional
        },
        {
          criterio: 'Factor Técnico y Calidad',
          puntosAsignados: puntajeCalidad,
          puntosMaximos: maxCalidadTecnica,
          fundamento: 'Certificaciones de Gestión y Especificaciones Técnicas Superiores',
          detalle: `Acreditación técnica valorada en ${puntajeCalidad} puntos.`
        },
        {
          criterio: 'Personal con Discapacidad',
          puntosAsignados: puntajeDiscapacidad,
          puntosMaximos: 1.0,
          fundamento: 'Decreto 392 de 2018',
          detalle: acreditaPersonalDiscapacidad ? '1.0 punto adicional otorgado.' : 'No acreditado (0 pts).'
        },
        {
          criterio: 'Empresas de Mujeres',
          puntosAsignados: puntajeMujeres,
          puntosMaximos: 0.5,
          fundamento: 'Ley 2069 de 2020 Art. 34 y Decreto 1860 de 2021',
          detalle: esEmpresaMujeres ? '0.5 puntos adicionales de enfoque de género.' : 'No acreditado.'
        }
      ],
      desempate: {
        blindajeDesempateScore,
        arbolDesempate,
        diagnostico: esMipyme ?
          '🏆 VENTAJA CRÍTICA: En caso de empate en puntaje con competidores grandes o multinacionales, su oferta gana de manera inmediata en la Regla 2 (Condición Mipyme Nacional).' :
          '⚠️ En caso de empate, la adjudicación se definirá en factores técnicos o por orden de radicación en SECOP II.'
      }
    };
  }

  /**
   * Guarda la estrategia de ponderación en la base de datos
   */
  async guardarEstrategiaPuntaje(data) {
    const {
      proceso_id,
      empresa_id,
      puntaje_economico,
      puntaje_industria_nacional,
      puntaje_discapacidad,
      puntaje_mipyme_mujeres,
      puntaje_calidad_tecnica,
      puntaje_total,
      criterios_desempate
    } = data;

    const res = await dbPostgres.query(`
      INSERT INTO estrategia_puntaje_pliego
      (proceso_id, empresa_id, puntaje_economico, puntaje_industria_nacional, puntaje_discapacidad,
       puntaje_mipyme_mujeres, puntaje_calidad_tecnica, puntaje_total, criterios_desempate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (proceso_id, empresa_id) DO UPDATE SET
        puntaje_economico = EXCLUDED.puntaje_economico,
        puntaje_industria_nacional = EXCLUDED.puntaje_industria_nacional,
        puntaje_discapacidad = EXCLUDED.puntaje_discapacidad,
        puntaje_mipyme_mujeres = EXCLUDED.puntaje_mipyme_mujeres,
        puntaje_calidad_tecnica = EXCLUDED.puntaje_calidad_tecnica,
        puntaje_total = EXCLUDED.puntaje_total,
        criterios_desempate = EXCLUDED.criterios_desempate,
        actualizado_en = CURRENT_TIMESTAMP
      RETURNING *;
    `, [
      proceso_id,
      empresa_id,
      puntaje_economico,
      puntaje_industria_nacional,
      puntaje_discapacidad,
      puntaje_mipyme_mujeres,
      puntaje_calidad_tecnica,
      puntaje_total,
      JSON.stringify(criterios_desempate || {})
    ]);

    return res.rows[0];
  }

  /**
   * Obtiene la estrategia de ponderación guardada
   */
  async getEstrategiaPuntaje(procesoId, empresaId) {
    const res = await dbPostgres.query(`
      SELECT * FROM estrategia_puntaje_pliego
      WHERE proceso_id = $1 AND ($2::int IS NULL OR empresa_id = $2)
      ORDER BY actualizado_en DESC
      LIMIT 1;
    `, [procesoId, empresaId || null]);

    return res.rows[0] || null;
  }
}

module.exports = new ScoringEngine();
