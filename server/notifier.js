const config = require('./config');
const db = require('./database');

class Notifier {
  constructor() {
    this.botToken = config.telegram.botToken;
    this.chatId = config.telegram.chatId;
  }

  // Permite actualizar credenciales en caliente desde la UI
  updateCredentials(botToken, chatId) {
    this.botToken = botToken;
    this.chatId = chatId;
    if (botToken) db.setConfig('telegram_bot_token', botToken);
    if (chatId) db.setConfig('telegram_chat_id', chatId);
  }

  getCredentials() {
    const token = db.getConfig('telegram_bot_token', this.botToken);
    const chat = db.getConfig('telegram_chat_id', this.chatId);
    return { botToken: token, chatId: chat };
  }

  formatCOP(num) {
    if (!num || isNaN(num)) return '$0 COP';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num);
  }

  async autoDetectChatId() {
    const { botToken } = this.getCredentials();
    if (!botToken) return null;
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
        const lastMsg = [...data.result].reverse().find(u => u.message && u.message.chat && u.message.chat.id);
        if (lastMsg) {
          const detectedId = String(lastMsg.message.chat.id);
          this.chatId = detectedId;
          db.setConfig('telegram_chat_id', detectedId);
          console.log(`🤖 Chat ID de Telegram auto-detectado con éxito: ${detectedId} (${lastMsg.message.from?.first_name || ''})`);
          return detectedId;
        }
      }
    } catch (e) {
      console.warn('Error auto-detectando Chat ID:', e.message);
    }
    return null;
  }

  async sendTelegramMessage(messageText, inlineKeyboard = null) {
    let { botToken, chatId } = this.getCredentials();
    if (!botToken) {
      console.log('⚠️ Notificador Telegram no configurado. Token faltante.');
      return { success: false, error: 'Token de Telegram no configurado' };
    }

    // Si el chatId es el username del bot (ej. @SECOP_Agente_bot) o no está configurado, intentar auto-detectarlo desde los mensajes entrantes
    if (!chatId || (chatId.startsWith('@') && chatId.toLowerCase().includes('bot'))) {
      const detected = await this.autoDetectChatId();
      if (detected) {
        chatId = detected;
      } else {
        return {
          success: false,
          error: "Abre en Telegram https://t.me/SECOP_Agente_bot y presiona 'INICIAR' (Start) para que el bot pueda enviarte mensajes. Luego presiona 'Probar Envío'."
        };
      }
    }

    const payload = {
      chat_id: chatId,
      text: messageText,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    };

    if (inlineKeyboard) {
      payload.reply_markup = {
        inline_keyboard: inlineKeyboard
      };
    }

    try {
      let response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let resJson = await response.json();
      if (!resJson.ok) {
        // Si falló por restricción de bot o chat inexistente, intentar auto-detectar de nuevo
        const detected = await this.autoDetectChatId();
        if (detected && detected !== chatId) {
          payload.chat_id = detected;
          response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          resJson = await response.json();
        }
      }

      if (!resJson.ok) {
        console.error('❌ Error de Telegram Bot API:', resJson.description);
        if (resJson.description.includes("can't send messages to the bot") || resJson.description.includes("chat not found")) {
          return {
            success: false,
            error: "Abre en Telegram https://t.me/SECOP_Agente_bot y presiona 'INICIAR' (Start) para habilitar el bot en tu cuenta."
          };
        }
        return { success: false, error: resJson.description };
      }
      return { success: true, messageId: resJson.result.message_id, chatId: payload.chat_id };
    } catch (err) {
      console.error('❌ Error de red enviando a Telegram:', err.message);
      return { success: false, error: err.message };
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async notifyOportunidad(item) {
    const matches = (item.palabras_clave_match || []).join(', ');
    const precio = this.formatCOP(item.precio_base);

    const isCerabela = item.perfil === 'CERABELA';
    const brandIcon = isCerabela ? '🕯️' : '🤖';
    const brandTitle = isCerabela ? 'Radar CERABELA - Velas & Artesanías' : 'Radar NIKADU IA - Inteligencia Artificial & Tech';
    const relLabel = isCerabela ? 'Relevancia Artesanal' : 'Relevancia IA';

    const isConv = item.tipo_proceso === 'CONVOCATORIA';
    const badge = isConv ? '📢 ¡NUEVA CONVOCATORIA DETECTADA!' : '📑 ¡NUEVA CONTRATACIÓN DETECTADA!';
    const fechaPub = item.fecha_publicacion ? item.fecha_publicacion.slice(0, 10) : 'Reciente';
    const fechaCierre = item.fecha_cierre ? item.fecha_cierre.slice(0, 10) : 'Vigente / Por definir';

    // Construcción del objeto completo sin recortes arbitrarios
    const desc = (item.descripcion && item.descripcion !== 'No definido') ? item.descripcion.trim() : '';
    const nom = (item.nombre && item.nombre !== 'No definido') ? item.nombre.trim() : '';

    let rawObjeto = '';
    if (!desc && !nom) {
      rawObjeto = 'No especificado';
    } else if (!desc) {
      rawObjeto = nom;
    } else if (!nom) {
      rawObjeto = desc;
    } else {
      const dLower = desc.toLowerCase();
      const nLower = nom.toLowerCase();
      if (dLower === nLower || dLower.includes(nLower)) {
        rawObjeto = desc;
      } else if (nLower.includes(dLower)) {
        rawObjeto = nom;
      } else {
        rawObjeto = `${nom}\n\n${desc}`;
      }
    }

    // Telegram admite mensajes de hasta 4096 caracteres.
    // Con 3000 caracteres de margen, el objeto se envía 100% completo en prácticamente la totalidad de los procesos.
    const MAX_OBJETO_CHARS = 3000;
    const objetoFinal = rawObjeto.length > MAX_OBJETO_CHARS
      ? rawObjeto.slice(0, MAX_OBJETO_CHARS) + '...'
      : rawObjeto;

    const entidadEscaped = this.escapeHtml(item.entidad || 'No definida');
    const ciudad = item.ciudad ? item.ciudad.trim() : '';
    const depto = item.departamento ? item.departamento.trim() : '';
    const ubicacionStr = ciudad && depto ? `${ciudad}, ${depto}` : (ciudad || depto || 'Colombia');
    const ubicacionEscaped = this.escapeHtml(ubicacionStr);
    const refEscaped = this.escapeHtml(item.referencia || item.id || '');
    const matchesEscaped = this.escapeHtml(matches || 'General');
    const faseEscaped = this.escapeHtml(item.fase || 'Presentación de ofertas');
    const objetoEscaped = this.escapeHtml(objetoFinal);

    const message = `
${badge} ${brandIcon}
<b>${brandTitle}</b>

🏢 <b>Entidad:</b> ${entidadEscaped}
📍 <b>Ubicación:</b> ${ubicacionEscaped}
📌 <b>Proceso:</b> <code>${refEscaped}</code>
📑 <b>Tipo:</b> <b>${item.tipo_proceso || 'CONTRATACION'}</b>
💰 <b>Presupuesto:</b> <b>${precio}</b>
📅 <b>Publicado:</b> ${fechaPub}
⏳ <b>Cierre:</b> <b>${fechaCierre}</b>
🎯 <b>${relLabel}:</b> <b>${item.score_relevancia}%</b>
🏷️ <b>Keywords:</b> <i>${matchesEscaped}</i>
📊 <b>Fase:</b> ${faseEscaped}

📝 <b>Objeto:</b>
${objetoEscaped}
    `.trim();

    const inlineKeyboard = [];
    if (item.url) {
      const buttonText = item.fuente === 'FONDO_EMPRENDER' ? '🌱 Ver en Fondo Emprender' : '📄 Abrir Pliegos en SECOP II';
      inlineKeyboard.push([
        { text: buttonText, url: item.url }
      ]);
    }

    const result = await this.sendTelegramMessage(message, inlineKeyboard.length ? inlineKeyboard : null);
    if (result.success) {
      db.markNotificado(item.id);
    }
    return result;
  }

  async sendTestMessage() {
    const text = `
✅ <b>¡Conexión Exitosa con Radar Unificado!</b> 🛰️
Tu bot de alertas para <b>NIKADU IA</b> 🤖 y <b>CERABELA</b> 🕯️ está configurado correctamente.
Recibirás aquí notificaciones cada hora cuando aparezcan nuevas licitaciones de:
• 🤖 Inteligencia Artificial & Automatización
• 🕯️ Velas Hechas a Mano, Artesanías & Regalos Corporativos
• 🌱 Convocatorias del Fondo Emprender (SENA)
    `.trim();

    return await this.sendTelegramMessage(text, [
      [{ text: '🚀 Ir a Datos Abiertos Colombia', url: 'https://www.datos.gov.co' }]
    ]);
  }
}

module.exports = new Notifier();
