const config = require('./config');
const dbPostgres = require('./dbPostgres');
const pipelineManager = require('./pipelineManager');

class PredictiveEngine {
  constructor() {
    this.datasetUrl = config.socrata?.secopIIContratos || 'https://www.datos.gov.co/resource/jbjy-vk9h.json';
    this.appToken = config.socrata?.appToken || null;
  }

  /**
   * Resuelve el ID del usuario actual o demo para persistencia
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
   * Genera clave única para almacenamiento en caché
   */
  _generarCacheKey(criterios) {
    const parts = [];
    if (criterios.perfil) parts.push(`PERFIL:${criterios.perfil.trim().toUpperCase()}`);
    if (criterios.entidad) parts.push(`ENTIDAD:${criterios.entidad.trim().toUpperCase()}`);
    if (criterios.palabraClave) parts.push(`KEYWORD:${criterios.palabraClave.trim().toUpperCase()}`);
    if (parts.length === 0) return { tipo: 'GENERAL', valor: 'GLOBAL' };
    return {
      tipo: parts.length === 1 ? parts[0].split(':')[0] : 'MIXTO',
      valor: parts.join(' | ')
    };
  }

  /**
   * Obtiene y clasifica los contratos de SECOP II próximos a vencer
   */
  async obtenerVencimientos({
    perfil = 'NIKADU_IA',
    entidad = '',
    palabraClave = '',
    diasHorizonte = 90,
    minValor = 20000000,
    limit = 100,
    forceRefresh = false
  }) {
    const dias = parseInt(diasHorizonte, 10) || 90;
    const cleanLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 10), 300);
    const cacheInfo = this._generarCacheKey({ perfil, entidad, palabraClave });

    // 1. Revisar caché en PostgreSQL (vigencia de 12 horas)
    if (!forceRefresh) {
      try {
        const cacheRes = await dbPostgres.query(`
          SELECT * FROM alertas_vencimientos_cache
          WHERE criterio_tipo = $1 AND criterio_valor = $2 AND dias_horizonte = $3
            AND actualizado_en >= NOW() - INTERVAL '12 hours'
          ORDER BY actualizado_en DESC LIMIT 1;
        `, [cacheInfo.tipo, cacheInfo.valor, dias]);

        if (cacheRes.rows.length > 0) {
          const row = cacheRes.rows[0];
          return {
            source: 'CACHE_POSTGRES',
            criterio: { tipo: row.criterio_tipo, valor: row.criterio_valor, diasHorizonte: row.dias_horizonte },
            totalContratos: row.total_contratos,
            montoTotal: Number(row.monto_total),
            contratos: row.contratos,
            resumenEntidades: row.resumen_entidades,
            actualizadoEn: row.actualizado_en
          };
        }
      } catch (err) {
        console.warn('⚠️ Error al leer caché de alertas predictivas:', err.message);
      }
    }

    // 2. Definir ventana temporal de búsqueda
    const now = new Date();
    // Permitir incluir contratos vencidos hace hasta 15 días (donde aún la entidad no ha adjudicado el nuevo proceso)
    const past15 = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const futureDate = new Date(now.getTime() + dias * 24 * 60 * 60 * 1000);

    const fromDateStr = past15.toISOString().slice(0, 10);
    const toDateStr = futureDate.toISOString().slice(0, 10);

    // 3. Construir filtros SoQL
    const conditions = [
      `fecha_de_fin_del_contrato between '${fromDateStr}T00:00:00.000' and '${toDateStr}T23:59:59.000'`,
      `valor_del_contrato >= ${Number(minValor) || 20000000}`,
      `(tipo_de_contrato != 'Prestación de servicios' or tipodocproveedor != 'Cédula de Ciudadanía' or valor_del_contrato > 80000000)`
    ];

    if (entidad && entidad.trim().length > 0) {
      const cleanEntidad = entidad.trim().toUpperCase().replace(/'/g, "''");
      conditions.push(`upper(nombre_entidad) like '%${cleanEntidad}%'`);
    }

    if (palabraClave && palabraClave.trim().length > 0) {
      const cleanWord = palabraClave.trim().toUpperCase().replace(/'/g, "''");
      conditions.push(`(upper(objeto_del_contrato) like '%${cleanWord}%' or upper(descripcion_del_proceso) like '%${cleanWord}%')`);
    } else {
      // Filtrar según perfil
      if (perfil === 'CERABELA') {
        conditions.push(`(lower(objeto_del_contrato) like '%artesani%' or lower(objeto_del_contrato) like '%velas%' or lower(objeto_del_contrato) like '%souvenirs%' or lower(objeto_del_contrato) like '%obsequios%')`);
      } else {
        // NIKADU IA - Tecnología, Software, IA, Cloud
        const techTerms = ['software', 'inteligencia artificial', 'computo', 'tecnolog', 'sistemas', 'datos', 'nube', 'cloud', 'interoperabilidad', 'desarrollo'];
        const orClauses = techTerms.map(t => `lower(objeto_del_contrato) like '%${t}%'`).join(' or ');
        conditions.push(`(${orClauses})`);
      }
    }

    const whereClause = conditions.join(' and ');
    const queryParams = new URLSearchParams({
      $where: whereClause,
      $order: 'fecha_de_fin_del_contrato ASC',
      $limit: String(cleanLimit)
    });

    const targetUrl = `${this.datasetUrl}?${queryParams.toString()}`;
    console.log(`⏳ [Predictivo Vencimientos] Consultando contratos en SECOP II: ${targetUrl}`);

    const headers = { 'Accept': 'application/json', 'User-Agent': 'RadarSECOP/1.0' };
    if (this.appToken) headers['X-App-Token'] = this.appToken;

    const response = await fetch(targetUrl, { headers });
    if (!response.ok) {
      throw new Error(`Error en Socrata jbjy-vk9h (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Respuesta inválida recibida desde SECOP II');
    }

    // 4. Analizar, calcular urgencia y estructurar oportunidades tempranas
    let montoTotal = 0;
    const entidadesMap = new Map();
    const contratosProcesados = [];

    data.forEach((item, idx) => {
      const val = parseFloat(item.valor_del_contrato) || 0;
      montoTotal += val;

      const fechaFinStr = item.fecha_de_fin_del_contrato ? item.fecha_de_fin_del_contrato.slice(0, 10) : '';
      const fechaFin = item.fecha_de_fin_del_contrato ? new Date(item.fecha_de_fin_del_contrato) : now;
      const diffMs = fechaFin.getTime() - now.getTime();
      const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Clasificación de Urgencia y Ventana de Acción
      let urgencia = {
        codigo: 'TEMPRANA',
        etiqueta: 'Planificación Temprana (>60d)',
        color: '#10b981',
        badge: 'badge-success',
        estrategia: 'Tiempo óptimo para alianzas, consorcios y calibración de RUP.'
      };

      if (diasRestantes <= 0) {
        urgencia = {
          codigo: 'EXPIRADO_RECIENTE',
          etiqueta: 'Finalizado Recientemente',
          color: '#f43f5e',
          badge: 'badge-danger',
          estrategia: 'El contrato venció. El nuevo proceso debe estar adjudicándose o en estructuración urgente.'
        };
      } else if (diasRestantes <= 30) {
        urgencia = {
          codigo: 'CRITICA',
          etiqueta: 'Vencimiento Inminente (<30d)',
          color: '#ef4444',
          badge: 'badge-danger',
          estrategia: 'Licitación en estructuración previa o cotizaciones. Solicitar pliegos borrador ya.'
        };
      } else if (diasRestantes <= 60) {
        urgencia = {
          codigo: 'ALTA',
          etiqueta: 'Ventana Estratégica (30-60d)',
          color: '#f59e0b',
          badge: 'badge-warning',
          estrategia: 'Ventana para presentar portafolio a estructuradores técnicos de la entidad.'
        };
      }

      // Certeza de que habrá nueva licitación (o si pueden prorrogar)
      const esProrrogable = (item.el_contrato_puede_ser_prorrogado || 'No').trim().toLowerCase() === 'si';
      const diasAdicionados = parseInt(item.dias_adicionados, 10) || 0;

      let certezaNuevaLicitacion = {
        nivel: 'ALTA',
        probabilidad: 92,
        razon: 'El contrato NO es prorrogable legalmente. La entidad debe convocar nuevo proceso de selección.'
      };

      if (esProrrogable && diasAdicionados < 120) {
        certezaNuevaLicitacion = {
          nivel: 'MEDIA',
          probabilidad: 60,
          razon: 'El contrato es prorrogable. Existe probabilidad de adición antes de abrir nueva licitación.'
        };
      } else if (diasAdicionados >= 120) {
        certezaNuevaLicitacion = {
          nivel: 'MUY_ALTA',
          probabilidad: 98,
          razon: 'Ya superó más de 120 días adicionados (tope máximo Ley 80/1993 Art. 40). Es forzosa una nueva licitación.'
        };
      }

      // Agrupar por Entidad
      const entName = item.nombre_entidad || 'ENTIDAD PUBLICA';
      entidadesMap.set(entName, (entidadesMap.get(entName) || 0) + val);

      contratosProcesados.push({
        idContrato: item.id_contrato || item.referencia_del_contrato || `VENC-${idx}`,
        entidad: entName,
        departamento: item.departamento || 'Colombia',
        ciudad: item.ciudad || '',
        objeto: item.objeto_del_contrato || 'Sin descripción',
        valor: val,
        proveedorActual: item.proveedor_adjudicado || 'CONTRATISTA ACTUAL',
        nitProveedor: item.documento_proveedor || item.codigo_proveedor || 'SIN_NIT',
        fechaInicio: item.fecha_de_inicio_del_contrato ? item.fecha_de_inicio_del_contrato.slice(0, 10) : '',
        fechaFin: fechaFinStr,
        diasRestantes,
        esProrrogable,
        diasAdicionados,
        modalidad: item.modalidad_de_contratacion,
        tipoContrato: item.tipo_de_contrato,
        urgencia,
        certezaNuevaLicitacion,
        url: item.urlproceso?.url || item.urlproceso || null
      });
    });

    // Ranking de Entidades con más presupuesto en vencimiento
    const resumenEntidades = Array.from(entidadesMap.entries())
      .map(([nombre, monto]) => ({ nombre, monto }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 8);

    const resultado = {
      source: 'SOCRATA_LIVE',
      criterio: { ...cacheInfo, diasHorizonte: dias },
      totalContratos: contratosProcesados.length,
      montoTotal,
      contratos: contratosProcesados,
      resumenEntidades,
      actualizadoEn: new Date().toISOString()
    };

    // 5. Guardar en PostgreSQL
    try {
      await dbPostgres.query(`
        INSERT INTO alertas_vencimientos_cache (
          criterio_tipo, criterio_valor, dias_horizonte, total_contratos,
          monto_total, contratos, resumen_entidades, actualizado_en
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (criterio_tipo, criterio_valor, dias_horizonte) DO UPDATE SET
          total_contratos = EXCLUDED.total_contratos,
          monto_total = EXCLUDED.monto_total,
          contratos = EXCLUDED.contratos,
          resumen_entidades = EXCLUDED.resumen_entidades,
          actualizado_en = NOW();
      `, [
        cacheInfo.tipo,
        cacheInfo.valor,
        dias,
        resultado.totalContratos,
        resultado.montoTotal,
        JSON.stringify(resultado.contratos),
        JSON.stringify(resultado.resumenEntidades)
      ]);
    } catch (saveErr) {
      console.warn('⚠️ No se pudo guardar caché de vencimientos:', saveErr.message);
    }

    return resultado;
  }

  /**
   * Incorpora un contrato por vencer directamente al Pipeline Kanban como oportunidad temprana
   */
  async incorporarAlPipeline(usuarioId, { idContrato, entidad, objeto, valor, fechaFin, proveedorActual, nitProveedor, empresaId = null }) {
    const uid = await this._resolverUsuarioId(usuarioId);

    // Si no se proporcionó empresaId, tomar la primera empresa activa
    let empId = empresaId;
    if (!empId) {
      const empRes = await dbPostgres.query(`SELECT id FROM empresas ORDER BY creado_en ASC LIMIT 1`);
      empId = empRes.rows[0]?.id || 1;
    }

    const nuevoProceso = await pipelineManager.addProceso({
      empresa_id: empId,
      proceso_referencia: `VENC-${idContrato}`,
      entidad: entidad,
      objeto: `[Oportunidad Temprana por Vencimiento] ${objeto} (Titular actual: ${proveedorActual} - NIT: ${nitProveedor})`,
      presupuesto: valor,
      fecha_cierre: fechaFin,
      fase: 'IDENTIFICADO',
      probabilidad_exito: 40,
      responsable: 'Comercial / Licitador',
      observaciones: `Contrato por vencer el ${fechaFin}. Incumbent actual a desplazar: ${proveedorActual} (NIT: ${nitProveedor}).`
    });

    return nuevoProceso;
  }

  /**
   * Lista contratos en seguimiento de vencimiento por el usuario
   */
  async listarSeguimiento(usuarioId) {
    const uid = await this._resolverUsuarioId(usuarioId);
    const res = await dbPostgres.query(`
      SELECT * FROM vencimientos_seguimiento
      WHERE usuario_id = $1
      ORDER BY fecha_fin ASC;
    `, [uid]);
    return res.rows;
  }

  /**
   * Agrega un contrato por vencer a la lista de seguimiento del usuario
   */
  async agregarSeguimiento(usuarioId, data) {
    const uid = await this._resolverUsuarioId(usuarioId);
    const { idContrato, entidad, objeto, valorContrato, fechaFin, proveedorActual, nitProveedor, esProrrogable, diasAdicionados, urlSecop, notas } = data;

    const res = await dbPostgres.query(`
      INSERT INTO vencimientos_seguimiento (
        usuario_id, id_contrato, entidad, objeto, valor_contrato,
        fecha_fin, proveedor_actual, nit_proveedor, es_prorrogable,
        dias_adicionados, url_secop, notas
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (usuario_id, id_contrato) DO UPDATE SET
        entidad = EXCLUDED.entidad,
        objeto = EXCLUDED.objeto,
        valor_contrato = EXCLUDED.valor_contrato,
        fecha_fin = EXCLUDED.fecha_fin,
        proveedor_actual = EXCLUDED.proveedor_actual,
        nit_proveedor = EXCLUDED.nit_proveedor,
        notas = EXCLUDED.notas,
        alerta_activa = true
      RETURNING *;
    `, [
      uid, idContrato, entidad, objeto, valorContrato || 0,
      fechaFin, proveedorActual, nitProveedor, esProrrogable || false,
      diasAdicionados || 0, urlSecop, notas || ''
    ]);

    return res.rows[0];
  }

  /**
   * Elimina un contrato en seguimiento
   */
  async eliminarSeguimiento(usuarioId, id) {
    const uid = await this._resolverUsuarioId(usuarioId);
    const res = await dbPostgres.query(`
      DELETE FROM vencimientos_seguimiento
      WHERE id = $1 AND usuario_id = $2
      RETURNING *;
    `, [id, uid]);
    return res.rowCount > 0;
  }
}

module.exports = new PredictiveEngine();
