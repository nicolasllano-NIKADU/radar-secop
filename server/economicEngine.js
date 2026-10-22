/**
 * ====================================================================
 * RADAR SECOP - MOTOR DE PONDERACIÓN ECONÓMICA Y ANÁLISIS PRECIENTÍFICO
 * Marco Normativo:
 * - Ley 1882 de 2018 (Art. 4 y 5: Pliegos Tipo y Reglas Objetivas)
 * - Ley 2022 de 2020 (Ampliación de Pliegos Tipo)
 * - Concepto C-382 de 2020 de la ANCP - Colombia Compra Eficiente (Aleatoriedad de TRM)
 * - Decreto 1082 de 2015 (Art. 2.2.1.1.2.2.4: Precios Artificialmente Bajos)
 * ====================================================================
 */

class EconomicEngine {
  constructor() {
    this.METODOS = {
      MEDIA_ARITMETICA: {
        codigo: 'MEDIA_ARITMETICA',
        nombre: 'Media Aritmética Simple',
        rangoTrm: [0, 19],
        descripcion: 'Promedio aritmético directo de las propuestas económicas hábiles.'
      },
      MEDIA_ARITMETICA_MODIFICADA: {
        codigo: 'MEDIA_ARITMETICA_MODIFICADA',
        nombre: 'Media Aritmética con Inclusión del Presupuesto Oficial',
        rangoTrm: [20, 39],
        descripcion: 'Promedio aritmético de las propuestas incluyendo el Presupuesto Oficial como una oferta adicional.'
      },
      MEDIA_GEOMETRICA: {
        codigo: 'MEDIA_GEOMETRICA',
        nombre: 'Media Geométrica',
        rangoTrm: [40, 59],
        descripcion: 'Raíz N-ésima del producto de las ofertas válidas; reduce el impacto de valores atípicos.'
      },
      MEDIANA: {
        codigo: 'MEDIANA',
        nombre: 'Mediana',
        rangoTrm: [60, 79],
        descripcion: 'Punto medio de la serie ordenada de ofertas económicas válidas.'
      },
      MENOR_VALOR: {
        codigo: 'MENOR_VALOR',
        nombre: 'Menor Valor Hábil',
        rangoTrm: [80, 99],
        descripcion: 'Asignación del puntaje máximo a la oferta más económica hábil y proporcionalmente menor a las demás.'
      }
    };
  }

  /**
   * Resuelve el método de evaluación aplicable según los dos últimos decimales de la TRM
   * Fuente: Concepto C-382/2020 ANCP-CCE y Pliegos Tipo
   * @param {number|string} trmDecimales - Últimos 2 dígitos decimales (0 a 99)
   */
  resolverMetodoPorTrm(trmDecimales) {
    const num = Math.abs(parseInt(trmDecimales, 10)) % 100;
    for (const key of Object.keys(this.METODOS)) {
      const [min, max] = this.METODOS[key].rangoTrm;
      if (num >= min && num <= max) {
        return this.METODOS[key];
      }
    }
    return this.METODOS.MEDIA_ARITMETICA;
  }

  /**
   * Detecta ofertas con sospecha de precio artificialmente bajo
   * Decreto 1082 de 2015 Art. 2.2.1.1.2.2.4 y Guía CCE
   */
  detectarPreciosArtificialmenteBajos(po, ofertas) {
    if (!ofertas || ofertas.length === 0) return [];

    const valores = ofertas.map(o => typeof o === 'object' ? parseFloat(o.valor) : parseFloat(o));
    const n = valores.length;
    const media = valores.reduce((acc, v) => acc + v, 0) / n;

    // Desviación estándar muestral
    const varianza = n > 1 
      ? valores.reduce((acc, v) => acc + Math.pow(v - media, 2), 0) / (n - 1)
      : 0;
    const desviacion = Math.sqrt(varianza);

    // Umbrales técnicos de alerta
    const umbralDesviacion = media - (1.5 * desviacion);
    const umbralPresupuesto = po * 0.80; // 80% del PO según costumbre administrativa

    return ofertas.map((item, idx) => {
      const val = valores[idx];
      const sospechosa = (n >= 3 && val < umbralDesviacion) || (val < umbralPresupuesto);
      let motivo = null;
      if (sospechosa) {
        if (val < umbralPresupuesto) {
          motivo = `Oferta inferior al 80% del Presupuesto Oficial (Alerta Guía CCE)`;
        } else {
          motivo = `Oferta inferior a 1.5 desviaciones estándar de la media de mercado ($${Math.round(umbralDesviacion).toLocaleString('es-CO')})`;
        }
      }

      return {
        proponente: typeof item === 'object' ? item.proponente || `Oferente ${idx + 1}` : `Oferente ${idx + 1}`,
        valor: val,
        porcentaje_po: Number(((val / po) * 100).toFixed(2)),
        sospecha_precio_bajo: sospechosa,
        motivo_alerta: motivo
      };
    });
  }

