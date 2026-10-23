/**
 * ====================================================================
 * RADAR SECOP - MOTOR DE GENERACIÓN DE SOBRES Y PROPUESTAS ECONÓMICAS
 * Marco Normativo y Jurisprudencial:
 * - Ley 80 de 1993 (Estatuto General de Contratación Pública)
 * - Ley 1150 de 2007 (Art. 5: Criterios Objetivos de Selección)
 * - Ley 1882 de 2018 (Pliegos Tipo y Reglas Vinculantes ANCP-CCE)
 * - Estatuto Tributario (Art. 462-1: Tarifa especial IVA sobre AIU)
 * - Formato Estándar CCE: Formulario 1 (Carta Económica) y Formulario 2 (Presupuesto)
 * ====================================================================
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

class EconomicProposalEngine {
  constructor() {
    this.AIU_DEFAULT = {
      administracion_pct: 18.0,
      imprevistos_pct: 2.0,
      utilidad_pct: 5.0,
      tarifa_iva_utilidad_pct: 19.0
    };
  }

  /**
   * Convierte un valor numérico a su expresión en letras en español (Pesos M/Cte)
   * Válido legalmente en Colombia para propuestas contractuales.
   * 
   * @param {number} n - Valor monetario en COP
   * @returns {string} - Texto en letras mayúsculas con sufijo formal
   */
  numeroALetras(n) {
    const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const DECENAS = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const DIEZ_Y = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const VEINTE_Y = ['VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
    const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    function leer3(num) {
      const c = Math.floor(num / 100);
      const d = Math.floor((num % 100) / 10);
      const u = num % 10;
      const res = [];

      if (num === 100) return 'CIEN';
      if (c > 0) res.push(CENTENAS[c]);

      const du = num % 100;
      if (du >= 10 && du <= 19) {
        res.push(DIEZ_Y[du - 10]);
      } else if (du >= 20 && du <= 29) {
        res.push(VEINTE_Y[du - 20]);
      } else {
        if (d > 0) {
          if (u > 0) res.push(DECENAS[d] + ' Y ' + UNIDADES[u]);
          else res.push(DECENAS[d]);
        } else if (u > 0) {
          res.push(UNIDADES[u]);
        }
      }
      return res.join(' ');
    }

    function leer6(num) {
      const miles = Math.floor(num / 1000);
      const resto = num % 1000;
      const partes = [];
      if (miles === 1) partes.push('MIL');
      else if (miles > 1) partes.push(leer3(miles) + ' MIL');
      if (resto > 0) partes.push(leer3(resto));
      return partes.join(' ');
    }

    const entero = Math.round(Math.abs(n || 0));
    if (entero === 0) return 'CERO PESOS M/CTE';

    const millones = Math.floor(entero / 1000000);
    const restoMillones = entero % 1000000;
    const salida = [];

    if (millones > 0) {
      if (millones === 1) salida.push('UN MILLÓN');
      else salida.push(leer6(millones) + ' MILLONES');
    }

    if (restoMillones > 0) {
      salida.push(leer6(restoMillones));
    }

    let texto = salida.join(' ').replace(/\s+/g, ' ').trim();
    if (texto.endsWith('MILLONES') || texto.endsWith('MILLÓN')) {
      texto += ' DE PESOS M/CTE';
    } else {
      texto += ' PESOS M/CTE';
    }
    return texto;
  }

  /**
   * Realiza la liquidación económica completa de la propuesta y genera metadatos
   */
  liquidarPropuesta({
    items = [],
    aiuConfig = {},
    proceso = {},
    oferente = {},
    consorcio = null,
    banco = null,
    ciudad = 'Bogotá D.C.',
    validezDias = 90,
    observaciones = ''
  }) {
    if (!items || items.length === 0) {
      throw new Error('Se requiere al menos un ítem para estructurar la propuesta económica');
    }

    const aiu = {
      administracion_pct: parseFloat(aiuConfig.administracion_pct !== undefined ? aiuConfig.administracion_pct : this.AIU_DEFAULT.administracion_pct),
      imprevistos_pct: parseFloat(aiuConfig.imprevistos_pct !== undefined ? aiuConfig.imprevistos_pct : this.AIU_DEFAULT.imprevistos_pct),
      utilidad_pct: parseFloat(aiuConfig.utilidad_pct !== undefined ? aiuConfig.utilidad_pct : this.AIU_DEFAULT.utilidad_pct),
      tarifa_iva_utilidad_pct: parseFloat(aiuConfig.tarifa_iva_utilidad_pct !== undefined ? aiuConfig.tarifa_iva_utilidad_pct : this.AIU_DEFAULT.tarifa_iva_utilidad_pct)
    };

    let totalDirecto = 0;
    const itemsProcesados = items.map((it, idx) => {
      const codigo = it.codigo || `${idx + 1}.0`;
      const descripcion = it.descripcion || `Ítem ${idx + 1}`;
      const unidad = it.unidad || 'UN';
      const cantidad = parseFloat(it.cantidad) || 1;
      const precioUnitario = parseFloat(it.precio_unitario_oferta || it.precio_unitario || 0);
      const subtotal = Math.round(cantidad * precioUnitario);
      const fase = (it.fase || 'INTERMEDIA').toUpperCase();

      totalDirecto += subtotal;

      return {
        item_no: idx + 1,
        codigo,
        descripcion,
        unidad,
        cantidad,
        fase,
        precio_unitario: precioUnitario,
        subtotal
      };
    });

    const aiuTotalPct = Number((aiu.administracion_pct + aiu.imprevistos_pct + aiu.utilidad_pct).toFixed(2));
    const administracionCop = Math.round(totalDirecto * (aiu.administracion_pct / 100));
    const imprevistosCop = Math.round(totalDirecto * (aiu.imprevistos_pct / 100));
    const utilidadCop = Math.round(totalDirecto * (aiu.utilidad_pct / 100));
    const aiuTotalCop = administracionCop + imprevistosCop + utilidadCop;

    // IVA especial sobre utilidad (Art. 462-1 E.T.)
    const ivaUtilidadCop = Math.round(utilidadCop * (aiu.tarifa_iva_utilidad_pct / 100));
    const granTotalOferta = totalDirecto + aiuTotalCop + ivaUtilidadCop;
    const granTotalLetras = this.numeroALetras(granTotalOferta);

    const bancoDatos = banco || {
      nombre: 'Bancolombia S.A.',
      tipo: 'Cuenta Corriente',
      numero: '001-234567-89'
    };

    return {
      proceso: {
        referencia: proceso.referencia || proceso.id || 'LP-001-2026',
        entidad: proceso.entidad || 'Entidad Estatal Contratante',
        objeto: proceso.objeto || proceso.nombre || 'Contratación estatal de obra o servicios',
        presupuesto_oficial: parseFloat(proceso.precio_base || proceso.cuantia || granTotalOferta)
      },
      oferente: {
        razon_social: oferente.razon_social || 'EMPRESA PROPONENTE S.A.S.',
        nit: oferente.nit || '900.000.000-1',
        representante_legal: oferente.representante_legal || 'Representante Legal',
        cedula_representante: oferente.cedula_representante || '1.000.000.000',
        ciudad: oferente.ciudad || ciudad,
        direccion: oferente.direccion || 'Calle 100 # 15-20',
        email: oferente.email || 'licitaciones@empresa.com',
        telefono: oferente.telefono || '300 123 4567'
      },
      consorcio: consorcio && consorcio.esPlural ? consorcio : null,
      validez_dias: parseInt(validezDias, 10) || 90,
      ciudad_firma: ciudad,
      banco: bancoDatos,
      observaciones,
      totales: {
        total_directo_cop: totalDirecto,
        administracion_cop: administracionCop,
        imprevistos_cop: imprevistosCop,
        utilidad_cop: utilidadCop,
        aiu_total_cop: aiuTotalCop,
        iva_utilidad_cop: ivaUtilidadCop,
        gran_total_oferta_cop: granTotalOferta,
        gran_total_letras: granTotalLetras
      },
      aiu_desglose: {
        administracion_pct: aiu.administracion_pct,
        imprevistos_pct: aiu.imprevistos_pct,
        utilidad_pct: aiu.utilidad_pct,
        aiu_total_pct: aiuTotalPct,
        tarifa_iva_utilidad_pct: aiu.tarifa_iva_utilidad_pct
      },
      items: itemsProcesados
    };
  }

  /**
   * Genera el Sobre Económico Oficial CCE en formato PDF con pdfkit
   * Incluye: Formulario 1 (Carta de Presentación Económica) y Formulario 2 (Presupuesto y APUs)
   * 
   * @param {Object} data - Datos calculados por liquidarPropuesta
   * @returns {Promise<Buffer>}
   */
  async generarFormularioEconomicoPdf(data) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          layout: 'portrait',
          margins: { top: 36, bottom: 36, left: 36, right: 36 },
          bufferPages: true
        });

        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const fCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);
        const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

        const { proceso, oferente, consorcio, totales, aiu_desglose, items, banco, validez_dias, ciudad_firma } = data;
        const esConsorcio = consorcio && consorcio.esPlural;

        // =========================================================================
        // PÁGINA 1: FORMULARIO 1 - CARTA DE PRESENTACIÓN DE LA PROPUESTA ECONÓMICA
        // =========================================================================
        doc.fontSize(7.5).fillColor('#64748b').text('REPÚBLICA DE COLOMBIA • AGENCIA NACIONAL DE CONTRATACIÓN PÚBLICA (ANCP-CCE)', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text('FORMULARIO 1: CARTA DE PRESENTACIÓN DE LA PROPUESTA ECONÓMICA', { align: 'center' });
        doc.fontSize(7.5).fillColor('#475569').font('Helvetica').text('Ley 80 de 1993 • Ley 1150 de 2007 • Ley 1882 de 2018 • Pliegos Tipo ANCP-CCE', { align: 'center' });
        doc.moveDown(0.5);

        // Cabecera fecha y destinatario
        const topY = doc.y;
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text(`${ciudad_firma}, ${fechaHoy}`, { align: 'right' });
        doc.moveDown(0.3);

        doc.font('Helvetica-Bold').fontSize(7.5).text('Señores:');
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e3a8a').text((proceso.entidad || 'ENTIDAD ESTATAL').toUpperCase());
        doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text('Comité Evaluador de Selección / Dirección de Contratación');
        doc.text(`${ciudad_firma}, República de Colombia`);
        doc.moveDown(0.4);

        // Cuadro de Referencia del Proceso
        const refY = doc.y;
        doc.rect(36, refY, 540, 36).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(7);
        doc.font('Helvetica-Bold').text('NÚMERO DE PROCESO:', 44, refY + 5)
           .font('Helvetica').text(proceso.referencia, 150, refY + 5);
        doc.font('Helvetica-Bold').text('OBJETO LICITATORIO:', 44, refY + 16)
           .font('Helvetica').text((proceso.objeto || 'Obras o servicios').slice(0, 110), 150, refY + 16, { width: 415 });

        doc.y = refY + 42;

        // Cuerpo legal vinculante
        doc.fillColor('#1e293b').fontSize(7).font('Helvetica');
        const introText = `El suscrito, obrando en calidad de Representante Legal ${esConsorcio ? 'de la estructura plural ' + consorcio.nombreConsorcio : 'de la sociedad ' + oferente.razon_social}, presento formal e irrevocable OFERTA ECONÓMICA para la adjudicación del contrato estatal de la referencia, conforme a las siguientes condiciones jurídicas y financieras:`;
        doc.text(introText, { align: 'justify' });
        doc.moveDown(0.4);

        // Tarjeta Hero: Valor de la Oferta en Letras y Números
        const valY = doc.y;
        doc.rect(36, valY, 540, 52).fillAndStroke('#f0fdf4', '#86efac');
        doc.fillColor('#166534').fontSize(7.5).font('Helvetica-Bold').text('VALOR TOTAL PROPUESTO (INCLUIDO COSTOS DIRECTOS, AIU E IVA SOBRE UTILIDAD):', 44, valY + 6);
        doc.fillColor('#15803d').fontSize(13).font('Helvetica-Bold').text(fCOP(totales.gran_total_oferta_cop), 44, valY + 18);
        doc.fillColor('#1e293b').fontSize(7).font('Helvetica-Bold').text('SON: ' + totales.gran_total_letras, 44, valY + 36, { width: 524 });

        doc.y = valY + 58;

        // Tabla de discriminación de AIU e IVA
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text('DISCRIMINACIÓN ECONÓMICA Y FACTOR IMPOSITIVO (ART. 462-1 E.T.):');
        doc.moveDown(0.2);

        const aiuTabY = doc.y;
        doc.rect(36, aiuTabY, 540, 42).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(6.8);

        doc.font('Helvetica-Bold').text('1. COSTOS DIRECTOS:', 44, aiuTabY + 5)
           .font('Helvetica').text(fCOP(totales.total_directo_cop), 180, aiuTabY + 5);
        doc.font('Helvetica-Bold').text(`2. ADMINISTRACIÓN (${aiu_desglose.administracion_pct}%):`, 44, aiuTabY + 15)
           .font('Helvetica').text(fCOP(totales.administracion_cop), 180, aiuTabY + 15);
        doc.font('Helvetica-Bold').text(`3. IMPREVISTOS (${aiu_desglose.imprevistos_pct}%):`, 44, aiuTabY + 25)
           .font('Helvetica').text(fCOP(totales.imprevistos_cop), 180, aiuTabY + 25);

        doc.font('Helvetica-Bold').text(`4. UTILIDAD (${aiu_desglose.utilidad_pct}%):`, 310, aiuTabY + 5)
           .font('Helvetica').text(fCOP(totales.utilidad_cop), 440, aiuTabY + 5);
        doc.font('Helvetica-Bold').text(`5. IVA 19% S/ UTILIDAD:`, 310, aiuTabY + 15)
           .font('Helvetica').text(fCOP(totales.iva_utilidad_cop), 440, aiuTabY + 15);
        doc.font('Helvetica-Bold').text(`6. TOTAL OFERTA CON AIU:`, 310, aiuTabY + 25)
           .font('Helvetica-Bold').fillColor('#047857').text(fCOP(totales.gran_total_oferta_cop), 440, aiuTabY + 25);

        doc.y = aiuTabY + 48;

        // Declaraciones Juramentadas y Compromisos
        doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text('DECLARACIONES Y MANIFESTACIONES VINCULANTES:');
        doc.moveDown(0.2);

        const declaraciones = [
          `1. VALIDEZ DE LA OFERTA: Manifiesto que la presente propuesta económica es obligatoria e inmodificable por un término de ${validez_dias} días calendario a partir de su cierre.`,
          '2. NO RECLAMACIONES DE PRECIO: Garantizo que los precios unitarios ofertados son completos y remuneran todos los costos directos, indirectos, laborales, tributarios, financieros y riesgos asociados.',
          '3. CONOCIMIENTO DEL LUGAR: Declaro haber estudiado detenidamente los pliegos tipo, estudios previos, planos y las condiciones geográficas y técnicas de ejecución de la obra o servicio.',
          '4. INEXISTENCIA DE DESBALANCE: Certifico que los precios unitarios propuestos son razonables, guardan equilibrio con los precios del sector y no constituyen práctica de precios artificialmente bajos ni sobrecostos.',
          `5. CUENTA BANCARIA PARA DESEMBOLSOS: Autorizo el abono a la cuenta de ${banco.nombre}, ${banco.tipo} No. ${banco.numero}.`
        ];

        doc.font('Helvetica').fontSize(6.5).fillColor('#334155');
        declaraciones.forEach(dec => {
          doc.text(dec, { align: 'justify' });
          doc.moveDown(0.15);
        });

        // Bloque de Firma Legal
        const sigY = doc.page.height - 110;
        doc.rect(36, sigY, 540, 68).fillAndStroke('#ffffff', '#e2e8f0');

        doc.fillColor('#0f172a').fontSize(7).font('Helvetica-Bold').text('ATENTAMENTE / PROPONENTE RESPONSABLE:', 44, sigY + 6);
        doc.moveDown(0.5);

        doc.font('Helvetica-Bold').text('________________________________________________________', 44, sigY + 34);
        doc.font('Helvetica-Bold').fillColor('#1e3a8a').text(
          esConsorcio ? `${consorcio.representante} (Representante de la Estructura Plural)` : (oferente.representante_legal || 'Representante Legal'),
          44, sigY + 44
        );
        doc.font('Helvetica').fillColor('#475569').text(
          `C.C. ${oferente.cedula_representante || '________________'} • Razón Social: ${oferente.razon_social} (NIT: ${oferente.nit}) • Correo: ${oferente.email}`,
          44, sigY + 54
        );

        // =========================================================================
        // PÁGINA 2: FORMULARIO 2 - PRESUPUESTO OFICIAL Y PRECIOS UNITARIOS (APUS)
        // =========================================================================
        doc.addPage();

        doc.fontSize(7.5).fillColor('#64748b').text('REPÚBLICA DE COLOMBIA • AGENCIA NACIONAL DE CONTRATACIÓN PÚBLICA (ANCP-CCE)', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text('FORMULARIO 2: CUADRO DE PRESUPUESTO OFICIAL Y PRECIOS UNITARIOS (APU)', { align: 'center' });
        doc.fontSize(7.5).fillColor('#475569').font('Helvetica').text(`Proceso: ${proceso.referencia} • Proponente: ${oferente.razon_social}`, { align: 'center' });
        doc.moveDown(0.5);

        // Tabla de ítems detallados
        const tableTop = doc.y;
        doc.rect(36, tableTop, 540, 14).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(6.5).font('Helvetica-Bold');
        doc.text('ITEM', 42, tableTop + 4, { width: 30 });
        doc.text('CÓDIGO', 72, tableTop + 4, { width: 38 });
        doc.text('DESCRIPCIÓN DEL ÍTEM', 112, tableTop + 4, { width: 200 });
        doc.text('UND', 315, tableTop + 4, { width: 25, align: 'center' });
        doc.text('CANT', 345, tableTop + 4, { width: 35, align: 'right' });
        doc.text('P.U. SIN AIU', 385, tableTop + 4, { width: 75, align: 'right' });
        doc.text('SUBTOTAL DIRECTO', 465, tableTop + 4, { width: 105, align: 'right' });

        let currentY = tableTop + 14;
        const maxItemsP2 = Math.min(items.length, 22);

        for (let i = 0; i < maxItemsP2; i++) {
          const it = items[i];
          doc.rect(36, currentY, 540, 14).fillAndStroke(i % 2 === 0 ? '#f8fafc' : '#ffffff', '#e2e8f0');

          doc.fillColor('#0f172a').fontSize(6.5).font('Helvetica-Bold').text(String(it.item_no), 42, currentY + 3, { width: 30 });
          doc.font('Helvetica').text(it.codigo, 72, currentY + 3, { width: 38 });
          doc.text(it.descripcion.slice(0, 52), 112, currentY + 3, { width: 200 });
          doc.text(it.unidad, 315, currentY + 3, { width: 25, align: 'center' });
          doc.text(String(it.cantidad), 345, currentY + 3, { width: 35, align: 'right' });
          doc.text(fCOP(it.precio_unitario), 385, currentY + 3, { width: 75, align: 'right' });
          doc.font('Helvetica-Bold').text(fCOP(it.subtotal), 465, currentY + 3, { width: 105, align: 'right' });

          currentY += 14;
        }

        if (items.length > maxItemsP2) {
          doc.rect(36, currentY, 540, 12).fillAndStroke('#f1f5f9', '#cbd5e1');
          doc.fillColor('#64748b').fontSize(6).font('Helvetica-Oblique').text(
            `... y ${items.length - maxItemsP2} ítems adicionales detallados en anexo técnico complementario y Excel de SECOP II.`, 44, currentY + 2
          );
          currentY += 12;
        }

        doc.y = currentY + 8;

        // Bloque de consolidación final con AIU
        const totalBoxY = doc.y;
        doc.rect(260, totalBoxY, 316, 85).fillAndStroke('#f8fafc', '#0f172a');
        doc.fillColor('#0f172a').fontSize(6.8);

        doc.font('Helvetica-Bold').text('SUBTOTAL COSTO DIRECTO:', 270, totalBoxY + 6)
           .font('Helvetica-Bold').text(fCOP(totales.total_directo_cop), 465, totalBoxY + 6, { width: 105, align: 'right' });

        doc.font('Helvetica').text(`(+) Administración (${aiu_desglose.administracion_pct}%):`, 270, totalBoxY + 18)
           .text(fCOP(totales.administracion_cop), 465, totalBoxY + 18, { width: 105, align: 'right' });

        doc.font('Helvetica').text(`(+) Imprevistos (${aiu_desglose.imprevistos_pct}%):`, 270, totalBoxY + 30)
           .text(fCOP(totales.imprevistos_cop), 465, totalBoxY + 30, { width: 105, align: 'right' });

        doc.font('Helvetica').text(`(+) Utilidad (${aiu_desglose.utilidad_pct}%):`, 270, totalBoxY + 42)
           .text(fCOP(totales.utilidad_cop), 465, totalBoxY + 42, { width: 105, align: 'right' });

        doc.font('Helvetica').text(`(+) IVA 19% s/ Utilidad (Art. 462-1 E.T.):`, 270, totalBoxY + 54)
           .text(fCOP(totales.iva_utilidad_cop), 465, totalBoxY + 54, { width: 105, align: 'right' });

        doc.rect(260, totalBoxY + 68, 316, 17).fill('#1e3a8a');
        doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold').text('GRAN TOTAL PROPUESTA ECONÓMICA:', 270, totalBoxY + 72)
           .text(fCOP(totales.gran_total_oferta_cop), 450, totalBoxY + 72, { width: 120, align: 'right' });

        // Bloque de Firma de Ingeniería y Representación Legal
        const botSigY = doc.page.height - 80;
        doc.fillColor('#0f172a').fontSize(6.8).font('Helvetica-Bold');
        doc.text('___________________________________________', 44, botSigY);
        doc.text(oferente.representante_legal || 'Representante Legal', 44, botSigY + 10);
        doc.font('Helvetica').fontSize(6).fillColor('#64748b').text('Representante Legal Proponente', 44, botSigY + 18);

        doc.fillColor('#0f172a').fontSize(6.8).font('Helvetica-Bold');
        doc.text('___________________________________________', 320, botSigY);
        doc.text('Ingeniero de Costos / Director de Licitaciones', 320, botSigY + 10);
        doc.font('Helvetica').fontSize(6).fillColor('#64748b').text('Matrícula Profesional COPNIA / RUP', 320, botSigY + 18);

        // Numeración de páginas
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(6.5).font('Helvetica').fillColor('#94a3b8')
             .text(`Radar SECOP • Sobre Económico Oficial CCE • Proceso ${proceso.referencia} • Página ${i + 1} de ${pages.count}`, 36, doc.page.height - 24, { align: 'center', width: 540 });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Genera el Libro Excel (.xlsx) estructurado con fórmulas nativas de cálculo
   * Idéntico a las plantillas estándar ANCP-CCE de SECOP II
   * 
   * @param {Object} data - Datos calculados por liquidarPropuesta
   * @returns {Promise<Buffer>}
   */
  async generarPresupuestoExcel(data) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Radar SECOP - NIKADU IA';
    workbook.lastModifiedBy = 'Radar SECOP';
    workbook.created = new Date();
    workbook.modified = new Date();

    const { proceso, oferente, totales, aiu_desglose, items, banco, validez_dias, ciudad_firma } = data;

    // -------------------------------------------------------------
    // HOJA 1: RESUMEN Y CARTA ECONÓMICA
    // -------------------------------------------------------------
    const wsCarta = workbook.addWorksheet('1. Carta Económica CCE');
    wsCarta.views = [{ showGridLines: true }];

    wsCarta.columns = [
      { width: 25 },
      { width: 35 },
      { width: 20 },
      { width: 25 }
    ];

    wsCarta.mergeCells('A1:D1');
    wsCarta.getCell('A1').value = 'REPÚBLICA DE COLOMBIA • AGENCIA NACIONAL DE CONTRATACIÓN PÚBLICA (ANCP-CCE)';
    wsCarta.getCell('A1').font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
    wsCarta.getCell('A1').alignment = { horizontal: 'center' };

    wsCarta.mergeCells('A2:D2');
    wsCarta.getCell('A2').value = 'FORMULARIO 1: CARTA DE PRESENTACIÓN DE LA PROPUESTA ECONÓMICA';
    wsCarta.getCell('A2').font = { size: 12, bold: true, color: { argb: 'FF0F172A' } };
    wsCarta.getCell('A2').alignment = { horizontal: 'center' };

    wsCarta.addRow([]);
    wsCarta.addRow(['NÚMERO DE PROCESO:', proceso.referencia, 'FECHA EMISIÓN:', new Date().toLocaleDateString('es-CO')]);
    wsCarta.addRow(['ENTIDAD CONTRATANTE:', proceso.entidad, 'VALIDEZ OFERTA:', `${validez_dias} días calendario`]);
    wsCarta.addRow(['PROPONENTE:', oferente.razon_social, 'NIT:', oferente.nit]);
    wsCarta.addRow(['REPRESENTANTE LEGAL:', oferente.representante_legal, 'CÉDULA:', oferente.cedula_representante]);
    wsCarta.addRow(['DOMICILIO / CIUDAD:', ciudad_firma, 'CORREO:', oferente.email]);
    wsCarta.addRow(['CUENTA BANCARIA:', `${banco.nombre} - ${banco.tipo}`, 'NÚMERO CUENTA:', banco.numero]);

    ['A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9'].forEach(c => {
      wsCarta.getCell(c).font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
    });

    wsCarta.addRow([]);
    wsCarta.addRow(['RESUMEN DE LIQUIDACIÓN ECONÓMICA OFICIAL:']);
    wsCarta.getCell('A11').font = { bold: true, size: 11, color: { argb: 'FF1E3A8A' } };

    const tablaRowStart = 12;
    wsCarta.addRow(['CONCEPTO', 'PORCENTAJE', 'VALOR MONEDA LEGAL (COP)', 'ESTADO']);
    wsCarta.getRow(tablaRowStart).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ['A12', 'B12', 'C12', 'D12'].forEach(c => {
      wsCarta.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    });

    wsCarta.addRow(['1. Costos Directos de la Oferta', '--', totales.total_directo_cop, 'Conforme']);
    wsCarta.addRow(['2. Administración (A)', `${aiu_desglose.administracion_pct}%`, totales.administracion_cop, 'Conforme']);
    wsCarta.addRow(['3. Imprevistos (I)', `${aiu_desglose.imprevistos_pct}%`, totales.imprevistos_cop, 'Conforme']);
    wsCarta.addRow(['4. Utilidad (U)', `${aiu_desglose.utilidad_pct}%`, totales.utilidad_cop, 'Conforme']);
    wsCarta.addRow(['5. IVA 19% s/ Utilidad (Art. 462-1 E.T.)', '19.00%', totales.iva_utilidad_cop, 'Tributario']);
    wsCarta.addRow(['GRAN TOTAL PROPUESTA ECONÓMICA', `${aiu_desglose.aiu_total_pct}% AIU`, totales.gran_total_oferta_cop, 'TOTAL VINCULANTE']);

    // Formato de moneda para la tabla
    for (let r = 13; r <= 18; r++) {
      wsCarta.getCell(`C${r}`).numFmt = '$#,##0';
    }
    wsCarta.getRow(18).font = { bold: true, size: 11, color: { argb: 'FF047857' } };

    wsCarta.addRow([]);
    wsCarta.mergeCells('A20:D20');
    wsCarta.getCell('A20').value = `VALOR TOTAL EN LETRAS: ${totales.gran_total_letras}`;
    wsCarta.getCell('A20').font = { bold: true, size: 9, color: { argb: 'FF0F172A' } };

    // -------------------------------------------------------------
    // HOJA 2: PRESUPUESTO Y PRECIOS UNITARIOS CON FÓRMULAS VINCULADAS
    // -------------------------------------------------------------
    const wsPresupuesto = workbook.addWorksheet('2. Presupuesto y APUs');
    wsPresupuesto.views = [{ showGridLines: true }];

    wsPresupuesto.columns = [
      { key: 'item_no', width: 8 },
      { key: 'codigo', width: 12 },
      { key: 'descripcion', width: 45 },
      { key: 'unidad', width: 10 },
      { key: 'cantidad', width: 14 },
      { key: 'fase', width: 14 },
      { key: 'precio_unitario', width: 18 },
      { key: 'subtotal', width: 22 }
    ];

    wsPresupuesto.mergeCells('A1:H1');
    wsPresupuesto.getCell('A1').value = `CUADRO DE PRECIOS UNITARIOS Y PRESUPUESTO - PROCESO: ${proceso.referencia}`;
    wsPresupuesto.getCell('A1').font = { size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    wsPresupuesto.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    wsPresupuesto.getCell('A1').alignment = { horizontal: 'center' };

    const headerRow = wsPresupuesto.addRow([
      'ITEM', 'CÓDIGO', 'DESCRIPCIÓN DEL ÍTEM', 'UNIDAD', 'CANTIDAD', 'FASE', 'P.U. SIN AIU ($)', 'SUBTOTAL DIRECTO ($)'
    ]);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    for (let c = 1; c <= 8; c++) {
      headerRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      headerRow.getCell(c).alignment = { horizontal: 'center' };
    }

    const rowStart = 3;
    items.forEach((it, idx) => {
      const rowNum = rowStart + idx;
      const r = wsPresupuesto.addRow([
        it.item_no,
        it.codigo,
        it.descripcion,
        it.unidad,
        it.cantidad,
        it.fase,
        it.precio_unitario,
        { formula: `E${rowNum}*G${rowNum}`, result: it.subtotal }
      ]);

      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(4).alignment = { horizontal: 'center' };
      r.getCell(5).alignment = { horizontal: 'right' };
      r.getCell(6).alignment = { horizontal: 'center' };
      r.getCell(7).numFmt = '$#,##0';
      r.getCell(8).numFmt = '$#,##0';
      r.getCell(8).font = { bold: true };
    });

    const lastItemRow = rowStart + items.length - 1;

    // Filas de consolidación y AIU
    wsPresupuesto.addRow([]);
    const subtotalDirectoRow = wsPresupuesto.addRow([
      '', '', 'SUBTOTAL COSTO DIRECTO DE LA PROPUESTA', '', '', '', '',
      { formula: `SUM(H${rowStart}:H${lastItemRow})`, result: totales.total_directo_cop }
    ]);
    subtotalDirectoRow.font = { bold: true, size: 10 };
    subtotalDirectoRow.getCell(8).numFmt = '$#,##0';

    const rAdmin = wsPresupuesto.addRow([
      '', '', `(+) Administración (${aiu_desglose.administracion_pct}%)`, '', '', '', `${aiu_desglose.administracion_pct}%`,
      { formula: `H${subtotalDirectoRow.number}*${aiu_desglose.administracion_pct / 100}`, result: totales.administracion_cop }
    ]);
    rAdmin.getCell(8).numFmt = '$#,##0';

    const rImprev = wsPresupuesto.addRow([
      '', '', `(+) Imprevistos (${aiu_desglose.imprevistos_pct}%)`, '', '', '', `${aiu_desglose.imprevistos_pct}%`,
      { formula: `H${subtotalDirectoRow.number}*${aiu_desglose.imprevistos_pct / 100}`, result: totales.imprevistos_cop }
    ]);
    rImprev.getCell(8).numFmt = '$#,##0';

    const rUtil = wsPresupuesto.addRow([
      '', '', `(+) Utilidad (${aiu_desglose.utilidad_pct}%)`, '', '', '', `${aiu_desglose.utilidad_pct}%`,
      { formula: `H${subtotalDirectoRow.number}*${aiu_desglose.utilidad_pct / 100}`, result: totales.utilidad_cop }
    ]);
    rUtil.getCell(8).numFmt = '$#,##0';

    const rIva = wsPresupuesto.addRow([
      '', '', `(+) IVA Especial 19% s/ Utilidad (Art. 462-1 E.T.)`, '', '', '', '19.00%',
      { formula: `H${rUtil.number}*0.19`, result: totales.iva_utilidad_cop }
    ]);
    rIva.getCell(8).numFmt = '$#,##0';

    const totalFinalRow = wsPresupuesto.addRow([
      '', '', 'VALOR TOTAL PROPUESTA ECONÓMICA (INCLUIDO AIU E IVA S/ UTILIDAD)', '', '', '', '',
      { formula: `H${subtotalDirectoRow.number}+H${rAdmin.number}+H${rImprev.number}+H${rUtil.number}+H${rIva.number}`, result: totales.gran_total_oferta_cop }
    ]);
    totalFinalRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    totalFinalRow.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    totalFinalRow.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
    totalFinalRow.getCell(8).numFmt = '$#,##0';

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = new EconomicProposalEngine();
