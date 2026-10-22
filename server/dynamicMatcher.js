const config = require('./config');
const db = require('./dbPostgres');
const opsFilter = require('./opsFilter');
const notifier = require('./notifier');

class DynamicMatcher {
  /**
   * Construye el filtro SoQL ($where) para Socrata dinámicamente
   * a partir del perfil de búsqueda de una empresa específica.
   */
  buildCompanySoql(perfil, sinceDate = null) {
    const clauses = [];

    // 1. Palabras clave positivas de inclusión (OR entre ellas)
    const keywords = (perfil.palabras_clave_incluir || []).filter(k => k && k.trim().length > 0);
    const unspscCodes = (perfil.codigos_unspsc || []).filter(c => c && c.trim().length > 0);

    const matchConditions = [];
    for (const kw of keywords) {
      const sanitized = kw.trim().toLowerCase().replace(/'/g, "''");
      matchConditions.push(`lower(descripci_n_del_procedimiento) like '%${sanitized}%'`);
      matchConditions.push(`lower(nombre_del_procedimiento) like '%${sanitized}%'`);
    }

    if (unspscCodes.length > 0) {
      const formattedUnspsc = unspscCodes.map(c => `'${c.trim()}'`).join(', ');
      matchConditions.push(`codigo_principal_de_categoria in (${formattedUnspsc})`);
    }

    if (matchConditions.length > 0) {
      clauses.push(`(${matchConditions.join(' or ')})`);
    }

    // 2. Palabras clave negativas de exclusión (AND NOT)
    const excludes = (perfil.palabras_clave_excluir || []).filter(k => k && k.trim().length > 0);
    for (const ex of excludes) {
      const sanitized = ex.trim().toLowerCase().replace(/'/g, "''");
      clauses.push(`not (lower(descripci_n_del_procedimiento) like '%${sanitized}%')`);
      clauses.push(`not (lower(nombre_del_procedimiento) like '%${sanitized}%')`);
    }

    // 3. Exclusiones obligatorias de OPS y personal de planta
    clauses.push("estado_del_procedimiento in ('Publicado', 'Abierto')");
    clauses.push("adjudicado != 'Si'");
    clauses.push("not (lower(justificaci_n_modalidad_de) like '%apoyo a la gesti%')");
    clauses.push("not (lower(justificaci_n_modalidad_de) like '%servicios profesionales%')");
    clauses.push("not (lower(justificaci_n_modalidad_de) like '%personal de planta%')");

    // 4. Filtros de presupuesto si están configurados
    if (perfil.presupuesto_min && parseFloat(perfil.presupuesto_min) > 0) {
      clauses.push(`precio_base >= ${parseFloat(perfil.presupuesto_min)}`);
    }
    if (perfil.presupuesto_max && parseFloat(perfil.presupuesto_max) > 0) {
      clauses.push(`precio_base <= ${parseFloat(perfil.presupuesto_max)}`);
    }

    // 5. Filtros departamentales/geográficos si existen
    const deptos = (perfil.departamentos || []).filter(d => d && d.trim().length > 0);
    if (deptos.length > 0) {
      const formattedDeptos = deptos.map(d => `'${d.trim()}'`).join(', ');
      clauses.push(`departamento_entidad in (${formattedDeptos})`);
    }

    // 6. Filtro incremental de fecha de publicación
    if (sinceDate) {
      clauses.push(`(fecha_de_publicacion_del >= '${sinceDate}' or fecha_de_ultima_publicaci >= '${sinceDate}')`);
    }

    return clauses.join(' and ');
  }

  /**
   * Calcula el puntaje de coincidencia semántica y de palabras clave (0 a 100%)
   */
  evaluateScore(item, perfil) {
    const text = `${item.nombre_del_procedimiento || ''} ${item.descripci_n_del_procedimiento || ''}`.toLowerCase();
    const keywords = perfil.palabras_clave_incluir || [];
    const unspscCodes = perfil.codigos_unspsc || [];

    const matched = [];
    let score = 20; // Base por coincidir con la consulta SODA

    for (const kw of keywords) {
      if (kw && text.includes(kw.toLowerCase())) {
        matched.push(kw);
        score += 25;
      }
    }

    if (item.codigo_principal_de_categoria && unspscCodes.includes(item.codigo_principal_de_categoria)) {
      matched.push(`UNSPSC: ${item.codigo_principal_de_categoria}`);
      score += 30;
    }

    // Bonificación si el presupuesto se ajusta a la capacidad
    if (parseFloat(item.precio_base) > 0) {
      score += 10;
    }

    return {
      score: Math.min(score, 100),
      matched
    };
  }

  /**
   * Ejecuta el escaneo para todas las empresas registradas en PostgreSQL
   */
  async scanForActiveCompanies(sinceDate = null, notifyTelegram = true) {
    // 1. Obtener todas las empresas con sus perfiles de búsqueda
    const companiesRes = await db.query(`
      SELECT e.id as empresa_id, e.razon_social, e.es_propia, pb.* 
      FROM empresas e
      JOIN perfil_busqueda pb ON pb.empresa_id = e.id
      WHERE pb.activo = true AND e.es_propia = true;
    `);

    const companies = companiesRes.rows;
    if (companies.length === 0) {
      console.log('ℹ️ No hay empresas propias con perfiles activos para escanear.');
      return { success: true, count: 0 };
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let totalOportunidadesGuardadas = 0;

    for (const comp of companies) {
      console.log(`📡 [Matching] Consultando oportunidades para: ${comp.razon_social}...`);
      const whereClause = this.buildCompanySoql(comp, sinceDate);

      const params = new URLSearchParams({
        $where: whereClause,
        $order: 'fecha_de_publicacion_del DESC',
        $limit: '40'
      });

      const url = `${config.socrata.secopIIProcesos}?${params.toString()}`;
      const headers = { 'Accept': 'application/json' };
      if (config.socrata.appToken) headers['X-App-Token'] = config.socrata.appToken;

      try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
          console.warn(`Error en Socrata para ${comp.razon_social}: HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();
        console.log(`📦 Recibidos ${data.length} procesos candidatos para ${comp.razon_social}`);

        let notificacionesEnviadas = 0;
        const MAX_ALERTAS_POR_EMPRESA = 3;

        for (const item of data) {
          const id = item.referencia_del_proceso || item.id_del_proceso;
          if (!id) continue;

          // Descartar OPS individuales
          if (opsFilter.isOps(item)) continue;

          // Validar URL directa a OpportunityDetail
          const procesoUrl = item.urlproceso && item.urlproceso.url ? item.urlproceso.url : null;
          if (!procesoUrl || procesoUrl.includes('/STS/Users/Login') || !procesoUrl.includes('OpportunityDetail')) {
            continue;
          }

          const { score, matched } = this.evaluateScore(item, comp);
          if (score < (comp.umbral_score_minimo || 40)) continue;

          const pubRaw = item.fecha_de_publicacion_del || item.fecha_de_ultima_publicaci;
          const fechaPub = pubRaw ? pubRaw.slice(0, 10) : todayStr;

          const cierreRaw = item.fecha_de_recepcion_de || item.fecha_de_apertura_de_respuesta;
          const fechaCierre = cierreRaw ? cierreRaw.slice(0, 10) : null;

          if (fechaCierre && fechaCierre < todayStr) continue;

          // 1. Guardar o actualizar la Oportunidad en PostgreSQL
          await db.query(`
            INSERT INTO oportunidades (
              id, fuente, tipo_proceso, entidad, nit_entidad, departamento, ciudad,
              referencia, id_del_portafolio, nombre, descripcion, fase, estado, modalidad,
              tipo_contrato, precio_base, fecha_publicacion, fecha_cierre, url_proceso
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            ON CONFLICT (id) DO UPDATE SET
              fase = EXCLUDED.fase,
              estado = EXCLUDED.estado,
              fecha_cierre = EXCLUDED.fecha_cierre,
              actualizado_en = CURRENT_TIMESTAMP;
          `, [
            id,
            'SECOP_II',
            item.tipo_de_contrato === 'Convocatoria' ? 'CONVOCATORIA' : 'CONTRATACION',
            item.entidad || 'Entidad no especificada',
            item.nit_entidad || '',
            item.departamento_entidad || '',
            item.ciudad_entidad || '',
            item.referencia_del_proceso || id,
            item.id_del_portafolio || null, // Clave para dmgg-8hin
            item.nombre_del_procedimiento || '',
            item.descripci_n_del_procedimiento || '',
            item.fase || 'Presentación de oferta',
            item.estado_del_procedimiento || 'Publicado',
            item.modalidad_de_contratacion || 'Contratación Pública',
            item.tipo_de_contrato || 'Servicios / Suministro',
            parseFloat(item.precio_base) || 0,
            fechaPub,
            fechaCierre,
            procesoUrl
          ]);

          // 2. Guardar el Match con la Empresa
          const matchRes = await db.query(`
            INSERT INTO oportunidad_empresa_match (
              oportunidad_id, empresa_id, score_relevancia, palabras_clave_match
            )
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (oportunidad_id, empresa_id) DO UPDATE SET
              score_relevancia = EXCLUDED.score_relevancia,
              palabras_clave_match = EXCLUDED.palabras_clave_match
            RETURNING id, notificado_telegram;
          `, [id, comp.empresa_id, score, matched]);

          totalOportunidadesGuardadas++;

          // 3. Notificación a Telegram con blindaje estricto
          const matchRow = matchRes.rows[0];
          const esReciente = fechaPub >= yesterday;
          const bajoLimite = notificacionesEnviadas < MAX_ALERTAS_POR_EMPRESA;

          if (notifyTelegram && comp.notificar_telegram && !matchRow.notificado_telegram && esReciente && bajoLimite) {
            notificacionesEnviadas++;
            console.log(`📢 [Telegram Alerta] ${comp.razon_social} -> ${id}`);

            await notifier.notifyOportunidad({
              id,
              referencia: item.referencia_del_proceso || id,
              entidad: item.entidad,
              ciudad: item.ciudad_entidad,
              departamento: item.departamento_entidad,
              nombre: item.nombre_del_procedimiento,
              descripcion: item.descripci_n_del_procedimiento,
              precio_base: parseFloat(item.precio_base) || 0,
              score_relevancia: score,
              palabras_clave_match: matched,
              tipo_proceso: item.tipo_de_contrato === 'Convocatoria' ? 'CONVOCATORIA' : 'CONTRATACION',
              fecha_publicacion: fechaPub,
              fecha_cierre: fechaCierre,
              url: procesoUrl,
              perfil: comp.razon_social.includes('CERABELA') ? 'CERABELA' : 'NIKADU_IA'
            });

            await db.query(`UPDATE oportunidad_empresa_match SET notificado_telegram = true WHERE id = $1`, [matchRow.id]);
            await new Promise(r => setTimeout(r, 1200));
          }
        }
      } catch (err) {
        console.error(`Error procesando escaneo para ${comp.razon_social}:`, err.message);
      }
    }

    return { success: true, guardadas: totalOportunidadesGuardadas };
  }
}

module.exports = new DynamicMatcher();