  /**
   * Evalúa el puntaje económico exacto para cada uno de los métodos oficiales
   * @param {number} po - Presupuesto Oficial
   * @param {Array<{proponente: string, valor: number}>} ofertas
   * @param {number} puntajeMax - Puntaje máximo (por defecto 60)
   */
  evaluarTodosLosMetodos(po, ofertas, puntajeMax = 60) {
    const n = ofertas.length;
    if (n === 0) return {};

    const valores = ofertas.map(o => parseFloat(o.valor));
    
    // 1. Media Aritmética Simple
    const suma = valores.reduce((a, b) => a + b, 0);
    const mediaSimple = suma / n;

    // 2. Media Aritmética Modificada (incluye PO)
    const mediaModificada = (po + suma) / (n + 1);

    // 3. Media Geométrica
    const logSuma = valores.reduce((acc, v) => acc + Math.log(v), 0);
    const mediaGeometrica = Math.exp(logSuma / n);

    // 4. Mediana
    const ordenados = [...valores].sort((a, b) => a - b);
    let mediana = 0;
    if (n % 2 !== 0) {
      mediana = ordenados[Math.floor(n / 2)];
    } else {
      mediana = (ordenados[(n / 2) - 1] + ordenados[n / 2]) / 2;
    }

    // 5. Menor Valor
    const menorValor = Math.min(...valores);

    // Función de cálculo de puntaje por distancia absoluta normalizada
    const calcPuntajeDistancia = (val, pivote) => {
      const distancia = Math.abs(val - pivote);
      const factor = 1 - (distancia / pivote);
      return Math.max(0, Math.round(puntajeMax * factor * 100) / 100);
    };

    // Calificación de cada participante en los 5 métodos
    const resultados = ofertas.map((o) => {
      const v = parseFloat(o.valor);
      const pMediaSimple = calcPuntajeDistancia(v, mediaSimple);
      const pMediaMod = calcPuntajeDistancia(v, mediaModificada);
      const pMediaGeom = calcPuntajeDistancia(v, mediaGeometrica);
      const pMediana = calcPuntajeDistancia(v, mediana);
      const pMenor = Math.round(puntajeMax * (menorValor / v) * 100) / 100;

      const promedioPuntajes = Number(((pMediaSimple + pMediaMod + pMediaGeom + pMediana + pMenor) / 5).toFixed(2));

      return {
        proponente: o.proponente,
        valor: v,
        porcentaje_po: Number(((v / po) * 100).toFixed(2)),
        puntajes: {
          media_aritmetica: pMediaSimple,
          media_modificada: pMediaMod,
          media_geometrica: pMediaGeom,
          mediana: pMediana,
          menor_valor: pMenor,
          promedio_global: promedioPuntajes
        }
      };
    });

    return {
      presupuesto_oficial: po,
      puntaje_maximo: puntajeMax,
      total_ofertas: n,
      referencias_metodos: {
        media_aritmetica: Math.round(mediaSimple),
        media_modificada: Math.round(mediaModificada),
        media_geometrica: Math.round(mediaGeometrica),
        mediana: Math.round(mediana),
        menor_valor: Math.round(menorValor)
      },
      calificaciones: resultados
    };
  }

