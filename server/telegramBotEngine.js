/**
 * ====================================================================
 * RADAR SECOP - MOTOR DE TELEGRAM BOT & NOTIFICACIONES PUSH EN TIEMPO REAL
 * Marco Normativo:
 * - Ley 1882 de 2018 (Publicidad obligatoria de Adendas con antelación mínima de 3 días)
 * - Ley 80 de 1993 y Ley 1150 de 2007 (Términos perentorios de traslado e informes)
 * - Decreto 1082 de 2015 (Garantías contractuales, vigencias y amparos obligatorios)
 * ====================================================================
 */

const dbPostgres = require('./dbPostgres');
const config = require('./config');
const dbSqlite = require('./database');

class TelegramBotEngine {
  constructor() {
    this.botToken = config.telegram ? config.telegram.botToken : '';
    this.defaultChatId = config.telegram ? config.telegram.chatId : '';
  }

  /**
   * Obtiene las credenciales del bot (con fallback a SQLite y .env)
   */
  getBotCredentials() {
    let token = this.botToken;
    let chat = this.defaultChatId;

    try {
      token = dbSqlite.getConfig('telegram_bot_token', token);
      chat = dbSqlite.getConfig('telegram_chat_id', chat);
    } catch (_) {}

    return {
      botToken: token || process.env.TELEGRAM_BOT_TOKEN || '',
      defaultChatId: chat || process.env.TELEGRAM_CHAT_ID || ''
    };
  }

  /**
   * Actualiza el token global y chat ID por defecto
   */
  setCredentials(botToken, defaultChatId) {
    if (botToken) {
      this.botToken = botToken;
      try { dbSqlite.setConfig('telegram_bot_token', botToken); } catch (_) {}
    }
    if (defaultChatId) {
      this.defaultChatId = defaultChatId;
      try { dbSqlite.setConfig('telegram_chat_id', defaultChatId); } catch (_) {}
    }
  }

