const fs = require('fs');
const pdfParse = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');

class RUPParser {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY || null;
  }

  /**
   * Procesa un buffer de archivo PDF (Certificado RUP o Balance) y extrae:
   * 1. Información General (Razón Social, NIT, Tamaño Empresarial, Representante)
   * 2. Información Financiera (Activo Corriente, Pasivo Corriente, Activo Total, Pasivo Total, Patrimonio, Utilidad Operacional, Gastos de Intereses)
   * 3. Códigos UNSPSC / Experiencia básica
   */
  async parseRUPBuffer(pdfBuffer) {
    // 1. Extraer texto crudo del PDF
    const parsedData = await pdfParse(pdfBuffer);
    const rawText = parsedData.text || '';

    if (!rawText.trim()) {
      throw new Error('El archivo PDF parece estar vacío o ser un escaneo de imagen sin OCR legible.');
    }

    // 2. Intentar extracción con Gemini Flash si hay API Key disponible
    if (this.geminiApiKey) {
      try {
        const aiResult = await this.extractWithGemini(rawText);
        if (aiResult) return aiResult;
      } catch (err) {
        console.warn('⚠️ Falla en extracción asistida por Gemini, pasando a extractor de reglas heurísticas Regex:', err.message);
      }
    }

    // 3. Extracción de alta precisión mediante Regex / Heurística colombiana
    return this.extractWithRegex(rawText);
  }

  /**
   * Extracción inteligente mediante Gemini Flash
   */
  async extractWithGemini(rawText) {
    const ai = new GoogleGenAI({ apiKey: this.geminiApiKey });
    const prompt = `Eres un experto auditor de contratación pública en Colombia especializado en RUP (Registro Único de Proponentes) según Decreto 1082 de 2015.
Analiza el siguiente texto de un Certificado RUP / Estados Financieros de Cámara de Comercio y extrae los datos en formato JSON estricto sin bloques de markdown adicionales.

Texto a analizar:
"""
${rawText.slice(0, 15000)}
"""

Estructura JSON requerida:
{
  "razon_social": string,
  "nit": string (solo números y dígito de verificación si aplica),
  "tamano_empresarial": "MICRO" | "PEQUEÑA" | "MEDIANA" | "GRANDE",
  "departamento": string,
  "ciudad": string,
  "ano_fiscal": number (ej: 2025 o 2024),
  "activo_corriente": number (en pesos colombianos sin decimales ni símbolos),
  "pasivo_corriente": number,
  "activo_total": number,
  "pasivo_total": number,
  "patrimonio": number,
  "utilidad_operacional": number,
  "gastos_intereses": number,
  "codigos_unspsc": array of strings (ej: ["80101500", "81111500"])
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text();
    return JSON.parse(text);
  }

  /**
   * Extractor local por expresiones regulares especializado en formatos de Cámara de Comercio de Colombia
   */
  extractWithRegex(rawText) {
    const cleanText = rawText.replace(/\r\n/g, '\n');

    // 1. Razón Social
    let razon_social = '';
    const matchRazon = cleanText.match(/(?:RAZ[OÓ]N SOCIAL|NOMBRE O RAZ[OÓ]N SOCIAL|PROPONENTE:)\s*[:\n]\s*([^\n\r]+)/i);
    if (matchRazon && matchRazon[1]) {
      razon_social = matchRazon[1].trim();
    }

    // 2. NIT
    let nit = '';
    const matchNit = cleanText.match(/(?:N\.?I\.?T\.?|IDENTIFICACI[OÓ]N)\s*[:\n]?\s*([0-9\.\-]{7,15})/i);
    if (matchNit && matchNit[1]) {
      nit = matchNit[1].replace(/\./g, '').trim();
    }

    // 3. Tamaño Empresarial
    let tamano_empresarial = 'PEQUEÑA';
    if (/MICROEMPRESA|TAMA[ÑN]O:\s*MICRO/i.test(cleanText)) tamano_empresarial = 'MICRO';
    else if (/MEDIANA EMPRESA|TAMA[ÑN]O:\s*MEDIANA/i.test(cleanText)) tamano_empresarial = 'MEDIANA';
    else if (/GRAN EMPRESA|TAMA[ÑN]O:\s*GRANDE/i.test(cleanText)) tamano_empresarial = 'GRANDE';

    // 4. Ciudad / Departamento
    let ciudad = '';
    let departamento = '';
    const matchMun = cleanText.match(/(?:MUNICIPIO|CIUDAD|DOMICILIO)\s*[:\n]\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)/i);
    if (matchMun && matchMun[1]) {
      ciudad = matchMun[1].trim().split('\n')[0];
    }

    // 5. Cifras Financieras (Búsqueda de líneas de balance)
    const extractMoney = (pattern) => {
      const regex = new RegExp(pattern + '[\\s\\S]{0,80}?([\\$]?[\\s]?[0-9]{1,3}(?:[\\.\\,][0-9]{3})*(?:[\\.\\,][0-9]{2})?)', 'i');
      const m = cleanText.match(regex);
      if (m && m[1]) {
        // Normalizar número eliminando $ y separadores de miles
        let numStr = m[1].replace(/[\$\s]/g, '');
        if (numStr.includes('.') && numStr.includes(',')) {
          numStr = numStr.replace(/\./g, '').replace(',', '.');
        } else if (numStr.includes('.')) {
          numStr = numStr.replace(/\./g, '');
        } else if (numStr.includes(',')) {
          numStr = numStr.replace(/,/g, '');
        }
        return Math.round(parseFloat(numStr)) || 0;
      }
      return 0;
    };

    const activo_corriente = extractMoney('(?:ACTIVO CORRIENTE)');
    const pasivo_corriente = extractMoney('(?:PASIVO CORRIENTE)');
    const activo_total = extractMoney('(?:ACTIVO TOTAL)');
    const pasivo_total = extractMoney('(?:PASIVO TOTAL)');
    const patrimonio = extractMoney('(?:PATRIMONIO TOTAL|TOTAL PATRIMONIO|PATRIMONIO)');
    const utilidad_operacional = extractMoney('(?:UTILIDAD OPERACIONAL|UTILIDAD O P[EÉ]RDIDA OPERACIONAL)');
    const gastos_intereses = extractMoney('(?:GASTOS DE INTERESES|GASTOS POR INTERESES|COSTOS FINANCIEROS)');

    // 6. Códigos UNSPSC (Patrón de 8 dígitos comunes en RUP)
    const unspscMatches = cleanText.match(/\b([1-9][0-9](?:1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9]|7[0-9]|8[0-9]|9[0-9])[0-9]{4})\b/g) || [];
    const codigos_unspsc = Array.from(new Set(unspscMatches)).slice(0, 15);

    // Año fiscal estimado
    const matchAno = cleanText.match(/(?:A\s*CORTE\s*A\s*31\s*DE\s*DICIEMBRE\s*DE\s*|EJERCICIO\s*FISCAL\s*:?\s*)(202[0-9])/i);
    const ano_fiscal = matchAno ? parseInt(matchAno[1], 10) : new Date().getFullYear() - 1;

    return {
      razon_social: razon_social || 'EMPRESA IDENTIFICADA DE RUP',
      nit: nit || '',
      tamano_empresarial,
      departamento: departamento || 'Cundinamarca',
      ciudad: ciudad || 'Bogotá D.C.',
      ano_fiscal,
      activo_corriente,
      pasivo_corriente,
      activo_total,
      pasivo_total,
      patrimonio: patrimonio || (activo_total - pasivo_total),
      utilidad_operacional,
      gastos_intereses,
      codigos_unspsc
    };
  }
}

module.exports = new RUPParser();
