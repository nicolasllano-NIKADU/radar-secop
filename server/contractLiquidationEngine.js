/**
 * ====================================================================
 * RADAR SECOP - MOTOR DE LIQUIDACIÓN FINAL DE CONTRATOS Y CIERRE DE BALANCES
 * Marco Normativo y Jurisprudencial:
 * - Ley 80 de 1993 (Art. 60: Obligatoriedad y contenido de la liquidación)
 * - Ley 1150 de 2007 (Art. 11: Plazos de liquidación bilateral y unilateral)
 * - Decreto Ley 019 de 2012 (Art. 217: Términos y caducidad del medio de control)
 * - Decreto 1082 de 2015 (Amparos de la Garantía Poscontractual)
 * - Consejo de Estado Sección Tercera (Fuerza vinculante del balance y salvedades)
 * ====================================================================
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

class ContractLiquidationEngine {
  constructor() {
    this.PLAZO_LIQUIDACION_BILATERAL_MESES = 4;
    this.PLAZO_LIQUIDACION_UNILATERAL_MESES = 2;
    this.CADUCIDAD_SUBSIDIARIA_ANOS = 2;
  }

  /**
   * Realiza la conciliación contable y financiera del balance de liquidación
   * 
   * @param {Object} params
   * @param {number} params.valorInicial - Valor original contractual
   * @param {number} [params.adiciones=0] - Modificaciones en valor adicionales
   * @param {number} params.valorEjecutado - Total ejecutado a satisfacción en actas
   * @param {number} params.valorPagado - Total desembolsado por tesorería
   * @param {number} [params.anticipoConcedido=0] - Anticipo total entregado
   * @param {number} [params.anticipoAmortizado=0] - Anticipo amortizado en actas
   * @param {number} [params.retencionesGarantia=0] - Retenciones en garantía a devolver
   * @param {number} [params.multasODeducciones=0] - Sanciones o deducciones pecuniarias
   * @param {string} [params.salvedades=''] - Salvedades u observaciones expresas
   * @returns {Object}
   */
  liquidarContratoBalance({
    valorInicial = 0,
    adiciones = 0,
    valorEjecutado = 0,
    valorPagado = 0,
    anticipoConcedido = 0,
    anticipoAmortizado = 0,
    retencionesGarantia = 0,
    multasODeducciones = 0,
    salvedades = ''
  }) {
    const vIni = Number(valorInicial) || 0;
    const vAdic = Number(adiciones) || 0;
    const vContratoFinal = vIni + vAdic;

    const vEjec = Number(valorEjecutado) || 0;
    const vPag = Number(valorPagado) || 0;

    const antConcedido = Number(anticipoConcedido) || 0;
    const antAmort = Number(anticipoAmortizado) || 0;
    const antPendiente = Math.max(0, antConcedido - antAmort);

    const retGarantia = Number(retencionesGarantia) || 0;
    const deducciones = Number(multasODeducciones) || 0;

    const saldoEjecucionPendiente = vEjec - vPag;
    const saldoNeto = (saldoEjecucionPendiente + retGarantia) - (antPendiente + deducciones);

    let direccion = 'A_PAZ_Y_SALVO_CERO';
    let resumenSaldoTexto = 'Las partes se declaran a paz y salvo total por todo concepto contractual.';

    if (saldoNeto > 0.01) {
      direccion = 'A_FAVOR_CONTRATISTA';
      resumenSaldoTexto = `Existe un saldo neto a favor del Contratista por valor de $${saldoNeto.toLocaleString('es-CO')} COP que debe ser pagado por la Entidad Estatal.`;
    } else if (saldoNeto < -0.01) {
      direccion = 'A_FAVOR_ENTIDAD';
      resumenSaldoTexto = `Existe un saldo neto a favor de la Entidad Estatal por valor de $${Math.abs(saldoNeto).toLocaleString('es-CO')} COP que debe ser reintegrado por el Contratista.`;
    }

    const pctEjecucion = vContratoFinal > 0 ? (vEjec / vContratoFinal) * 100 : 0;
    const saldoContratoNoEjecutado = Math.max(0, vContratoFinal - vEjec);

    // Amparos Poscontractuales requeridos por Decreto 1082/2015
    const amparosPoscontractuales = [
      {
        amparo: 'ESTABILIDAD_Y_CALIDAD_OBRA',
        nombre: 'Estabilidad y Calidad de la Obra (Art. 2060 Código Civil)',
        porcentaje: 20.0,
        baseCalculo: vEjec,
        valorAsegurado: Number((vEjec * 0.20).toFixed(2)),
        vigenciaTexto: 'Cinco (5) años contados a partir de la firma del acta de liquidación',
        vigenciaAnos: 5
      },
      {
        amparo: 'PAGO_SALARIOS_PRESTACIONES',
        nombre: 'Pago de Salarios, Prestaciones Sociales e Indemnizaciones Laborales',
        porcentaje: 5.0,
        baseCalculo: vEjec,
        valorAsegurado: Number((vEjec * 0.05).toFixed(2)),
        vigenciaTexto: 'Tres (3) años contados a partir de la firma del acta de liquidación (Art. 488 CST)',
        vigenciaAnos: 3
      }
    ];

    return {
      balance_financiero: {
        valor_contrato_inicial: vIni,
        valor_adiciones: vAdic,
        valor_contrato_final: vContratoFinal,
        valor_total_ejecutado: vEjec,
        valor_total_pagado: vPag,
        saldo_ejecucion_pendiente_pago: Number(saldoEjecucionPendiente.toFixed(2)),
        saldo_contrato_no_ejecutado_liberar: Number(saldoContratoNoEjecutado.toFixed(2)),
        porcentaje_ejecucion: Number(pctEjecucion.toFixed(2))
      },
      anticipo_balance: {
        anticipo_concedido: antConcedido,
        anticipo_amortizado: antAmort,
        anticipo_pendiente: antPendiente,
        totalmente_amortizado: antPendiente === 0
      },
      deducciones_y_retenciones: {
        retenciones_garantia_devolucion: retGarantia,
        multas_descuentos_sanciones: deducciones
      },
      cierre_financiero: {
        saldo_neto_final: Number(saldoNeto.toFixed(2)),
        direccion_saldo: direccion,
        dictamen_saldo: resumenSaldoTexto
      },
      amparos_poscontractuales: amparosPoscontractuales,
      salvedades_contratista: salvedades || 'Sin salvedades expresas. Las partes suscriben de mutuo acuerdo.'
    };
  }

  /**
   * Genera el Acta Formal Institucional de Liquidación Bilateral del Contrato en PDF
   * Cumple con los estándares formales de ANCP-CCE y Ley 80 Art. 60
   * 
   * @param {Object} data
   * @returns {Promise<Buffer>}
   */
  async generarActaLiquidacionPdf(data) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: 36, bottom: 36, left: 36, right: 36 },
          bufferPages: true
        });

        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const {
          proceso_numero = 'LP-OBRA-2026-001',
          contrato_numero = 'CTO-2026-045',
          entidad_nombre = 'ENTIDAD ESTATAL CONTRATANTE',
          contratista_nombre = 'CONSORCIO CONSTRUCTOR COLOMBIA',
          contratista_nit = '901.456.789-1',
          interventor_nombre = 'CONSORCIO INTERVENTORÍA ANDINA',
          fecha_terminacion = '2026-09-30',
          fecha_liquidacion = new Date().toISOString().split('T')[0],
          liquidacion = {}
        } = data;

        const primaryColor = '#1E3A8A';   // Azul institucional
        const emeraldColor = '#059669';   // Verde éxito
        const accentRed = '#DC2626';
        const darkText = '#0F172A';
        const grayText = '#475569';
        const lightBg = '#F8FAFC';

        const bf = liquidacion.balance_financiero || {};
        const cf = liquidacion.cierre_financiero || {};
        const ant = liquidacion.anticipo_balance || {};
        const amparos = liquidacion.amparos_poscontractuales || [];

        // -------------------------------------------------------------
        // ENCABEZADO INSTITUCIONAL
        // -------------------------------------------------------------
        doc.rect(36, 36, 540, 52).fillAndStroke('#F0FDF4', '#BBF7D0');
        
        doc.fillColor(emeraldColor).fontSize(10).font('Helvetica-Bold')
           .text('REPÚBLICA DE COLOMBIA • CONTRATACIÓN PÚBLICA ESTATAL', 46, 44, { align: 'center', width: 520 });
        doc.fillColor(darkText).fontSize(11).font('Helvetica-Bold')
           .text('ACTA DE LIQUIDACIÓN BILATERAL DE MUTUO ACUERDO DEL CONTRATO', 46, 57, { align: 'center', width: 520 });
        doc.fillColor(grayText).fontSize(7.5).font('Helvetica')
           .text('Ley 80 de 1993 Art. 60 • Ley 1150 de 2007 Art. 11 • Decreto 1082 de 2015', 46, 72, { align: 'center', width: 520 });

        doc.y = 98;

        // -------------------------------------------------------------
        // FICHA TÉCNICA Y COMPARECIENTES
        // -------------------------------------------------------------
        doc.rect(36, doc.y, 540, 68).fillAndStroke(lightBg, '#E2E8F0');
        const cardY = doc.y + 6;

        doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('DATOS DE IDENTIFICACIÓN CONTRACTUAL', 44, cardY);
        
        let lineY = cardY + 12;
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(darkText).text('Entidad Estatal: ', 44, lineY, { continued: true })
           .font('Helvetica').text(entidad_nombre);
        doc.font('Helvetica-Bold').text('Contrato / Proceso: ', 320, lineY, { continued: true })
           .font('Helvetica').text(`${contrato_numero} / ${proceso_numero}`);

        lineY += 11;
        doc.font('Helvetica-Bold').text('Contratista Ejecutor: ', 44, lineY, { continued: true })
           .font('Helvetica').text(`${contratista_nombre} (NIT: ${contratista_nit})`);
        doc.font('Helvetica-Bold').text('Interventoría / Supervisión: ', 320, lineY, { continued: true })
           .font('Helvetica').text(interventor_nombre);

        lineY += 11;
        doc.font('Helvetica-Bold').text('Fecha Terminación de Obra: ', 44, lineY, { continued: true })
           .font('Helvetica').text(fecha_terminacion);
        doc.font('Helvetica-Bold').text('Fecha de Liquidación: ', 320, lineY, { continued: true })
           .font('Helvetica').text(fecha_liquidacion);

        lineY += 11;
        doc.font('Helvetica-Bold').text('Valor Final Contrato (c/adic): ', 44, lineY, { continued: true })
           .font('Helvetica').text(`$${Number(bf.valor_contrato_final || 0).toLocaleString('es-CO')} COP`);
        doc.font('Helvetica-Bold').text('Ejecución Física y Financiera: ', 320, lineY, { continued: true })
           .font('Helvetica-Bold').fillColor(emeraldColor).text(`${Number(bf.porcentaje_ejecucion || 0).toFixed(2)}% ($${Number(bf.valor_total_ejecutado || 0).toLocaleString('es-CO')})`);

        doc.y = cardY + 68;

        // -------------------------------------------------------------
        // CAPÍTULO I: BALANCE FINANCIERO Y CONTABLE DETALLADO
        // -------------------------------------------------------------
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text('I. BALANCE FINANCIERO CONSOLIDADO DEL CONTRATO', 36, doc.y);
        doc.y += 10;

        const tableY = doc.y;
        doc.rect(36, tableY, 540, 16).fill(primaryColor);
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#FFFFFF');
        doc.text('CONCEPTO FINANCIERO', 42, tableY + 4, { width: 330 });
        doc.text('PORCENTAJE', 375, tableY + 4, { width: 65, align: 'right' });
        doc.text('VALOR MONEDA LEGAL (COP)', 445, tableY + 4, { width: 125, align: 'right' });

        let rowY = tableY + 16;
        const filasBalance = [
          { c: 'Valor Inicial del Contrato', p: '100.00%', v: bf.valor_contrato_inicial || 0 },
          { c: 'Valor Adiciones Aprobadas', p: '-', v: bf.valor_adiciones || 0 },
          { c: 'VALOR DEFINITIVO DEL CONTRATO (Inicial + Adiciones)', p: '100.00%', v: bf.valor_contrato_final || 0, bold: true },
          { c: 'Total Facturado y Ejecutado a Satisfacción', p: `${bf.porcentaje_ejecucion || 0}%`, v: bf.valor_total_ejecutado || 0 },
          { c: 'Total Pagado Efectivamente por Tesorería', p: '-', v: bf.valor_total_pagado || 0 },
          { c: 'Anticipo Concedido vs Amortizado en Actas', p: ant.totalmente_amortizado ? '100% AMORTIZADO' : 'PENDIENTE', v: ant.anticipo_pendiente || 0 },
          { c: 'Devolución de Retenciones en Garantía', p: '-', v: liquidacion.deducciones_y_retenciones?.retenciones_garantia_devolucion || 0 },
          { c: 'Descuentos por Multas o Sanciones Pecuniarias', p: '-', v: liquidacion.deducciones_y_retenciones?.multas_descuentos_sanciones || 0 }
        ];

        filasBalance.forEach((f, idx) => {
          const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          doc.rect(36, rowY, 540, 14).fillAndStroke(bg, '#E2E8F0');
          doc.font(f.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.5).fillColor(darkText).text(f.c, 42, rowY + 3.5, { width: 330 });
          doc.font('Helvetica').fontSize(6.5).fillColor(grayText).text(f.p, 375, rowY + 3.5, { width: 65, align: 'right' });
          doc.font(f.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.5).fillColor(darkText).text(`$${Number(f.v).toLocaleString('es-CO')}`, 445, rowY + 3.5, { width: 125, align: 'right' });
          rowY += 14;
        });

        // Fila Saldo Neto Final
        const colorSaldo = cf.direccion_saldo === 'A_FAVOR_CONTRATISTA' ? emeraldColor : (cf.direccion_saldo === 'A_FAVOR_ENTIDAD' ? accentRed : primaryColor);
        doc.rect(36, rowY, 540, 16).fillAndStroke('#DCFCE7', '#86EFAC');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#166534')
           .text(`SALDO NETO FINAL DE LIQUIDACIÓN (${cf.direccion_saldo}):`, 42, rowY + 4, { width: 380 });
        doc.text(`$${Number(cf.saldo_neto_final || 0).toLocaleString('es-CO')} COP`, 425, rowY + 4, { width: 145, align: 'right' });

        doc.y = rowY + 22;

        // -------------------------------------------------------------
        // CAPÍTULO II: DECLARACIÓN DE PAZ Y SALVO Y DESTINACIÓN DE SALDOS
        // -------------------------------------------------------------
        doc.rect(36, doc.y, 540, 42).fillAndStroke('#F8FAFC', '#E2E8F0');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(primaryColor).text('DICTAMEN DE PAZ Y SALVO Y CIERRE CONTRACTUAL:', 44, doc.y + 5);
        doc.font('Helvetica').fontSize(6.8).fillColor(darkText)
           .text(cf.dictamen_saldo || 'Las partes se declaran a paz y salvo recíproco.', 44, doc.y + 16, { width: 520, lineGap: 1.2 });

        doc.y += 48;

        // -------------------------------------------------------------
        // CAPÍTULO III: GARANTÍAS Y AMPAROS POSCONTRACTUALES (DEC. 1082/2015)
        // -------------------------------------------------------------
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text('II. AMPAROS DE LA GARANTÍA POSCONTRACTUAL VIGENTE', 36, doc.y);
        doc.y += 10;

        const tableGarantiasY = doc.y;
        doc.rect(36, tableGarantiasY, 540, 15).fill(emeraldColor);
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#FFFFFF');
        doc.text('AMPARO POSCONTRACTUAL', 40, tableGarantiasY + 4, { width: 230 });
        doc.text('VIGENCIA EXIGIDA', 275, tableGarantiasY + 4, { width: 155 });
        doc.text('VALOR ASEGURADO (COP)', 435, tableGarantiasY + 4, { width: 135, align: 'right' });

        let gRowY = tableGarantiasY + 15;
        amparos.forEach((amp, idx) => {
          const bg = idx % 2 === 0 ? '#FFFFFF' : '#F0FDF4';
          doc.rect(36, gRowY, 540, 15).fillAndStroke(bg, '#DCFCE7');

          doc.font('Helvetica-Bold').fontSize(6.2).fillColor(darkText).text(amp.nombre, 40, gRowY + 3.5, { width: 230 });
          doc.font('Helvetica').fontSize(6).fillColor(grayText).text(amp.vigenciaTexto, 275, gRowY + 3.5, { width: 155 });
          doc.font('Helvetica-Bold').fontSize(6.5).fillColor(emeraldColor).text(`$${Number(amp.valorAsegurado).toLocaleString('es-CO')}`, 435, gRowY + 3.5, { width: 135, align: 'right' });

          gRowY += 15;
        });

        doc.y = gRowY + 12;

        // -------------------------------------------------------------
        // CAPÍTULO IV: CONSTANCIA SOBRE SALVEDADES
        // -------------------------------------------------------------
        doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('III. CONSTANCIA SOBRE SALVEDADES U OBSERVACIONES', 36, doc.y);
        doc.y += 8;

        doc.rect(36, doc.y, 540, 32).fillAndStroke('#FFFBEB', '#FDE68A');
        doc.font('Helvetica').fontSize(6.5).fillColor('#78350F')
           .text(liquidacion.salvedades_contratista || 'Sin salvedades. Suscrito de mutuo acuerdo sin reservas.', 44, doc.y + 6, { width: 520, lineGap: 1.1 });

        doc.y += 38;

        // -------------------------------------------------------------
        // CAPÍTULO V: FIRMAS DE LAS PARTES Y SUPERVISIÓN
        // -------------------------------------------------------------
        if (doc.y > 620) {
          doc.addPage();
          doc.y = 36;
        }

        doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('FIRMAS Y SUSCRIPCIÓN FORMAL', 36, doc.y);
        doc.y += 10;

        const fWidth = 165;
        const fGap = 22;
        const fx1 = 36;
        const fx2 = fx1 + fWidth + fGap;
        const fx3 = fx2 + fWidth + fGap;

        [fx1, fx2, fx3].forEach(x => {
          doc.rect(x, doc.y, fWidth, 54).fillAndStroke('#FFFFFF', '#CBD5E1');
          doc.moveTo(x + 10, doc.y + 36).lineTo(x + fWidth - 10, doc.y + 36).stroke('#94A3B8');
        });

        const fy = doc.y;
        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(darkText);
        doc.text('ORDENADOR DEL GASTO / ENTIDAD', fx1, fy + 39, { width: fWidth, align: 'center' });
        doc.font('Helvetica').fontSize(6).fillColor(grayText)
           .text(`${entidad_nombre}\nRepresentante Legal / Delegado`, fx1, fy + 47, { width: fWidth, align: 'center' });

        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(darkText);
        doc.text('CONTRATISTA EJECUTOR', fx2, fy + 39, { width: fWidth, align: 'center' });
        doc.font('Helvetica').fontSize(6).fillColor(grayText)
           .text(`${contratista_nombre}\nNIT: ${contratista_nit}`, fx2, fy + 47, { width: fWidth, align: 'center' });

        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(darkText);
        doc.text('INTERVENTORÍA / SUPERVISIÓN', fx3, fy + 39, { width: fWidth, align: 'center' });
        doc.font('Helvetica').fontSize(6).fillColor(grayText)
           .text(`${interventor_nombre}\nMatrícula Profesional Vigente`, fx3, fy + 47, { width: fWidth, align: 'center' });

        // Numeración de páginas
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(6.5).font('Helvetica').fillColor('#94A3B8')
             .text(`Radar SECOP • Acta de Liquidación Bilateral (Ley 80 Art. 60) • Contrato ${contrato_numero} • Página ${i + 1} de ${pages.count}`, 36, doc.page.height - 24, { align: 'center', width: 540 });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Genera el Libro Excel (.xlsx) estructurado con el Balance Financiero de Liquidación
   * 
   * @param {Object} data
   * @returns {Promise<Buffer>}
   */
  async generarBalanceLiquidacionExcel(data) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Radar SECOP - NIKADU IA';
    workbook.lastModifiedBy = 'Radar SECOP';
    workbook.created = new Date();
    workbook.modified = new Date();

    const {
      proceso_numero = 'LP-OBRA-2026-001',
      contrato_numero = 'CTO-2026-045',
      entidad_nombre = 'ENTIDAD ESTATAL CONTRATANTE',
      contratista_nombre = 'CONSORCIO CONSTRUCTOR COLOMBIA',
      contratista_nit = '901.456.789-1',
      interventor_nombre = 'CONSORCIO INTERVENTORÍA ANDINA',
      fecha_terminacion = '2026-09-30',
      fecha_liquidacion = new Date().toISOString().split('T')[0],
      liquidacion = {}
    } = data;

    const bf = liquidacion.balance_financiero || {};
    const cf = liquidacion.cierre_financiero || {};
    const ant = liquidacion.anticipo_balance || {};
    const amparos = liquidacion.amparos_poscontractuales || [];

    const ws = workbook.addWorksheet('Balance de Liquidación');
    ws.views = [{ showGridLines: true }];

    ws.columns = [
      { width: 35 },
      { width: 30 },
      { width: 22 },
      { width: 25 }
    ];

    ws.mergeCells('A1:D1');
    ws.getCell('A1').value = 'REPÚBLICA DE COLOMBIA • CONTRATACIÓN PÚBLICA ESTATAL';
    ws.getCell('A1').font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
    ws.getCell('A1').alignment = { horizontal: 'center' };

    ws.mergeCells('A2:D2');
    ws.getCell('A2').value = 'BALANCE FINANCIERO Y ACTA DE LIQUIDACIÓN BILATERAL (LEY 80 ART. 60)';
    ws.getCell('A2').font = { size: 12, bold: true, color: { argb: 'FF059669' } };
    ws.getCell('A2').alignment = { horizontal: 'center' };

    ws.addRow([]);
    ws.addRow(['NÚMERO DE CONTRATO:', contrato_numero, 'PROCESO SECOP:', proceso_numero]);
    ws.addRow(['ENTIDAD CONTRATANTE:', entidad_nombre, 'FECHA LIQUIDACIÓN:', fecha_liquidacion]);
    ws.addRow(['CONTRATISTA:', contratista_nombre, 'NIT CONTRATISTA:', contratista_nit]);
    ws.addRow(['INTERVENTORÍA:', interventor_nombre, 'FECHA TERMINACIÓN:', fecha_terminacion]);

    ['A4', 'A5', 'A6', 'A7', 'C4', 'C5', 'C6', 'C7'].forEach(c => {
      ws.getCell(c).font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
    });

    ws.addRow([]);
    ws.addRow(['ESTRUCTURA DEL BALANCE FINANCIERO CONCILIADO:']);
    ws.getCell('A9').font = { bold: true, size: 11, color: { argb: 'FF059669' } };

    const hRow = 10;
    ws.addRow(['CONCEPTO', 'FÓRMULA / BASE', 'VALOR MONEDA LEGAL (COP)', 'ESTADO']);
    ws.getRow(hRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ['A10', 'B10', 'C10', 'D10'].forEach(c => {
      ws.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF059669' }
      };
    });

    ws.addRow(['1. Valor Inicial del Contrato', 'Pactado en pliego', Number(bf.valor_contrato_inicial || 0), 'PACTADO']);
    ws.addRow(['2. Valor Adiciones Aprobadas', 'Modificaciones contractuales', Number(bf.valor_adiciones || 0), 'APROBADO']);
    ws.addRow(['3. Valor Total Definitivo', '=C11+C12', { formula: 'C11+C12' }, 'VIGENTE']);
    ws.addRow(['4. Total Facturado y Ejecutado', 'Actas recibo a satisfacción', Number(bf.valor_total_ejecutado || 0), 'EJECUTADO']);
    ws.addRow(['5. Total Pagado por Tesorería', 'Desembolsos efectivos', Number(bf.valor_total_pagado || 0), 'PAGADO']);
    ws.addRow(['6. Saldo Ejecución Pendiente Pago', '=C14-C15', { formula: 'C14-C15' }, 'POR PAGAR']);
    ws.addRow(['7. Anticipo No Amortizado', 'Saldo insoluto de anticipo', Number(ant.anticipo_pendiente || 0), ant.totalmente_amortizado ? 'AMORTIZADO' : 'PENDIENTE']);
    ws.addRow(['8. Devolución Retención Garantía', 'Retenciones acumuladas', Number(liquidacion.deducciones_y_retenciones?.retenciones_garantia_devolucion || 0), 'A DEVOLVER']);
    ws.addRow(['9. Descuentos por Multas/Sanciones', 'Deducciones pecuniarias', Number(liquidacion.deducciones_y_retenciones?.multas_descuentos_sanciones || 0), 'DESCUENTO']);

    for (let r = 11; r <= 19; r++) {
      ws.getCell(`C${r}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
    }
    ws.getCell('C13').font = { bold: true };

    // Fila Saldo Neto Final
    ws.addRow([
      'SALDO NETO FINAL DE LIQUIDACIÓN',
      '=(C16+C18)-(C17+C19)',
      { formula: '(C16+C18)-(C17+C19)' },
      cf.direccion_saldo
    ]);
    ws.getRow(20).font = { bold: true, color: { argb: 'FF059669' } };
    ['A20', 'B20', 'C20', 'D20'].forEach(c => {
      ws.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDCFCE7' }
      };
      ws.getCell(c).border = {
        top: { style: 'thin' },
        bottom: { style: 'double' }
      };
    });
    ws.getCell('C20').numFmt = '$#,##0.00;($#,##0.00);"-"';

    // Sección Amparos Poscontractuales
    ws.addRow([]);
    ws.addRow(['AMPAROS DE LA GARANTÍA POSCONTRACTUAL (DECRETO 1082 DE 2015):']);
    ws.getCell('A22').font = { bold: true, size: 10, color: { argb: 'FF1E3A8A' } };

    const hAmp = 23;
    ws.addRow(['AMPARO EXIGIDO', 'PORCENTAJE', 'VIGENCIA REQUERIDA', 'VALOR ASEGURADO (COP)']);
    ws.getRow(hAmp).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ['A23', 'B23', 'C23', 'D23'].forEach(c => {
      ws.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }
      };
    });

    let ampRow = 24;
    amparos.forEach(a => {
      ws.addRow([
        a.nombre,
        `${a.porcentaje}%`,
        a.vigenciaTexto,
        Number(a.valorAsegurado)
      ]);
      ws.getCell(`D${ampRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
      ampRow++;
    });

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = new ContractLiquidationEngine();