  /**
   * Formatea valores numéricos en Pesos Colombianos (COP)
   */
  formatCOP(num) {
    if (!num || isNaN(num)) return '$0 COP';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num);
  }

  /**
   * Escapa caracteres especiales para modo HTML de Telegram
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Auto-detecta el Chat ID consultando los últimos mensajes entrantes vía getUpdates
   */
  async autoDetectChatId() {
    const { botToken } = this.getBotCredentials();
    if (!botToken) return null;

    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
        const lastMsg = [...data.result].reverse().find(u => u.message && u.message.chat && u.message.chat.id);
        if (lastMsg) {
          const detectedId = String(lastMsg.message.chat.id);
          this.defaultChatId = detectedId;
          try { dbSqlite.setConfig('telegram_chat_id', detectedId); } catch (_) {}
          return {
            chatId: detectedId,
            remitente: `${lastMsg.message.from?.first_name || ''} ${lastMsg.message.from?.last_name || ''}`.trim() || lastMsg.message.chat?.title || 'Usuario Telegram'
          };
        }
      }
    } catch (e) {
      console.warn('Error auto-detectando Chat ID de Telegram:', e.message);
    }
    return null;
  }

  /**
   * Envía un mensaje a Telegram registrando el log de auditoría
   */
  async enviarMensajeTelegram(chatId, text, inlineKeyboard = null, meta = {}) {
    const { botToken, defaultChatId } = this.getBotCredentials();
    const targetChatId = chatId || defaultChatId;

    const logEntry = {
      empresa_id: meta.empresa_id || null,
      proceso_referencia: meta.proceso_referencia || 'N/A',
      chat_id: String(targetChatId || 'NO_CONFIGURADO'),
      tipo_alerta: meta.tipo_alerta || 'GENERAL',
      titulo: meta.titulo || 'Notificación Radar SECOP',
      mensaje_texto: text,
      estado: 'FALLIDO',
      mensaje_id: null,
      error_detalle: null
    };

    if (!botToken || !targetChatId) {
      logEntry.error_detalle = 'Bot Token o Chat ID no configurados';
      await this._guardarLog(logEntry);
      return { success: false, error: logEntry.error_detalle };
    }

    const payload = {
      chat_id: targetChatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    };

    if (inlineKeyboard && inlineKeyboard.length > 0) {
      payload.reply_markup = { inline_keyboard: inlineKeyboard };
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resJson = await response.json();

      if (!resJson.ok) {
        logEntry.error_detalle = resJson.description || 'Error de API de Telegram';
        await this._guardarLog(logEntry);
        return { success: false, error: resJson.description };
      }

      logEntry.estado = 'ENVIADO';
      logEntry.mensaje_id = String(resJson.result.message_id);
      await this._guardarLog(logEntry);

      return {
        success: true,
        messageId: resJson.result.message_id,
        chatId: targetChatId
      };
    } catch (err) {
      logEntry.error_detalle = err.message;
      await this._guardarLog(logEntry);
      return { success: false, error: err.message };
    }
  }

  async _guardarLog(log) {
    try {
      await dbPostgres.query(`
        INSERT INTO telegram_notificaciones_log (
          empresa_id, proceso_referencia, chat_id, tipo_alerta, titulo,
          mensaje_texto, mensaje_id, estado, error_detalle
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        log.empresa_id,
        log.proceso_referencia,
        log.chat_id,
        log.tipo_alerta,
        log.titulo,
        log.mensaje_texto,
        log.mensaje_id,
        log.estado,
        log.error_detalle
      ]);
    } catch (e) {
      console.warn('Aviso: No se pudo guardar bitácora de Telegram en DB:', e.message);
    }
  }

  // ====================================================================
  // 1. ALERTA PUSH: OPORTUNIDAD DE ALTA AFINIDAD (HIGH-FIT MATCH)
  // ====================================================================
  async notificarOportunidadAltaAfinidad(item, empresaId = null) {
    const precio = this.formatCOP(item.precio_base || item.cuantia);
    const score = item.score_relevancia || item.score || 85;
    const entidad = this.escapeHtml(item.entidad || 'Entidad Pública');
    const ref = this.escapeHtml(item.referencia || item.id || '');
    const objeto = this.escapeHtml((item.descripcion || item.nombre || 'Sin descripción').slice(0, 1200));
    const depto = this.escapeHtml(item.departamento || item.ciudad || 'Colombia');
    const fechaCierre = item.fecha_cierre ? item.fecha_cierre.slice(0, 10) : 'Por definir';

    const text = `
🎯 <b>¡LICITACIÓN DE ALTA AFINIDAD DETECTADA!</b> 🛰️
<b>Radar SECOP • NIKADU IA</b>

🏢 <b>Entidad:</b> ${entidad}
📍 <b>Ubicación:</b> ${depto}
📌 <b>Proceso:</b> <code>${ref}</code>
💰 <b>Presupuesto:</b> <b>${precio}</b>
⏳ <b>Cierre de Ofertas:</b> <b>${fechaCierre}</b>
🔥 <b>Afinidad Predictiva:</b> <b>${score}% Match</b>

📝 <b>Objeto del Contrato:</b>
${objeto}
    `.trim();

    const inlineKeyboard = [];
    if (item.url) {
      inlineKeyboard.push([{ text: '📄 Abrir Pliegos en SECOP II', url: item.url }]);
    }

    // Buscar canales activos suscritos a oportunidades fit
    const canales = await this.obtenerCanalesDestino(empresaId, 'oportunidades_fit', score);

    const resultados = [];
    for (const canal of canales) {
      const res = await this.enviarMensajeTelegram(canal.chat_id, text, inlineKeyboard, {
        empresa_id: empresaId,
        proceso_referencia: ref,
        tipo_alerta: 'ALTA_AFINIDAD',
        titulo: `Licitación ${ref} (${score}% Fit)`
      });
      resultados.push(res);
    }

    return resultados;
  }

  // ====================================================================
  // 2. ALERTA CRÍTICA: ADENDA Y MODIFICACIÓN DE CRONOGRAMA (LEY 1882/2018)
  // ====================================================================
  async notificarAdendaCronograma(adenda, procesoInfo = {}, empresaId = null) {
    const numAdenda = this.escapeHtml(adenda.numero_adenda || '1');
    const ref = this.escapeHtml(adenda.numero_proceso || procesoInfo.referencia || 'N/A');
    const entidad = this.escapeHtml(adenda.entidad_nombre || procesoInfo.entidad || 'Entidad Estatal');
    const fechaAnt = adenda.fecha_cierre_anterior ? new Date(adenda.fecha_cierre_anterior).toLocaleDateString('es-CO') : 'N/A';
    const fechaNueva = adenda.fecha_cierre_nueva ? new Date(adenda.fecha_cierre_nueva).toLocaleDateString('es-CO') : 'Sin cambio de fecha';
    const dias = adenda.dias_prorroga ? `${adenda.dias_prorroga} días calendario` : 'Sin prórroga de días';
    const cambios = this.escapeHtml(adenda.descripcion_cambios || 'Modificación en documentos y cronograma del proceso.');

    // Evaluación de cumplimiento de la Ley 1882 de 2018
    const cumpleLey1882 = adenda.cumplimiento_ley_1882 !== false;
    const badgeLey = cumpleLey1882
      ? '✅ <b>Regla 3 Días Hábiles (Ley 1882/2018):</b> Conforme'
      : '⚠️ <b>ALERTA LEGAL (Ley 1882/2018):</b> Publicada con menos de 3 días hábiles previos al cierre.';

    // Evaluación de impacto en garantía de seriedad
    const impactoPoliza = adenda.impacto_poliza_seriedad
      ? '🛡️ <b>IMPACTO EN PÓLIZAS:</b> Requiere ampliación de vigencia de la Garantía de Seriedad.'
      : '🛡️ <b>Impacto en Pólizas:</b> No requiere ajuste de vigencia.';

    const text = `
🚨 <b>¡ADENDA DETECTADA EN SECOP II!</b> 📑
<b>Alerta Crítica de Modificación de Proceso</b>

🏢 <b>Entidad:</b> ${entidad}
📌 <b>Proceso:</b> <code>${ref}</code>
🔖 <b>Adenda N°:</b> <b>${numAdenda}</b> (${adenda.tipo_modificacion || 'Modificación de Cronograma'})

🗓️ <b>Fecha Cierre Anterior:</b> ${fechaAnt}
⏰ <b>NUEVA FECHA DE CIERRE:</b> <b>${fechaNueva}</b> (+${dias})

${badgeLey}
${impactoPoliza}

📝 <b>Resumen de Cambios:</b>
${cambios}
    `.trim();

    const inlineKeyboard = [];
    if (procesoInfo.url) {
      inlineKeyboard.push([{ text: '📄 Revisar Adenda en SECOP II', url: procesoInfo.url }]);
    }

    const canales = await this.obtenerCanalesDestino(empresaId, 'adendas_cronograma');

    const resultados = [];
    for (const canal of canales) {
      const res = await this.enviarMensajeTelegram(canal.chat_id, text, inlineKeyboard, {
        empresa_id: empresaId,
        proceso_referencia: ref,
        tipo_alerta: 'ADENDA_CRONOGRAMA',
        titulo: `Adenda ${numAdenda} - ${ref}`
      });
      resultados.push(res);
    }

    return resultados;
  }

  // ====================================================================
  // 3. ALERTA PUSH: INFORME DE EVALUACIÓN Y TRASLADO DE OBSERVACIONES
  // ====================================================================
  async notificarInformeEvaluacion(evalInfo = {}, procesoInfo = {}, empresaId = null) {
    const ref = this.escapeHtml(procesoInfo.referencia || evalInfo.proceso_referencia || 'N/A');
    const entidad = this.escapeHtml(procesoInfo.entidad || evalInfo.entidad || 'Entidad Contratante');
    const fechaPub = evalInfo.fecha_publicacion || new Date().toLocaleDateString('es-CO');
    const plazoTraslado = evalInfo.dias_traslado || 5;
    const posEmpresa = evalInfo.posicion_ranking ? `Puesto #${evalInfo.posicion_ranking}` : 'En evaluación';

    const text = `
⚖️ <b>¡INFORME DE EVALUACIÓN PUBLICADO!</b> 📋
<b>Traslado Legal de Observaciones (Ley 80/93)</b>

🏢 <b>Entidad:</b> ${entidad}
📌 <b>Proceso:</b> <code>${ref}</code>
📅 <b>Fecha de Publicación:</b> ${fechaPub}
⏳ <b>Término Perentorio:</b> <b>${plazoTraslado} días hábiles</b> para formular observaciones
📊 <b>Posición Preliminar:</b> <b>${posEmpresa}</b>

⚠️ <i>Recuerda que una vez vencido el término de traslado precluye la oportunidad de controvertir la evaluación de proponentes competidores.</i>
    `.trim();

    const inlineKeyboard = [
      [{ text: '🔍 Redactar Observaciones en Radar SECOP', url: 'https://secop.gov.co' }]
    ];

    const canales = await this.obtenerCanalesDestino(empresaId, 'evaluacion_traslado');

    const resultados = [];
    for (const canal of canales) {
      const res = await this.enviarMensajeTelegram(canal.chat_id, text, inlineKeyboard, {
        empresa_id: empresaId,
        proceso_referencia: ref,
        tipo_alerta: 'INFORME_EVALUACION',
        titulo: `Informe de Evaluación ${ref}`
      });
      resultados.push(res);
    }

    return resultados;
  }

  // ====================================================================
  // 4. ALERTA PUSH: VENCIMIENTO DE GARANTÍAS Y PÓLIZAS (DEC. 1082/2015)
  // ====================================================================
  async notificarAlertaPolizaVencimiento(poliza = {}, contratoInfo = {}, empresaId = null) {
    const refContrato = this.escapeHtml(contratoInfo.numero_contrato || poliza.contrato_id || 'CTR-2026');
    const entidad = this.escapeHtml(contratoInfo.entidad || 'Entidad Contratante');
    const amparo = this.escapeHtml(poliza.amparo || 'Cumplimiento y Salarios');
    const numPoliza = this.escapeHtml(poliza.numero_poliza || 'N/A');
    const aseguradora = this.escapeHtml(poliza.aseguradora || 'Compañía Aseguradora');
    const diasRestantes = poliza.dias_restantes !== undefined ? poliza.dias_restantes : 15;
    const fechaVence = poliza.fecha_fin ? new Date(poliza.fecha_fin).toLocaleDateString('es-CO') : 'Próxima';

    const criticidad = diasRestantes <= 10 ? '🚨 URGENTE: CRÍTICO' : '⚠️ PREVENTIVO: MODERADO';

    const text = `
🛡️ <b>ALERTA DE VIGENCIA DE GARANTÍA CONTRACTUAL</b>
<b>Decreto 1082 de 2015 • Control de Pólizas</b>

🏢 <b>Entidad:</b> ${entidad}
📌 <b>Contrato:</b> <code>${refContrato}</code>
🔖 <b>Póliza:</b> ${numPoliza} (${aseguradora})
📜 <b>Amparo:</b> <b>${amparo}</b>

⏳ <b>Días Restantes:</b> <b>${diasRestantes} días</b> (${criticidad})
📅 <b>Fecha Límite:</b> <b>${fechaVence}</b>

🔔 <i>Acción requerida: Tramitar certificado de prórroga o endoso de suficiencia ante la aseguradora para evitar siniestro por incumplimiento.</i>
    `.trim();

    const canales = await this.obtenerCanalesDestino(empresaId, 'polizas_vencimiento');

    const resultados = [];
    for (const canal of canales) {
      const res = await this.enviarMensajeTelegram(canal.chat_id, text, null, {
        empresa_id: empresaId,
        proceso_referencia: refContrato,
        tipo_alerta: 'POLIZA_VENCIMIENTO',
        titulo: `Póliza ${amparo} - ${diasRestantes} días restantes`
      });
      resultados.push(res);
    }

    return resultados;
  }

  // ====================================================================
  // 5. GESTIÓN DE CANALES Y SUSCRIPCIONES
  // ====================================================================
  async obtenerCanalesDestino(empresaId = null, tipoFiltro = null, scoreMin = null) {
    try {
      let query = `SELECT * FROM telegram_canales_config WHERE activo = true`;
      const params = [];

      if (empresaId) {
        params.push(empresaId);
        query += ` AND (empresa_id = $${params.length} OR empresa_id IS NULL)`;
      }

      if (tipoFiltro === 'oportunidades_fit') {
        query += ` AND alertar_oportunidades_fit = true`;
        if (scoreMin !== null) {
          params.push(scoreMin);
          query += ` AND score_minimo_fit <= $${params.length}`;
        }
      } else if (tipoFiltro === 'adendas_cronograma') {
        query += ` AND alertar_adendas_cronograma = true`;
      } else if (tipoFiltro === 'evaluacion_traslado') {
        query += ` AND alertar_evaluacion_traslado = true`;
      } else if (tipoFiltro === 'polizas_vencimiento') {
        query += ` AND alertar_polizas_vencimiento = true`;
      }

      const q = await dbPostgres.query(query, params);
      if (q.rows.length > 0) return q.rows;
    } catch (e) {
      console.warn('Aviso consultando canales en PostgreSQL:', e.message);
    }

    // Fallback al chat ID por defecto de la configuración
    const { defaultChatId } = this.getBotCredentials();
    if (defaultChatId) {
      return [{
        id: 0,
        alias: 'Canal General Configurado',
        chat_id: defaultChatId,
        activo: true
      }];
    }
    return [];
  }

  async listarCanales(empresaId = null) {
    const query = empresaId
      ? `SELECT * FROM telegram_canales_config WHERE empresa_id = $1 OR empresa_id IS NULL ORDER BY id ASC`
      : `SELECT * FROM telegram_canales_config ORDER BY id ASC`;
    const params = empresaId ? [empresaId] : [];
    const q = await dbPostgres.query(query, params);
    return q.rows;
  }

  async guardarCanal(canal) {
    const {
      id,
      empresa_id,
      alias = 'Canal Principal Licitaciones',
      chat_id,
      activo = true,
      alertar_oportunidades_fit = true,
      score_minimo_fit = 75,
      alertar_adendas_cronograma = true,
      alertar_evaluacion_traslado = true,
      alertar_polizas_vencimiento = true
    } = canal;

    if (!chat_id) throw new Error('El Chat ID de Telegram es obligatorio');

    if (id) {
      const q = await dbPostgres.query(`
        UPDATE telegram_canales_config SET
          alias = $1, chat_id = $2, activo = $3,
          alertar_oportunidades_fit = $4, score_minimo_fit = $5,
          alertar_adendas_cronograma = $6, alertar_evaluacion_traslado = $7,
          alertar_polizas_vencimiento = $8, actualizado_en = CURRENT_TIMESTAMP
        WHERE id = $9 RETURNING *;
      `, [alias, chat_id, activo, alertar_oportunidades_fit, score_minimo_fit, alertar_adendas_cronograma, alertar_evaluacion_traslado, alertar_polizas_vencimiento, id]);
      return q.rows[0];
    } else {
      const q = await dbPostgres.query(`
        INSERT INTO telegram_canales_config (
          empresa_id, alias, chat_id, activo, alertar_oportunidades_fit,
          score_minimo_fit, alertar_adendas_cronograma, alertar_evaluacion_traslado,
          alertar_polizas_vencimiento
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;
      `, [empresa_id || null, alias, chat_id, activo, alertar_oportunidades_fit, score_minimo_fit, alertar_adendas_cronograma, alertar_evaluacion_traslado, alertar_polizas_vencimiento]);
      return q.rows[0];
    }
  }

  async eliminarCanal(id) {
    await dbPostgres.query('DELETE FROM telegram_canales_config WHERE id = $1', [id]);
    return { success: true };
  }

  async suscribirProceso(datos) {
    const {
      empresa_id,
      proceso_id,
      numero_proceso,
      entidad = 'Entidad Estatal',
      objeto = '',
      chat_id
    } = datos;

    const targetChat = chat_id || this.getBotCredentials().defaultChatId;
    if (!targetChat) throw new Error('Se requiere un Chat ID de Telegram para suscribir el proceso');

    // Verificar si ya existe suscripción
    const check = await dbPostgres.query(`
      SELECT id FROM telegram_suscripciones_proceso 
      WHERE proceso_id = $1 AND chat_id = $2
    `, [proceso_id, targetChat]);

    if (check.rows.length > 0) {
      await dbPostgres.query(`
        UPDATE telegram_suscripciones_proceso SET
          activo = true, actualizado_en = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [check.rows[0].id]);
      return { id: check.rows[0].id, estado: 'REACTIVADA' };
    }

    const q = await dbPostgres.query(`
      INSERT INTO telegram_suscripciones_proceso (
        empresa_id, proceso_id, numero_proceso, entidad, objeto, chat_id
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
    `, [empresa_id || null, proceso_id, numero_proceso, entidad, objeto, targetChat]);

    // Enviar confirmación al chat de Telegram
    await this.enviarMensajeTelegram(targetChat, `
🔔 <b>PROCESO SUSCRITO A ALERTAS EN TIEMPO REAL</b>
<b>Radar SECOP • Monitoreo Activo</b>

🏢 <b>Entidad:</b> ${this.escapeHtml(entidad)}
📌 <b>Proceso:</b> <code>${this.escapeHtml(numero_proceso)}</code>

✅ Recibirás alertas inmediatas si la entidad publica <b>Adendas</b>, modifica el <b>Cronograma</b> o publica el <b>Informe de Evaluación</b>.
    `.trim(), null, {
      empresa_id,
      proceso_referencia: numero_proceso,
      tipo_alerta: 'SUSCRIPCION',
      titulo: `Suscripción a ${numero_proceso}`
    });

    return q.rows[0];
  }

  async listarSuscripciones(empresaId = null) {
    const query = empresaId
      ? `SELECT * FROM telegram_suscripciones_proceso WHERE empresa_id = $1 AND activo = true ORDER BY creado_en DESC`
      : `SELECT * FROM telegram_suscripciones_proceso WHERE activo = true ORDER BY creado_en DESC`;
    const params = empresaId ? [empresaId] : [];
    const q = await dbPostgres.query(query, params);
    return q.rows;
  }

  async eliminarSuscripcion(id) {
    await dbPostgres.query('DELETE FROM telegram_suscripciones_proceso WHERE id = $1', [id]);
    return { success: true };
  }

  async consultarHistorial(limite = 50) {
    const q = await dbPostgres.query(`
      SELECT * FROM telegram_notificaciones_log 
      ORDER BY creado_en DESC LIMIT $1
    `, [limite]);
    return q.rows;
  }

  // ====================================================================
  // 6. DESPACHADOR DE COMANDOS ENTRANTE DE TELEGRAM (/start, /resumen, etc.)
  // ====================================================================
  async procesarComandoTelegram(update) {
    if (!update || !update.message || !update.message.text) return null;

    const msg = update.message;
    const chatId = String(msg.chat.id);
    const text = msg.text.trim();
    const command = text.split(' ')[0].toLowerCase();

    if (command === '/start' || command === 'iniciar' || command === 'hola') {
      const resp = `
👋 <b>¡Bienvenido al Bot Oficial de Radar SECOP!</b> 🛰️

Tu <b>Chat ID</b> ha sido registrado automáticamente:
🆔 <code>${chatId}</code>

<b>Funciones disponibles:</b>
• 🎯 Alertas instantáneas de licitaciones con alta afinidad
• 🚨 Notificación de Adendas y cambios de cierre (Ley 1882/2018)
• ⚖️ Aviso perentorio de Informes de Evaluación y traslado de observaciones
• 🛡️ Semáforo de vigencias de pólizas y garantías contractuales

Escribe <b>/resumen</b> para ver el estado actual de tus procesos.
      `.trim();
      return await this.enviarMensajeTelegram(chatId, resp, null, {
        tipo_alerta: 'COMANDO',
        titulo: 'Comando /start'
      });
    }

    if (command === '/resumen') {
      // Contar oportunidades y pipeline
      let totalProc = 0;
      let totalSuscrip = 0;
      try {
        const q1 = await dbPostgres.query('SELECT COUNT(*) FROM pipeline_procesos');
        totalProc = parseInt(q1.rows[0].count, 10);
        const q2 = await dbPostgres.query('SELECT COUNT(*) FROM telegram_suscripciones_proceso WHERE activo = true');
        totalSuscrip = parseInt(q2.rows[0].count, 10);
      } catch (_) {}

      const resp = `
📊 <b>RESUMEN EJECUTIVO RADAR SECOP</b> 🛰️

📌 <b>Procesos en Pipeline:</b> ${totalProc} licitaciones
🔔 <b>Procesos Monitoreados con Alertas:</b> ${totalSuscrip} procesos
⚡ <b>Estado del Sistema:</b> 100% Operativo y Conectado a SECOP II

<i>Abre la consola web de Radar SECOP para ver el detalle de cada licitación.</i>
      `.trim();
      return await this.enviarMensajeTelegram(chatId, resp, null, {
        tipo_alerta: 'COMANDO',
        titulo: 'Comando /resumen'
      });
    }

    if (command === '/ping' || command === '/test') {
      const tStart = Date.now();
      const resp = `⚡ <b>Radar SECOP API Online:</b> Latencia ${Date.now() - tStart}ms. Todo funcionando correctamente.`;
      return await this.enviarMensajeTelegram(chatId, resp, null, {
        tipo_alerta: 'COMANDO',
        titulo: 'Comando /ping'
      });
    }

    return null;
  }
}

module.exports = new TelegramBotEngine();
