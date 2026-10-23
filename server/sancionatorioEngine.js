/**
 * ====================================================================
 * RADAR SECOP - MOTOR DE PROCEDIMIENTOS SANCIONATORIOS Y DEBIDO PROCESO
 * Marco Normativo y Jurisprudencial:
 * - Ley 1474 de 2011, Art. 86 (Procedimiento administrativo sancionatorio)
 * - Ley 80 de 1993, Art. 17 (Caducidad) y Art. 18 (Cláusula Penal Pecuniaria)
 * - Ley 1150 de 2007, Art. 17 (Poder sancionatorio y multas conminatorias)
 * - Decreto 1082 de 2015 (Garantías de cumplimiento y vinculación de aseguradoras)
 * - Código de Procedimiento Administrativo y de lo Contencioso Administrativo (CPACA)
 * - Consejo de Estado Sección Tercera (Sentencias Rad. 41719 y 24900):
 *   * Límite de la multa al 10% del contrato (Principio de proporcionalidad)
 *   * Carácter conminatorio de la multa vs indemnizatorio de la cláusula penal
 *   * Eximentes de responsabilidad: Fuerza mayor, caso fortuito, hecho de un tercero y culpa de la entidad
 * ====================================================================
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

class SancionatorioEngine {
  constructor() {
    this.TOPE_MAXIMO_MULTA_LEGAL_PCT = 10.0; // 10% del contrato según pliegos y doctrina
    this.PORCENTAJE_MULTA_DIARIA_DEFAULT = 0.1; // 0.1% diario (1 por mil)
    this.PORCENTAJE_CLAUSULA_PENAL_DEFAULT = 10.0; // 10% al 20% en caducidad
  }

  /**
   * Tasa y calcula la proporcionalidad de la multa o sanción contractual
   * 
   * @param {Object} params
   * @param {number} params.valorContrato
   * @param {string} params.tipologiaSancion
   * @param {number} [params.diasMora=0]
   * @param {number} [params.porcentajeDiario=0.1]
   * @param {number} [params.topeMaximoPct=10.0]
   * @param {Array<string>} [params.eximentesAlegados=[]]
   * @returns {Object}
   */
  tasarSancionProporcional({
    valorContrato = 0,
    tipologiaSancion = 'MULTA_DIARIA_MORA',
    diasMora = 0,
    porcentajeDiario = 0.1,
    topeMaximoPct = 10.0,
    eximentesAlegados = []
  }) {
    const contrato = Number(valorContrato) || 0;
    const dias = Math.max(0, parseInt(diasMora, 10) || 0);
    const pctDiario = Number(porcentajeDiario) || this.PORCENTAJE_MULTA_DIARIA_DEFAULT;
    const topePct = Math.min(100, Math.max(1, Number(topeMaximoPct) || this.TOPE_MAXIMO_MULTA_LEGAL_PCT));
    const topeMonetario = (contrato * topePct) / 100;

    let montoCalculadoBruto = 0;
    let montoFinalTasado = 0;
    let excedioTope = false;
    let naturalezaSancion = 'CONMINATORIA';

    if (tipologiaSancion === 'MULTA_DIARIA_MORA') {
      naturalezaSancion = 'CONMINATORIA_DE_APREMIO';
      montoCalculadoBruto = contrato * (pctDiario / 100) * dias;
      if (montoCalculadoBruto > topeMonetario) {
        montoFinalTasado = topeMonetario;
        excedioTope = true;
      } else {
        montoFinalTasado = montoCalculadoBruto;
      }
    } else if (tipologiaSancion === 'MULTA_INCUMPLIMIENTO_PARCIAL') {
      naturalezaSancion = 'COMPENSATORIA_PARCIAL';
      montoCalculadoBruto = (contrato * (topePct / 2)) / 100;
      montoFinalTasado = Math.min(montoCalculadoBruto, topeMonetario);
    } else if (tipologiaSancion === 'CLAUSULA_PENAL_PECUNIARIA' || tipologiaSancion === 'DECLARATORIA_CADUCIDAD') {
      naturalezaSancion = 'INDEMNIZATORIA_DEFINITIVA';
      montoCalculadoBruto = (contrato * this.PORCENTAJE_CLAUSULA_PENAL_DEFAULT) / 100;
      montoFinalTasado = montoCalculadoBruto;
    }

    // Análisis de eximentes de responsabilidad
    const eximentesAnalizados = (Array.isArray(eximentesAlegados) ? eximentesAlegados : []).map(ex => {
      let solidezJuridica = 'ALTA';
      let fundamento = 'Exime de culpa al contratista por ausencia de dolo o negligencia.';

      if (ex === 'FUERZA_MAYOR' || ex === 'CASO_FORTUITO') {
        fundamento = 'Art. 64 Código Civil (Imprevisible e irresistible). Rompe el nexo de imputación.';
      } else if (ex === 'HECHO_TERCERO') {
        fundamento = 'Bloqueos de vías o paros cívicos ajenos a la esfera de control del contratista.';
      } else if (ex === 'MORA_ENTIDAD') {
        fundamento = 'Exceptio non adimpleti contractus: la entidad incumplió previamente con predios o anticipo.';
      }

      return {
        eximente: ex,
        solidez: solidezJuridica,
        fundamento: fundamento
      };
    });

    const porcentajeSobreContrato = contrato > 0 ? (montoFinalTasado / contrato) * 100 : 0;

    return {
      tipologia_sancion: tipologiaSancion,
      naturaleza_sancion: naturalezaSancion,
      valor_contrato_base: contrato,
      dias_mora_imputados: dias,
      porcentaje_diario_aplicado: pctDiario,
      tope_maximo_pct: topePct,
      tope_maximo_monetario: Number(topeMonetario.toFixed(2)),
      monto_calculado_bruto: Number(montoCalculadoBruto.toFixed(2)),
      monto_final_tasado: Number(montoFinalTasado.toFixed(2)),
      porcentaje_sobre_contrato: Number(porcentajeSobreContrato.toFixed(2)),
      excedio_tope_legal: excedioTope,
      eximentes_evaluados: eximentesAnalizados,
      dictamen_proporcionalidad: excedioTope
        ? `La tasación matemática bruta excedía el tope legal del ${topePct}%. Se truncó conforme a la jurisprudencia del Consejo de Estado a $${montoFinalTasado.toLocaleString('es-CO')} COP.`
        : `La tasación es proporcional y no vulnera el tope máximo legal del ${topePct}%.`
    };
  }

  /**
   * Genera el Memorial Oficial de Descargos y Defensa del Contratista para la Audiencia del Art. 86
   * 
   * @param {Object} data
   * @returns {Promise<Buffer>}
   */
  async generarAlegatosDescargosPdf(data) {
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
          aseguradora_nombre = 'SEGUROS DEL ESTADO S.A.',
          numero_poliza_cumplimiento = 'POL-CUMP-9874521',
          fecha_citacion = '2026-10-28',
          hechos_imputados = 'Presunto atraso de 45 días en el hito 2 de entrega de cimentaciones.',
          argumentos_defensa = 'El retraso se originó en la falta de entrega oportuna de los permisos ambientales y prediales por parte de la Entidad Estatal.',
          tasacion = {}
        } = data;

        const primaryColor = '#1E3A8A';   // Azul institucional
        const accentRed = '#DC2626';      // Rojo procesal
        const darkText = '#0F172A';
        const grayText = '#475569';
        const lightBg = '#F8FAFC';

        // -------------------------------------------------------------
        // ENCABEZADO PROCESAL (Art. 86 Ley 1474/2011)
        // -------------------------------------------------------------
        doc.rect(36, 36, 540, 52).fillAndStroke('#FEF2F2', '#FECACA');
        
        doc.fillColor(accentRed).fontSize(9.5).font('Helvetica-Bold')
           .text('DEBIDO PROCESO SANCIONATORIO CONTRACTUAL (ART. 86 LEY 1474 DE 2011)', 46, 44, { align: 'center', width: 520 });
        doc.fillColor(darkText).fontSize(11).font('Helvetica-Bold')
           .text('MEMORIAL FORMAL DE DESCARGOS Y ALEGATOS DE DEFENSA TÉCNICA', 46, 57, { align: 'center', width: 520 });
        doc.fillColor(grayText).fontSize(7.5).font('Helvetica')
           .text('Garantía Constitucional del Art. 29 C.P. • Derecho de Defensa • Vinculación Formal de la Compañía Aseguradora', 46, 72, { align: 'center', width: 520 });

        doc.y = 98;

        // -------------------------------------------------------------
        // FICHA DEL EXPEDIENTE Y COMPARECIENTES
        // -------------------------------------------------------------
        doc.rect(36, doc.y, 540, 72).fillAndStroke(lightBg, '#E2E8F0');
        const cardY = doc.y + 6;

        doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('EXPEDIENTE ADMINISTRATIVO SANCIONATORIO', 44, cardY);
        
        let lineY = cardY + 12;
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(darkText).text('Entidad Sancionadora: ', 44, lineY, { continued: true })
           .font('Helvetica').text(entidad_nombre);
        doc.font('Helvetica-Bold').text('Contrato / Proceso: ', 320, lineY, { continued: true })
           .font('Helvetica').text(`${contrato_numero} / ${proceso_numero}`);

        lineY += 11;
        doc.font('Helvetica-Bold').text('Contratista Investigado: ', 44, lineY, { continued: true })
           .font('Helvetica').text(`${contratista_nombre} (NIT: ${contratista_nit})`);
        doc.font('Helvetica-Bold').text('Aseguradora Garante: ', 320, lineY, { continued: true })
           .font('Helvetica').text(`${aseguradora_nombre} (Póliza: ${numero_poliza_cumplimiento})`);

        lineY += 11;
        doc.font('Helvetica-Bold').text('Tipología de Sanción: ', 44, lineY, { continued: true })
           .font('Helvetica-Bold').fillColor(accentRed).text(tasacion.tipologia_sancion || 'MULTA DIARIA POR MORA');
        doc.font('Helvetica-Bold').fillColor(darkText).text('Fecha Citación Audiencia: ', 320, lineY, { continued: true })
           .font('Helvetica').text(fecha_citacion);

        lineY += 11;
        doc.font('Helvetica-Bold').text('Monto Pretendido de Multa: ', 44, lineY, { continued: true })
           .font('Helvetica-Bold').fillColor(accentRed).text(`$${Number(tasacion.monto_final_tasado || 0).toLocaleString('es-CO')} COP (${Number(tasacion.porcentaje_sobre_contrato || 0).toFixed(2)}%)`);
        doc.font('Helvetica-Bold').fillColor(darkText).text('Días de Mora Imputados: ', 320, lineY, { continued: true })
           .font('Helvetica').text(`${tasacion.dias_mora_imputados || 0} Días Calendario`);

        doc.y = cardY + 72;

        // -------------------------------------------------------------
        // CAPÍTULO I: PLIEGO DE CARGOS DE LA INTERVENTORÍA
        // -------------------------------------------------------------
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text('I. CARGOS IMPUTADOS POR LA INTERVENTORÍA / SUPERVISIÓN', 36, doc.y);
        doc.y += 10;

        doc.rect(36, doc.y, 540, 42).fillAndStroke('#FFFBEB', '#FDE68A');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#92400E').text('Informe de Presunto Incumplimiento:', 42, doc.y + 5);
        doc.font('Helvetica').fontSize(6.8).fillColor('#78350F')
           .text(hechos_imputados, 42, doc.y + 16, { width: 526, lineGap: 1.2 });

        doc.y += 48;

        // -------------------------------------------------------------
        // CAPÍTULO II: ALEGATOS DE DEFENSA Y EXIMENTES DE RESPONSABILIDAD
        // -------------------------------------------------------------
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text('II. ALEGATOS DE DESCARGOS Y EXCEPCIONES DE MÉRITO', 36, doc.y);
        doc.y += 10;

        doc.rect(36, doc.y, 540, 56).fillAndStroke('#F0FDF4', '#BBF7D0');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#166534').text('Argumentación Fáctica y Jurídica del Contratista:', 42, doc.y + 5);
        doc.font('Helvetica').fontSize(6.8).fillColor('#14532D')
           .text(argumentos_defensa, 42, doc.y + 16, { width: 526, lineGap: 1.2 });
        doc.font('Helvetica-Bold').fontSize(6.8).fillColor('#166534')
           .text('Fundamento: Art. 64 Código Civil (Fuerza Mayor), Art. 1609 Código Civil (Mora purga la mora) y Sentencia Consejo de Estado Rad. 41719.', 42, doc.y + 42, { width: 526 });

        doc.y += 62;

        // -------------------------------------------------------------
        // CAPÍTULO III: TASACIÓN PROPORCIONAL Y TOPE LEGAL DEL 10%
        // -------------------------------------------------------------
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text('III. TEST DE PROPORCIONALIDAD Y TOPE LEGAL DE LA MULTA (CONSEJO DE ESTADO)', 36, doc.y);
        doc.y += 10;

        const tableY = doc.y;
        doc.rect(36, tableY, 540, 16).fill(primaryColor);
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#FFFFFF');
        doc.text('PARÁMETRO DE TASACIÓN', 42, tableY + 4, { width: 220 });
        doc.text('BASE DE CÁLCULO', 265, tableY + 4, { width: 100, align: 'right' });
        doc.text('TASA / PORCENTAJE', 370, tableY + 4, { width: 80, align: 'right' });
        doc.text('VALOR MONETARIO (COP)', 455, tableY + 4, { width: 115, align: 'right' });

        let rowY = tableY + 16;
        const filasTasacion = [
          { p: 'Valor Total del Contrato Base', b: tasacion.valor_contrato_base || 0, t: '100.00%', v: tasacion.valor_contrato_base || 0 },
          { p: 'Multa Diaria Tasada por Mora', b: tasacion.valor_contrato_base || 0, t: `${tasacion.porcentaje_diario_aplicado || 0.1}% / día`, v: (tasacion.valor_contrato_base || 0) * ((tasacion.porcentaje_diario_aplicado || 0.1) / 100) },
          { p: 'Cálculo Bruto por Días de Mora', b: `${tasacion.dias_mora_imputados || 0} Días`, t: 'Acumulado', v: tasacion.monto_calculado_bruto || 0 },
          { p: 'Tope Máximo Legal Jurisprudencial (10%)', b: tasacion.valor_contrato_base || 0, t: 'Límite 10.00%', v: tasacion.tope_maximo_monetario || 0, bold: true }
        ];

        filasTasacion.forEach((f, idx) => {
          const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          doc.rect(36, rowY, 540, 14).fillAndStroke(bg, '#E2E8F0');
          doc.font(f.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.5).fillColor(darkText).text(f.p, 42, rowY + 3.5, { width: 220 });
          doc.font('Helvetica').fontSize(6.5).fillColor(darkText).text(typeof f.b === 'number' ? `$${Number(f.b).toLocaleString('es-CO')}` : f.b, 265, rowY + 3.5, { width: 100, align: 'right' });
          doc.font('Helvetica').fontSize(6.5).fillColor(grayText).text(f.t, 370, rowY + 3.5, { width: 80, align: 'right' });
          doc.font(f.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.5).fillColor(accentRed).text(`$${Number(f.v).toLocaleString('es-CO')}`, 455, rowY + 3.5, { width: 115, align: 'right' });
          rowY += 14;
        });

        // Fila Sanción Máxima Admisible
        doc.rect(36, rowY, 540, 16).fillAndStroke('#FEE2E2', '#FECACA');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(accentRed)
           .text('MONTO MÁXIMO PROPORCIONAL ADMISIBLE:', 42, rowY + 4, { width: 380 });
        doc.text(`$${Number(tasacion.monto_final_tasado || 0).toLocaleString('es-CO')} COP`, 425, rowY + 4, { width: 145, align: 'right' });

        doc.y = rowY + 22;

        // -------------------------------------------------------------
        // CAPÍTULO IV: PETICIÓN CONCRETA (SOLICITUD DE ARCHIVO)
        // -------------------------------------------------------------
        if (doc.y > 640) {
          doc.addPage();
          doc.y = 36;
        }

        doc.rect(36, doc.y, 540, 42).fillAndStroke('#F8FAFC', '#E2E8F0');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(primaryColor).text('PETICIÓN PRINCIPAL Y SUBSIDIARIA:', 44, doc.y + 5);
        doc.font('Helvetica').fontSize(6.8).fillColor(darkText)
           .text(`1. PRINCIPAL: Se solicita al Ordenador del Gasto el ARCHIVO DEFINITIVO de la investigación sancionatoria, al haberse acreditado que el retraso obedeció a hechos no imputables al contratista.\n2. SUBSIDIARIA: En caso de no acceder al archivo, aplicar estrictamente el principio de proporcionalidad y tasación reducida.`, 44, doc.y + 16, { width: 520, lineGap: 1.2 });

        doc.y += 48;

        // -------------------------------------------------------------
        // CAPÍTULO V: FIRMAS DE LA DEFENSA TÉCNICA Y APODERADO
        // -------------------------------------------------------------
        if (doc.y > 620) {
          doc.addPage();
          doc.y = 36;
        }

        doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('FIRMAS DE RESPONSABILIDAD PROCESAL', 36, doc.y);
        doc.y += 10;

        const fWidth = 250;
        const fy = doc.y;

        doc.rect(36, fy, fWidth, 54).fillAndStroke('#FFFFFF', '#CBD5E1');
        doc.moveTo(46, fy + 36).lineTo(36 + fWidth - 10, fy + 36).stroke('#94A3B8');
        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(darkText)
           .text('REPRESENTANTE LEGAL CONTRATISTA', 36, fy + 39, { width: fWidth, align: 'center' });
        doc.font('Helvetica').fontSize(6).fillColor(grayText)
           .text(`${contratista_nombre}\nNIT: ${contratista_nit}`, 36, fy + 47, { width: fWidth, align: 'center' });

        doc.rect(326, fy, fWidth, 54).fillAndStroke('#FFFFFF', '#CBD5E1');
        doc.moveTo(336, fy + 36).lineTo(326 + fWidth - 10, fy + 36).stroke('#94A3B8');
        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(darkText)
           .text('APODERADO ESPECIAL / ASESOR JURÍDICO', 326, fy + 39, { width: fWidth, align: 'center' });
        doc.font('Helvetica').fontSize(6).fillColor(grayText)
           .text('Abogado Especialista en Contratación Estatal\nTarjeta Profesional Vigente C.S.J.', 326, fy + 47, { width: fWidth, align: 'center' });

        // Numeración de páginas
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(6.5).font('Helvetica').fillColor('#94A3B8')
             .text(`Radar SECOP • Alegatos de Descargos (Art. 86 Ley 1474/2011) • Contrato ${contrato_numero} • Página ${i + 1} de ${pages.count}`, 36, doc.page.height - 24, { align: 'center', width: 540 });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Genera el Libro Excel (.xlsx) de Tasación y Liquidación Proporcional de Multas
   * 
   * @param {Object} data
   * @returns {Promise<Buffer>}
   */
  async generarCuadroSancionesExcel(data) {
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
      aseguradora_nombre = 'SEGUROS DEL ESTADO S.A.',
      tasacion = {}
    } = data;

    const ws = workbook.addWorksheet('Tasación de Multa Art. 86');
    ws.views = [{ showGridLines: true }];

    ws.columns = [
      { width: 32 },
      { width: 35 },
      { width: 22 },
      { width: 25 }
    ];

    ws.mergeCells('A1:D1');
    ws.getCell('A1').value = 'REPÚBLICA DE COLOMBIA • RADAR SECOP AUDITORÍA SANCIONATORIA';
    ws.getCell('A1').font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
    ws.getCell('A1').alignment = { horizontal: 'center' };

    ws.mergeCells('A2:D2');
    ws.getCell('A2').value = 'LIQUIDACIÓN Y TASACIÓN PROPORCIONAL DE MULTAS (ART. 86 LEY 1474 / 2011)';
    ws.getCell('A2').font = { size: 12, bold: true, color: { argb: 'FFDC2626' } };
    ws.getCell('A2').alignment = { horizontal: 'center' };

    ws.addRow([]);
    ws.addRow(['NÚMERO DE CONTRATO:', contrato_numero, 'PROCESO SECOP:', proceso_numero]);
    ws.addRow(['ENTIDAD SANCIONADORA:', entidad_nombre, 'FECHA AUDIENCIA:', new Date().toLocaleDateString('es-CO')]);
    ws.addRow(['CONTRATISTA INVESTIGADO:', contratista_nombre, 'ASEGURADORA GARANTE:', aseguradora_nombre]);
    ws.addRow(['TIPOLOGÍA DE SANCIÓN:', tasacion.tipologia_sancion, 'NATURALEZA LEGAL:', tasacion.naturaleza_sancion]);

    ['A4', 'A5', 'A6', 'A7', 'C4', 'C5', 'C6', 'C7'].forEach(c => {
      ws.getCell(c).font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
    });

    ws.addRow([]);
    ws.addRow(['MEMORIA DE CÁLCULO DE LA SANCIÓN:']);
    ws.getCell('A9').font = { bold: true, size: 11, color: { argb: 'FFDC2626' } };

    const hRow = 10;
    ws.addRow(['PARÁMETRO', 'DESCRIPCIÓN', 'VALOR MONETARIO / BASE', 'ESTADO']);
    ws.getRow(hRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ['A10', 'B10', 'C10', 'D10'].forEach(c => {
      ws.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDC2626' }
      };
    });

    ws.addRow(['Valor Contrato Base', 'Cuantía original del contrato', Number(tasacion.valor_contrato_base || 0), 'BASE']);
    ws.addRow(['Días de Mora Imputados', 'Tiempo de retraso en hito', Number(tasacion.dias_mora_imputados || 0), 'DÍAS']);
    ws.addRow(['Porcentaje Diario Aplicado', 'Pactado en pliego de condiciones', `${tasacion.porcentaje_diario_aplicado || 0.1}%`, 'TASA']);
    ws.addRow(['Cálculo Bruto de Multa', '=C11*(0.001)*C12', { formula: 'C11*0.001*C12' }, 'BRUTO']);
    ws.addRow(['Tope Máximo Legal (10%)', '=C11*0.1', { formula: 'C11*0.1' }, 'LÍMITE 10%']);
    ws.addRow(['MONTO FINAL TASADO', '=MIN(C14, C15)', { formula: 'MIN(C14, C15)' }, 'PROPORCIONAL']);

    ws.getCell('C11').numFmt = '$#,##0.00;($#,##0.00);"-"';
    ws.getCell('C14').numFmt = '$#,##0.00;($#,##0.00);"-"';
    ws.getCell('C15').numFmt = '$#,##0.00;($#,##0.00);"-"';
    ws.getCell('C16').numFmt = '$#,##0.00;($#,##0.00);"-"';

    ws.getRow(16).font = { bold: true, color: { argb: 'FFDC2626' } };
    ['A16', 'B16', 'C16', 'D16'].forEach(c => {
      ws.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEE2E2' }
      };
      ws.getCell(c).border = {
        top: { style: 'thin' },
        bottom: { style: 'double' }
      };
    });

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = new SancionatorioEngine();