  /**
   * Simulador Estocástico Monte Carlo de Ponderación Económica
   * Concepto C-382/2020 de la ANCP-CCE
   * 
   * @param {number} po - Presupuesto Oficial en COP
   * @param {Object} config - Parámetros de simulación
   */
  simularMontecarlo(po, config = {}) {
    const {
      competidoresEstimados = 6,
      puntajeMax = 60,
      iteraciones = 5000,
      perfilCompetencia = 'MODERADO', // AGRESIVO, MODERADO, CONSERVADOR
      ofertaUsuario = null
    } = config;

    // Distribución de precios de competidores según perfil
    let minPct = 0.90;
    let maxPct = 0.99;
    let bias = 0.945;

    if (perfilCompetencia === 'AGRESIVO') {
      minPct = 0.86;
      maxPct = 0.95;
      bias = 0.905;
    } else if (perfilCompetencia === 'CONSERVADOR') {
      minPct = 0.94;
      maxPct = 0.999;
      bias = 0.97;
    }

    // Puntos de prueba para el licitante: del 86% al 100% en saltos de 0.5%
    const candidatosPct = [];
    for (let p = 86.0; p <= 99.5; p += 0.5) {
      candidatosPct.push(Number(p.toFixed(1)));
    }

    // Si el usuario especificó una oferta puntual, la agregamos a la matriz
    if (ofertaUsuario) {
      const userPct = Number(((ofertaUsuario / po) * 100).toFixed(1));
      if (!candidatosPct.includes(userPct)) {
        candidatosPct.push(userPct);
        candidatosPct.sort((a, b) => a - b);
      }
    }

    // Acumuladores de puntaje para cada candidato
    const acumuladores = {};
    const conteoVictorias = {}; // Cuántas veces obtuvo el puntaje #1
    candidatosPct.forEach(pct => {
      acumuladores[pct] = 0;
      conteoVictorias[pct] = 0;
    });

    // Desglose de acumulador por método para el análisis de robustez
    const porMetodo = {
      MEDIA_ARITMETICA: {},
      MEDIA_ARITMETICA_MODIFICADA: {},
      MEDIA_GEOMETRICA: {},
      MEDIANA: {},
      MENOR_VALOR: {}
    };
    Object.keys(porMetodo).forEach(m => {
      candidatosPct.forEach(pct => porMetodo[m][pct] = 0);
    });

    // Helper para generar distribución pseudo-normal triangular con sesgo
    const randomCompetidorVal = () => {
      const u1 = Math.random();
      const u2 = Math.random();
      // Aproximación de distribución triangular sesgada hacia 'bias'
      const valPct = (u1 + u2) / 2 < 0.5 
        ? minPct + Math.sqrt((u1 + u2) / 2 * (maxPct - minPct) * (bias - minPct))
        : maxPct - Math.sqrt((1 - (u1 + u2) / 2) * (maxPct - minPct) * (maxPct - bias));
      return Math.min(maxPct, Math.max(minPct, valPct)) * po;
    };

    // Métodos en array para selección aleatoria por TRM
    const keysMetodos = Object.keys(this.METODOS);

    for (let iter = 0; iter < iteraciones; iter++) {
      // Simular decimales de TRM [0-99]
      const trmRand = Math.floor(Math.random() * 100);
      const metodoObj = this.resolverMetodoPorTrm(trmRand);
      const metodoCodigo = metodoObj.codigo;

      // Generar competidores
      const ofertasCompetidores = [];
      for (let c = 0; c < competidoresEstimados; c++) {
        ofertasCompetidores.push(randomCompetidorVal());
      }

      // Evaluar cada candidato de oferta del usuario compitiendo contra este pool
      candidatosPct.forEach(pct => {
        const valUser = (pct / 100) * po;
        const pool = [...ofertasCompetidores, valUser];
        const n = pool.length;

        let puntaje = 0;

        if (metodoCodigo === 'MEDIA_ARITMETICA') {
          const media = pool.reduce((a, b) => a + b, 0) / n;
          puntaje = Math.max(0, puntajeMax * (1 - Math.abs(valUser - media) / media));
        } else if (metodoCodigo === 'MEDIA_ARITMETICA_MODIFICADA') {
          const mediaMod = (po + pool.reduce((a, b) => a + b, 0)) / (n + 1);
          puntaje = Math.max(0, puntajeMax * (1 - Math.abs(valUser - mediaMod) / mediaMod));
        } else if (metodoCodigo === 'MEDIA_GEOMETRICA') {
          const logSuma = pool.reduce((acc, v) => acc + Math.log(v), 0);
          const mg = Math.exp(logSuma / n);
          puntaje = Math.max(0, puntajeMax * (1 - Math.abs(valUser - mg) / mg));
        } else if (metodoCodigo === 'MEDIANA') {
          const s = [...pool].sort((a, b) => a - b);
          const me = n % 2 !== 0 ? s[Math.floor(n / 2)] : (s[n/2 - 1] + s[n/2]) / 2;
          puntaje = Math.max(0, puntajeMax * (1 - Math.abs(valUser - me) / me));
        } else if (metodoCodigo === 'MENOR_VALOR') {
          const minVal = Math.min(...pool);
          puntaje = puntajeMax * (minVal / valUser);
        }

        acumuladores[pct] += puntaje;
        porMetodo[metodoCodigo][pct] += puntaje;
      });
    }

    // Encontrar el porcentaje óptimo que maximiza la esperanza matemática
    let mejorPct = candidatosPct[0];
    let maxEsperanza = 0;

    const curvaRendimiento = candidatosPct.map(pct => {
      const esperanza = Number((acumuladores[pct] / iteraciones).toFixed(2));
      const precio = Math.round((pct / 100) * po);

      if (esperanza > maxEsperanza) {
        maxEsperanza = esperanza;
        mejorPct = pct;
      }

      // Verificación de riesgo de precio artificialmente bajo
      const riesgoBajo = pct < 88.0;

      return {
        porcentaje_po: pct,
        precio_cop: precio,
        esperanza_puntaje: esperanza,
        desglose_por_metodo: {
          media_aritmetica: Number((porMetodo.MEDIA_ARITMETICA[pct] / (iteraciones / 5)).toFixed(2)),
          media_modificada: Number((porMetodo.MEDIA_ARITMETICA_MODIFICADA[pct] / (iteraciones / 5)).toFixed(2)),
          media_geometrica: Number((porMetodo.MEDIA_GEOMETRICA[pct] / (iteraciones / 5)).toFixed(2)),
          mediana: Number((porMetodo.MEDIANA[pct] / (iteraciones / 5)).toFixed(2)),
          menor_valor: Number((porMetodo.MENOR_VALOR[pct] / (iteraciones / 5)).toFixed(2))
        },
        alerta_riesgo_precio_bajo: riesgoBajo
      };
    });

    const precioOptimoCop = Math.round((mejorPct / 100) * po);
    const itemOptimo = curvaRendimiento.find(c => c.porcentaje_po === mejorPct);

    // Rango de seguridad recomendado (donde se conserva al menos el 96% del puntaje óptimo)
    const umbral96 = maxEsperanza * 0.96;
    const rangoSeguro = curvaRendimiento.filter(c => c.esperanza_puntaje >= umbral96 && !c.alerta_riesgo_precio_bajo);

    return {
      presupuesto_oficial: po,
      puntaje_maximo: puntajeMax,
      iteraciones_montecarlo: iteraciones,
      perfil_competencia: perfilCompetencia,
      competidores_simulados: competidoresEstimados,
      recomendacion_estrategica: {
        porcentaje_optimo: mejorPct,
        precio_optimo_cop: precioOptimoCop,
        esperanza_puntaje_max: maxEsperanza,
        eficiencia_esperada: Number(((maxEsperanza / puntajeMax) * 100).toFixed(1)),
        rango_seguro_recomendado: {
          min_pct: rangoSeguro.length > 0 ? rangoSeguro[0].porcentaje_po : mejorPct,
          max_pct: rangoSeguro.length > 0 ? rangoSeguro[rangoSeguro.length - 1].porcentaje_po : mejorPct,
          min_cop: rangoSeguro.length > 0 ? rangoSeguro[0].precio_cop : precioOptimoCop,
          max_cop: rangoSeguro.length > 0 ? rangoSeguro[rangoSeguro.length - 1].precio_cop : precioOptimoCop
        },
        desglose_metodos_en_optimo: itemOptimo ? itemOptimo.desglose_por_metodo : null
      },
      curva_rendimiento: curvaRendimiento
    };
  }
}

module.exports = new EconomicEngine();
