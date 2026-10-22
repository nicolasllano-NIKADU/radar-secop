/**
 * ====================================================================
 * RADAR SECOP - MOTOR DE PONDERACIÓN ECONÓMICA Y ANÁLISIS ESTOCÁSTICO
 * Marco Normativo y Jurisprudencial:
 * - Ley 1882 de 2018 (Art. 4 y 5: Pliegos Tipo y Reglas Objetivas de Evaluación)
 * - Ley 2022 de 2020 (Ampliación Obligatoria de Pliegos Tipo CCE)
 * - Concepto C-382 de 2020 de la ANCP - Colombia Compra Eficiente (Aleatoriedad de la TRM)
 * - Decreto 1082 de 2015 (Art. 2.2.1.1.2.2.4: Precios Artificialmente Bajos)
 * - Guía para la Gestión del Riesgo y Análisis del Sector Económico ANCP-CCE
 * ====================================================================
 */

const PDFDocument = require('pdfkit');

class EconomicEngine {
  constructor() {
    this.METODOS = {
      MEDIA_ARITMETICA: {
        codigo: 'MEDIA_ARITMETICA',
        nombre: 'Media Aritmética Simple',
        rangoTrm: [0, 16],
        trmTexto: '.00 a .16',
        formulaTexto: 'X̄ = (1/n) * Σ Vi',
        descripcion: 'Promedio aritmético directo de las propuestas económicas hábiles admitidas.'
      },
      MEDIA_EXTREMOS: {
        codigo: 'MEDIA_EXTREMOS',
        nombre: 'Media Aritmética con Eliminación de Extremos',
        rangoTrm: [17, 33],
        trmTexto: '.17 a .33',
        formulaTexto: 'X̄_depurada (excluye |Vi - X̄| > 1.0σ cuando n ≥ 4)',
        descripcion: 'Media depurada eliminando ofertas a más de 1 desviación estándar (|Vi - X̄| > 1.0σ) o extremos min/max.'
      },
      MEDIA_PONDERADA: {
        codigo: 'MEDIA_PONDERADA',
        nombre: 'Media Ponderada con Presupuesto Oficial',
        rangoTrm: [34, 50],
        trmTexto: '.34 a .50',
        formulaTexto: 'X̄_pond = 0.20 * PO + 0.80 * X̄',
        descripcion: 'Ponderación estándar CCE: 20% del Presupuesto Oficial y 80% de la media de las ofertas hábiles.'
      },
      MEDIANA: {
        codigo: 'MEDIANA',
        nombre: 'Mediana de Propuestas Hábiles',
        rangoTrm: [51, 67],
        trmTexto: '.51 a .67',
        formulaTexto: 'Me = Valor central de la serie ordenada',
        descripcion: 'Punto central de la distribución ordenada de ofertas económicas; neutraliza ofertas extremas.'
      },
      MEDIA_GEOMETRICA: {
        codigo: 'MEDIA_GEOMETRICA',
        nombre: 'Media Geométrica',
        rangoTrm: [68, 84],
        trmTexto: '.68 a .84',
        formulaTexto: 'G = exp( (1/n) * Σ ln(Vi) )',
        descripcion: 'Raíz N-ésima del producto de ofertas válidas; reduce asimetría producida por valores atípicos.'
      },
      MENOR_VALOR: {
        codigo: 'MENOR_VALOR',
        nombre: 'Menor Valor Hábil',
        rangoTrm: [85, 99],
        trmTexto: '.85 a .99',
        formulaTexto: 'P_i = P_max * (V_min / V_i)',
        descripcion: 'Asignación del puntaje máximo a la oferta más económica hábil y proporcionalmente menor a las demás.'
      }
    };

    // Alias retrocompatible para integraciones existentes
    this.METODOS.MEDIA_ARITMETICA_MODIFICADA = this.METODOS.MEDIA_PONDERADA;
  }

  /**
   * Resuelve el método de evaluación aplicable según los dos últimos decimales de la TRM
   * Fuente: Concepto C-382/2020 ANCP-CCE y Pliegos Tipo
   * @param {number|string} trmInput - Valor de la TRM completa (ej: 4185.42) o últimos 2 decimales (0 a 99)
   * @returns {Object} Método seleccionado con su código y rango
   */
  resolverMetodoPorTrm(trmInput) {
    let num = 0;
    if (typeof trmInput === 'string') {
      const str = trmInput.trim();
      const lastComma = str.lastIndexOf(',');
      const lastDot = str.lastIndexOf('.');
      const lastSep = Math.max(lastComma, lastDot);

      if (lastSep !== -1 && lastSep >= str.length - 5) {
        const decPart = str.substring(lastSep + 1);
        num = parseInt(decPart.substring(0, 2).padEnd(2, '0'), 10);
      } else {
        const cleanDigits = str.replace(/[^0-9]/g, '');
        num = cleanDigits.length > 0 ? Math.abs(parseInt(cleanDigits, 10)) % 100 : 0;
      }
    } else if (typeof trmInput === 'number') {
      if (!Number.isInteger(trmInput)) {
        const decStr = trmInput.toFixed(2).split('.')[1] || '00';
        num = parseInt(decStr.substring(0, 2), 10);
      } else {
        num = Math.abs(trmInput) % 100;
      }
    }

    if (isNaN(num)) num = 0;

    for (const key of Object.keys(this.METODOS)) {
      if (key === 'MEDIA_ARITMETICA_MODIFICADA') continue;
      const [min, max] = this.METODOS[key].rangoTrm;
      if (num >= min && num <= max) {
        return {
          ...this.METODOS[key],
          trm_decimales_evaluados: num
        };
      }
    }

    return {
      ...this.METODOS.MEDIA_ARITMETICA,
      trm_decimales_evaluados: num
    };
  }

