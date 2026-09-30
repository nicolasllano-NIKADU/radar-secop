const cheerio = require('cheerio');
const db = require('./database');
const notifier = require('./notifier');

function parseSpanishDate(str) {
  if (!str) return null;
  const isoMatch = str.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];

  const months = {
    enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
    julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
  };

  const regex = /(\d{1,2})\s+de\s+([a-zñ]+)(?:\s+de)?\s+(\d{4})/i;
  const match = str.match(regex);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = months[match[2].toLowerCase()];
    const year = match[3];
    if (month) return `${year}-${month}-${day}`;
  }
  return null;
}

class FondoEmprenderScanner {
  constructor() {
    this.baseUrl = 'https://www.fondoemprender.com';
    this.targetUrls = [
      'https://www.fondoemprender.com/SitePages/FondoEmprenderConvocatoriasVigentes.aspx',
      'https://www.fondoemprender.com/SitePages/Home.aspx'
    ];
  }

  cleanText(text) {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
  }

  evaluateFEScore(title, description) {
    const fullText = (title + ' ' + description).toLowerCase();
    const matches = ['capital semilla', 'sena', 'fondo emprender'];
    let score = 70;

    const techKeywords = [
      'innovacion', 'tecnologia', 'digital', 'software', 'automatiz',
      'inteligencia artificial', 'servicios', 'industria 4.0', 'stem'
    ];

    for (const kw of techKeywords) {
      if (fullText.includes(kw)) {
        matches.push(kw);
        score += 10;
      }
    }

    if (fullText.includes('nacional') || fullText.includes('general') || fullText.includes('multisectorial')) {
      matches.push('multisectorial');
      score += 10;
    }

    return {
      score: Math.min(score, 100),
      matches
    };
  }

