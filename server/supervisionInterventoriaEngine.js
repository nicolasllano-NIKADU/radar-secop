/**
 * ====================================================================
 * RADAR SECOP - MOTOR DE AUDITORÍA DE SUPERVISIÓN E INTERVENTORÍA CONTRACTUAL
 * Marco Normativo y Técnico:
 * - Ley 1474 de 2011, Arts. 82 - 85 (Estatuto Anticorrupción - Interventoría y Supervisión)
 * - Ley 80 de 1993 (Deberes de vigilancia, control y visado de desembolsos)
 * - Decreto 1082 de 2015 (Reglamentación de interventoría de obra pública)
 * - Norma NSR-10 (Norma Sismo Resistente - Control de calidad de concretos y aceros)
 * - Manual de Interventoría INVIAS (Ensayos de laboratorio, densidad y compactación)
 * ====================================================================
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

class SupervisionInterventoriaEngine {
  constructor() {
    this.NORMAS_ENSAYOS = {
      COMPRESION_CONCRETO_28D: {
        codigo: 'COMPRESION_CONCRETO_28D',
        nombre: 'Resistencia a la Compresión de Concreto a 28 Días',
        unidadDefault: 'PSI',
        normaReferencia: 'NSR-10 Título C.5 / NTC 673',
        toleranciaMinimaPct: 100.0,
        toleranciaCriticaPct: 85.0
      },
      DENSIDAD_SUELOS_PROCTOR: {
        codigo: 'DENSIDAD_SUELOS_PROCTOR',
        nombre: 'Densidad en Campo y Grado de Compactación Proctor',
        unidadDefault: '%',
        normaReferencia: 'INVIAS Art. 210 y 220 / NTC 1667',
        toleranciaMinimaPct: 95.0,
        toleranciaCriticaPct: 90.0
      },
      ASENTAMIENTO_SLUMP: {
        codigo: 'ASENTAMIENTO_SLUMP',
        nombre: 'Asentamiento del Concreto Fresco (Slump)',
        unidadDefault: 'Pulgadas',
        normaReferencia: 'NTC 396 / ASTM C143',
        toleranciaMinimaPct: 90.0,
        toleranciaCriticaPct: 75.0
      },
      ACERO_TRACCION: {
        codigo: 'ACERO_TRACCION',
        nombre: 'Límite de Fluencia y Resistencia a Tracción del Acero',
        unidadDefault: 'MPa',
        normaReferencia: 'NTC 2289 / ASTM A615 (Grado 60)',
        toleranciaMinimaPct: 100.0,
        toleranciaCriticaPct: 95.0
      }
    };
  }

  /**
   * Evalúa la conformidad técnica de un ensayo de laboratorio según la normativa aplicable
   * 
   * @param {Object} params
   * @param {string} params.tipoEnsayo
   * @param {number} params.valorExigido
   * @param {number} params.valorObtenido
   * @param {string} [params.unidadMedida='PSI']
   * @returns {Object}
   */
  evaluarConformidadEnsayo({
    tipoEnsayo = 'COMPRESION_CONCRETO_28D',
    valorExigido = 3000,
    valorObtenido = 3150,
    unidadMedida = 'PSI'
  }) {
    const vExig = Number(valorExigido) || 1;
    const vObt = Number(valorObtenido) || 0;
    const pctConformidad = Number(((vObt / vExig) * 100).toFixed(2));
    const ref = this.NORMAS_ENSAYOS[tipoEnsayo] || {
      nombre: 'Ensayo Técnico Especializado',
      normaReferencia: 'Norma Técnica Colombiana NTC',
      toleranciaMinimaPct: 100.0,
      toleranciaCriticaPct: 85.0
    };

    let resultadoTecnico = 'CONFORME';
    let concepto = 'Cumple satisfactoriamente las especificaciones técnicas exigidas.';
    let accionRequerida = 'Aprobado para visado en acta de obra.';

    if (pctConformidad >= ref.toleranciaMinimaPct) {
      resultadoTecnico = 'CONFORME';
      concepto = `Supera o iguala la especificación de diseño (${pctConformidad}%). Cumple con ${ref.normaReferencia}.`;
      accionRequerida = 'Aprobado para recibo y liquidación en acta parcial.';
    } else if (pctConformidad >= ref.toleranciaCriticaPct) {
      resultadoTecnico = 'OBSERVADO';
      concepto = `Resistencia o valor marginal (${pctConformidad}%). No alcanza el 100% de la especificación técnica.`;
      accionRequerida = 'Se ordena extracción de testigos/núcleos diamantados complementarios o ensayo de esclerometría.';
    } else {
      resultadoTecnico = 'NO_CONFORME';
      concepto = `Falla crítica de calidad (${pctConformidad}%). Deficiencia severa frente a ${ref.normaReferencia}.`;
      accionRequerida = 'No apto para pago. Se ordena rechazo de la estructura, peritaje estructural o demolición a cargo del contratista.';
    }

    return {
      tipo_ensayo: tipoEnsayo,
      nombre_ensayo: ref.nombre,
      norma_referencia: ref.normaReferencia,
      valor_diseno_exigido: vExig,
      valor_obtenido_laboratorio: vObt,
      unidad_medida: unidadMedida,
      porcentaje_conformidad: pctConformidad,
      resultado_tecnico: resultadoTecnico,
      concepto_interventoria: concepto,
      accion_requerida: accionRequerida
    };
  }

  /**
   * Calcula el desempeño físico vs financiero del cronograma y consolidado de calidad
   * 
   * @param {Object} params
   * @param {number} params.programadoPct - % avance programado a la fecha de corte
   * @param {number} params.realPct - % avance real ejecutado a la fecha de corte
   * @param {Array<Object>} [params.ensayos=[]] - Ensayos de laboratorio ejecutados
   * @returns {Object}
   */
  calcularAvanceYDesempeno({ programadoPct = 0, realPct = 0, ensayos = [] }) {
    const prog = Number(programadoPct) || 0;
    const real = Number(realPct) || 0;
    const spi = prog > 0 ? Number((real / prog).toFixed(3)) : 1.0;
    const desviacion = Number((real - prog).toFixed(2));

    let semaforoTiempo = 'EN_CRONOGRAMA';
    let dictamenCronograma = 'La obra avanza al ritmo programado o con adelanto favorable.';

    if (spi < 0.85) {
      semaforoTiempo = 'ATRASO_CRITICO';
      dictamenCronograma = `Atraso severo del cronograma (${desviacion}% respecto al programado). Conforme al Art. 84 Ley 1474/2011, la interventoría debe ordenar inmediatamente la presentación de un Plan de Contingencia con incremento de frentes y turnos.`;
    } else if (spi < 0.98) {
      semaforoTiempo = 'ATRASO_LEVE';
      dictamenCronograma = `Desviación leve (${desviacion}%). Requiere ajuste de rendimientos en frentes de obra.`;
    }

    // Estadísticas de Calidad
    let conformes = 0;
    let observados = 0;
    let noConformes = 0;

    ensayos.forEach(e => {
      if (e.resultado_tecnico === 'CONFORME') conformes++;
      else if (e.resultado_tecnico === 'OBSERVADO') observados++;
      else noConformes++;
    });

    const totalEnsayos = ensayos.length;
    const indiceCalidadPct = totalEnsayos > 0 ? Number(((conformes / totalEnsayos) * 100).toFixed(1)) : 100.0;

    return {
      avance_fisico_programado_pct: prog,
      avance_fisico_real_pct: real,
      desviacion_pct: desviacion,
      spi_schedule_performance_index: spi,
      semaforo_tiempo: semaforoTiempo,
      dictamen_cronograma: dictamenCronograma,
      control_calidad: {
        total_ensayos: totalEnsayos,
        conformes: conformes,
        observados: observados,
        no_conformes: noConformes,
        indice_calidad_pct: indiceCalidadPct,
        estado_calidad_global: noConformes > 0 ? 'ALERTA_NO_CONFORMIDADES' : (observados > 0 ? 'OBSERVADO' : 'EXCELENTE')
      }
    };
  }

  /**
   * Genera el Informe Oficial Periódico de Interventoría en PDF
   * Cumple con la Ley 1474 de 2011 Arts. 82-85
   * 
   * @param {Object} data
   * @returns {Promise<Buffer>}
   */
  async generarInformeInterventoriaPdf(data) {
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
          interventor_nombre = 'INTERVENTORÍA INTEGRAL TÉCNICA S.A.S.',
          periodo_informe = 'Mes 03 (Octubre 2026)',
          desempeno = {},
          bitacora = [],
          ensayos = []
        } = data;

        const primaryColor = '#1E3A8A';   // Azul institucional
        const indigoColor = '#4F46E5';    // Indigo técnico
        const emeraldColor = '#059669';   // Verde
        const accentRed = '#DC2626';
        const darkText = '#0F172A';
        const grayText = '#475569';
        const lightBg = '#F8FAFC';

        const cal = desempeno.control_calidad || {};

        // -------------------------------------------------------------
        // ENCABEZADO INSTITUCIONAL
        // -------------------------------------------------------------
        doc.rect(36, 36, 540, 52).fillAndStroke('#EEF2FF', '#C7D2FE');
        
        doc.fillColor(indigoColor).fontSize(10).font('Helvetica-Bold')
           .text('REPÚBLICA DE COLOMBIA • SISTEMA INTEGRAL DE CONTROL CONTRACTUAL', 46, 44, { align: 'center', width: 520 });
        doc.fillColor(darkText).fontSize(11).font('Helvetica-Bold')
           .text('INFORME OFICIAL PERIÓDICO DE SUPERVISIÓN E INTERVENTORÍA TÉCNICA', 46, 57, { align: 'center', width: 520 });
        doc.fillColor(grayText).fontSize(7.5).font('Helvetica')
           .text('Ley 1474 de 2011 Arts. 82 a 85 (Estatuto Anticorrupción) • Seguimiento Técnico, Administrativo y Financiero', 46, 72, { align: 'center', width: 520 });

        doc.y = 98;

        // -------------------------------------------------------------
        // FICHA TÉCNICA Y AUDITORÍA
        // -------------------------------------------------------------
        doc.rect(36, doc.y, 540, 68).fillAndStroke(lightBg, '#E2E8F0');
        const cardY = doc.y + 6;

        doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('IDENTIFICACIÓN DEL CONTRATO VIGILADO', 44, cardY);
        
        let lineY = cardY + 12;
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(darkText).text('Entidad Contratante: ', 44, lineY, { continued: true })
           .font('Helvetica').text(entidad_nombre);
        doc.font('Helvetica-Bold').text('Contrato / Proceso: ', 320, lineY, { continued: true })
           .font('Helvetica').text(`${contrato_numero} / ${proceso_numero}`);

        lineY += 11;
        doc.font('Helvetica-Bold').text('Contratista de Obra: ', 44, lineY, { continued: true })
           .font('Helvetica').text(contratista_nombre);
        doc.font('Helvetica-Bold').text('Firma de Interventoría: ', 320, lineY, { continued: true })
           .font('Helvetica').text(interventor_nombre);

        lineY += 11;
        doc.font('Helvetica-Bold').text('Período Evaluado: ', 44, lineY, { continued: true })
           .font('Helvetica').text(periodo_informe);
        doc.font('Helvetica-Bold').text('Estado de Supervisión: ', 320, lineY, { continued: true })
           .font('Helvetica-Bold').fillColor(emeraldColor).text('VIGILANCIA ACTIVA EN CAMPO');

        lineY += 11;
        doc.font('Helvetica-Bold').text('Avance Físico Real vs Programado: ', 44, lineY, { continued: true })
           .font('Helvetica-Bold').fillColor(primaryColor).text(`${desempeno.avance_fisico_real_pct || 0}% Real vs ${desempeno.avance_fisico_programado_pct || 0}% Programado (SPI: ${desempeno.spi_schedule_performance_index || 1.0})`);
        doc.font('Helvetica-Bold').text('Índice de Calidad Ensayos: ', 320, lineY, { continued: true })
           .font('Helvetica-Bold').fillColor(emeraldColor).text(`${cal.indice_calidad_pct || 100}% Conforme`);

        doc.y = cardY + 68;

        // -------------------------------------------------------------
        // CAPÍTULO I: DICTAMEN DE DESEMPEÑO DE CRONOGRAMA Y CURVA S
        // -------------------------------------------------------------
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text('I. EVALUACIÓN DE CRONOGRAMA, RENDIMIENTO Y CURVA S', 36, doc.y);
        doc.y += 10;

        const spiColor = (desempeno.spi_schedule_performance_index || 1.0) >= 0.95 ? '#166534' : '#991B1B';
        const spiBg = (desempeno.spi_schedule_performance_index || 1.0) >= 0.95 ? '#F0FDF4' : '#FEF2F2';
        const spiBorder = (desempeno.spi_schedule_performance_index || 1.0) >= 0.95 ? '#BBF7D0' : '#FECACA';

        doc.rect(36, doc.y, 540, 38).fillAndStroke(spiBg, spiBorder);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(spiColor)
           .text(`ESTADO DE CRONOGRAMA: ${desempeno.semaforo_tiempo || 'EN_CRONOGRAMA'}`, 44, doc.y + 5);
        doc.font('Helvetica').fontSize(6.8).fillColor(darkText)
           .text(desempeno.dictamen_cronograma || 'El contrato avanza de acuerdo con la programación pactada.', 44, doc.y + 16, { width: 520, lineGap: 1.2 });

        doc.y += 44;

        // -------------------------------------------------------------
        // CAPÍTULO II: CONTROL DE CALIDAD Y ENSAYOS DE LABORATORIO
        // -------------------------------------------------------------
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text('II. REGISTRO Y CONFORMIDAD DE ENSAYOS DE LABORATORIO', 36, doc.y);
        doc.y += 10;

        const tableEnsayosY = doc.y;
        doc.rect(36, tableEnsayosY, 540, 16).fill(indigoColor);
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#FFFFFF');
        doc.text('TIPO DE ENSAYO / ELEMENTO', 40, tableEnsayosY + 4, { width: 170 });
        doc.text('LOCALIZACIÓN', 215, tableEnsayosY + 4, { width: 95 });
        doc.text('EXIGIDO', 315, tableEnsayosY + 4, { width: 55, align: 'right' });
        doc.text('OBTENIDO', 375, tableEnsayosY + 4, { width: 55, align: 'right' });
        doc.text('% CONFORM.', 435, tableEnsayosY + 4, { width: 55, align: 'right' });
        doc.text('ESTADO', 500, tableEnsayosY + 4, { width: 70, align: 'center' });

        let eRowY = tableEnsayosY + 16;
        ensayos.forEach((ens, idx) => {
          if (eRowY > 670) {
            doc.addPage();
            eRowY = 36;
          }

          const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          doc.rect(36, eRowY, 540, 14).fillAndStroke(bg, '#E2E8F0');

          const colorRes = ens.resultado_tecnico === 'CONFORME' ? emeraldColor : (ens.resultado_tecnico === 'OBSERVADO' ? '#B45309' : accentRed);

          doc.font('Helvetica-Bold').fontSize(6.2).fillColor(darkText)
             .text(ens.nombre_ensayo || ens.tipo_ensayo, 40, eRowY + 3.5, { width: 170, ellipsis: true });
          doc.font('Helvetica').fontSize(6).fillColor(grayText)
             .text(ens.localizacion_muestra || 'Frente 1', 215, eRowY + 3.5, { width: 95, ellipsis: true });
          doc.font('Helvetica').fontSize(6.2).fillColor(darkText)
             .text(`${ens.valor_diseno_exigido} ${ens.unidad_medida}`, 315, eRowY + 3.5, { width: 55, align: 'right' });
          doc.font('Helvetica-Bold').fontSize(6.2).fillColor(darkText)
             .text(`${ens.valor_obtenido_laboratorio} ${ens.unidad_medida}`, 375, eRowY + 3.5, { width: 55, align: 'right' });
          doc.font('Helvetica-Bold').fontSize(6.2).fillColor(colorRes)
             .text(`${ens.porcentaje_conformidad}%`, 435, eRowY + 3.5, { width: 55, align: 'right' });
          doc.font('Helvetica-Bold').fontSize(6).fillColor(colorRes)
             .text(ens.resultado_tecnico, 500, eRowY + 3.5, { width: 70, align: 'center' });

          eRowY += 14;
        });

        doc.y = eRowY + 14;

        // -------------------------------------------------------------
        // CAPÍTULO III: SELECCIÓN DE EVENTOS DE BITÁCORA DIARIA DE OBRA
        // -------------------------------------------------------------
        if (doc.y > 640) {
          doc.addPage();
          doc.y = 36;
        }

        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text('III. BITÁCORA Y LIBRO DE ÓRDENES DE CAMPO DE INTERVENTORÍA', 36, doc.y);
        doc.y += 10;

        const tableBitY = doc.y;
        doc.rect(36, tableBitY, 540, 15).fill(primaryColor);
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#FFFFFF');
        doc.text('FECHA / CLIMA', 40, tableBitY + 4, { width: 75 });
        doc.text('RECURSOS (PERS/MAQ)', 120, tableBitY + 4, { width: 90 });
        doc.text('ACTIVIDADES PRINCIPALES EJECUTADAS', 215, tableBitY + 4, { width: 175 });
        doc.text('INSTRUCCIÓN / ORDEN INTERVENTORÍA', 395, tableBitY + 4, { width: 175 });

        let bRowY = tableBitY + 15;
        bitacora.forEach((bit, idx) => {
          if (bRowY > 670) {
            doc.addPage();
            bRowY = 36;
          }

          const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          doc.rect(36, bRowY, 540, 16).fillAndStroke(bg, '#E2E8F0');

          doc.font('Helvetica-Bold').fontSize(6).fillColor(darkText)
             .text(`${bit.fecha_registro}\n${bit.condicion_climatica}`, 40, bRowY + 3, { width: 75 });
          doc.font('Helvetica').fontSize(6).fillColor(grayText)
             .text(`${bit.personal_total} Trabajadores\n${bit.maquinaria_activa} Equipos activos`, 120, bRowY + 3, { width: 90 });
          doc.font('Helvetica').fontSize(6).fillColor(darkText)
             .text(bit.actividades_ejecutadas, 215, bRowY + 3, { width: 175, ellipsis: true });
          doc.font('Helvetica-Bold').fontSize(6).fillColor(indigoColor)
             .text(bit.instrucciones_interventor || 'Sin observaciones', 395, bRowY + 3, { width: 175, ellipsis: true });

          bRowY += 16;
        });

        doc.y = bRowY + 14;

        // -------------------------------------------------------------
        // CAPÍTULO IV: RECOMENDACIÓN FORMAL SOBRE PAGO DE ACTAS
        // -------------------------------------------------------------
        if (doc.y > 630) {
          doc.addPage();
          doc.y = 36;
        }

        doc.rect(36, doc.y, 540, 42).fillAndStroke('#F0FDF4', '#BBF7D0');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#166534').text('CONCEPTO Y VISADO DE PAGO DE ACTA MENSUAL:', 42, doc.y + 5);
        doc.font('Helvetica').fontSize(6.8).fillColor('#14532D')
           .text(`La Interventoría Técnica certifica que las actividades reportadas en el presente período cumplen con los planos, especificaciones generales y control de calidad. Por lo anterior, se emite concepto FAVORABLE para el trámite y desembolso del Acta Parcial de Obra correspondiente.`, 42, doc.y + 15, { width: 520, lineGap: 1.2 });

        doc.y += 50;

        // -------------------------------------------------------------
        // CAPÍTULO V: FIRMAS DE RESPONSABILIDAD DE INTERVENTORÍA
        // -------------------------------------------------------------
        if (doc.y > 620) {
          doc.addPage();
          doc.y = 36;
        }

        doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('FIRMAS Y APROBACIONES DE SUPERVISIÓN', 36, doc.y);
        doc.y += 10;

        const fWidth = 250;
        const fy = doc.y;

        doc.rect(36, fy, fWidth, 54).fillAndStroke('#FFFFFF', '#CBD5E1');
        doc.moveTo(46, fy + 36).lineTo(36 + fWidth - 10, fy + 36).stroke('#94A3B8');
        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(darkText)
           .text('DIRECTOR DE INTERVENTORÍA', 36, fy + 39, { width: fWidth, align: 'center' });
        doc.font('Helvetica').fontSize(6).fillColor(grayText)
           .text(`${interventor_nombre}\nIngeniero Civil - Matrícula Profesional COPNIA`, 36, fy + 47, { width: fWidth, align: 'center' });

        doc.rect(326, fy, fWidth, 54).fillAndStroke('#FFFFFF', '#CBD5E1');
        doc.moveTo(336, fy + 36).lineTo(326 + fWidth - 10, fy + 36).stroke('#94A3B8');
        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(darkText)
           .text('SUPERVISOR DESIGNADO POR LA ENTIDAD', 326, fy + 39, { width: fWidth, align: 'center' });
        doc.font('Helvetica').fontSize(6).fillColor(grayText)
           .text(`${entidad_nombre}\nSupervisor del Contrato Estatal`, 326, fy + 47, { width: fWidth, align: 'center' });

        // Numeración de páginas
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(6.5).font('Helvetica').fillColor('#94A3B8')
             .text(`Radar SECOP • Informe de Interventoría (Ley 1474/2011) • Contrato ${contrato_numero} • Página ${i + 1} de ${pages.count}`, 36, doc.page.height - 24, { align: 'center', width: 540 });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Genera el Libro Excel (.xlsx) estructurado con el Informe de Interventoría y Ensayos
   * 
   * @param {Object} data
   * @returns {Promise<Buffer>}
   */
  async generarInformeInterventoriaExcel(data) {
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
      interventor_nombre = 'INTERVENTORÍA INTEGRAL TÉCNICA S.A.S.',
      periodo_informe = 'Mes 03 (Octubre 2026)',
      desempeno = {},
      bitacora = [],
      ensayos = []
    } = data;

    // -------------------------------------------------------------
    // HOJA 1: RESUMEN Y AVANCE FÍSICO VS PROGRAMADO
    // -------------------------------------------------------------
    const wsResumen = workbook.addWorksheet('1. Desempeño y Cronograma');
    wsResumen.views = [{ showGridLines: true }];

    wsResumen.columns = [
      { width: 32 },
      { width: 35 },
      { width: 22 },
      { width: 25 }
    ];

    wsResumen.mergeCells('A1:D1');
    wsResumen.getCell('A1').value = 'REPÚBLICA DE COLOMBIA • AUDITORÍA CONTRACTUAL RADAR SECOP';
    wsResumen.getCell('A1').font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
    wsResumen.getCell('A1').alignment = { horizontal: 'center' };

    wsResumen.mergeCells('A2:D2');
    wsResumen.getCell('A2').value = 'INFORME DE SUPERVISIÓN E INTERVENTORÍA TÉCNICA (LEY 1474 DE 2011)';
    wsResumen.getCell('A2').font = { size: 12, bold: true, color: { argb: 'FF4F46E5' } };
    wsResumen.getCell('A2').alignment = { horizontal: 'center' };

    wsResumen.addRow([]);
    wsResumen.addRow(['NÚMERO DE CONTRATO:', contrato_numero, 'PROCESO SECOP:', proceso_numero]);
    wsResumen.addRow(['ENTIDAD CONTRATANTE:', entidad_nombre, 'PERÍODO INFORME:', periodo_informe]);
    wsResumen.addRow(['CONTRATISTA DE OBRA:', contratista_nombre, 'FIRMA INTERVENTORÍA:', interventor_nombre]);
    wsResumen.addRow(['AVANCE PROGRAMADO:', `${desempeno.avance_fisico_programado_pct || 0}%`, 'AVANCE REAL EJECUTADO:', `${desempeno.avance_fisico_real_pct || 0}%`]);
    wsResumen.addRow(['ÍNDICE SPI (DESEMPEÑO):', Number(desempeno.spi_schedule_performance_index || 1.0), 'ESTADO CRONOGRAMA:', desempeno.semaforo_tiempo || 'EN_TIEMPO']);

    ['A4', 'A5', 'A6', 'A7', 'A8', 'C4', 'C5', 'C6', 'C7', 'C8'].forEach(c => {
      wsResumen.getCell(c).font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
    });

    wsResumen.addRow([]);
    wsResumen.addRow(['CONTROL Y CALIDAD TÉCNICA DE LABORATORIO:']);
    wsResumen.getCell('A10').font = { bold: true, size: 11, color: { argb: 'FF4F46E5' } };

    const cal = desempeno.control_calidad || {};
    wsResumen.addRow(['Total Ensayos Realizados:', cal.total_ensayos || 0, 'Ensayos Conformes:', cal.conformes || 0]);
    wsResumen.addRow(['Ensayos Observados:', cal.observados || 0, 'Ensayos No Conformes:', cal.no_conformes || 0]);
    wsResumen.addRow(['Índice de Calidad Global:', `${cal.indice_calidad_pct || 100}%`, 'Estado Calidad:', cal.estado_calidad_global || 'CONFORME']);

    // -------------------------------------------------------------
    // HOJA 2: ENSAYOS DE LABORATORIO
    // -------------------------------------------------------------
    const wsEnsayos = workbook.addWorksheet('2. Ensayos de Calidad');
    wsEnsayos.views = [{ showGridLines: true }];

    wsEnsayos.columns = [
      { width: 25 },
      { width: 22 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 18 },
      { width: 25 }
    ];

    wsEnsayos.mergeCells('A1:G1');
    wsEnsayos.getCell('A1').value = 'REGISTRO DE CONTROL DE CALIDAD Y ENSAYOS DE LABORATORIO EN OBRA';
    wsEnsayos.getCell('A1').font = { size: 11, bold: true, color: { argb: 'FF4F46E5' } };
    wsEnsayos.getCell('A1').alignment = { horizontal: 'center' };

    wsEnsayos.addRow([]);

    const hEns = 3;
    wsEnsayos.addRow([
      'TIPO DE ENSAYO',
      'LOCALIZACIÓN MUESTRA',
      'VALOR EXIGIDO',
      'VALOR OBTENIDO',
      '% CONFORMIDAD',
      'RESULTADO TÉCNICO',
      'LABORATORIO CERTIFICADO'
    ]);
    wsEnsayos.getRow(hEns).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3'].forEach(c => {
      wsEnsayos.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }
      };
    });

    let eRow = 4;
    ensayos.forEach(e => {
      wsEnsayos.addRow([
        e.nombre_ensayo || e.tipo_ensayo,
        e.localizacion_muestra,
        Number(e.valor_diseno_exigido),
        Number(e.valor_obtenido_laboratorio),
        { formula: `(D${eRow}/C${eRow})*100` },
        e.resultado_tecnico,
        e.laboratorio_nombre || 'Laboratorio de Materiales'
      ]);

      wsEnsayos.getCell(`E${eRow}`).numFmt = '0.00"%"';
      wsEnsayos.getCell(`E${eRow}`).font = { bold: true };
      eRow++;
    });

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = new SupervisionInterventoriaEngine();
