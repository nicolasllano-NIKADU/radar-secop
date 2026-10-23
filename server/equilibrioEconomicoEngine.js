/**
 * ====================================================================
 * RADAR SECOP - MOTOR DE RESTABLECIMIENTO DEL EQUILIBRIO ECONÓMICO CONTRACTUAL
 * Marco Normativo y Jurisprudencial:
 * - Ley 80 de 1993 (Art. 4 num. 8, Art. 5 num. 1 y Art. 27: Ecuación Contractual)
 * - Ley 1150 de 2007 (Distribución de Riesgos y Matriz de Riesgos Contractuales)
 * - Código de Comercio Colombiano (Art. 868: Teoría de la Imprevisión)
 * - Código Civil Colombiano (Arts. 1613 y 1614: Daño Emergente y Lucro Cesante)
 * - Ley 2220 de 2022 (Estatuto de Conciliación Prejudicial en lo Contencioso)
 * - Consejo de Estado Sección Tercera (Sentencias de Unificación Rad. 18080 y Rad. 14577):
 *   * Fórmula matemática oficial de indexación por IPC DANE: R = Rh * (IPC_final / IPC_inicial)
 *   * Doctrina de Stand-by de maquinaria (35% - 50% de tarifa operativa plena)
 *   * Diferenciación de indemnización: Punto de no pérdida vs indemnización integral
 * ====================================================================
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

class EquilibrioEconomicoEngine {
  constructor() {
    this.TIPOLOGIAS = {
      TEORIA_IMPREVISION: {
        codigo: 'TEORIA_IMPREVISION',
        nombre: 'Teoría de la Imprevisión (Art. 868 C.Co / Art. 27 Ley 80)',
        alcanceIndemnizatorio: 'PUNTO_NO_PERDIDA',
        reconoceLucroCesante: false,
        reconoceDanoEmergente: true,
        descripcion: 'Hechos extraordinarios, imprevisibles y sobrevinientes que alteran gravemente la ecuación económica sin culpa de las partes.',
        fundamentoLegal: 'Art. 27 Ley 80 de 1993, Art. 868 Código de Comercio, Sentencia C-089 de 2002 Corte Constitucional.'
      },
      HECHO_DEL_PRINCIPE: {
        codigo: 'HECHO_DEL_PRINCIPE',
        nombre: 'Hecho del Príncipe (Acto General de la Entidad Contratante)',
        alcanceIndemnizatorio: 'INTEGRAL',
        reconoceLucroCesante: true,
        reconoceDanoEmergente: true,
        descripcion: 'Medidas de carácter general adoptadas por la misma entidad estatal contratante que hacen más gravosa la ejecución del contrato.',
        fundamentoLegal: 'Consejo de Estado Sección Tercera, Rad. 13649 y Rad. 18080.'
      },
      IUS_VARIANDI: {
        codigo: 'IUS_VARIANDI',
        nombre: 'Ius Variandi / Modificaciones Unilaterales Imprevistas',
        alcanceIndemnizatorio: 'INTEGRAL',
        reconoceLucroCesante: true,
        reconoceDanoEmergente: true,
        descripcion: 'Modificaciones sustanciales al proyecto o alcance ordenadas unilateralmente por la entidad sin la compensación oportuna.',
        fundamentoLegal: 'Art. 16 Ley 80 de 1993 y Sentencia Consejo de Estado Rad. 14577.'
      },
      MAYOR_PERMANENCIA_OBRA: {
        codigo: 'MAYOR_PERMANENCIA_OBRA',
        nombre: 'Mayor Permanencia en Obra por Causas No Imputables al Contratista',
        alcanceIndemnizatorio: 'INTEGRAL_COSTOS_FIJOS',
        reconoceLucroCesante: false,
        reconoceDanoEmergente: true,
        descripcion: 'Sobrecostos de personal, equipo en stand-by, pólizas e infraestructura por prórrogas o suspensiones causadas por la entidad.',
        fundamentoLegal: 'Consejo de Estado Sección Tercera, Rad. 25000-23-26-000-1996-02758-01.'
      },
      INCUMPLIMIENTO_ENTIDAD: {
        codigo: 'INCUMPLIMIENTO_ENTIDAD',
        nombre: 'Incumplimiento Contractual de la Entidad Estatal',
        alcanceIndemnizatorio: 'INTEGRAL',
        reconoceLucroCesante: true,
        reconoceDanoEmergente: true,
        descripcion: 'Mora en entrega de predios, permisos ambientales o retraso sistemático en el pago de actas de obra.',
        fundamentoLegal: 'Art. 4 num. 8 y Art. 50 Ley 80 de 1993, Art. 1613 y 1614 Código Civil.'
      }
    };

    // Parámetros técnicos de referencia para liquidaciones periciales
    this.FACTOR_PRESTACIONAL_DEFAULT = 1.52; // Factor prestaciones sociales Colombia (52%)
    this.TARIFA_STANDBY_MAQUINARIA_PCT = 40.0; // 40% de la tarifa operativa según Consejo de Estado
    this.IPC_REFERENCIA_BASE = 142.5; // Índice DANE de corte
    this.IPC_REFERENCIA_ACTUAL = 158.2; // Índice DANE actual de liquidación
  }

  /**
   * Calcula la liquidación pericial integral de restablecimiento del equilibrio económico
   * 
   * @param {Object} params
   * @param {string} params.tipologia - Código de la tipología jurídica
   * @param {number} params.valorContrato - Valor original del contrato en COP
   * @param {number} params.plazoInicialDias - Plazo pactado originalmente en días
   * @param {number} params.diasMayorPermanencia - Días de suspensión o prórroga generados
   * @param {Array<Object>} params.items - Rubros de perjuicio ({ tipo, descripcion, valorHistorico, fechaHistorica, standByPct, factorPrestacional })
   * @param {number} [params.ipcInicial] - Índice DANE IPC histórico
   * @param {number} [params.ipcFinal] - Índice DANE IPC fecha reclamación
   * @param {number} [params.margenUtilidadEsperadaPct=5.0] - Margen para lucro cesante si aplica
   * @returns {Object}
   */
  calcularRestablecimientoEquilibrio({
    tipologia = 'MAYOR_PERMANENCIA_OBRA',
    valorContrato = 0,
    plazoInicialDias = 180,
    diasMayorPermanencia = 60,
    items = [],
    ipcInicial = 142.5,
    ipcFinal = 158.2,
    margenUtilidadEsperadaPct = 5.0
  }) {
    const tipoConfig = this.TIPOLOGIAS[tipologia] || this.TIPOLOGIAS.MAYOR_PERMANENCIA_OBRA;
    const contrato = Number(valorContrato) || 0;
    const diasPerm = Math.max(0, parseInt(diasMayorPermanencia, 10) || 0);
    const ipcIni = Number(ipcInicial) > 0 ? Number(ipcInicial) : this.IPC_REFERENCIA_BASE;
    const ipcFin = Number(ipcFinal) > 0 ? Number(ipcFinal) : this.IPC_REFERENCIA_ACTUAL;
    
    // Factor de indexación oficial Consejo de Estado: (IPC_final / IPC_inicial)
    const factorIndexacion = ipcFin / ipcIni;

    let totalDanoEmergenteHistorico = 0;
    let totalDanoEmergenteActualizado = 0;
    let itemsLiquidados = [];

    items.forEach((item, index) => {
      const vHist = Number(item.valorHistorico) || 0;
      let vCalculado = vHist;
      let metodoCalculo = 'Valor directo histórico';

      // Tratamiento especial por tipo de costo
      if (item.tipo === 'EQUIPO_STANDBY') {
        const pctStandBy = (Number(item.standByPct) || this.TARIFA_STANDBY_MAQUINARIA_PCT) / 100;
        const diasUso = Number(item.diasAfectados) || diasPerm;
        // Si el valor era tarifa diaria plena:
        if (item.tarifaDiariaPlena) {
          vCalculado = Number(item.tarifaDiariaPlena) * pctStandBy * diasUso;
          metodoCalculo = `Tarifa Stand-by (${(pctStandBy * 100).toFixed(0)}%) x ${diasUso} días`;
        } else {
          vCalculado = vHist * pctStandBy;
          metodoCalculo = `Stand-by reconocido al ${(pctStandBy * 100).toFixed(0)}% s/tarifa`;
        }
      } else if (item.tipo === 'NOMINA_PERSONAL') {
        const factor = Number(item.factorPrestacional) || this.FACTOR_PRESTACIONAL_DEFAULT;
        const diasUso = Number(item.diasAfectados) || diasPerm;
        const salarioMes = Number(item.salarioBaseMensual) || vHist;
        vCalculado = (salarioMes * factor * (diasUso / 30));
        metodoCalculo = `Nómina (${diasUso} días) c/Factor Prestacional ${(factor * 100).toFixed(0)}%`;
      } else if (item.tipo === 'DESFASE_MATERIALES_IPP') {
        const deltaPct = Number(item.incrementoIppPct) || 0;
        vCalculado = vHist * (deltaPct / 100);
        metodoCalculo = `Sobrecosto directo IPP DANE (+${deltaPct.toFixed(2)}%)`;
      }

      // Aplicar fórmula de indexación jurisprudencial
      const vActualizado = vCalculado * factorIndexacion;
      const indexacionValor = vActualizado - vCalculado;

      totalDanoEmergenteHistorico += vCalculado;
      totalDanoEmergenteActualizado += vActualizado;

      itemsLiquidados.push({
        id: index + 1,
        tipo: item.tipo || 'COSTO_GENERAL',
        descripcion: item.descripcion || 'Sobrecosto contractual no previsto',
        valor_historico_base: Number(vCalculado.toFixed(2)),
        metodo_calculo: metodoCalculo,
        factor_indexacion: Number(factorIndexacion.toFixed(4)),
        valor_indexado: Number(vActualizado.toFixed(2)),
        monto_indexacion: Number(indexacionValor.toFixed(2)),
        soporte_anexo: item.soporte || 'Bitácora y facturas de obra'
      });
    });

    // Lucro Cesante (Utilidad dejada de percibir si la tipología jurídica lo reconoce)
    let totalLucroCesante = 0;
    let lucroCesanteActualizado = 0;

    if (tipoConfig.reconoceLucroCesante && totalDanoEmergenteHistorico > 0) {
      const margen = Number(margenUtilidadEsperadaPct) || 5.0;
      totalLucroCesante = totalDanoEmergenteHistorico * (margen / 100);
      lucroCesanteActualizado = totalLucroCesante * factorIndexacion;
    }

    const totalReclamado = totalDanoEmergenteActualizado + lucroCesanteActualizado;
    const pctImpactoContrato = contrato > 0 ? (totalReclamado / contrato) * 100 : 0;
    const indexacionTotal = (totalDanoEmergenteActualizado - totalDanoEmergenteHistorico) + 
                           (lucroCesanteActualizado - totalLucroCesante);

    // Dictamen y evaluación de viabilidad procesal
    let viabilidadProcesal = 'ALTA';
    let dictamenJuridico = 'La reclamación reúne los presupuestos fácticos y jurisprudenciales para ser radicada en solicitud de conciliación prejudicial.';

    if (pctImpactoContrato > 50.0) {
      viabilidadProcesal = 'MEDIA_ALTA';
      dictamenJuridico = 'El sobrecosto excede el 50% del valor del contrato original. Se requiere dictamen pericial financiero externo y acreditación rigurosa de causas.';
    } else if (items.length === 0) {
      viabilidadProcesal = 'BAJA';
      dictamenJuridico = 'No se han registrado ítems o evidencias técnicas que sustenten el daño emergente.';
    }

    return {
      tipologia: tipoConfig,
      valor_contrato: contrato,
      plazo_inicial_dias: plazoInicialDias,
      dias_mayor_permanencia: diasPerm,
      indices_dane: {
        ipc_inicial: ipcIni,
        ipc_final: ipcFin,
        factor_indexacion: Number(factorIndexacion.toFixed(4)),
        porcentaje_variacion: Number(((factorIndexacion - 1) * 100).toFixed(2))
      },
      liquidacion: {
        dano_emergente_historico: Number(totalDanoEmergenteHistorico.toFixed(2)),
        dano_emergente_actualizado: Number(totalDanoEmergenteActualizado.toFixed(2)),
        lucro_cesante_historico: Number(totalLucroCesante.toFixed(2)),
        lucro_cesante_actualizado: Number(lucroCesanteActualizado.toFixed(2)),
        indexacion_ipc_total: Number(indexacionTotal.toFixed(2)),
        monto_total_reclamado: Number(totalReclamado.toFixed(2)),
        porcentaje_impacto_contrato: Number(pctImpactoContrato.toFixed(2))
      },
      items_liquidados: itemsLiquidados,
      dictamen_pericial: {
        viabilidad: viabilidadProcesal,
        dictamen: dictamenJuridico,
        formula_indexacion_aplicada: 'R = Rh * (IPC_final / IPC_inicial) [Consejo de Estado Sección Tercera]'
      }
    };
  }

  /**
   * Genera el Dictamen Pericial Financiero y Solicitud Formal de Conciliación Prejudicial en PDF
   * Cumple con la Ley 2220 de 2022 y lineamientos de la Procuraduría General de la Nación
   * 
   * @param {Object} data
   * @returns {Promise<Buffer>}
   */
  async generarDictamenReclamacionPdf(data) {
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
          contratista_nombre = 'CONSORCIO EJECUTOR COLOMBIA',
          contratista_nit = '901.456.789-1',
          hechos_generadores = 'Prórrogas y suspensiones reiteradas por no entrega oportuna del corredor predial y licencias ambientales por parte de la Entidad Contratante.',
          calculo = {}
        } = data;

        const primaryColor = '#1E3A8A';   // Azul institucional
        const accentRed = '#B91C1C';      // Rojo peritaje
        const darkText = '#0F172A';
        const grayText = '#475569';
        const lightBg = '#F8FAFC';

        const liq = calculo.liquidacion || {};
        const tip = calculo.tipologia || this.TIPOLOGIAS.MAYOR_PERMANENCIA_OBRA;
        const dane = calculo.indices_dane || {};

        // -------------------------------------------------------------
        // ENCABEZADO INSTITUCIONAL
        // -------------------------------------------------------------
        doc.rect(36, 36, 540, 52).fillAndStroke('#FEF2F2', '#FECACA');
        
        doc.fillColor(accentRed).fontSize(9.5).font('Helvetica-Bold')
           .text('SOLICITUD DE CONCILIACIÓN PREJUDICIAL EN LO CONTENCIOSO ADMINISTRATIVO', 46, 44, { align: 'center', width: 520 });
        doc.fillColor(darkText).fontSize(11).font('Helvetica-Bold')
           .text('DICTAMEN PERICIAL DE RESTABLECIMIENTO DEL EQUILIBRIO ECONÓMICO', 46, 57, { align: 'center', width: 520 });
        doc.fillColor(grayText).fontSize(7.5).font('Helvetica')
           .text('Ley 80 de 1993 Art. 27 • Ley 2220 de 2022 • Consejo de Estado Sección Tercera Rad. 18080', 46, 72, { align: 'center', width: 520 });

        doc.y = 98;

        // -------------------------------------------------------------
        // FICHA TÉCNICA DEL CONTRATO Y PARTES
        // -------------------------------------------------------------
        doc.rect(36, doc.y, 540, 68).fillAndStroke(lightBg, '#E2E8F0');
        const cardY = doc.y + 6;

        doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('IDENTIFICACIÓN CONTRACTUAL Y PROCESAL', 44, cardY);
        
        let lineY = cardY + 12;
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(darkText).text('Entidad Convocada: ', 44, lineY, { continued: true })
           .font('Helvetica').text(entidad_nombre);
        doc.font('Helvetica-Bold').text('Contrato / Proceso: ', 320, lineY, { continued: true })
           .font('Helvetica').text(`${contrato_numero} / ${proceso_numero}`);

        lineY += 11;
        doc.font('Helvetica-Bold').text('Convocante / Contratista: ', 44, lineY, { continued: true })
           .font('Helvetica').text(`${contratista_nombre} (NIT: ${contratista_nit})`);
        doc.font('Helvetica-Bold').text('Tipología Jurídica: ', 320, lineY, { continued: true })
           .font('Helvetica-Bold').fillColor(accentRed).text(tip.nombre || 'Mayor Permanencia en Obra');

        lineY += 11;
        doc.font('Helvetica-Bold').fillColor(darkText).text('Valor Original Contrato: ', 44, lineY, { continued: true })
           .font('Helvetica').text(`$${Number(calculo.valor_contrato || 0).toLocaleString('es-CO')} COP`);
        doc.font('Helvetica-Bold').text('Días Afectación / Suspensión: ', 320, lineY, { continued: true })
           .font('Helvetica').text(`${calculo.dias_mayor_permanencia || 0} Días Calendario`);

        lineY += 11;
        doc.font('Helvetica-Bold').text('Índices DANE (IPC Indexación): ', 44, lineY, { continued: true })
           .font('Helvetica').text(`IPC Base: ${dane.ipc_inicial || 0} | IPC Corte: ${dane.ipc_final || 0} (Factor: ${dane.factor_indexacion || 1.0})`);
        doc.font('Helvetica-Bold').text('Impacto sobre Contrato: ', 320, lineY, { continued: true })
           .font('Helvetica-Bold').fillColor(accentRed).text(`${Number(liq.porcentaje_impacto_contrato || 0).toFixed(2)}%`);

        doc.y = cardY + 68;

        // -------------------------------------------------------------
        // CAPÍTULO I: HECHOS Y FUNDAMENTO JURÍDICO
        // -------------------------------------------------------------
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text('I. RESUMEN DE HECHOS GENERADORES Y FUNDAMENTO JURÍDICO', 36, doc.y);
        doc.y += 10;

        doc.rect(36, doc.y, 540, 48).fillAndStroke('#FFFBEB', '#FDE68A');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#92400E').text('Hechos Generadores del Desequilibrio:', 42, doc.y + 5);
        doc.font('Helvetica').fontSize(6.8).fillColor('#78350F')
           .text(hechos_generadores, 42, doc.y + 15, { width: 526, lineGap: 1.2 });
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#92400E')
           .text(`Fundamento Legal: ${tip.fundamentoLegal}`, 42, doc.y + 36, { width: 526 });

        doc.y += 54;

        // -------------------------------------------------------------
        // CAPÍTULO II: RESUMEN DE LIQUIDACIÓN PERICIAL Y PERJUICIOS
        // -------------------------------------------------------------
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text('II. CUADRO DE LIQUIDACIÓN ECONÓMICA DE PERJUICIOS', 36, doc.y);
        doc.y += 10;

        const tableY = doc.y;
        doc.rect(36, tableY, 540, 16).fill(primaryColor);
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#FFFFFF');
        doc.text('CONCEPTO DE INDEMNIZACIÓN', 42, tableY + 4, { width: 220 });
        doc.text('VALOR HISTÓRICO', 265, tableY + 4, { width: 90, align: 'right' });
        doc.text('INDEXACIÓN IPC', 360, tableY + 4, { width: 90, align: 'right' });
        doc.text('TOTAL RECLAMADO (COP)', 455, tableY + 4, { width: 115, align: 'right' });

        let rowY = tableY + 16;

        const filasLiquidacion = [
          {
            concepto: 'Daño Emergente (Costos Directos, Stand-by y Nómina)',
            hist: liq.dano_emergente_historico || 0,
            index: (liq.dano_emergente_actualizado || 0) - (liq.dano_emergente_historico || 0),
            total: liq.dano_emergente_actualizado || 0
          },
          {
            concepto: 'Lucro Cesante (Utilidad Dejada de Percibir s/Régimen Legal)',
            hist: liq.lucro_cesante_historico || 0,
            index: (liq.lucro_cesante_actualizado || 0) - (liq.lucro_cesante_historico || 0),
            total: liq.lucro_cesante_actualizado || 0
          }
        ];

        filasLiquidacion.forEach((f, idx) => {
          const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          doc.rect(36, rowY, 540, 15).fillAndStroke(bg, '#E2E8F0');
          doc.font('Helvetica-Bold').fontSize(6.8).fillColor(darkText).text(f.concepto, 42, rowY + 3.5, { width: 220 });
          doc.font('Helvetica').fontSize(6.8).fillColor(darkText).text(`$${Number(f.hist).toLocaleString('es-CO')}`, 265, rowY + 3.5, { width: 90, align: 'right' });
          doc.font('Helvetica').fontSize(6.8).fillColor('#B45309').text(`$${Number(f.index).toLocaleString('es-CO')}`, 360, rowY + 3.5, { width: 90, align: 'right' });
          doc.font('Helvetica-Bold').fontSize(6.8).fillColor(accentRed).text(`$${Number(f.total).toLocaleString('es-CO')}`, 455, rowY + 3.5, { width: 115, align: 'right' });
          rowY += 15;
        });

        // Fila Totalizadora
        doc.rect(36, rowY, 540, 16).fillAndStroke('#FEE2E2', '#FECACA');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(accentRed).text('TOTAL RESTABLECIMIENTO ECONÓMICO SOLICITADO:', 42, rowY + 4, { width: 220 });
        doc.text(`$${Number((liq.dano_emergente_historico || 0) + (liq.lucro_cesante_historico || 0)).toLocaleString('es-CO')}`, 265, rowY + 4, { width: 90, align: 'right' });
        doc.text(`$${Number(liq.indexacion_ipc_total || 0).toLocaleString('es-CO')}`, 360, rowY + 4, { width: 90, align: 'right' });
        doc.text(`$${Number(liq.monto_total_reclamado || 0).toLocaleString('es-CO')} COP`, 455, rowY + 4, { width: 115, align: 'right' });

        doc.y = rowY + 22;

        // -------------------------------------------------------------
        // CAPÍTULO III: DESGLOSE DE ÍTEMS Y MEMORIA DE CÁLCULO
        // -------------------------------------------------------------
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text('III. DESGLOSE PORMENORIZADO DE ÍTEMS RECLAMADOS', 36, doc.y);
        doc.y += 10;

        const itemsTableY = doc.y;
        doc.rect(36, itemsTableY, 540, 15).fill('#334155');
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#FFFFFF');
        doc.text('ÍTEM / RUBRO', 40, itemsTableY + 4, { width: 130 });
        doc.text('MÉTODO DE CÁLCULO PERICIAL', 175, itemsTableY + 4, { width: 160 });
        doc.text('VALOR BASE', 340, itemsTableY + 4, { width: 70, align: 'right' });
        doc.text('INDEXACIÓN', 415, itemsTableY + 4, { width: 65, align: 'right' });
        doc.text('VALOR TOTAL (COP)', 485, itemsTableY + 4, { width: 85, align: 'right' });

        let itemRowY = itemsTableY + 15;
        const items = calculo.items_liquidados || [];

        items.forEach((it, idx) => {
          if (itemRowY > 670) {
            doc.addPage();
            itemRowY = 36;
          }

          const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          doc.rect(36, itemRowY, 540, 14).fillAndStroke(bg, '#E2E8F0');

          doc.font('Helvetica-Bold').fontSize(6.2).fillColor(darkText)
             .text(it.descripcion, 40, itemRowY + 3.5, { width: 130, ellipsis: true });
          doc.font('Helvetica').fontSize(6).fillColor(grayText)
             .text(it.metodo_calculo, 175, itemRowY + 3.5, { width: 160, ellipsis: true });
          doc.font('Helvetica').fontSize(6.2).fillColor(darkText)
             .text(`$${Number(it.valor_historico_base).toLocaleString('es-CO')}`, 340, itemRowY + 3.5, { width: 70, align: 'right' });
          doc.font('Helvetica').fontSize(6.2).fillColor('#B45309')
             .text(`$${Number(it.monto_indexacion).toLocaleString('es-CO')}`, 415, itemRowY + 3.5, { width: 65, align: 'right' });
          doc.font('Helvetica-Bold').fontSize(6.2).fillColor(accentRed)
             .text(`$${Number(it.valor_indexado).toLocaleString('es-CO')}`, 485, itemRowY + 3.5, { width: 85, align: 'right' });

          itemRowY += 14;
        });

        doc.y = itemRowY + 14;

        // -------------------------------------------------------------
        // CAPÍTULO IV: PETICIÓN FORMAL DE ARREGLO AMIGABLE (Ley 2220/2022)
        // -------------------------------------------------------------
        if (doc.y > 640) {
          doc.addPage();
          doc.y = 36;
        }

        doc.rect(36, doc.y, 540, 42).fillAndStroke('#F0FDF4', '#BBF7D0');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#166534').text('PETICIÓN CONCILIATORIA Y FÓRMULA DE ARREGLO:', 42, doc.y + 5);
        doc.font('Helvetica').fontSize(6.8).fillColor('#14532D')
           .text(`Se convoca a ${entidad_nombre} para que en audiencia prejudicial ante la Procuraduría Judicial se reconozca y pague a favor de ${contratista_nombre} la suma líquida de $${Number(liq.monto_total_reclamado || 0).toLocaleString('es-CO')} COP por concepto de restablecimiento del equilibrio económico del Contrato ${contrato_numero}.`, 42, doc.y + 15, { width: 526, lineGap: 1.2 });

        doc.y += 50;

        // -------------------------------------------------------------
        // CAPÍTULO V: FIRMAS DE RESPONSABILIDAD TÉCNICA Y JURÍDICA
        // -------------------------------------------------------------
        if (doc.y > 630) {
          doc.addPage();
          doc.y = 36;
        }

        doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('FIRMAS DE RESPONSABILIDAD TÉCNICA Y REPRESENTACIÓN LEGAL', 36, doc.y);
        doc.y += 12;

        const fWidth = 250;
        const fy = doc.y;

        // Cuadro 1: Representante Legal
        doc.rect(36, fy, fWidth, 54).fillAndStroke('#FFFFFF', '#CBD5E1');
        doc.moveTo(46, fy + 36).lineTo(36 + fWidth - 10, fy + 36).stroke('#94A3B8');
        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(darkText)
           .text('REPRESENTANTE LEGAL CONVOCANTE', 36, fy + 39, { width: fWidth, align: 'center' });
        doc.font('Helvetica').fontSize(6).fillColor(grayText)
           .text(`${contratista_nombre}\nC.C. y NIT debidamente facultado`, 36, fy + 47, { width: fWidth, align: 'center' });

        // Cuadro 2: Perito Ingeniero / Especialista
        doc.rect(326, fy, fWidth, 54).fillAndStroke('#FFFFFF', '#CBD5E1');
        doc.moveTo(336, fy + 36).lineTo(326 + fWidth - 10, fy + 36).stroke('#94A3B8');
        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(darkText)
           .text('PERITO INGENIERO / ESPECIALISTA EN COSTOS', 326, fy + 39, { width: fWidth, align: 'center' });
        doc.font('Helvetica').fontSize(6).fillColor(grayText)
           .text('Especialista en Gerencia de Obras & Peritaje Financiero\nMatrícula Profesional Vigente COPNIA', 326, fy + 47, { width: fWidth, align: 'center' });

        // Numeración de páginas
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(6.5).font('Helvetica').fillColor('#94A3B8')
             .text(`Radar SECOP • Dictamen Pericial de Equilibrio Económico (Ley 80 Art. 27) • Contrato ${contrato_numero} • Página ${i + 1} de ${pages.count}`, 36, doc.page.height - 24, { align: 'center', width: 540 });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Genera el Libro Excel (.xlsx) estructurado con fórmulas nativas de cálculo pericial
   * e indexación según parámetros del Consejo de Estado
   * 
   * @param {Object} data
   * @returns {Promise<Buffer>}
   */
  async generarCuadroLiquidacionExcel(data) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Radar SECOP - NIKADU IA';
    workbook.lastModifiedBy = 'Radar SECOP';
    workbook.created = new Date();
    workbook.modified = new Date();

    const {
      proceso_numero = 'LP-OBRA-2026-001',
      contrato_numero = 'CTO-2026-045',
      entidad_nombre = 'ENTIDAD ESTATAL CONTRATANTE',
      contratista_nombre = 'CONSORCIO EJECUTOR COLOMBIA',
      contratista_nit = '901.456.789-1',
      calculo = {}
    } = data;

    const liq = calculo.liquidacion || {};
    const tip = calculo.tipologia || this.TIPOLOGIAS.MAYOR_PERMANENCIA_OBRA;
    const dane = calculo.indices_dane || {};

    // -------------------------------------------------------------
    // HOJA 1: RESUMEN PERICIAL Y LIQUIDACIÓN
    // -------------------------------------------------------------
    const wsResumen = workbook.addWorksheet('1. Liquidación Pericial');
    wsResumen.views = [{ showGridLines: true }];

    wsResumen.columns = [
      { width: 28 },
      { width: 35 },
      { width: 22 },
      { width: 25 }
    ];

    wsResumen.mergeCells('A1:D1');
    wsResumen.getCell('A1').value = 'REPÚBLICA DE COLOMBIA • RADAR SECOP NIKADU IA';
    wsResumen.getCell('A1').font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
    wsResumen.getCell('A1').alignment = { horizontal: 'center' };

    wsResumen.mergeCells('A2:D2');
    wsResumen.getCell('A2').value = 'LIQUIDACIÓN DE RESTABLECIMIENTO DEL EQUILIBRIO ECONÓMICO (LEY 80 ART. 27)';
    wsResumen.getCell('A2').font = { size: 12, bold: true, color: { argb: 'FFB91C1C' } };
    wsResumen.getCell('A2').alignment = { horizontal: 'center' };

    wsResumen.addRow([]);
    wsResumen.addRow(['NÚMERO DE PROCESO:', proceso_numero, 'CONTRATO NÚMERO:', contrato_numero]);
    wsResumen.addRow(['ENTIDAD CONVOCADA:', entidad_nombre, 'FECHA EMISIÓN:', new Date().toLocaleDateString('es-CO')]);
    wsResumen.addRow(['CONTRATISTA CONVOCANTE:', contratista_nombre, 'NIT CONTRATISTA:', contratista_nit]);
    wsResumen.addRow(['TIPOLOGÍA JURÍDICA:', tip.nombre, 'ALCANCE LEGAL:', tip.alcanceIndemnizatorio]);
    wsResumen.addRow(['VALOR INICIAL CONTRATO:', Number(calculo.valor_contrato || 0), 'DÍAS SUSPENSIÓN/PRÓRROGA:', `${calculo.dias_mayor_permanencia || 0} Días`]);
    wsResumen.addRow(['ÍNDICE IPC INICIAL DANE:', Number(dane.ipc_inicial || 0), 'ÍNDICE IPC FINAL DANE:', Number(dane.ipc_final || 0)]);
    wsResumen.addRow(['FACTOR INDEXACIÓN DANE:', { formula: 'D9/B9' }, 'VARIACIÓN INFLACIÓN:', `${dane.porcentaje_variacion || 0}%`]);

    ['A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10'].forEach(c => {
      wsResumen.getCell(c).font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
    });

    wsResumen.getCell('B8').numFmt = '$#,##0.00;($#,##0.00);"-"';
    wsResumen.getCell('B10').numFmt = '0.0000';

    wsResumen.addRow([]);
    wsResumen.addRow(['CONSOLIDADO OFICIAL DE PERJUICIOS ECONÓMICOS:']);
    wsResumen.getCell('A12').font = { bold: true, size: 11, color: { argb: 'FFB91C1C' } };

    const headerConsolRow = 13;
    wsResumen.addRow(['CONCEPTO DE INDEMNIZACIÓN', 'VALOR HISTÓRICO (COP)', 'INDEXACIÓN IPC DANE', 'TOTAL RECLAMADO (COP)']);
    wsResumen.getRow(headerConsolRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ['A13', 'B13', 'C13', 'D13'].forEach(c => {
      wsResumen.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB91C1C' }
      };
    });

    wsResumen.addRow([
      'Daño Emergente (Costos Directos, Stand-by y Nómina)',
      Number(liq.dano_emergente_historico || 0),
      { formula: 'D14-B14' },
      Number(liq.dano_emergente_actualizado || 0)
    ]);
    wsResumen.addRow([
      'Lucro Cesante (Utilidad s/Régimen Legal)',
      Number(liq.lucro_cesante_historico || 0),
      { formula: 'D15-B15' },
      Number(liq.lucro_cesante_actualizado || 0)
    ]);

    ['B14', 'C14', 'D14', 'B15', 'C15', 'D15'].forEach(c => {
      wsResumen.getCell(c).numFmt = '$#,##0.00;($#,##0.00);"-"';
    });

    // Fila Total
    wsResumen.addRow([
      'TOTAL PERJUICIOS RECLAMADOS',
      { formula: 'SUM(B14:B15)' },
      { formula: 'SUM(C14:C15)' },
      { formula: 'SUM(D14:D15)' }
    ]);
    wsResumen.getRow(16).font = { bold: true, color: { argb: 'FFB91C1C' } };
    ['A16', 'B16', 'C16', 'D16'].forEach(c => {
      wsResumen.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEE2E2' }
      };
      wsResumen.getCell(c).border = {
        top: { style: 'thin' },
        bottom: { style: 'double' }
      };
    });
    ['B16', 'C16', 'D16'].forEach(c => {
      wsResumen.getCell(c).numFmt = '$#,##0.00;($#,##0.00);"-"';
    });

    // -------------------------------------------------------------
    // HOJA 2: DETALLE DE ÍTEMS Y MEMORIA DE CÁLCULO
    // -------------------------------------------------------------
    const wsDetalle = workbook.addWorksheet('2. Detalle de Ítems');
    wsDetalle.views = [{ showGridLines: true }];

    wsDetalle.columns = [
      { width: 8 },  // #
      { width: 30 }, // Descripción
      { width: 30 }, // Método de Cálculo
      { width: 22 }, // Valor Histórico Base
      { width: 18 }, // Factor Indexación
      { width: 22 }, // Indexación COP
      { width: 22 }  // Total Indexado COP
    ];

    wsDetalle.mergeCells('A1:G1');
    wsDetalle.getCell('A1').value = 'MEMORIA PORMENORIZADA DE CÁLCULO PERICIAL DE COSTOS Y SOBRECOSTOS';
    wsDetalle.getCell('A1').font = { size: 12, bold: true, color: { argb: 'FF1E3A8A' } };
    wsDetalle.getCell('A1').alignment = { horizontal: 'center' };

    wsDetalle.addRow([]);

    const hDetRow = 3;
    wsDetalle.addRow([
      'N°',
      'CONCEPTO / RUBRO',
      'MÉTODO PERICIAL APLICADO',
      'VALOR BASE (COP)',
      'FACTOR IPC',
      'MONTO INDEXACIÓN',
      'TOTAL RECLAMADO'
    ]);
    wsDetalle.getRow(hDetRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3'].forEach(c => {
      wsDetalle.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }
      };
    });

    let dRow = 4;
    const items = calculo.items_liquidados || [];

    items.forEach(it => {
      wsDetalle.addRow([
        it.id,
        it.descripcion,
        it.metodo_calculo,
        Number(it.valor_historico_base),
        { formula: "'1. Liquidación Pericial'!B10" },
        { formula: `G${dRow}-D${dRow}` },
        { formula: `D${dRow}*E${dRow}` }
      ]);

      wsDetalle.getCell(`D${dRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
      wsDetalle.getCell(`E${dRow}`).numFmt = '0.0000';
      wsDetalle.getCell(`F${dRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
      wsDetalle.getCell(`G${dRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
      wsDetalle.getCell(`G${dRow}`).font = { bold: true, color: { argb: 'FFB91C1C' } };

      dRow++;
    });

    // Fila Totalizadora Hoja 2
    wsDetalle.addRow([
      'TOTAL',
      'SUMATORIA CONSOLIDADA',
      '-',
      { formula: `SUM(D4:D${dRow - 1})` },
      '-',
      { formula: `SUM(F4:F${dRow - 1})` },
      { formula: `SUM(G4:G${dRow - 1})` }
    ]);

    wsDetalle.getRow(dRow).font = { bold: true, color: { argb: 'FF1E3A8A' } };
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
      wsDetalle.getCell(`${col}${dRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' }
      };
      wsDetalle.getCell(`${col}${dRow}`).border = {
        top: { style: 'thin' },
        bottom: { style: 'double' }
      };
    });

    wsDetalle.getCell(`D${dRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
    wsDetalle.getCell(`F${dRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
    wsDetalle.getCell(`G${dRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = new EquilibrioEconomicoEngine();
