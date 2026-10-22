const financialEngine = require('./financialEngine');

class AllianceRecommender {
  /**
   * Encuentra la mejor configuración de consorcio o unión temporal para que una empresa líder
   * cumpla con los requisitos financieros de un pliego de contratación estatal.
   * 
   * @param {Object} empresaLider - Objeto empresa con partidas contables
   * @param {Array} empresasDisponibles - Lista de empresas aliadas registradas
   * @param {Object} requisitosPliego - { min_liquidez, max_endeudamiento, min_cobertura_intereses, min_capital_trabajo, min_roe }
   * @param {Object} opciones - { maxMiembros: 3, stepPorcentaje: 5, minPorcentajeLider: 20 }
   */
  recommendAlliances(empresaLider, empresasDisponibles = [], requisitosPliego, opciones = {}) {
    const {
      maxMiembros = 3,
      stepPorcentaje = 5,
      minPorcentajeLider = 25
    } = opciones;

    const candidatos = empresasDisponibles.filter(e => e.id !== empresaLider.id);

    // 1. Evaluar si la empresa líder por sí sola ya cumple al 100%
    const liderInd = financialEngine.calculateIndicators(empresaLider);
    const evalLiderSolo = financialEngine.evaluateAgainstRequirements(liderInd, requisitosPliego);

    const propuestas = [];

    if (evalLiderSolo.cumplimiento_general === 'HABILITADO') {
      propuestas.push({
        tipo: 'INDIVIDUAL',
        score_viabilidad: 100,
        motivo: 'Tu empresa cumple el 100% de los requisitos del pliego por sí sola sin necesidad de ceder participación.',
        miembros: [
          {
            empresa_id: empresaLider.id,
            razon_social: empresaLider.razon_social,
            es_propia: empresaLider.es_propia,
            porcentaje: 100
          }
        ],
        indicadores: liderInd,
        evaluacion: evalLiderSolo
      });
    }

    // 2. Probar combinaciones con 1 aliado (Estructuras de 2 miembros)
    for (const aliado of candidatos) {
      // Probar variaciones de porcentaje desde minPorcentajeLider hasta 95%
      let mejorParaEsteAliado = null;

      for (let pLider = 95; pLider >= minPorcentajeLider; pLider -= stepPorcentaje) {
        const pAliado = 100 - pLider;

        const miembros = [
          {
            empresa_id: empresaLider.id,
            razon_social: empresaLider.razon_social,
            es_propia: empresaLider.es_propia,
            porcentaje: pLider,
            financiero: empresaLider
          },
          {
            empresa_id: aliado.id,
            razon_social: aliado.razon_social,
            es_propia: aliado.es_propia,
            porcentaje: pAliado,
            financiero: aliado
          }
        ];

        try {
          const sim = financialEngine.aggregatePluralStructure(miembros);
          const ev = financialEngine.evaluateAgainstRequirements(sim.indicadores, requisitosPliego);

          if (ev.cumplimiento_general === 'HABILITADO') {
            // Se prioriza maximizar la participación de la empresa líder
            const scoreViabilidad = Math.round(pLider * 0.7 + (aliado.es_propia ? 30 : 15));
            mejorParaEsteAliado = {
              tipo: 'ESTRUCTURA_PLURAL_2',
              score_viabilidad: scoreViabilidad,
              motivo: `Alianza estratégica con ${aliado.razon_social} (${aliado.es_propia ? 'Grupo Propio' : 'Aliado Externo'}). Conservas el ${pLider}% de participación.`,
              miembros: [
                { empresa_id: empresaLider.id, razon_social: empresaLider.razon_social, porcentaje: pLider, es_propia: empresaLider.es_propia },
                { empresa_id: aliado.id, razon_social: aliado.razon_social, porcentaje: pAliado, es_propia: aliado.es_propia }
              ],
              indicadores: sim.indicadores,
              evaluacion: ev
            };
            break; // Dado que empezamos desde pLider = 95 hacia abajo, el primero que cumpla maximiza el porcentaje del líder
          }
        } catch (e) {
          // Ignorar error si no cumple
        }
      }

      if (mejorParaEsteAliado) {
        propuestas.push(mejorParaEsteAliado);
      }
    }

    // 3. Si se permite y aún se necesitan más opciones, probar combinaciones de 3 miembros (Líder + 2 Aliados)
    if (maxMiembros >= 3 && candidatos.length >= 2) {
      for (let i = 0; i < candidatos.length; i++) {
        for (let j = i + 1; j < candidatos.length; j++) {
          const a1 = candidatos[i];
          const a2 = candidatos[j];

          // Evaluar partición estándar (ej: Líder 50%, Aliado1 25%, Aliado2 25% o Líder 60%, 20%, 20%)
          for (const [pLider, pA1, pA2] of [[60, 20, 20], [50, 25, 25], [40, 30, 30]]) {
            const miembros = [
              { empresa_id: empresaLider.id, razon_social: empresaLider.razon_social, porcentaje: pLider, financiero: empresaLider },
              { empresa_id: a1.id, razon_social: a1.razon_social, porcentaje: pA1, financiero: a1 },
              { empresa_id: a2.id, razon_social: a2.razon_social, porcentaje: pA2, financiero: a2 }
            ];

            try {
              const sim = financialEngine.aggregatePluralStructure(miembros);
              const ev = financialEngine.evaluateAgainstRequirements(sim.indicadores, requisitosPliego);

              if (ev.cumplimiento_general === 'HABILITADO') {
                const bonusPropias = (a1.es_propia ? 10 : 0) + (a2.es_propia ? 10 : 0);
                propuestas.push({
                  tipo: 'ESTRUCTURA_PLURAL_3',
                  score_viabilidad: Math.round(pLider * 0.5 + bonusPropias),
                  motivo: `Consorcio tripartito con ${a1.razon_social} y ${a2.razon_social}. Habilita capacidades financieras de gran envergadura.`,
                  miembros: [
                    { empresa_id: empresaLider.id, razon_social: empresaLider.razon_social, porcentaje: pLider },
                    { empresa_id: a1.id, razon_social: a1.razon_social, porcentaje: pA1 },
                    { empresa_id: a2.id, razon_social: a2.razon_social, porcentaje: pA2 }
                  ],
                  indicadores: sim.indicadores,
                  evaluacion: ev
                });
                break;
              }
            } catch (e) {}
          }
        }
      }
    }

    // Ordenar propuestas de mayor a menor viabilidad
    propuestas.sort((a, b) => b.score_viabilidad - a.score_viabilidad);

    return {
      total_recomendaciones: propuestas.length,
      cumple_solo: evalLiderSolo.cumplimiento_general === 'HABILITADO',
      recomendaciones: propuestas.slice(0, 5) // Top 5 mejores configuraciones
    };
  }
}

module.exports = new AllianceRecommender();