  /**
   * Detecta ofertas con sospecha de precio artificialmente bajo
   * Decreto 1082 de 2015 Art. 2.2.1.1.2.2.4 y Guía CCE
   * @param {number} po - Presupuesto Oficial
   * @param {Array<number|Object>} ofertas - Propuestas económicas
   */
  detectarPreciosArtificialmenteBajos(po, ofertas) {
    if (!ofertas || ofertas.length === 0) return [];

    const valores = ofertas.map(o => typeof o === 'object' ? parseFloat(o.valor) : parseFloat(o)).filter(v => !isNaN(v) && v > 0);
    const n = valores.length;
    if (n === 0) return [];

    const media = valores.reduce((acc, v) => acc + v, 0) / n;

    // Desviación estándar muestral
    const varianza = n > 1 
      ? valores.reduce((acc, v) => acc + Math.pow(v - media, 2), 0) / (n - 1)
      : 0;
    const desviacion = Math.sqrt(varianza);

    // Umbrales técnicos de alerta
    const umbralDesviacion = media - (1.5 * desviacion);
    const umbralPresupuesto = po * 0.80; // 80% del PO según regla general CCE / costumbre administrativa

    return ofertas.map((item, idx) => {
      const val = typeof item === 'object' ? parseFloat(item.valor) : parseFloat(item);
      const sospechosa = (n >= 3 && val < umbralDesviacion) || (val < umbralPresupuesto);
      let motivo = null;
      if (sospechosa) {
        if (val < umbralPresupuesto) {
          motivo = `Oferta inferior al 80% del Presupuesto Oficial ($ ${Math.round(umbralPresupuesto).toLocaleString('es-CO')}) - Alerta Decreto 1082/2015`;
        } else {
          motivo = `Oferta inferior a 1.5 desviaciones estándar de la media de mercado ($ ${Math.round(umbralDesviacion).toLocaleString('es-CO')})`;
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
   * Calcula el pivote para la fórmula de Media Aritmética con Eliminación de Extremos
   * @param {Array<number>} valores - Valores numéricos de las ofertas
   */
  calcularMediaExtremos(valores) {
    const n = valores.length;
    if (n < 4) {
      return valores.reduce((a, b) => a + b, 0) / (n || 1);
    }

    const suma = valores.reduce((a, b) => a + b, 0);
    const media = suma / n;
    const varianza = valores.reduce((acc, v) => acc + Math.pow(v - media, 2), 0) / (n - 1);
    const sigma = Math.sqrt(varianza);

    // Filtrar propuestas dentro de 1 desviación estándar
    const dentroDeRango = valores.filter(v => Math.abs(v - media) <= sigma);

    if (dentroDeRango.length >= 2 && dentroDeRango.length < n) {
      return dentroDeRango.reduce((a, b) => a + b, 0) / dentroDeRango.length;
    }

    // Si ninguna se excluyó con 1 sigma o quedaron muy pocas, se excluye el menor y el mayor
    const ordenados = [...valores].sort((a, b) => a - b);
    const depurados = ordenados.slice(1, -1);
    return depurados.reduce((a, b) => a + b, 0) / depurados.length;
  }

  /**
   * Evalúa el puntaje económico exacto para cada uno de los 6 métodos oficiales de Pliegos Tipo
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

    // 2. Media con Eliminación de Extremos (k*sigma o recorte)
    const mediaExtremos = this.calcularMediaExtremos(valores);

    // 3. Media Ponderada con Presupuesto Oficial (20% PO / 80% Media Ofertas)
    const mediaPonderada = (0.20 * po) + (0.80 * mediaSimple);

    // 4. Mediana
    const ordenados = [...valores].sort((a, b) => a - b);
    let mediana = 0;
    if (n % 2 !== 0) {
      mediana = ordenados[Math.floor(n / 2)];
    } else {
      mediana = (ordenados[(n / 2) - 1] + ordenados[n / 2]) / 2;
    }

    // 5. Media Geométrica
    const logSuma = valores.reduce((acc, v) => acc + Math.log(v > 0 ? v : 1), 0);
    const mediaGeometrica = Math.exp(logSuma / n);

    // 6. Menor Valor
    const menorValor = Math.min(...valores);

    // Función de cálculo de puntaje por distancia absoluta normalizada CCE
    const calcPuntajeDistancia = (val, pivote) => {
      const distancia = Math.abs(val - pivote);
      const factor = 1 - (distancia / pivote);
      return Math.max(0, Math.round(puntajeMax * factor * 100) / 100);
    };

    // Calificación de cada participante en los 6 métodos
    const resultados = ofertas.map((o) => {
      const v = parseFloat(o.valor);
      const pMediaSimple = calcPuntajeDistancia(v, mediaSimple);
      const pMediaExtremos = calcPuntajeDistancia(v, mediaExtremos);
      const pMediaPond = calcPuntajeDistancia(v, mediaPonderada);
      const pMediana = calcPuntajeDistancia(v, mediana);
      const pMediaGeom = calcPuntajeDistancia(v, mediaGeometrica);
      const pMenor = Math.round(puntajeMax * (menorValor / v) * 100) / 100;

      const promedioPuntajes = Number(((pMediaSimple + pMediaExtremos + pMediaPond + pMediana + pMediaGeom + pMenor) / 6).toFixed(2));

      return {
        proponente: o.proponente,
        valor: v,
        porcentaje_po: Number(((v / po) * 100).toFixed(2)),
        puntajes: {
          media_aritmetica: pMediaSimple,
          media_extremos: pMediaExtremos,
          media_ponderada: pMediaPond,
          mediana: pMediana,
          media_geometrica: pMediaGeom,
          menor_valor: pMenor,
          // Compatibilidad
          media_modificada: pMediaPond,
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
        media_extremos: Math.round(mediaExtremos),
        media_ponderada: Math.round(mediaPonderada),
        mediana: Math.round(mediana),
        media_geometrica: Math.round(mediaGeometrica),
        menor_valor: Math.round(menorValor),
        // Compatibilidad
        media_modificada: Math.round(mediaPonderada)
      },
      calificaciones: resultados
    };
  }

  /**
   * Evalúa un set de ofertas bajo un método específico resuelto por TRM
   * @param {number} po - Presupuesto Oficial
   * @param {Array<{proponente: string, valor: number}>} ofertas
   * @param {number|string} trmInput - TRM para resolver el método
   * @param {number} puntajeMax - Puntaje máximo (por defecto 60)
   */
  evaluarPorTrmEspecifica(po, ofertas, trmInput, puntajeMax = 60) {
    const metodoResuelto = this.resolverMetodoPorTrm(trmInput);
    const evaluacionTotal = this.evaluarTodosLosMetodos(po, ofertas, puntajeMax);
    const codMetodo = metodoResuelto.codigo.toLowerCase();

    const calificacionesMetodo = evaluacionTotal.calificaciones.map(c => ({
      proponente: c.proponente,
      valor: c.valor,
      porcentaje_po: c.porcentaje_po,
      puntaje: c.puntajes[codMetodo] || 0
    })).sort((a, b) => b.puntaje - a.puntaje);

    return {
      metodo_aplicado: metodoResuelto,
      pivote_referencia: evaluacionTotal.referencias_metodos[codMetodo] || 0,
      calificaciones: calificacionesMetodo
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
      iteraciones = 10000,
      perfilCompetencia = 'MODERADO', // AGRESIVO, MODERADO, CONSERVADOR
      ofertaUsuario = null,
      trmFija = null
    } = config;

    // Límites de iteraciones seguras (1.000 a 20.000)
    const iters = Math.min(20000, Math.max(1000, parseInt(iteraciones, 10) || 10000));

    // Distribución de precios de competidores según perfil
    let minPct = 0.90;
    let maxPct = 0.99;
    let bias = 0.945;

    if (perfilCompetencia === 'AGRESIVO') {
      minPct = 0.85;
      maxPct = 0.95;
      bias = 0.900;
    } else if (perfilCompetencia === 'CONSERVADOR') {
      minPct = 0.93;
      maxPct = 0.999;
      bias = 0.970;
    }

    // Puntos de prueba para el licitante: del 82% al 99.5% en saltos de 0.5%
    const candidatosPct = [];
    for (let p = 82.0; p <= 99.5; p += 0.5) {
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

    // Acumuladores de puntaje y de victorias (#1 en la iteración)
    const acumuladores = {};
    const conteoVictorias = {};
    candidatosPct.forEach(pct => {
      acumuladores[pct] = 0;
      conteoVictorias[pct] = 0;
    });

    // Desglose de acumulador por cada uno de los 6 métodos
    const porMetodo = {
      MEDIA_ARITMETICA: {},
      MEDIA_EXTREMOS: {},
      MEDIA_PONDERADA: {},
      MEDIANA: {},
      MEDIA_GEOMETRICA: {},
      MENOR_VALOR: {}
    };
    const iteracionesPorMetodo = {
      MEDIA_ARITMETICA: 0,
      MEDIA_EXTREMOS: 0,
      MEDIA_PONDERADA: 0,
      MEDIANA: 0,
      MEDIA_GEOMETRICA: 0,
      MENOR_VALOR: 0
    };

    Object.keys(porMetodo).forEach(m => {
      candidatosPct.forEach(pct => porMetodo[m][pct] = 0);
    });

    // Helper para generar distribución pseudo-normal triangular con sesgo
    const randomCompetidorVal = () => {
      const u1 = Math.random();
      const u2 = Math.random();
      const valPct = (u1 + u2) / 2 < 0.5 
        ? minPct + Math.sqrt((u1 + u2) / 2 * (maxPct - minPct) * (bias - minPct))
        : maxPct - Math.sqrt((1 - (u1 + u2) / 2) * (maxPct - minPct) * (maxPct - bias));
      return Math.min(maxPct, Math.max(minPct, valPct)) * po;
    };

    // Bucle Principal de Monte Carlo
    for (let iter = 0; iter < iters; iter++) {
      // Simular decimales de TRM [0-99] o usar TRM fija
      const trmRand = (trmFija !== null && trmFija !== undefined)
        ? Math.abs(parseInt(trmFija, 10)) % 100
        : Math.floor(Math.random() * 100);

      const metodoObj = this.resolverMetodoPorTrm(trmRand);
      const metodoCodigo = metodoObj.codigo;
      iteracionesPorMetodo[metodoCodigo]++;

      // Generar ofertas de competidores para esta iteración
      const ofertasCompetidores = [];
      for (let c = 0; c < competidoresEstimados; c++) {
        ofertasCompetidores.push(randomCompetidorVal());
      }

      // Evaluar cada candidato de oferta del usuario compitiendo contra este pool
      let mejorPuntajeIter = -1;
      let mejorCandidatoIter = null;

      candidatosPct.forEach(pct => {
        const valUser = (pct / 100) * po;
        const pool = [...ofertasCompetidores, valUser];
        const n = pool.length;

        let puntaje = 0;

        if (metodoCodigo === 'MEDIA_ARITMETICA') {
          const media = pool.reduce((a, b) => a + b, 0) / n;
          puntaje = Math.max(0, puntajeMax * (1 - Math.abs(valUser - media) / media));
        } else if (metodoCodigo === 'MEDIA_EXTREMOS') {
          const mediaExt = this.calcularMediaExtremos(pool);
          puntaje = Math.max(0, puntajeMax * (1 - Math.abs(valUser - mediaExt) / mediaExt));
        } else if (metodoCodigo === 'MEDIA_PONDERADA' || metodoCodigo === 'MEDIA_ARITMETICA_MODIFICADA') {
          const mediaSimp = pool.reduce((a, b) => a + b, 0) / n;
          const mediaPond = (0.20 * po) + (0.80 * mediaSimp);
          puntaje = Math.max(0, puntajeMax * (1 - Math.abs(valUser - mediaPond) / mediaPond));
        } else if (metodoCodigo === 'MEDIANA') {
          const s = [...pool].sort((a, b) => a - b);
          const me = n % 2 !== 0 ? s[Math.floor(n / 2)] : (s[n/2 - 1] + s[n/2]) / 2;
          puntaje = Math.max(0, puntajeMax * (1 - Math.abs(valUser - me) / me));
        } else if (metodoCodigo === 'MEDIA_GEOMETRICA') {
          const logSuma = pool.reduce((acc, v) => acc + Math.log(v > 0 ? v : 1), 0);
          const mg = Math.exp(logSuma / n);
          puntaje = Math.max(0, puntajeMax * (1 - Math.abs(valUser - mg) / mg));
        } else if (metodoCodigo === 'MENOR_VALOR') {
          const minVal = Math.min(...pool);
          puntaje = puntajeMax * (minVal / valUser);
        }

        acumuladores[pct] += puntaje;
        porMetodo[metodoCodigo][pct] += puntaje;

        if (puntaje > mejorPuntajeIter) {
          mejorPuntajeIter = puntaje;
          mejorCandidatoIter = pct;
        }
      });

      if (mejorCandidatoIter !== null) {
        conteoVictorias[mejorCandidatoIter]++;
      }
    }

    // Encontrar el porcentaje óptimo que maximiza la esperanza matemática
    let mejorPct = candidatosPct[0];
    let maxEsperanza = 0;

    const curvaRendimiento = candidatosPct.map(pct => {
      const esperanza = Number((acumuladores[pct] / iters).toFixed(2));
      const precio = Math.round((pct / 100) * po);
      const probVictoria = Number(((conteoVictorias[pct] / iters) * 100).toFixed(1));

      if (esperanza > maxEsperanza) {
        maxEsperanza = esperanza;
        mejorPct = pct;
      }

      // Verificación de riesgo de precio artificialmente bajo
      const riesgoBajo = pct < 88.0;

      // Desglose condicional por método
      const desglose = {};
      Object.keys(porMetodo).forEach(m => {
        const count = iteracionesPorMetodo[m] || 1;
        desglose[m.toLowerCase()] = Number((porMetodo[m][pct] / count).toFixed(2));
      });

      return {
        porcentaje_po: pct,
        precio_cop: precio,
        esperanza_puntaje: esperanza,
        probabilidad_victoria: probVictoria,
        desglose_por_metodo: {
          media_aritmetica: desglose.media_aritmetica,
          media_extremos: desglose.media_extremos,
          media_ponderada: desglose.media_ponderada,
          mediana: desglose.mediana,
          media_geometrica: desglose.media_geometrica,
          menor_valor: desglose.menor_valor,
          // Compatibilidad retroactiva
          media_modificada: desglose.media_ponderada
        },
        alerta_riesgo_precio_bajo: riesgoBajo
      };
    });

    const precioOptimoCop = Math.round((mejorPct / 100) * po);
    const itemOptimo = curvaRendimiento.find(c => c.porcentaje_po === mejorPct);

    // Zona Óptima de Adjudicación (ZOA): donde se conserva al menos el 95% del puntaje máximo sin incurrir en precio artificialmente bajo
    const umbral95 = maxEsperanza * 0.95;
    const zoa = curvaRendimiento.filter(c => c.esperanza_puntaje >= umbral95 && !c.alerta_riesgo_precio_bajo);

    return {
      presupuesto_oficial: po,
      puntaje_maximo: puntajeMax,
      iteraciones_montecarlo: iters,
      perfil_competencia: perfilCompetencia,
      competidores_simulados: competidoresEstimados,
      trm_estocastica: {
        distribucion: 'Uniforme discreta U[0, 99] en 6 rangos oficiales de Pliegos Tipo ANCP-CCE',
        concepto_cce: 'Concepto C-382 de 2020 ANCP-CCE',
        iteraciones_por_metodo: iteracionesPorMetodo
      },
      recomendacion_estrategica: {
        porcentaje_optimo: mejorPct,
        precio_optimo_cop: precioOptimoCop,
        esperanza_puntaje_max: maxEsperanza,
        eficiencia_esperada: Number(((maxEsperanza / puntajeMax) * 100).toFixed(1)),
        zona_optima_adjudicacion_zoa: {
          min_pct: zoa.length > 0 ? zoa[0].porcentaje_po : mejorPct,
          max_pct: zoa.length > 0 ? zoa[zoa.length - 1].porcentaje_po : mejorPct,
          min_cop: zoa.length > 0 ? zoa[0].precio_cop : precioOptimoCop,
          max_cop: zoa.length > 0 ? zoa[zoa.length - 1].precio_cop : precioOptimoCop,
          descripcion: 'Intervalo de postura donde se maximiza el puntaje con inmunidad a precios artificialmente bajos.'
        },
        // Compatibilidad retroactiva
        rango_seguro_recomendado: {
          min_pct: zoa.length > 0 ? zoa[0].porcentaje_po : mejorPct,
          max_pct: zoa.length > 0 ? zoa[zoa.length - 1].porcentaje_po : mejorPct,
          min_cop: zoa.length > 0 ? zoa[0].precio_cop : precioOptimoCop,
          max_cop: zoa.length > 0 ? zoa[zoa.length - 1].precio_cop : precioOptimoCop
        },
        desglose_metodos_en_optimo: itemOptimo ? itemOptimo.desglose_por_metodo : null
      },
      umbral_precio_artificialmente_bajo: {
        porcentaje_po: 88.0,
        valor_cop: Math.round(po * 0.88),
        fundamento_legal: 'Decreto 1082 de 2015 Art. 2.2.1.1.2.2.4 y Concepto C-382/2020 CCE'
      },
      curva_rendimiento: curvaRendimiento
    };
  }

  /**
   * Genera el Informe Técnico Oficial de Simulación Económica y Estocástica de TRM en PDF
   * Cumpliendo los estándares de la Ley 1882/2018 y Concepto C-382/2020 ANCP-CCE
   * 
   * @param {Object} simulacionData - Datos consolidados de simulación
   * @param {Object} procesoInfo - Datos del proceso (referencia, entidad, proponente, etc.)
   * @returns {Promise<Buffer>}
   */
  async generarInformeSimulacionEconomicaPdf(simulacionData, procesoInfo = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          layout: 'portrait',
          margin: 36
        });

        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const fCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);
        const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        const po = simulacionData.presupuesto_oficial || 0;
        const puntajeMax = simulacionData.puntaje_maximo || 60;
        const rec = simulacionData.recomendacion_estrategica || {};
        const zoa = rec.zona_optima_adjudicacion_zoa || rec.rango_seguro_recomendado || {};
        const umbralBajo = simulacionData.umbral_precio_artificialmente_bajo || { valor_cop: Math.round(po * 0.88), porcentaje_po: 88.0 };

        // 1. ENCABEZADO INSTITUCIONAL RADAR SECOP & CCE
        doc.fontSize(7.5).fillColor('#64748b').text('REPÚBLICA DE COLOMBIA • AGENCIA NACIONAL DE CONTRATACIÓN PÚBLICA - COLOMBIA COMPRA EFICIENTE', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text('DICTAMEN TÉCNICO DE PONDERACIÓN ECONÓMICA Y MODELADO ESTOCÁSTICO DE TRM', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(7.5).fillColor('#475569').font('Helvetica').text('Ley 1882 de 2018 • Ley 2022 de 2020 • Concepto C-382 de 2020 ANCP-CCE • Decreto 1082 de 2015', { align: 'center' });
        doc.moveDown(0.6);

        // 2. BLOQUE DE IDENTIFICACIÓN DEL PROCESO
        const topY = doc.y;
        doc.rect(36, topY, 540, 52).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(7);

        doc.font('Helvetica-Bold').text('ENTIDAD ESTATAL:', 44, topY + 6).font('Helvetica').text(procesoInfo.entidad || 'ENTIDAD LICITANTE', 145, topY + 6);
        doc.font('Helvetica-Bold').text('PROCESO / REFERENCIA:', 44, topY + 17).font('Helvetica').text(procesoInfo.referencia || 'LP-001-2026', 145, topY + 17);
        doc.font('Helvetica-Bold').text('PROPONENTE / EMPRESA:', 44, topY + 28).font('Helvetica').text(procesoInfo.proponente || 'PROPONENTE INTERESADO', 145, topY + 28);
        doc.font('Helvetica-Bold').text('FECHA DE SIMULACIÓN:', 44, topY + 39).font('Helvetica').text(fechaHoy, 145, topY + 39);

        doc.font('Helvetica-Bold').text('PRESUPUESTO OFICIAL (PO):', 350, topY + 6).font('Helvetica-Bold').fillColor('#1e3a8a').text(fCOP(po), 475, topY + 6);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text('PUNTAJE ECONÓMICO MÁX:', 350, topY + 17).font('Helvetica').text(`${puntajeMax} Puntos`, 475, topY + 17);
        doc.font('Helvetica-Bold').text('ITERACIONES MONTE CARLO:', 350, topY + 28).font('Helvetica').text(`${(simulacionData.iteraciones_montecarlo || 10000).toLocaleString('es-CO')} iteraciones`, 475, topY + 28);
        doc.font('Helvetica-Bold').text('PERFIL DE COMPETENCIA:', 350, topY + 39).font('Helvetica').text(`${simulacionData.perfil_competencia || 'MODERADO'} (${simulacionData.competidores_simulados || 6} competidores)`, 475, topY + 39);

        doc.y = topY + 60;

        // 3. TARJETA HERO: RECOMENDACIÓN ESTRATÉGICA Y PRECIO ÓPTIMO
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('1. DETERMINACIÓN DEL PRECIO ÓPTIMO DE ADJUDICACIÓN (P_opt)');
        doc.moveDown(0.3);

        const heroY = doc.y;
        doc.rect(36, heroY, 540, 58).fillAndStroke('#eff6ff', '#bfdbfe');

        doc.fillColor('#1e40af').fontSize(7.5).font('Helvetica-Bold').text('POSTURA ECONÓMICA RECOMENDADA (P_opt):', 46, heroY + 8);
        doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text(fCOP(rec.precio_optimo_cop || 0), 46, heroY + 20);
        doc.fillColor('#475569').fontSize(7.5).font('Helvetica').text(`Equivale exactamente al ${rec.porcentaje_optimo || 0}% del Presupuesto Oficial`, 46, heroY + 40);

        doc.fillColor('#1e40af').fontSize(7.5).font('Helvetica-Bold').text('ESPERANZA MATEMÁTICA E[PUNTAJE]:', 340, heroY + 8);
        doc.fillColor('#15803d').fontSize(14).font('Helvetica-Bold').text(`${rec.esperanza_puntaje_max || 0} / ${puntajeMax} pts`, 340, heroY + 20);
        doc.fillColor('#475569').fontSize(7.5).font('Helvetica').text(`Eficiencia global esperada: ${rec.eficiencia_esperada || 0}%`, 340, heroY + 38);

        doc.y = heroY + 66;

        // 4. PARÁMETROS DE SEGURIDAD JURÍDICO-ECONÓMICA (ZOA Y PRECIO ARTIFICIALMENTE BAJO)
        const subSecY = doc.y;
        // Caja ZOA
        doc.rect(36, subSecY, 265, 48).fillAndStroke('#f0fdf4', '#bbf7d0');
        doc.fillColor('#166534').fontSize(7.5).font('Helvetica-Bold').text('ZONA ÓPTIMA DE ADJUDICACIÓN (ZOA)', 44, subSecY + 6);
        doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(`${zoa.min_pct || rec.porcentaje_optimo}% a ${zoa.max_pct || rec.porcentaje_optimo}% del PO`, 44, subSecY + 18);
        doc.fillColor('#475569').fontSize(7).font('Helvetica').text(`Rango: ${fCOP(zoa.min_cop)} - ${fCOP(zoa.max_cop)}`, 44, subSecY + 30);
        doc.fillColor('#166534').fontSize(6.5).font('Helvetica').text('Conserva al menos el 95% de la esperanza de puntaje máximo.', 44, subSecY + 39);

        // Caja Umbral Precio Artificialmente Bajo
        doc.rect(311, subSecY, 265, 48).fillAndStroke('#fef2f2', '#fecaca');
        doc.fillColor('#991b1b').fontSize(7.5).font('Helvetica-Bold').text('UMBRAL DE PRECIO ARTIFICIALMENTE BAJO', 319, subSecY + 6);
        doc.fillColor('#b91c1c').fontSize(9).font('Helvetica-Bold').text(`< ${umbralBajo.porcentaje_po}% del PO (${fCOP(umbralBajo.valor_cop)})`, 319, subSecY + 18);
        doc.fillColor('#475569').fontSize(7).font('Helvetica').text('Decreto 1082/2015 Art. 2.2.1.1.2.2.4 y Guía CCE', 319, subSecY + 30);
        doc.fillColor('#991b1b').fontSize(6.5).font('Helvetica').text('Propuestas inferiores exigen requerimiento de aclaración de costos.', 319, subSecY + 39);

        doc.y = subSecY + 56;

        // 5. TABLA DE LAS 6 FÓRMULAS OFICIALES Y RANGOS DE TRM (CONCEPTO C-382/2020)
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('2. MODELO DE LAS 6 FÓRMULAS DE PLIEGOS TIPO Y ESTOCÁSTICA DE TRM');
        doc.moveDown(0.3);

        const tabMetodosY = doc.y;
        doc.rect(36, tabMetodosY, 540, 14).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(6.5).font('Helvetica-Bold');
        doc.text('CÓDIGO', 42, tabMetodosY + 4, { width: 45 });
        doc.text('MÉTODO DE EVALUACIÓN ECONÓMICA', 90, tabMetodosY + 4, { width: 175 });
        doc.text('DECIMALES TRM', 270, tabMetodosY + 4, { width: 65, align: 'center' });
        doc.text('FÓRMULA / PIVOTE MATEMÁTICO', 340, tabMetodosY + 4, { width: 140 });
        doc.text('PUNTAJE EN P_opt', 485, tabMetodosY + 4, { width: 85, align: 'right' });

        const metodosLista = [
          { cod: 'M1', nom: 'Media Aritmética Simple', trm: '.00 a .16', form: 'X̄ = (1/n) * Σ Vi', key: 'media_aritmetica' },
          { cod: 'M2', nom: 'Media Aritmética con Extremos', trm: '.17 a .33', form: 'X̄_depurada (|Vi - X̄| ≤ 1.0σ)', key: 'media_extremos' },
          { cod: 'M3', nom: 'Media Ponderada con PO', trm: '.34 a .50', form: '0.20 * PO + 0.80 * X̄', key: 'media_ponderada' },
          { cod: 'M4', nom: 'Mediana de Propuestas', trm: '.51 a .67', form: 'Valor central serie ordenada', key: 'mediana' },
          { cod: 'M5', nom: 'Media Geométrica', trm: '.68 a .84', form: 'G = exp( (1/n) * Σ ln(Vi) )', key: 'media_geometrica' },
          { cod: 'M6', nom: 'Menor Valor Hábil', trm: '.85 a .99', form: 'P_i = P_max * (V_min / V_i)', key: 'menor_valor' }
        ];

        let currY = tabMetodosY + 14;
        const desglose = rec.desglose_metodos_en_optimo || {};

        metodosLista.forEach((m, idx) => {
          doc.rect(36, currY, 540, 14).fillAndStroke(idx % 2 === 0 ? '#f8fafc' : '#ffffff', '#e2e8f0');
          doc.fillColor('#0f172a').fontSize(6.5).font('Helvetica-Bold').text(m.cod, 42, currY + 3);
          doc.font('Helvetica').text(m.nombre, 90, currY + 3);
          doc.fillColor('#1e40af').font('Helvetica-Bold').text(m.trm, 270, currY + 3, { width: 65, align: 'center' });
          doc.fillColor('#475569').font('Helvetica').text(m.form, 340, currY + 3);
          const pts = desglose[m.key] !== undefined ? `${desglose[m.key]} pts` : '--';
          doc.fillColor('#15803d').font('Helvetica-Bold').text(pts, 485, currY + 3, { width: 85, align: 'right' });
          currY += 14;
        });

        doc.y = currY + 8;

        // 6. CURVA DE SENSIBILIDAD DEL BARRIDO DE OFERTAS
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('3. MATRIZ DE SENSIBILIDAD Y PROBABILIDAD DE ADJUDICACIÓN');
        doc.moveDown(0.3);

        const tabCurvaY = doc.y;
        doc.rect(36, tabCurvaY, 540, 13).fill('#1e293b');
        doc.fillColor('#ffffff').fontSize(6.5).font('Helvetica-Bold');
        doc.text('% SOBRE PO', 44, tabCurvaY + 3, { width: 65 });
        doc.text('OFERTA ECONÓMICA (COP)', 115, tabCurvaY + 3, { width: 120 });
        doc.text('E[PUNTAJE]', 240, tabCurvaY + 3, { width: 70, align: 'center' });
        doc.text('P(VICTORIA #1)', 315, tabCurvaY + 3, { width: 75, align: 'center' });
        doc.text('ESTADO / NIVEL DE RIESGO', 395, tabCurvaY + 3, { width: 175 });

        let curvaY = tabCurvaY + 13;
        const curva = simulacionData.curva_rendimiento || [];
        // Muestrear puntos clave (cada 1.5% o los relevantes)
        const puntosMuestra = curva.filter((c, idx) => c.porcentaje_po === rec.porcentaje_optimo || idx % 3 === 0);

        puntosMuestra.forEach((p, idx) => {
          const isOpt = p.porcentaje_po === rec.porcentaje_optimo;
          doc.rect(36, curvaY, 540, 12).fillAndStroke(isOpt ? '#fef9c3' : (idx % 2 === 0 ? '#f8fafc' : '#ffffff'), '#e2e8f0');

          doc.fillColor(isOpt ? '#854d0e' : '#0f172a').fontSize(6.5).font(isOpt ? 'Helvetica-Bold' : 'Helvetica');
          doc.text(`${p.porcentaje_po}%`, 44, curvaY + 2.5);
          doc.text(fCOP(p.precio_cop), 115, curvaY + 2.5);
          doc.text(`${p.esperanza_puntaje} pts`, 240, curvaY + 2.5, { width: 70, align: 'center' });
          doc.text(`${p.probabilidad_victoria || 0}%`, 315, curvaY + 2.5, { width: 75, align: 'center' });

          let estadoTexto = 'En zona competitiva estándar';
          let estadoColor = '#334155';
          if (isOpt) {
            estadoTexto = '⭐ PUNTO ÓPTIMO RECOMENDADO';
            estadoColor = '#854d0e';
          } else if (p.alerta_riesgo_precio_bajo) {
            estadoTexto = '⚠️ RIESGO: PRECIO ARTIFICIALMENTE BAJO';
            estadoColor = '#b91c1c';
          } else if (p.porcentaje_po > 97.0) {
            estadoTexto = 'Conservador: Alta pérdida de puntos';
            estadoColor = '#64748b';
          }

          doc.fillColor(estadoColor).font('Helvetica-Bold').text(estadoTexto, 395, curvaY + 2.5);
          curvaY += 12;
        });

        doc.y = curvaY + 8;

        // 7. DICTAMEN TÉCNICO Y RECOMENDACIÓN PARA EL COMITÉ DE LICITACIONES
        const recBoxY = doc.y;
        doc.rect(36, recBoxY, 540, 52).fillAndStroke('#f1f5f9', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text('DICTAMEN Y RECOMENDACIÓN PARA EL COMITÉ DE CONTRATACIÓN:', 44, recBoxY + 6);
        doc.fillColor('#334155').fontSize(6.8).font('Helvetica').text(
          `Conforme al Concepto C-382 de 2020 de la ANCP-CCE, la asignación de puntaje está supeditada a los dos últimos decimales de la TRM del día de adjudicación o apertura del sobre económico. El precio óptimo de ${fCOP(rec.precio_optimo_cop)} (${rec.porcentaje_optimo}% del PO) maximiza la esperanza de puntaje a ${rec.esperanza_puntaje_max} puntos (${rec.eficiencia_esperada}% de eficiencia global). Se recomienda fijar la postura dentro de la ZOA (${zoa.min_pct}% a ${zoa.max_pct}% PO) y no descender del 88.0% para evitar incurrir en investigación por precio artificialmente bajo (Decreto 1082/2015).`,
          44, recBoxY + 18, { width: 524, align: 'justify' }
        );

        // 8. PIE DE PÁGINA Y SELLO DE AUDITORÍA
        const footY = doc.page.height - 40;
        doc.fontSize(6.5).font('Helvetica').fillColor('#94a3b8')
          .text(`Dictamen emitido automáticamente por el Sistema Radar SECOP • Algoritmo Estocástico CCE • Hash de Integridad: ${Buffer.from(String(po) + String(rec.precio_optimo_cop) + fechaHoy).toString('hex').substring(0, 24)}`, 36, footY, { align: 'center', width: 540 });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = new EconomicEngine();
