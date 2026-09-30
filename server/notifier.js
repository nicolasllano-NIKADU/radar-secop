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

  async notifyOportunidad(item) {
    const matches = (item.palabras_clave_match || []).join(', ');
    const precio = this.formatCOP(item.precio_base);

    const isCerabela = item.perfil === 'CERABELA';
    const brandIcon = isCerabela ? '🕯️' : '🤖';
    const brandTitle = isCerabela ? 'Radar CERABELA - Velas Artesanales' : 'Radar NIKADU IA - Inteligencia Artificial';
    const relLabel = isCerabela ? 'Relevancia Artesanal' : 'Relevancia IA';

    const message = `
🚨 <b>¡NUEVA CONVOCATORIA DETECTADA!</b> ${brandIcon}
<b>${brandTitle}</b>

🏢 <b>Entidad:</b> ${item.entidad || 'No definida'}
📍 <b>Ubicación:</b> ${item.ciudad || ''}, ${item.departamento || 'Colombia'}
📌 <b>Proceso:</b> <code>${item.referencia || item.id}</code>
💰 <b>Presupuesto:</b> <b>${precio}</b>
🎯 <b>${relLabel}:</b> <b>${item.score_relevancia}%</b>
🏷️ <b>Keywords:</b> <i>${matches || 'General'}</i>
📊 <b>Fase:</b> ${item.fase || 'Presentación de ofertas'}

📝 <b>Objeto:</b>
${(item.nombre || item.descripcion || '').slice(0, 300)}...
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
