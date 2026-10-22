/**
 * Motor de Cálculo Financiero y Capacidad Habilitante para Contratación Estatal
 * Normativa: Decreto 1082 de 2015, Ley 1150 de 2007, Concepto C-933 de 2026 ANCP-CCE.
 */

class FinancialEngine {
  /**
   * Calcula los indicadores financieros y organizacionales oficiales del RUP
   * a partir de las partidas contables del Último Año Fiscal.
   */
  calculateIndicators(data) {
    const ac = parseFloat(data.activo_corriente) || 0;
    const pc = parseFloat(data.pasivo_corriente) || 0;
    const at = parseFloat(data.activo_total) || 0;
    const pt = parseFloat(data.pasivo_total) || 0;
    const pat = parseFloat(data.patrimonio) || (at - pt);
    const uo = parseFloat(data.utilidad_operacional) || 0;
    const gi = parseFloat(data.gastos_intereses) || 0;

    // 1. Capital de Trabajo (CT = AC - PC)
    const capitalTrabajo = ac - pc;

    // 2. Índice de Liquidez (IL = AC / PC)
    // Si PC es 0 y hay AC positivo, la liquidez es técnicamente infinita (se representa con valor tope o null seguro)
    const indiceLiquidez = pc > 0 ? parseFloat((ac / pc).toFixed(4)) : (ac > 0 ? 999.0 : 0);

    // 3. Índice de Endeudamiento (IE = PT / AT)
    const indiceEndeudamiento = at > 0 ? parseFloat((pt / at).toFixed(4)) : 0;

    // 4. Razón de Cobertura de Intereses (CI = UO / GI)
    // Nota doctrinal: Si no tiene gastos de intereses (GI = 0) y UO > 0, cumple con holgura.
    const coberturaIntereses = gi > 0 ? parseFloat((uo / gi).toFixed(4)) : (uo > 0 ? 999.0 : 0);

    // 5. Rentabilidad del Patrimonio (ROE = UO / Patrimonio)
    const roe = pat > 0 ? parseFloat((uo / pat).toFixed(4)) : 0;

    // 6. Rentabilidad del Activo (ROA = UO / Activo Total)
    const roa = at > 0 ? parseFloat((uo / at).toFixed(4)) : 0;

    return {
      activo_corriente: ac,
      pasivo_corriente: pc,
      activo_total: at,
      pasivo_total: pt,
      patrimonio: pat,
      utilidad_operacional: uo,
      gastos_intereses: gi,
      capital_trabajo: capitalTrabajo,
      indice_liquidez: indiceLiquidez,
      indice_endeudamiento: indiceEndeudamiento,
      cobertura_intereses: coberturaIntereses,
      rentabilidad_patrimonio_roe: roe,
      rentabilidad_activo_roa: roa
    };
  }

  /**
   * Agregación matemática para Estructuras Plurales (Consorcios y Uniones Temporales)
   * Aplica agregación de partidas contables puras (Ley 80/1993, Art. 7).
   * @param {Array} miembros - Lista de { empresa, porcentaje }
   */
  aggregatePluralStructure(miembros) {
    if (!Array.isArray(miembros) || miembros.length === 0) {
      throw new Error('Debe proporcionar al menos un integrante para la estructura plural.');
    }

    const sumaPorcentajes = miembros.reduce((acc, m) => acc + (parseFloat(m.porcentaje) || 0), 0);
    if (Math.abs(sumaPorcentajes - 100) > 0.01) {
      throw new Error(`La suma de participaciones debe ser exactamente 100%. Actual: ${sumaPorcentajes}%`);
    }

    let acPlural = 0;
    let pcPlural = 0;
    let atPlural = 0;
    let ptPlural = 0;
    let patPlural = 0;
    let uoPlural = 0;
    let giPlural = 0;

    for (const m of miembros) {
      const f = m.financiero || {};
      acPlural += parseFloat(f.activo_corriente) || 0;
      pcPlural += parseFloat(f.pasivo_corriente) || 0;
      atPlural += parseFloat(f.activo_total) || 0;
      ptPlural += parseFloat(f.pasivo_total) || 0;
      patPlural += parseFloat(f.patrimonio) || 0;
      uoPlural += parseFloat(f.utilidad_operacional) || 0;
      giPlural += parseFloat(f.gastos_intereses) || 0;
    }

    const indicadoresPlurales = this.calculateIndicators({
      activo_corriente: acPlural,
      pasivo_corriente: pcPlural,
      activo_total: atPlural,
      pasivo_total: ptPlural,
      patrimonio: patPlural,
      utilidad_operacional: uoPlural,
      gastos_intereses: giPlural
    });

    return {
      partidas_agregadas: {
        activo_corriente: acPlural,
        pasivo_corriente: pcPlural,
        activo_total: atPlural,
        pasivo_total: ptPlural,
        patrimonio: patPlural,
        utilidad_operacional: uoPlural,
        gastos_intereses: giPlural
      },
      indicadores: indicadoresPlurales,
      miembros_resumen: miembros.map(m => ({
        empresa_id: m.empresa_id,
        razon_social: m.razon_social,
        porcentaje: m.porcentaje
      }))
    };
  }