  async fetchHtml(url) {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8'
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} en ${url}`);
      }
      return await response.text();
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  // Extrae y parsea ÚNICAMENTE convocatorias ABIERTAS y VIGENTES
  async scanFondoEmprender() {
    console.log('🌾 [Fondo Emprender] Verificando convocatorias abiertas en fondoemprender.com...');
    let nuevosContador = 0;
    let totalDetectados = 0;
    const convocatoriasEncontradas = new Map();
    const todayStr = new Date().toISOString().slice(0, 10);

    for (const url of this.targetUrls) {
      try {
        const html = await this.fetchHtml(url);
        const $ = cheerio.load(html);

        $('a').each((_, el) => {
          const href = $(el).attr('href') || '';
          const rawText = $(el).text();
          const cleanLinkText = this.cleanText(rawText);
          const parentText = this.cleanText($(el).closest('div, tr, p, td').text());

          // Omitir años históricos y páginas de navegación general
          const isHistorical = /2020|2021|2022|2023|2024|2025/i.test(href) || /2020|2021|2022|2023|2024|2025/i.test(cleanLinkText);
          const isNavPage = /convocatoriasvigentes|convocatorias2020|home\.aspx/i.test(href);
          if (isHistorical || isNavPage) return;

          const matchNum = href.match(/conv(\d+)/i) || cleanLinkText.match(/convocatoria\s*(?:no\.?|número)?\s*(\d+)/i);
          const convNumber = matchNum ? matchNum[1] : null;
          if (!convNumber) return; // Solo procesar convocatorias reales con número

          const isConvLink = /conv\d+/i.test(href) || /convocatoria\s*(no\.|número|\d+)/i.test(cleanLinkText);

          if (isConvLink && href.length > 4 && !href.includes('Historico') && !href.includes('javascript:')) {
            let fullUrl = href;
            if (href.startsWith('/')) {
              fullUrl = `${this.baseUrl}${href}`;
            } else if (!href.startsWith('http')) {
              fullUrl = `${this.baseUrl}/SitePages/${href}`;
            }

            const convId = `FE-CONV-${convNumber}`;

            if (!convocatoriasEncontradas.has(convId)) {
              let title = cleanLinkText.length > 10 ? cleanLinkText : parentText.slice(0, 140);
              if (!title || title.length < 5) {
                title = `Convocatoria Fondo Emprender ${convNumber || ''}`;
              }

              convocatoriasEncontradas.set(convId, {
                id: convId,
                referencia: convNumber ? `Convocatoria ${convNumber}` : 'Fondo Emprender',
                nombre: title,
                descripcion: parentText.length > 40 ? parentText : `Convocatoria pública de capital semilla no reembolsable del Fondo Emprender del SENA.`,
                url: fullUrl
              });
            }
          }
        });
      } catch (err) {
        console.warn(`⚠️ Error leyendo ${url}:`, err.message);
      }
    }

    console.log(`📦 Enlaces candidatos detectados en Fondo Emprender: ${convocatoriasEncontradas.size}`);

    // Validar fechas y descartar rigurosamente convocatorias cerradas
    for (const [id, item] of convocatoriasEncontradas.entries()) {
      try {
        const pageHtml = await this.fetchHtml(item.url);
        const $p = cheerio.load(pageHtml);
        const bodyText = $p('body').text().replace(/\s+/g, ' ');

        const aperturaMatch = bodyText.match(/Apertura:\s*([^C\n\r]+?)(?:Cierre|$)/i);
        const cierreMatch = bodyText.match(/Cierre:\s*([^\n\r<]+)/i);

        const fechaPub = aperturaMatch ? parseSpanishDate(aperturaMatch[1]) : todayStr;
        const fechaCierre = cierreMatch ? parseSpanishDate(cierreMatch[1]) : null;

        // Si la fecha de cierre es anterior a hoy, o contiene "Informe Final", ESTÁ CERRADA -> DESCARTAR
        if (fechaCierre && fechaCierre < todayStr) {
          continue;
        }

        if (bodyText.includes('Informe Final de Evaluación') || bodyText.includes('Informe de Asignación de Recursos')) {
          continue;
        }

        if (item.nombre.toLowerCase().includes('convocatoria cerrada')) {
          continue;
        }

        totalDetectados++;
        const { score, matches } = this.evaluateFEScore(item.nombre, item.descripcion);
        const textLower = (item.nombre + ' ' + item.descripcion).toLowerCase();
        
        let itemPerfil = 'NIKADU_IA';
        if (textLower.includes('artesani') || textLower.includes('manual') || textLower.includes('cultural') || textLower.includes('creativ') || textLower.includes('ancestral')) {
          itemPerfil = 'CERABELA';
        } else if (textLower.includes('digital') || textLower.includes('software') || textLower.includes('tecnolog') || textLower.includes('ia') || textLower.includes('4.0')) {
          itemPerfil = 'NIKADU_IA';
        } else {
          itemPerfil = 'AMBOS';
        }

        const oportunidad = {
          id,
          fuente: 'FONDO_EMPRENDER',
          perfil: itemPerfil,
          tipo_proceso: 'CONVOCATORIA',
          entidad: 'SENA - Fondo Emprender',
          nit_entidad: '899999034',
          departamento: 'Nacional',
          ciudad: 'Colombia',
          referencia: item.referencia,
          nombre: item.nombre,
          descripcion: item.descripcion,
          fase: 'Convocatoria Abierta',
          estado: 'Abierta',
          modalidad: 'Capital Semilla No Reembolsable',
          tipo_contrato: 'Recurso No Reembolsable (Subvención)',
          precio_base: 100000000,
          fecha_publicacion: fechaPub || todayStr,
          fecha_cierre: fechaCierre || null,
          url: item.url,
          score_relevancia: score,
          palabras_clave_match: matches
        };

        const result = db.saveOportunidad(oportunidad);
        if (result.isNew) {
          nuevosContador++;
          console.log(`✨ [Fondo Emprender Abierta] Convocatoria indexada: ${item.referencia} - ${item.nombre}`);
          await this.notifyFondoEmprender(oportunidad);
        }
      } catch (err) {
        // Ignorar errores de páginas individuales
      }
    }

    return {
      success: true,
      nuevos: nuevosContador,
      total: totalDetectados
    };
  }

  async notifyFondoEmprender(item) {
    const text = `
🌱 <b>¡NUEVA CONVOCATORIA FONDO EMPRENDER - SENA!</b> 🚀
<b>Tipo:</b> CONVOCATORIA (Capital Semilla No Reembolsable)

🏢 <b>Entidad:</b> SENA (Fondo Emprender)
📌 <b>Convocatoria:</b> <code>${item.referencia}</code>
💰 <b>Recurso Asignado:</b> <b>Hasta $100.000.000 COP</b>
📅 <b>Fecha Cierre:</b> ${item.fecha_cierre || 'Vigente'}
🎯 <b>Relevancia:</b> <b>${item.score_relevancia}%</b>
🏷️ <b>Perfil:</b> ${item.perfil}

📝 <b>Descripción:</b>
${item.nombre}
    `.trim();

    return await notifier.sendTelegramMessage(text, [
      [{ text: '🌱 Ver Convocatoria en Fondo Emprender', url: item.url }],
      [{ text: '📄 Términos y Requisitos SENA', url: 'https://www.fondoemprender.com/SitePages/Home.aspx' }]
    ]);
  }
}

module.exports = new FondoEmprenderScanner();
