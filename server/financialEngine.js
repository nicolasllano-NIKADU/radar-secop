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

  /**
   * Evalúa la matriz de experiencia contractual (general y específica)
   * acreditada en SMMLV y códigos UNSPSC según reglas ANCP-CCE.
   * 
   * @param {Array} contratosAcreditados - Lista de contratos de la empresa o agregados del consorcio
   * @param {Object} requisitosExp - {
   *   min_smmlv_total: number,       // Sumatoria total en SMMLV exigida
   *   max_numero_contratos: number,  // Máximo número de contratos para sumar (ej. hasta 3 o 5 contratos)
   *   codigos_unspsc_exigidos: [],   // Códigos requeridos en el pliego
   *   min_smmlv_individual: number   // Mínimo SMMLV que debe aportar al menos 1 contrato (opcional)
   * }
   */
  evaluateExperience(contratosAcreditados = [], requisitosExp = {}) {
    const {
      min_smmlv_total = 0,
      max_numero_contratos = 10,
      codigos_unspsc_exigidos = [],
      min_smmlv_individual = 0
    } = requisitosExp;

    // 1. Filtrar contratos que contengan al menos uno de los códigos UNSPSC exigidos (si se especifican)
    let contratosValidos = contratosAcreditados;
    if (codigos_unspsc_exigidos && codigos_unspsc_exigidos.length > 0) {
      contratosValidos = contratosAcreditados.filter(c => {
        const cods = c.codigos_unspsc || [];
        return codigos_unspsc_exigidos.some(reqCode => 
          cods.some(cCode => cCode.startsWith(reqCode.slice(0, 4)) || cCode === reqCode)
        );
      });
    }

    // 2. Ordenar de mayor a menor valor en SMMLV para optimizar el cupo
    const ordenados = [...contratosValidos].sort((a, b) => 
      (parseFloat(b.valor_contrato_smmlv) || 0) - (parseFloat(a.valor_contrato_smmlv) || 0)
    );

    // 3. Tomar los mejores N contratos hasta el tope permitido por el pliego
    const seleccionados = ordenados.slice(0, max_numero_contratos);
    const smmlvAcreditado = seleccionados.reduce((sum, c) => sum + (parseFloat(c.valor_contrato_smmlv) || 0), 0);
    const mayorIndividual = seleccionados.length > 0 ? (parseFloat(seleccionados[0].valor_contrato_smmlv) || 0) : 0;

    const detalles = [];

    // Verificación de Sumatoria Total en SMMLV
    if (min_smmlv_total > 0) {
      const cumpleTotal = smmlvAcreditado >= min_smmlv_total;
      detalles.push({
        criterio: 'Experiencia Total Acreditada (SMMLV)',
        exigido: `>= ${min_smmlv_total} SMMLV`,
        obtenido: `${smmlvAcreditado.toFixed(2)} SMMLV (${seleccionados.length} contratos)`,
        cumple: cumpleTotal,
        estado_semaforo: cumpleTotal ? 'CUMPLE' : 'NO_CUMPLE'
      });
    }

    // Verificación de Contrato Individual Mayor (si aplica)
    if (min_smmlv_individual > 0) {
      const cumpleIndividual = mayorIndividual >= min_smmlv_individual;
      detalles.push({
        criterio: 'Mayor Contrato Individual (SMMLV)',
        exigido: `>= ${min_smmlv_individual} SMMLV`,
        obtenido: `${mayorIndividual.toFixed(2)} SMMLV`,
        cumple: cumpleIndividual,
        estado_semaforo: cumpleIndividual ? 'CUMPLE' : 'NO_CUMPLE'
      });
    }

    // Verificación de afinidad temática UNSPSC
    if (codigos_unspsc_exigidos.length > 0) {
      const cumpleCodigos = seleccionados.length > 0;
      detalles.push({
        criterio: 'Afinidad Clasificación UNSPSC',
        exigido: codigos_unspsc_exigidos.join(', '),
        obtenido: `${seleccionados.length} contratos coincidentes`,
        cumple: cumpleCodigos,
        estado_semaforo: cumpleCodigos ? 'CUMPLE' : 'NO_CUMPLE'
      });
    }

    const todosCumplen = detalles.length === 0 || detalles.every(d => d.cumple);

    return {
      cumplimiento_experiencia: todosCumplen ? 'HABILITADO' : 'NO_HABILITADO',
      smmlv_total_acreditado: parseFloat(smmlvAcreditado.toFixed(2)),
      contratos_utilizados: seleccionados,
      detalles
    };
  }

  /**
   * Calculadora Oficial de Capacidad Residual de Contratación (K Residual)
   * Metodología Colombia Compra Eficiente - Pliegos Tipo Obra Pública:
   * K_R = CO + E + CT + CF - SCE
   * 
   * @param {Object} data - {
   *   activo_corriente, patrimonio,       // Para Capacidad Operativa (CO)
   *   experiencia_smmlv,                  // Para Experiencia (E)
   *   personal_tecnico_score,             // Para Capacidad Técnica (CT)
   *   liquidez, endeudamiento, cobertura, // Para Capacidad Financiera (CF)
   *   saldos_contratos_ejecucion_cop      // Saldos de Contratos en Ejecución (SCE)
   * }
   * @param {number} smmlvValor - Valor oficial del SMMLV del año
   */
  calculateResidualCapacityK(data, smmlvValor = 1423500) {
    const ac = parseFloat(data.activo_corriente) || 0;
    const pat = parseFloat(data.patrimonio) || 0;
    const expSmmlv = parseFloat(data.experiencia_smmlv) || 0;
    const ctScore = parseFloat(data.personal_tecnico_score) || 80;
    const sce = parseFloat(data.saldos_contratos_ejecucion_cop) || 0;

    // 1. Capacidad Operativa (CO): CO = (AC + Patrimonio) * factor
    const co = Math.round((ac * 0.4 + pat * 0.6) * 1.2);

    // 2. Experiencia (E): E = expSmmlv * SMMLV * factor escala
    const e = Math.round(expSmmlv * smmlvValor * 0.85);

    // 3. Capacidad Técnica (CT): valor base ponderado por personal acreditado
    const ct = Math.round(ctScore * smmlvValor * 15);

    // 4. Capacidad Financiera (CF): bonificación de liquidez y bajo endeudamiento
    const il = parseFloat(data.indice_liquidez) || (data.pasivo_corriente > 0 ? ac / data.pasivo_corriente : 1.5);
    const ie = parseFloat(data.indice_endeudamiento) || 0.5;
    const factorFinanciero = Math.max(0.5, Math.min(2.0, (il * 0.5) + ((1 - ie) * 0.5)));
    const cf = Math.round((co * 0.15) * factorFinanciero);

    // 5. Capacidad Residual Neta: K_R = CO + E + CT + CF - SCE
    const kResidual = Math.max(0, (co + e + ct + cf) - sce);
    const kResidualSmmlv = parseFloat((kResidual / smmlvValor).toFixed(2));

    return {
      capacidad_residual_cop: kResidual,
      capacidad_residual_smmlv: kResidualSmmlv,
      desglose: {
        capacidad_operativa_co: co,
        experiencia_e: e,
        capacidad_tecnica_ct: ct,
        capacidad_financiera_cf: cf,
        saldos_en_ejecucion_sce: sce
      }
    };
  }
}

module.exports = new FinancialEngine();