  /**
   * Evalúa los indicadores consolidados de una empresa o estructura plural
   * frente a los requisitos habilitantes exigidos en un pliego de condiciones.
   */
  evaluateAgainstRequirements(indicadores, requisitos) {
    const resultados = [];

    // 1. Evaluación de Liquidez (típicamente >= umbral)
    if (requisitos.min_liquidez !== undefined && requisitos.min_liquidez !== null) {
      const cumple = indicadores.indice_liquidez >= requisitos.min_liquidez;
      resultados.push({
        indicador: 'Índice de Liquidez',
        exigido: `>= ${requisitos.min_liquidez}`,
        obtenido: indicadores.indice_liquidez,
        cumple,
        estado_semaforo: cumple ? 'CUMPLE' : 'NO_CUMPLE'
      });
    }

    // 2. Evaluación de Endeudamiento (típicamente <= umbral)
    if (requisitos.max_endeudamiento !== undefined && requisitos.max_endeudamiento !== null) {
      const cumple = indicadores.indice_endeudamiento <= requisitos.max_endeudamiento;
      resultados.push({
        indicador: 'Nivel de Endeudamiento',
        exigido: `<= ${requisitos.max_endeudamiento}`,
        obtenido: indicadores.indice_endeudamiento,
        cumple,
        estado_semaforo: cumple ? 'CUMPLE' : 'NO_CUMPLE'
      });
    }

    // 3. Cobertura de Intereses (típicamente >= umbral)
    if (requisitos.min_cobertura_intereses !== undefined && requisitos.min_cobertura_intereses !== null) {
      const cumple = indicadores.cobertura_intereses >= requisitos.min_cobertura_intereses;
      resultados.push({
        indicador: 'Razón de Cobertura de Intereses',
        exigido: `>= ${requisitos.min_cobertura_intereses}`,
        obtenido: indicadores.cobertura_intereses,
        cumple,
        estado_semaforo: cumple ? 'CUMPLE' : 'NO_CUMPLE'
      });
    }

    // 4. Capital de Trabajo (típicamente >= umbral en COP)
    if (requisitos.min_capital_trabajo !== undefined && requisitos.min_capital_trabajo !== null) {
      const cumple = indicadores.capital_trabajo >= requisitos.min_capital_trabajo;
      resultados.push({
        indicador: 'Capital de Trabajo',
        exigido: `>= $${requisitos.min_capital_trabajo.toLocaleString('es-CO')}`,
        obtenido: `$${indicadores.capital_trabajo.toLocaleString('es-CO')}`,
        cumple,
        estado_semaforo: cumple ? 'CUMPLE' : 'NO_CUMPLE'
      });
    }

    // 5. Rentabilidad del Patrimonio ROE (típicamente >= umbral)
    if (requisitos.min_roe !== undefined && requisitos.min_roe !== null) {
      const cumple = indicadores.rentabilidad_patrimonio_roe >= requisitos.min_roe;
      resultados.push({
        indicador: 'Rentabilidad del Patrimonio (ROE)',
        exigido: `>= ${requisitos.min_roe}`,
        obtenido: indicadores.rentabilidad_patrimonio_roe,
        cumple,
        estado_semaforo: cumple ? 'CUMPLE' : 'NO_CUMPLE'
      });
    }

    const todosCumplen = resultados.every(r => r.cumple);

    return {
      cumplimiento_general: todosCumplen ? 'HABILITADO' : 'NO_HABILITADO',
      detalles: resultados
    };
  }
}

module.exports = new FinancialEngine();
