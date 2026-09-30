const config = require('./config');
const db = require('./database');
const notifier = require('./notifier');
const fondoEmprender = require('./fondoEmprender');
const sourcesCatalog = require('./sources');

class Scanner {
  constructor() {
    this.isScanning = false;
  }

  // Normaliza texto eliminando tildes y caracteres extraños para comparación
  normalizeText(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Clasifica dinámicamente un proceso de SECOP II en CONVOCATORIA (abierta/competitiva) o CONTRATACION (directa)
  classifyTipoProceso(item) {
    const mod = this.normalizeText(item.modalidad_de_contratacion || '');
    const title = this.normalizeText(item.nombre_del_procedimiento || '');
    const desc = this.normalizeText(item.descripci_n_del_procedimiento || '');
    const fullText = `${title} ${desc}`;

    // Modalidades de contratación que son por naturaleza convocatorias públicas abiertas
    const isConvModalidad = [
      'licitacion publica',
      'concurso de meritos',
      'solicitud de informacion a los proveedores',
      'seleccion abreviada',
      'con ofertas'
    ].some(m => mod.includes(m));

    // Términos explícitos en título u objeto que denotan convocatorias, concursos o fondos
    const isConvKeywords = [
      'convocatoria', 'concurso', 'fomento', 'subvencion',
      'estimulo', 'banco de proyectos', 'manifestacion de interes',
      'feria artesanal', 'salon de artesanias', 'invitacion publica a oferentes'
    ].some(k => fullText.includes(k));

    if (isConvModalidad || isConvKeywords) {
      return 'CONVOCATORIA';
    }
    return 'CONTRATACION';
  }

  // 1. Calcula score de relevancia para NIKADU IA (Inteligencia Artificial, Agentes & Automatización)
  calculateRelevanceNikadu(title, description, categoryCode) {
    const combined = this.normalizeText(`${title} ${description}`);
    const cfg = config.profiles.NIKADU_IA;

    // Términos tecnológicos estrictos
    const techTerms = [
      'software', 'tecnologia', 'sistema', 'computo', 'plataforma', 'digital',
      'algoritmo', 'datos', 'informacion', 'inteligente', 'desarrollo de software',
      'desarrollo de sistemas', 'desarrollo tecnologico', 'desarrollo de aplicaciones',
      'desarrollo web', 'desarrollo informatico', 'inteligencia artificial', 'machine learning'
    ];
    const hasTechContext = techTerms.some(t => combined.includes(t));

    // Filtro negativo exhaustivo de falsos positivos no tecnológicos
    const negativeTerms = [
      'agente de transito', 'agentes de transito', 'agente vial', 'agentes viales',
      'regulacion del transito', 'regulador de transito', 'seguridad vial',
      'tienda escolar', 'servicios funerarios', 'vigilancia privada',
      'agente educativo', 'agente psicosocial', 'agente de salud', 'agentes comunitarios',
      'agente de policia', 'agente aduanero', 'agente de viajes', 'higienista oral',
      'enfermeria', 'auxiliar de enfermeria', 'odontologia', 'farmaceutico',
      'medicamentos', 'carpas', 'sillas plasticas', 'alimentos', 'transporte escolar',
      'limpieza y aseo'
    ];

    const hasNegative = negativeTerms.some(term => combined.includes(term));
    const hasPureAi = combined.includes('inteligencia artificial') || combined.includes('machine learning') || combined.includes('ia generativa');

    if (hasNegative && !hasPureAi) {
      return { score: 0, matched: [] };
    }

    const matched = [];
    let score = 0;

    // RPA (Robotic Process Automation) con verificación contextual
    if (/\brpa\b/i.test(combined) && (combined.includes('robotic') || combined.includes('automatiz') || combined.includes('uipath') || combined.includes('software') || combined.includes('power automate') || combined.includes('blue prism'))) {
      matched.push('rpa');
      score += 45;
    }

    // Agentes de IA
    const agentAiPatterns = [
      'agente de ia', 'agentes de ia', 'agente inteligente', 'agentes inteligentes',
      'agente virtual', 'agentes virtuales', 'agente autonomo', 'agentes autonomos',
      'agente conversacional', 'agentes conversacionales', 'ai agent', 'ai agents'
    ];
    if (agentAiPatterns.some(p => combined.includes(p)) || (/\bagente\b/i.test(combined) && (combined.includes('inteligencia artificial') || combined.includes('ia generativa') || combined.includes('machine learning') || combined.includes('modelo de lenguaje') || combined.includes('chatbot')))) {
      matched.push('agente de ia');
      score += 45;
    }

    // Inteligencia Artificial y Machine Learning
    if (combined.includes('inteligencia artificial') || combined.includes('ia generativa') || combined.includes('machine learning') || combined.includes('aprendizaje automatico')) {
      if (!matched.includes('inteligencia artificial')) matched.push('inteligencia artificial');
      score = Math.max(score, 85);
    }

    // Chatbots / LLM
    if (/\b(chatbot|chatbots|bot conversacional|llm)\b/i.test(combined)) {
      matched.push('chatbot');
      score = Math.max(score, 75);
    }

    // Automatizaciones tecnológicas
    if (combined.includes('automatizacion de procesos') || combined.includes('automatizaciones')) {
      if (hasTechContext) {
        matched.push('automatizacion de procesos');
        score = Math.max(score, 70);
      }
    } else if (combined.includes('automatizacion') && hasTechContext) {
      matched.push('automatizacion');
      score = Math.max(score, 50);
    }

    // Desarrollos y Software a la Medida
    if (combined.includes('desarrollo a la medida') || combined.includes('desarrollos a la medida') || combined.includes('software a la medida') || combined.includes('a la medida')) {
      if (hasTechContext || combined.includes('software') || combined.includes('sistema') || combined.includes('aplicacion')) {
        matched.push('desarrollo a la medida');
        score = Math.max(score, 85);
      }
    }

    // Fábrica y desarrollo de software
    if (combined.includes('desarrollo de software') || combined.includes('fabrica de software')) {
      matched.push('desarrollo de software');
      score = Math.max(score, 80);
    } else if (/\bsoftware\b/i.test(combined)) {
      matched.push('software');
      score = Math.max(score, 50);
    }

    // Desarrollo de aplicaciones (móviles / web)
    if (combined.includes('desarrollo de aplicaciones') || combined.includes('aplicaciones moviles') || combined.includes('aplicacion movil') || combined.includes('aplicaciones web') || combined.includes('aplicacion web')) {
      matched.push('desarrollo de aplicaciones');
      score = Math.max(score, 80);
    } else if (/\b(aplicaciones|aplicacion)\b/i.test(combined) && hasTechContext) {
      matched.push('aplicaciones');
      score = Math.max(score, 55);
    }

    // APP / APPS (con límite de palabra estricto)
    if (/\b(app|apps)\b/i.test(combined) && (hasTechContext || combined.includes('movil') || combined.includes('web') || combined.includes('dispositivo') || combined.includes('celular') || combined.includes('usuario'))) {
      matched.push('app');
      score = Math.max(score, 75);
    }

    // Palabras de alta relevancia del config
    for (const kw of cfg.keywords.high) {
      const normKw = this.normalizeText(kw);
      if (normKw === 'rpa' || normKw === 'ia' || normKw.includes('agente') || normKw.includes('inteligencia artificial')) continue;
      if (combined.includes(normKw) && !matched.includes(kw)) {
        matched.push(kw);
        score += 35;
      }
    }

    // Palabras de media relevancia
    for (const kw of cfg.keywords.medium) {
      const normKw = this.normalizeText(kw);
      if (combined.includes(normKw) && !matched.includes(kw) && hasTechContext) {
        matched.push(kw);
        score += 20;
      }
    }

    if (categoryCode && cfg.unspscCodes.some(c => categoryCode.includes(c))) {
      score += 15;
    }

    return {
      score: Math.min(score, 100),
      matched
    };
  }

  // 2. Calcula score de relevancia para CERABELA (Velas Artesanales Hechas a Mano)
  calculateRelevanceCerabela(title, description, categoryCode) {
    const combined = this.normalizeText(`${title} ${description}`);
    const cfg = config.profiles.CERABELA;

    // Filtro negativo exhaustivo (pesca artesanal, veleros, apellidos Velasquez/Velasco, patología hospitalaria, recordatorios por whatsapp)
    const negativeTerms = [
      'pesca artesanal', 'deportes a vela', 'embarcacion a vela', 'velero', 'veleros',
      'velasquez', 'velasco', 'velandia', 'alumbrado publico de luminarias',
      'redes electricas', 'postes de alumbrado', 'luminarias viales',
      'recordatorios por whatsapp', 'recordatorio por whatsapp', 'recordatorio de citas',
      'recordatorios de citas', 'recordatorio de pago', 'recordatorios de pago',
      'biopsia', 'biopsias', 'patologia', 'histologia', 'corte de tejido',
      'patrullaje', 'lanchas'
    ];

    if (negativeTerms.some(term => combined.includes(term))) {
      return { score: 0, matched: [] };
    }

    const matched = [];
    let score = 0;

    // Palabras de alta relevancia: velas, velones, hecho a mano, ceras, etc.
    const candleRegex = /\b(vela|velas|velon|velones)\b/i;
    if (candleRegex.test(combined)) {
      matched.push('velas');
      score += 55;
    }

    if (/\b(cera de abejas|cera de soya|cera de palma|parafina)\b/i.test(combined)) {
      matched.push('cera artesanal');
      score += 50;
    }

    if (combined.includes('hecho a mano')) {
      matched.push('hecho a mano');
      score += 40;
    }

    if (combined.includes('artesanias de colombia')) {
      matched.push('artesanias de colombia');
      score = Math.max(score, 80);
    }

    // Palabras de alta del config
    for (const kw of cfg.keywords.high) {
      const normKw = this.normalizeText(kw);
      if (['vela', 'velas', 'velon', 'velones', 'cera de abejas', 'cera de soya', 'hecho a mano', 'artesanias de colombia'].includes(normKw)) continue;
      if (combined.includes(normKw) && !matched.includes(kw)) {
        matched.push(kw);
        score += 35;
      }
    }

    // Palabras de media relevancia (artesanías, ferias, souvenirs, obsequios)
    for (const kw of cfg.keywords.medium) {
      const normKw = this.normalizeText(kw);
      if (combined.includes(normKw) && !matched.includes(kw)) {
        matched.push(kw);
        score += 25;
      }
    }

    if (categoryCode && cfg.unspscCodes.some(c => categoryCode.includes(c))) {
      score += 20;
    }

    if (/\b(velas|velon|velones|cera de abejas|cera de soya|fabricacion de velas)\b/i.test(combined)) {
      score = Math.max(score, 85);
    }

    return {
      score: Math.min(score, 100),
      matched
    };
  }

  // Construye la cláusula SoQL $where para un perfil EXCLUSIVAMENTE CON PROCESOS ACTIVOS
  buildSoqlWhere(profileKey, hoursBack = null) {
    let likeConditions = '';
    if (profileKey === 'CERABELA') {
      likeConditions = `(lower(descripci_n_del_procedimiento) like '%velas%' or lower(descripci_n_del_procedimiento) like '%velones%' or lower(descripci_n_del_procedimiento) like '%artesani%' or lower(descripci_n_del_procedimiento) like '%hecho a mano%' or lower(descripci_n_del_procedimiento) like '%cera de %' or lower(descripci_n_del_procedimiento) like '%parafina%' or lower(descripci_n_del_procedimiento) like '%obsequios%' or lower(descripci_n_del_procedimiento) like '%souvenirs%' or lower(descripci_n_del_procedimiento) like '%recordatorios%' or lower(nombre_del_procedimiento) like '%velas%' or lower(nombre_del_procedimiento) like '%artesani%') and not (lower(descripci_n_del_procedimiento) like '%pesca%')`;
    } else {
      const profile = config.profiles[profileKey];
      const searchTerms = profile.soqlTerms;
      likeConditions = searchTerms.map(term => 
        `lower(descripci_n_del_procedimiento) like '%${term}%' or lower(nombre_del_procedimiento) like '%${term}%'`
      ).join(' or ');
      likeConditions = `(${likeConditions})`;
    }

    // Filtrar estrictamente: solo procesos Publicados o Abiertos, NO adjudicados
    let whereClause = `${likeConditions} and estado_del_procedimiento in ('Publicado', 'Abierto') and adjudicado != 'Si'`;

    if (hoursBack) {
      const pastDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
      whereClause += ` and (fecha_de_publicacion_del >= '${pastDate}' or fecha_de_ultima_publicaci >= '${pastDate}')`;
    }

    return whereClause;
  }

  // Ejecuta escaneo en SECOP II para un perfil determinado con validación rigurosa de URLs
  async scanSECOPIIForProfile(profileKey, limit = 80, hoursBack = null) {
    let nuevosContador = 0;
    let totalRevisados = 0;
    const todayStr = new Date().toISOString().slice(0, 10);

    try {
      const whereClause = this.buildSoqlWhere(profileKey, hoursBack);
      const params = new URLSearchParams({
        $where: whereClause,
        $order: 'id_del_proceso DESC',
        $limit: String(limit)
      });

      const url = `${config.socrata.secopIIProcesos}?${params.toString()}`;
      console.log(`📡 [${profileKey}] Consultando SECOP II activos: ${url}`);

      const headers = { 'Accept': 'application/json' };
      if (config.socrata.appToken) {
        headers['X-App-Token'] = config.socrata.appToken;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Error en API datos.gov.co: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      totalRevisados = data.length;

      console.log(`📦 [${profileKey}] Procesos activos recibidos de SECOP II: ${totalRevisados}`);

      for (const item of data) {
        const id = item.referencia_del_proceso || item.id_del_proceso;
        if (!id) continue;

        // VALIDACIÓN CRÍTICA DE URL: Solo aceptar enlaces directos al pliego público OpportunityDetail
        const procesoUrl = item.urlproceso && item.urlproceso.url ? item.urlproceso.url : null;
        if (!procesoUrl || procesoUrl.includes('/STS/Users/Login') || !procesoUrl.includes('OpportunityDetail')) {
          continue;
        }

        const title = item.nombre_del_procedimiento || '';
        const description = item.descripci_n_del_procedimiento || '';
        const category = item.codigo_principal_de_categoria || '';

        // Calcular relevancia según perfil
        let score = 0;
        let matched = [];

        if (profileKey === 'CERABELA') {
          const resCerabela = this.calculateRelevanceCerabela(title, description, category);
          score = resCerabela.score;
          matched = resCerabela.matched;
        } else {
          const resNikadu = this.calculateRelevanceNikadu(title, description, category);
          score = resNikadu.score;
          matched = resNikadu.matched;
        }

        if (score > 0 || matched.length > 0) {
          // Extraer fechas reales
          const pubRaw = item.fecha_de_publicacion_del || item.fecha_de_ultima_publicaci || item.fecha_de_publicacion_fase_3;
          const fechaPub = pubRaw ? pubRaw.slice(0, 10) : todayStr;

          const cierreRaw = item.fecha_de_recepcion_de || item.fecha_de_apertura_de_respuesta || item.fecha_de_apertura_efectiva || item.fecha_hora_de_cierre_de_recepci_n_de_ofertas;
          const fechaCierre = cierreRaw ? cierreRaw.slice(0, 10) : null;

          // Si tiene fecha de cierre y ya expiró, DESCARTAR
          if (fechaCierre && fechaCierre < todayStr) {
            continue;
          }

          // Descartar procesos viejos previos a 2025 si no tienen fecha de cierre futura
          if (fechaPub < '2025-01-01' && (!fechaCierre || fechaCierre < todayStr)) {
            continue;
          }

          // Clasificación dinámica del tipo de proceso (CONVOCATORIA vs CONTRATACION)
          const tipoProceso = this.classifyTipoProceso(item);

          const oportunidad = {
            id,
            fuente: 'SECOP_II',
            perfil: profileKey,
            tipo_proceso: tipoProceso,
            entidad: item.entidad || 'Entidad no especificada',
            nit_entidad: item.nit_entidad || '',
            departamento: item.departamento_entidad || '',
            ciudad: item.ciudad_entidad || '',
            referencia: item.referencia_del_proceso || id,
            nombre: title,
            descripcion: description !== 'No definido' ? description : title,
            fase: item.fase || 'Presentación de oferta',
            estado: item.estado_del_procedimiento || 'Publicado',
            modalidad: item.modalidad_de_contratacion || 'Contratación Pública',
            tipo_contrato: item.tipo_de_contrato || 'Servicios / Suministro',
            precio_base: parseFloat(item.precio_base) || 0,
            fecha_publicacion: fechaPub,
            fecha_cierre: fechaCierre,
            url: procesoUrl,
            score_relevancia: score,
            palabras_clave_match: matched
          };

          const result = db.saveOportunidad(oportunidad);
          if (result.isNew) {
            nuevosContador++;
            console.log(`✨ [${profileKey} - ${tipoProceso}] Nueva: [${score}%] ${id} - ${item.entidad}`);
            if (score >= 65) {
              await notifier.notifyOportunidad(oportunidad);
            }
          }
        }
      }

      return { success: true, nuevos: nuevosContador, total: totalRevisados };
    } catch (error) {
      console.error(`❌ Error en escaneo SECOP II para ${profileKey}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Escaneo integral horario de todos los perfiles y fuentes
  async runScheduledScan() {
    if (this.isScanning) {
      console.log('⏳ Escaneo en progreso, omitiendo ejecución simultánea.');
      return { success: false, message: 'Escaneo en curso' };
    }

    this.isScanning = true;
    const startTime = Date.now();
    console.log(`⏰ [${new Date().toLocaleTimeString('es-CO')}] Iniciando escáner integral (NIKADU IA & CERABELA)...`);

    try {
      // 0. Depurar oportunidades cerradas o con enlaces inválidos de la base de datos
      db.purgeOldClosed();

      // 1. Escanear SECOP II para NIKADU IA (Contrataciones y convocatorias activas)
      const nikaduRes = await this.scanSECOPIIForProfile('NIKADU_IA', 100, null);

      // 2. Escanear SECOP II para CERABELA (Contrataciones y convocatorias activas de velas y artesanías)
      const cerabelaRes = await this.scanSECOPIIForProfile('CERABELA', 100, null);

      // 3. Escanear Fondo Emprender en fondoemprender.com (solo convocatorias vigentes con enlaces puntuales)
      let feRes = { nuevos: 0, total: 0 };
      try {
        feRes = await fondoEmprender.scanFondoEmprender();
      } catch (feErr) {
        console.warn('⚠️ Error en escáner de Fondo Emprender:', feErr.message);
      }

      const totalNuevos = (nikaduRes.nuevos || 0) + (cerabelaRes.nuevos || 0) + (feRes.nuevos || 0);
      const totalRevisados = (nikaduRes.total || 0) + (cerabelaRes.total || 0) + (feRes.total || 0);
      const duracion = Date.now() - startTime;

      db.logScan({
        nuevos: totalNuevos,
        total: totalRevisados,
        duracion,
        estado: 'OK',
        mensaje: `Escaneo completado. ${totalNuevos} nuevos (NIKADU: ${nikaduRes.nuevos || 0}, CERABELA: ${cerabelaRes.nuevos || 0}, FE: ${feRes.nuevos || 0}).`
      });

      return {
        success: true,
        nuevos: totalNuevos,
        total: totalRevisados,
        duracionMs: duracion,
        nikadu: nikaduRes,
        cerabela: cerabelaRes,
        fondoEmprender: feRes
      };
    } finally {
      this.isScanning = false;
    }
  }
}

module.exports = new Scanner();
