const config = require('./config');
const dbPostgres = require('./dbPostgres');

class CompetitiveIntelligence {
  constructor() {
    this.datasetUrl = config.socrata?.secopIIContratos || 'https://www.datos.gov.co/resource/jbjy-vk9h.json';
    this.appToken = config.socrata?.appToken || null;
  }

  /**
   * Genera una clave unificada de caché según los criterios de búsqueda
   */
  _generarCacheKey(criterios) {
    const parts = [];
    if (criterios.entidad) parts.push(`ENTIDAD:${criterios.entidad.trim().toUpperCase()}`);
    if (criterios.palabraClave) parts.push(`KEYWORD:${criterios.palabraClave.trim().toUpperCase()}`);
    if (criterios.unspsc) parts.push(`UNSPSC:${criterios.unspsc.trim()}`);
    if (parts.length === 0) return { tipo: 'GENERAL', valor: 'NACIONAL_GLOBAL' };
    return {
      tipo: parts.length === 1 ? parts[0].split(':')[0] : 'MIXTO',
      valor: parts.join(' | ')
    };
  }

  /**
   * Calcula percentiles matemáticos en un arreglo numérico ordenado ascendente
   */
  _calcularPercentil(arr, p) {
    if (arr.length === 0) return 0;
    const index = (p / 100) * (arr.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    if (lower === upper) return arr[lower];
    return arr[lower] * (1 - weight) + arr[upper] * weight;
  }

  /**
   * Analiza el mercado competitivo y precios históricos adjudicados en SECOP II
   */
  async analizarMercado({ entidad = '', palabraClave = '', unspsc = '', minValor = 10000000, limit = 100, forceRefresh = false }) {
    const cacheInfo = this._generarCacheKey({ entidad, palabraClave, unspsc });

    // 1. Verificar si existe en caché de PostgreSQL (vigencia 24 horas)
    if (!forceRefresh) {
      try {
        const cacheRes = await dbPostgres.query(`
          SELECT * FROM inteligencia_competidores_cache
          WHERE criterio_tipo = $1 AND criterio_valor = $2
            AND actualizado_en >= NOW() - INTERVAL '24 hours'
          ORDER BY actualizado_en DESC LIMIT 1;
        `, [cacheInfo.tipo, cacheInfo.valor]);

        if (cacheRes.rows.length > 0) {
          const row = cacheRes.rows[0];
          return {
            source: 'CACHE_POSTGRES',
            criterio: { tipo: row.criterio_tipo, valor: row.criterio_valor },
            totalContratos: row.total_contratos,
            montoTotal: Number(row.monto_total),
            ticketPromedio: Number(row.ticket_promedio),
            ticketMediana: Number(row.ticket_mediana),
            ticketMin: Number(row.ticket_min),
            ticketMax: Number(row.ticket_max),
            indiceHerfindahl: Number(row.indice_herfindahl),
            nivelConcentracion: this._clasificarHHI(Number(row.indice_herfindahl)),
            topContratistas: row.top_contratistas,
            distribucionModalidades: row.distribucion_modalidades,
            contratosMuestra: row.contratos_muestra,
            monteCarloParams: row.monte_carlo_params,
            actualizadoEn: row.actualizado_en
          };
        }
      } catch (err) {
        console.warn('⚠️ Error al leer caché de inteligencia competitiva:', err.message);
      }
    }

    // 2. Construir la consulta SoQL contra Socrata jbjy-vk9h
    const conditions = [];

    // Filtro de entidad compradora
    if (entidad && entidad.trim().length > 0) {
      const cleanEntidad = entidad.trim().toUpperCase().replace(/'/g, "''");
      conditions.push(`upper(nombre_entidad) like '%${cleanEntidad}%'`);
    }

    // Filtro por palabra clave en objeto o descripción
    if (palabraClave && palabraClave.trim().length > 0) {
      const cleanWord = palabraClave.trim().toUpperCase().replace(/'/g, "''");
      conditions.push(`(upper(objeto_del_contrato) like '%${cleanWord}%' or upper(descripcion_del_proceso) like '%${cleanWord}%')`);
    }

    // Filtro por código UNSPSC (categoría principal)
    if (unspsc && unspsc.trim().length > 0) {
      const cleanUnspsc = unspsc.trim().replace(/'/g, "''");
      conditions.push(`codigo_de_categoria_principal like '%${cleanUnspsc}%'`);
    }

    // Filtro de valor mínimo (excluir cajas menores o gastos irrelevantes)
    if (minValor && !isNaN(minValor) && minValor > 0) {
      conditions.push(`valor_del_contrato >= ${Number(minValor)}`);
    }

    // Descartar personas naturales / OPS individuales no empresariales si se busca B2B
    // (Por ejemplo no cédula de ciudadanía si el valor es menor a 80M y es prestación de servicios)
    conditions.push(`(tipo_de_contrato != 'Prestación de servicios' or tipodocproveedor != 'Cédula de Ciudadanía' or valor_del_contrato > 80000000)`);

    const whereClause = conditions.length > 0 ? conditions.join(' and ') : 'valor_del_contrato > 20000000';
    const cleanLimit = Math.min(Math.max(parseInt(limit) || 100, 10), 300);

    const queryParams = new URLSearchParams({
      $where: whereClause,
      $order: 'fecha_de_firma DESC',
      $limit: String(cleanLimit)
    });

    const targetUrl = `${this.datasetUrl}?${queryParams.toString()}`;
    console.log(`🔍 [Inteligencia Competitiva] Consultando SECOP II contratos: ${targetUrl}`);

    const headers = { 'Accept': 'application/json', 'User-Agent': 'RadarSECOP/1.0' };
    if (this.appToken) {
      headers['X-App-Token'] = this.appToken;
    }

    const response = await fetch(targetUrl, { headers });
    if (!response.ok) {
      throw new Error(`Error en Socrata jbjy-vk9h (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Respuesta inválida recibida desde SECOP II');
    }

    // 3. Procesar y calcular analítica agregada
    const totalContratos = data.length;
    let montoTotal = 0;
    const precios = [];
    const contratistasMap = new Map();
    const modalidadesMap = new Map();
    const muestra = [];

    data.forEach((item, idx) => {
      const val = parseFloat(item.valor_del_contrato) || 0;
      montoTotal += val;
      precios.push(val);

      // Agrupación por proveedor
      const nit = (item.documento_proveedor || item.codigo_proveedor || 'SIN_NIT').trim();
      const nombre = (item.proveedor_adjudicado || 'PROVEEDOR NO REGISTRADO').trim();
      const key = `${nit}::${nombre}`;

      if (!contratistasMap.has(key)) {
        contratistasMap.set(key, {
          nit,
          nombre,
          contratosGanados: 0,
          montoTotal: 0,
          esPyme: item.es_pyme === 'Si',
          entidadesFrecuentes: new Set(),
          ultimoContrato: null
        });
      }

      const prov = contratistasMap.get(key);
      prov.contratosGanados += 1;
      prov.montoTotal += val;
      if (item.nombre_entidad) prov.entidadesFrecuentes.add(item.nombre_entidad);

      const fechaFirma = item.fecha_de_firma || item.fecha_de_inicio_del_contrato || '';
      if (!prov.ultimoContrato || (fechaFirma && fechaFirma > prov.ultimoContrato.fecha)) {
        prov.ultimoContrato = {
          fecha: fechaFirma,
          entidad: item.nombre_entidad,
          valor: val,
          objeto: item.objeto_del_contrato,
          url: item.urlproceso?.url || item.urlproceso || null
        };
      }

      // Agrupación por modalidad
      const mod = item.modalidad_de_contratacion || 'Otras modalidades';
      modalidadesMap.set(mod, (modalidadesMap.get(mod) || 0) + 1);

      // Muestra de contratos (top 15 más representativos)
      if (idx < 15) {
        muestra.push({
          idContrato: item.id_contrato || item.referencia_del_contrato || `CTR-${idx}`,
          entidad: item.nombre_entidad,
          proveedor: nombre,
          nit: nit,
          valor: val,
          modalidad: mod,
          tipoContrato: item.tipo_de_contrato,
          objeto: item.objeto_del_contrato,
          fechaFirma: fechaFirma,
          url: item.urlproceso?.url || item.urlproceso || null
        });
      }
    });

    // 4. Estadísticas de Precios
    precios.sort((a, b) => a - b);
    const ticketMin = precios.length > 0 ? precios[0] : 0;
    const ticketMax = precios.length > 0 ? precios[precios.length - 1] : 0;
    const ticketPromedio = totalContratos > 0 ? montoTotal / totalContratos : 0;
    const ticketMediana = this._calcularPercentil(precios, 50);
    const p25 = this._calcularPercentil(precios, 25);
    const p75 = this._calcularPercentil(precios, 75);

    // 5. Ranking de Contratistas y Cuota de Mercado
    const contratistasList = Array.from(contratistasMap.values()).map(c => {
      const cuotaMercadoPct = montoTotal > 0 ? (c.montoTotal / montoTotal) * 100 : 0;
      return {
        nit: c.nit,
        nombre: c.nombre,
        contratosGanados: c.contratosGanados,
        montoTotal: c.montoTotal,
        ticketPromedio: c.contratosGanados > 0 ? c.montoTotal / c.contratosGanados : 0,
        cuotaMercadoPct: Number(cuotaMercadoPct.toFixed(2)),
        esPyme: c.esPyme,
        entidadesFrecuentes: Array.from(c.entidadesFrecuentes).slice(0, 5),
        ultimoContrato: c.ultimoContrato
      };
    });

    // Ordenar por volumen monetario adjudicado
    contratistasList.sort((a, b) => b.montoTotal - a.montoTotal);

    // 6. Índice de Concentración Herfindahl-Hirschman (HHI)
    let herfindahl = 0;
    contratistasList.forEach(c => {
      herfindahl += Math.pow(c.cuotaMercadoPct, 2);
    });
    herfindahl = Number(herfindahl.toFixed(2));
    const nivelConcentracion = this._clasificarHHI(herfindahl);

    // 7. Distribución de Modalidades
    const distribucionModalidades = {};
    modalidadesMap.forEach((cnt, mod) => {
      distribucionModalidades[mod] = cnt;
    });

    // 8. Calibración Inteligente para el Simulador Monte Carlo
    const monteCarloParams = this._generarParametrosMonteCarlo({
      totalContratos,
      herfindahl,
      contratistasList,
      ticketMediana
    });

    const resultado = {
      source: 'SOCRATA_LIVE',
      criterio: cacheInfo,
      totalContratos,
      montoTotal,
      ticketPromedio,
      ticketMediana,
      ticketMin,
      ticketMax,
      percentiles: { p25, p50: ticketMediana, p75 },
      indiceHerfindahl: herfindahl,
      nivelConcentracion,
      topContratistas: contratistasList.slice(0, 10),
      distribucionModalidades,
      contratosMuestra: muestra,
      monteCarloParams,
      actualizadoEn: new Date().toISOString()
    };

    // 9. Guardar/Actualizar en Caché de PostgreSQL
    try {
      await dbPostgres.query(`
        INSERT INTO inteligencia_competidores_cache (
          criterio_tipo, criterio_valor, total_contratos, monto_total,
          ticket_promedio, ticket_mediana, ticket_min, ticket_max,
          indice_herfindahl, top_contratistas, distribucion_modalidades,
          contratos_muestra, monte_carlo_params, actualizado_en
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        ON CONFLICT (criterio_tipo, criterio_valor) DO UPDATE SET
          total_contratos = EXCLUDED.total_contratos,
          monto_total = EXCLUDED.monto_total,
          ticket_promedio = EXCLUDED.ticket_promedio,
          ticket_mediana = EXCLUDED.ticket_mediana,
          ticket_min = EXCLUDED.ticket_min,
          ticket_max = EXCLUDED.ticket_max,
          indice_herfindahl = EXCLUDED.indice_herfindahl,
          top_contratistas = EXCLUDED.top_contratistas,
          distribucion_modalidades = EXCLUDED.distribucion_modalidades,
          contratos_muestra = EXCLUDED.contratos_muestra,
          monte_carlo_params = EXCLUDED.monte_carlo_params,
          actualizado_en = NOW();
      `, [
        cacheInfo.tipo,
        cacheInfo.valor,
        totalContratos,
        montoTotal,
        ticketPromedio,
        ticketMediana,
        ticketMin,
        ticketMax,
        herfindahl,
        JSON.stringify(resultado.topContratistas),
        JSON.stringify(distribucionModalidades),
        JSON.stringify(muestra),
        JSON.stringify(monteCarloParams)
      ]);
    } catch (saveErr) {
      console.warn('⚠️ No se pudo persistir caché de inteligencia competitiva:', saveErr.message);
    }

    return resultado;
  }

  /**
   * Clasifica el índice de concentración de Herfindahl
   */
  _clasificarHHI(hhi) {
    if (hhi > 2500) {
      return {
        codigo: 'ALTA_CONCENTRACION',
        etiqueta: 'Mercado Altamente Concentrado',
        badge: 'badge-danger',
        descripcion: 'Dominancia evidente de uno o pocos contratistas. Existen barreras de entrada o ventajas del titular habitual.',
        color: '#ef4444'
      };
    } else if (hhi >= 1500) {
      return {
        codigo: 'MODERADA_CONCENTRACION',
        etiqueta: 'Mercado Moderadamente Concentrado',
        badge: 'badge-warning',
        descripcion: 'Oligopolio moderado. Varios competidores recurrentes se reparten las adjudicaciones.',
        color: '#f59e0b'
      };
    } else {
      return {
        codigo: 'COMPETITIVO_ATOMIZADO',
        etiqueta: 'Mercado Competitivo y Atomizado',
        badge: 'badge-success',
        descripcion: 'Alta rotación y pluralidad de oferentes. Excelente oportunidad para participar con propuesta técnica sólida.',
        color: '#10b981'
      };
    }
  }

  /**
   * Genera recomendaciones de descuento y competidores para alimentar el Simulador Monte Carlo
   */
  _generarParametrosMonteCarlo({ totalContratos, herfindahl, contratistasList, ticketMediana }) {
    // Estimación del número de proponentes habituales
    const topCount = contratistasList.length;
    let competidoresSugeridos = 6;
    if (topCount > 15) competidoresSugeridos = 8;
    if (topCount > 25) competidoresSugeridos = 10;
    if (herfindahl > 3000) competidoresSugeridos = 4; // Pocos proponentes reales compiten

    // Estrategia de descuento sugerido frente al Presupuesto Oficial (PO)
    // En mercados muy concentrados, el titular no suele arriesgar margen alto (descuento conservador).
    // En mercados competitivos, los descuentos bajan fuertemente.
    let suggestedMinPct = 90.0;
    let suggestedMaxPct = 98.5;
    let suggestedBias = 'down';
    let recomendacionEstrategica = '';

    if (herfindahl > 2500) {
      suggestedMinPct = 94.0;
      suggestedMaxPct = 99.0;
      suggestedBias = 'up';
      recomendacionEstrategica = 'El mercado tiene un contratista dominante que suele ofertar cerca del 96% - 99% del PO. Para ganar, se recomienda ofertar entre el 92% y 94% apuntando a Media con PO o Menor Valor.';
    } else if (herfindahl >= 1500) {
      suggestedMinPct = 91.0;
      suggestedMaxPct = 97.5;
      suggestedBias = 'middle';
      recomendacionEstrategica = 'Competencia moderada. Las ofertas suelen agruparse entre el 93% y 96% del PO. La Media Aritmética Simple o Mediana son métodos frecuentes.';
    } else {
      suggestedMinPct = 88.0;
      suggestedMaxPct = 96.0;
      suggestedBias = 'down';
      recomendacionEstrategica = 'Mercado altamente competido. La dispersión es amplia con agresividad en precio. Se recomienda simular con 8 a 12 competidores.';
    }

    return {
      competidoresSugeridos,
      suggestedMinPct,
      suggestedMaxPct,
      suggestedBias,
      recomendacionEstrategica,
      ticketMedianaRef: ticketMediana
    };
  }

  /**
   * Resuelve un ID de usuario válido para persistencia
   */
  async _resolverUsuarioId(usuarioId) {
    if (usuarioId) return usuarioId;
    const res = await dbPostgres.query(`SELECT id FROM usuarios ORDER BY creado_en ASC LIMIT 1`);
    if (res.rows.length > 0) return res.rows[0].id;
    const nuevo = await dbPostgres.query(`
      INSERT INTO usuarios (email, password_hash, nombre_completo, rol)
      VALUES ('admin@radarsecop.com', '$2b$10$1234567890123456789012345678901234567890123456789012', 'Administrador SaaS', 'ADMIN')
      RETURNING id;
    `);
    return nuevo.rows[0].id;
  }

  /**
   * Obtiene la lista de competidores seguidos por un usuario
   */
  async listarSeguimiento(usuarioId) {
    const uid = await this._resolverUsuarioId(usuarioId);
    const res = await dbPostgres.query(`
      SELECT * FROM competidores_seguimiento
      WHERE usuario_id = $1
      ORDER BY creado_en DESC;
    `, [uid]);
    return res.rows;
  }

  /**
   * Agrega un competidor al radar de seguimiento
   */
  async agregarSeguimiento(usuarioId, { nit, nombre, sector = '', notas = '' }) {
    const uid = await this._resolverUsuarioId(usuarioId);
    const cleanNit = (nit || '').trim();
    const cleanNombre = (nombre || 'COMPETIDOR').trim();
    const res = await dbPostgres.query(`
      INSERT INTO competidores_seguimiento (usuario_id, nit_competidor, nombre_competidor, sector_principal, notas)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (usuario_id, nit_competidor) DO UPDATE SET
        nombre_competidor = EXCLUDED.nombre_competidor,
        sector_principal = EXCLUDED.sector_principal,
        notas = EXCLUDED.notas,
        alerta_activa = true
      RETURNING *;
    `, [uid, cleanNit, cleanNombre, sector, notas]);
    return res.rows[0];
  }

  /**
   * Elimina un competidor del radar de seguimiento
   */
  async eliminarSeguimiento(usuarioId, id) {
    const uid = await this._resolverUsuarioId(usuarioId);
    const res = await dbPostgres.query(`
      DELETE FROM competidores_seguimiento
      WHERE id = $1 AND usuario_id = $2
      RETURNING *;
    `, [id, uid]);
    return res.rowCount > 0;
  }

  /**
   * Consulta el historial específico de un contratista por su NIT
   */
  async obtenerHistorialContratista(nit) {
    const cleanNit = nit.trim().replace(/'/g, "''");
    const queryParams = new URLSearchParams({
      $where: `documento_proveedor = '${cleanNit}'`,
      $order: 'fecha_de_firma DESC',
      $limit: '50'
    });

    const targetUrl = `${this.datasetUrl}?${queryParams.toString()}`;
    const headers = { 'Accept': 'application/json', 'User-Agent': 'RadarSECOP/1.0' };
    if (this.appToken) headers['X-App-Token'] = this.appToken;

    const response = await fetch(targetUrl, { headers });
    if (!response.ok) {
      throw new Error(`Error consultando contratista ${cleanNit}: ${response.statusText}`);
    }

    const data = await response.json();
    let totalAdjudicado = 0;
    const entidades = new Set();

    const contratos = data.map(item => {
      const val = parseFloat(item.valor_del_contrato) || 0;
      totalAdjudicado += val;
      if (item.nombre_entidad) entidades.add(item.nombre_entidad);
      return {
        idContrato: item.id_contrato || item.referencia_del_contrato,
        entidad: item.nombre_entidad,
        departamento: item.departamento,
        ciudad: item.ciudad,
        valor: val,
        objeto: item.objeto_del_contrato,
        modalidad: item.modalidad_de_contratacion,
        tipoContrato: item.tipo_de_contrato,
        fechaFirma: item.fecha_de_firma,
        url: item.urlproceso?.url || item.urlproceso || null
      };
    });

    return {
      nit: cleanNit,
      nombre: data[0]?.proveedor_adjudicado || 'CONTRATISTA',
      totalContratos: data.length,
      montoTotalAdjudicado: totalAdjudicado,
      entidadesContratantes: Array.from(entidades),
      contratos
    };
  }
}

module.exports = new CompetitiveIntelligence();
