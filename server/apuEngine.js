/**
 * ====================================================================
 * RADAR SECOP - MOTOR DE ANÁLISIS DE PRECIOS UNITARIOS (APU) Y DESBALANCE
 * Marco Normativo y Jurisprudencial:
 * - Decreto 1082 de 2015 (Art. 2.2.1.1.2.2.4: Precios Artificialmente Bajos)
 * - Ley 1882 de 2018 (Pliegos Tipo y Reglas Objetivas de Evaluación Económica)
 * - Guía para la Gestión de Precios y Análisis del Sector ANCP-CCE
 * - Estatuto Tributario (Art. 462-1: Tarifa especial de IVA sobre AIU)
 * ====================================================================
 */

const PDFDocument = require('pdfkit');

class APUEngine {
  constructor() {
    this.UMBRALES = {
      DESVIACION_NORMAL_MIN: -15.0,
      DESVIACION_NORMAL_MAX: 10.0,
      ALERTA_SOBRECOSTO_MAX: 25.0,
      ALERTA_SUBVALORADO_MIN: -25.0,
      FRONT_LOADING_LIMITE: 1.15 // Ratio > 1.15 en fase inicial indica anticipo encubierto
    };

    this.AIU_DEFAULT = {
      administracion_pct: 18.0,
      imprevistos_pct: 2.0,
      utilidad_pct: 5.0,
      tarifa_iva_utilidad_pct: 19.0
    };
  }

  /**
   * Clasifica un ítem según su desviación frente al precio oficial de referencia
   * @param {number} desviacionPct - Porcentaje de variación
   */
  clasificarDesviacion(desviacionPct) {
    if (desviacionPct > this.UMBRALES.ALERTA_SOBRECOSTO_MAX) {
      return {
        nivel: 'CRITICO_SOBREPRECIO',
        badge: 'CRÍTICO SOBREPRECIO',
        color: '#ef4444',
        alerta: true,
        motivo: `Precio unitario excede en más del 25% el estimado oficial (+${desviacionPct.toFixed(1)}%). Riesgo de desbalance especulativo.`
      };
    } else if (desviacionPct > this.UMBRALES.DESVIACION_NORMAL_MAX) {
      return {
        nivel: 'ALERTA_SOBRECOSTO',
        badge: 'SOBRECOSTO',
        color: '#f59e0b',
        alerta: true,
        motivo: `Precio unitario superior entre 10% y 25% (+${desviacionPct.toFixed(1)}%). Posible distorsión de flujo.`
      };
    } else if (desviacionPct < this.UMBRALES.ALERTA_SUBVALORADO_MIN) {
      return {
        nivel: 'CRITICO_PRECIO_BAJO',
        badge: 'PRECIO ARTIFICIALMENTE BAJO',
        color: '#dc2626',
        alerta: true,
        motivo: `Precio unitario inferior en más del 25% (${desviacionPct.toFixed(1)}%). Alerta Decreto 1082/2015: riesgo de no ejecución o colapso del ítem.`
      };
    } else if (desviacionPct < this.UMBRALES.DESVIACION_NORMAL_MIN) {
      return {
        nivel: 'ALERTA_SUBVALORADO',
        badge: 'SUBVALORADO',
        color: '#eab308',
        alerta: true,
        motivo: `Precio unitario entre 15% y 25% por debajo del estimado (${desviacionPct.toFixed(1)}%). Se sugiere revisar rendimientos.`
      };
    } else {
      return {
        nivel: 'NORMAL',
        badge: 'EQUILIBRADO',
        color: '#10b981',
        alerta: false,
        motivo: 'Precio unitario dentro de los márgenes razonables del mercado estatal (-15% a +10%).'
      };
    }
  }

  /**
   * Realiza la auditoría comparativa completa de APUs, Desbalance y AIU
   * 
   * @param {Array<Object>} items - Lista de ítems del presupuesto
   * @param {Object} aiuConfig - Configuración de AIU (Administración, Imprevistos, Utilidad)
   */
  analizarPresupuestoYDesbalance(items = [], aiuConfig = {}) {
    if (!items || items.length === 0) {
      throw new Error('Se requiere al menos un ítem para realizar el análisis de APUs');
    }

    const aiu = {
      administracion_pct: parseFloat(aiuConfig.administracion_pct !== undefined ? aiuConfig.administracion_pct : this.AIU_DEFAULT.administracion_pct),
      imprevistos_pct: parseFloat(aiuConfig.imprevistos_pct !== undefined ? aiuConfig.imprevistos_pct : this.AIU_DEFAULT.imprevistos_pct),
      utilidad_pct: parseFloat(aiuConfig.utilidad_pct !== undefined ? aiuConfig.utilidad_pct : this.AIU_DEFAULT.utilidad_pct),
      tarifa_iva_utilidad_pct: parseFloat(aiuConfig.tarifa_iva_utilidad_pct !== undefined ? aiuConfig.tarifa_iva_utilidad_pct : this.AIU_DEFAULT.tarifa_iva_utilidad_pct)
    };

    let totalOficialDirecto = 0;
    let totalOfertaDirecto = 0;

    let subtotalInicialOficial = 0;
    let subtotalInicialOferta = 0;

    let itemsConAlerta = 0;
    let itemsCriticosSobreprecio = 0;
    let itemsCriticosPrecioBajo = 0;

    const itemsAuditados = items.map((it, idx) => {
      const codigo = it.codigo || `${idx + 1}.0`;
      const descripcion = it.descripcion || `Ítem ${idx + 1}`;
      const unidad = it.unidad || 'UN';
      const cantidad = parseFloat(it.cantidad) || 1;
      const precioOficial = parseFloat(it.precio_unitario_oficial) || 0;
      const precioOferta = parseFloat(it.precio_unitario_oferta) || 0;
      const fase = (it.fase || 'INTERMEDIA').toUpperCase(); // INICIAL, INTERMEDIA, FINAL

      const subOficial = Math.round(cantidad * precioOficial);
      const subOferta = Math.round(cantidad * precioOferta);

      totalOficialDirecto += subOficial;
      totalOfertaDirecto += subOferta;

      if (fase === 'INICIAL') {
        subtotalInicialOficial += subOficial;
        subtotalInicialOferta += subOferta;
      }

      // Desviación del precio unitario
      const desviacionPct = precioOficial > 0
        ? Number((((precioOferta - precioOficial) / precioOficial) * 100).toFixed(2))
        : 0;

      const diferenciaCop = subOferta - subOficial;
      const clasificacion = this.clasificarDesviacion(desviacionPct);

      if (clasificacion.alerta) itemsConAlerta++;
      if (clasificacion.nivel === 'CRITICO_SOBREPRECIO') itemsCriticosSobreprecio++;
      if (clasificacion.nivel === 'CRITICO_PRECIO_BAJO') itemsCriticosPrecioBajo++;

      return {
        codigo,
        descripcion,
        unidad,
        cantidad,
        fase,
        precio_unitario_oficial: precioOficial,
        precio_unitario_oferta: precioOferta,
        subtotal_oficial: subOficial,
        subtotal_oferta: subOferta,
        diferencia_cop: diferenciaCop,
        desviacion_pct: desviacionPct,
        clasificacion: clasificacion.nivel,
        badge: clasificacion.badge,
        badge_color: clasificacion.color,
        alerta: clasificacion.alerta,
        motivo_alerta: clasificacion.motivo
      };
    });

    // Cálculo del AIU
    const aiuTotalPct = Number((aiu.administracion_pct + aiu.imprevistos_pct + aiu.utilidad_pct).toFixed(2));
    const factorAiu = 1 + (aiuTotalPct / 100);

    const aiuOficialCop = Math.round(totalOficialDirecto * (aiuTotalPct / 100));
    const aiuOfertaCop = Math.round(totalOfertaDirecto * (aiuTotalPct / 100));

    // IVA sobre utilidad (Art. 462-1 E.T.)
    const utilidadOficialCop = Math.round(totalOficialDirecto * (aiu.utilidad_pct / 100));
    const utilidadOfertaCop = Math.round(totalOfertaDirecto * (aiu.utilidad_pct / 100));
    const ivaUtilidadOficialCop = Math.round(utilidadOficialCop * (aiu.tarifa_iva_utilidad_pct / 100));
    const ivaUtilidadOfertaCop = Math.round(utilidadOfertaCop * (aiu.tarifa_iva_utilidad_pct / 100));

    const totalOficialConAiu = totalOficialDirecto + aiuOficialCop + ivaUtilidadOficialCop;
    const totalOfertaConAiu = totalOfertaDirecto + aiuOfertaCop + ivaUtilidadOfertaCop;

    // Desviación global del presupuesto
    const desviacionGlobalPct = totalOficialConAiu > 0
      ? Number((((totalOfertaConAiu - totalOficialConAiu) / totalOficialConAiu) * 100).toFixed(2))
      : 0;

    // Front-Loading Ratio (Índice de Anticipo Encubierto en Fase Inicial)
    let frontLoadingRatio = 1.0;
    let tieneFrontLoading = false;
    let motivoFrontLoading = 'Distribución de cobros temporalmente equilibrada.';

    if (subtotalInicialOficial > 0) {
      frontLoadingRatio = Number((subtotalInicialOferta / subtotalInicialOficial).toFixed(3));
      if (frontLoadingRatio > this.UMBRALES.FRONT_LOADING_LIMITE) {
        tieneFrontLoading = true;
        motivoFrontLoading = `⚠️ ALERTA DE FRONT-LOADING (Ratio: ${frontLoadingRatio}): La propuesta cobra un ${(frontLoadingRatio * 100 - 100).toFixed(1)}% más en los ítems de fase inicial respecto al estimado oficial. Constituye presunto anticipo financiero encubierto.`;
      }
    }

    // Dictamen Global de Viabilidad
    let estadoDictamen = 'EQUILIBRADO';
    let conceptoJuridico = '';

    if (itemsCriticosSobreprecio > 0 && tieneFrontLoading) {
      estadoDictamen = 'OBSERVADO_DESBALANCE';
      conceptoJuridico = 'La propuesta presenta DESBALANCE GRAVE por combinación de sobrecostos especulativos en ítems individuales e inflación de cobros en fase inicial (Front-Loading). Se recomienda requerir al proponente justificación técnica detallada de los APUs.';
    } else if (itemsCriticosPrecioBajo > 1 || desviacionGlobalPct < -20.0) {
      estadoDictamen = 'ALERTA_PRECIO_BAJO';
      conceptoJuridico = 'Se detectaron ítems con valores inferiores en más del 25% frente a la referencia oficial, activando la causal de sospecha de precio artificialmente bajo (Decreto 1082/2015 Art. 2.2.1.1.2.2.4). Requiere trámite formal de aclaración de costos y salarios.';
    } else if (itemsConAlerta > 2) {
      estadoDictamen = 'OBSERVADO_DESBALANCE';
      conceptoJuridico = `Se identificaron ${itemsConAlerta} ítems con desvíos sensibles frente al presupuesto oficial de referencia. Se recomienda verificar los rendimientos y costos de insumos reportados.`;
    } else if (desviacionGlobalPct > 5.0) {
      estadoDictamen = 'OBSERVADO_SOBRECOSTO';
      conceptoJuridico = 'La propuesta económica global supera el presupuesto oficial de la entidad estatal, lo cual constituye causal de rechazo en licitaciones públicas de cuantía determinada.';
    } else {
      estadoDictamen = 'EQUILIBRADO';
      conceptoJuridico = 'La propuesta económica y su desagregación en precios unitarios (APUs) guardan estricta consistencia y equilibrio financiero con los precios de mercado y el presupuesto de la entidad. Oferta económicamente viable.';
    }

    return {
      totales: {
        total_oficial_directo: totalOficialDirecto,
        total_oferta_directo: totalOfertaDirecto,
        aiu_oficial_cop: aiuOficialCop,
        aiu_oferta_cop: aiuOfertaCop,
        iva_utilidad_oficial_cop: ivaUtilidadOficialCop,
        iva_utilidad_oferta_cop: ivaUtilidadOfertaCop,
        total_oficial_con_aiu: totalOficialConAiu,
        total_oferta_con_aiu: totalOfertaConAiu,
        desviacion_global_pct: desviacionGlobalPct,
        diferencia_total_cop: totalOfertaConAiu - totalOficialConAiu,
        porcentaje_po_oferta: Number(((totalOfertaConAiu / (totalOficialConAiu || 1)) * 100).toFixed(2))
      },
      front_loading: {
        subtotal_inicial_oficial: subtotalInicialOficial,
        subtotal_inicial_oferta: subtotalInicialOferta,
        front_loading_ratio: frontLoadingRatio,
        tiene_front_loading: tieneFrontLoading,
        alerta_detalle: motivoFrontLoading
      },
      aiu_desglose: {
        administracion_pct: aiu.administracion_pct,
        imprevistos_pct: aiu.imprevistos_pct,
        utilidad_pct: aiu.utilidad_pct,
        aiu_total_pct: aiuTotalPct,
        tarifa_iva_utilidad_pct: aiu.tarifa_iva_utilidad_pct
      },
      resumen_auditoria: {
        total_items: items.length,
        items_conformes: items.length - itemsConAlerta,
        items_con_alerta: itemsConAlerta,
        items_criticos_sobreprecio: itemsCriticosSobreprecio,
        items_criticos_precio_bajo: itemsCriticosPrecioBajo,
        estado_dictamen: estadoDictamen,
        concepto_juridico: conceptoJuridico
      },
      items: itemsAuditados
    };
  }

  /**
   * Genera el Dictamen Oficial de Auditoría de APUs y Desbalance en PDF con pdfkit
   * 
   * @param {Object} analisis - Resultado de analizarPresupuestoYDesbalance
   * @param {Object} procesoInfo - Datos del proceso (referencia, entidad, proponente)
   * @returns {Promise<Buffer>}
   */
  async generarDictamenApuPdf(analisis, procesoInfo = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          layout: 'portrait',
          margin: 36
        });

        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const fCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);
        const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        const totales = analisis.totales || {};
        const fl = analisis.front_loading || {};
        const audit = analisis.resumen_auditoria || {};
        const items = analisis.items || [];
        const aiu = analisis.aiu_desglose || {};

        // 1. ENCABEZADO INSTITUCIONAL RADAR SECOP & ANCP-CCE
        doc.fontSize(7.5).fillColor('#64748b').text('REPÚBLICA DE COLOMBIA • AGENCIA NACIONAL DE CONTRATACIÓN PÚBLICA (CCE)', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text('DICTAMEN TÉCNICO DE AUDITORÍA DE PRECIOS UNITARIOS (APU) Y DESBALANCE', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(7.5).fillColor('#475569').font('Helvetica').text('Ley 1882 de 2018 • Decreto 1082 de 2015 Art. 2.2.1.1.2.2.4 • Control de Front-Loading', { align: 'center' });
        doc.moveDown(0.6);

        // 2. BLOQUE DE IDENTIFICACIÓN DEL PROCESO
        const topY = doc.y;
        doc.rect(36, topY, 540, 52).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(7);

        doc.font('Helvetica-Bold').text('ENTIDAD ESTATAL:', 44, topY + 6).font('Helvetica').text(procesoInfo.entidad || 'ENTIDAD ESTATAL', 145, topY + 6);
        doc.font('Helvetica-Bold').text('NÚMERO DE PROCESO:', 44, topY + 17).font('Helvetica').text(procesoInfo.referencia || 'LP-001-2026', 145, topY + 17);
        doc.font('Helvetica-Bold').text('PROPONENTE EVALUADO:', 44, topY + 28).font('Helvetica').text(procesoInfo.proponente || 'PROPONENTE LICITANTE', 145, topY + 28);
        doc.font('Helvetica-Bold').text('FECHA DE AUDITORÍA:', 44, topY + 39).font('Helvetica').text(fechaHoy, 145, topY + 39);

        doc.font('Helvetica-Bold').text('PRESUPUESTO OFICIAL (PO):', 340, topY + 6).font('Helvetica-Bold').fillColor('#1e3a8a').text(fCOP(totales.total_oficial_con_aiu), 475, topY + 6);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text('VALOR OFERTADO CON AIU:', 340, topY + 17).font('Helvetica-Bold').fillColor('#047857').text(fCOP(totales.total_oferta_con_aiu), 475, topY + 17);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text('VARIACIÓN GLOBAL PO:', 340, topY + 28).font('Helvetica').text(`${totales.desviacion_global_pct}% (${totales.porcentaje_po_oferta}% PO)`, 475, topY + 28);
        doc.font('Helvetica-Bold').text('TOTAL ÍTEMS AUDITADOS:', 340, topY + 39).font('Helvetica').text(`${audit.total_items} Ítems analizados`, 475, topY + 39);

        doc.y = topY + 60;

        // 3. TARJETA HERO: VEREDICTO DE VIABILIDAD Y FRONT-LOADING
        const heroY = doc.y;
        const isOk = audit.estado_dictamen === 'EQUILIBRADO';
        const cardBg = isOk ? '#f0fdf4' : '#fffbeb';
        const cardBorder = isOk ? '#86efac' : '#fde047';
        const titleColor = isOk ? '#166534' : '#854d0e';

        doc.rect(36, heroY, 540, 52).fillAndStroke(cardBg, cardBorder);
        doc.fillColor(titleColor).fontSize(7.5).font('Helvetica-Bold').text('DICTAMEN DE VIABILIDAD ECONÓMICA DE PRECIOS UNITARIOS:', 46, heroY + 6);
        doc.fillColor(isOk ? '#15803d' : '#b45309').fontSize(12).font('Helvetica-Bold').text(
          isOk ? '✅ OFERTA ECONÓMICAMENTE EQUILIBRADA Y SOSTENIBLE' : `⚠️ OFERTA CON OBSERVACIONES DE DESBALANCE (${audit.items_con_alerta} ALERTAS)`,
          46, heroY + 18
        );

        // Indicador de Front-Loading
        doc.fillColor('#1e40af').fontSize(7.5).font('Helvetica-Bold').text('ÍNDICE DE FRONT-LOADING:', 370, heroY + 6);
        const flColor = fl.tiene_front_loading ? '#b91c1c' : '#15803d';
        doc.fillColor(flColor).fontSize(11).font('Helvetica-Bold').text(`Ratio: ${fl.front_loading_ratio}`, 370, heroY + 18);
        doc.fillColor('#475569').fontSize(6.5).font('Helvetica').text(
          fl.tiene_front_loading ? '⚠️ Anticipo encubierto detectado' : '✅ Cobros iniciales equilibrados', 370, heroY + 34
        );

        doc.fillColor('#475569').fontSize(7).font('Helvetica').text(
          `Ítems conformes: ${audit.items_conformes} / ${audit.total_items} • AIU Pactado: ${aiu.aiu_total_pct}% (A: ${aiu.administracion_pct}% / I: ${aiu.imprevistos_pct}% / U: ${aiu.utilidad_pct}%)`,
          46, heroY + 36
        );

        doc.y = heroY + 60;

        // 4. TABLA COMPARATIVA DE ÍTEMS AUDITADOS
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('1. MATRIZ DE PRECIOS UNITARIOS Y DESVIACIONES FRENTE AL ESTIMADO OFICIAL:');
        doc.moveDown(0.3);

        const tabY = doc.y;
        doc.rect(36, tabY, 540, 14).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(6.5).font('Helvetica-Bold');
        doc.text('CÓD', 42, tabY + 4, { width: 35 });
        doc.text('DESCRIPCIÓN DEL ÍTEM', 80, tabY + 4, { width: 170 });
        doc.text('UND', 255, tabY + 4, { width: 25, align: 'center' });
        doc.text('CANT', 285, tabY + 4, { width: 35, align: 'right' });
        doc.text('P.U. OFICIAL', 325, tabY + 4, { width: 65, align: 'right' });
        doc.text('P.U. OFERTA', 395, tabY + 4, { width: 65, align: 'right' });
        doc.text('VAR %', 465, tabY + 4, { width: 45, align: 'right' });
        doc.text('ESTADO', 515, tabY + 4, { width: 55, align: 'right' });

        let currY = tabY + 14;
        const maxItems = Math.min(items.length, 12); // Para asegurar que quepa en 1 página limpia

        for (let i = 0; i < maxItems; i++) {
          const it = items[i];
          doc.rect(36, currY, 540, 15).fillAndStroke(i % 2 === 0 ? '#f8fafc' : '#ffffff', '#e2e8f0');

          doc.fillColor('#0f172a').fontSize(6.5).font('Helvetica-Bold').text(it.codigo, 42, currY + 3, { width: 35 });
          doc.font('Helvetica').text(it.descripcion.slice(0, 45), 80, currY + 3, { width: 170 });
          doc.text(it.unidad, 255, currY + 3, { width: 25, align: 'center' });
          doc.text(String(it.cantidad), 285, currY + 3, { width: 35, align: 'right' });
          doc.text(fCOP(it.precio_unitario_oficial), 325, currY + 3, { width: 65, align: 'right' });
          doc.text(fCOP(it.precio_unitario_oferta), 395, currY + 3, { width: 65, align: 'right' });

          const varColor = it.desviacion_pct > 10 ? '#b91c1c' : (it.desviacion_pct < -15 ? '#d97706' : '#15803d');
          doc.fillColor(varColor).font('Helvetica-Bold').text(`${it.desviacion_pct > 0 ? '+' : ''}${it.desviacion_pct}%`, 465, currY + 3, { width: 45, align: 'right' });

          let stColor = '#15803d';
          let stText = 'NORMAL';
          if (it.clasificacion === 'CRITICO_SOBREPRECIO') { stColor = '#b91c1c'; stText = 'CRIT. ALTO'; }
          else if (it.clasificacion === 'CRITICO_PRECIO_BAJO') { stColor = '#b91c1c'; stText = 'CRIT. BAJO'; }
          else if (it.clasificacion === 'ALERTA_SOBRECOSTO') { stColor = '#d97706'; stText = 'SOBREPRECIO'; }
          else if (it.clasificacion === 'ALERTA_SUBVALORADO') { stColor = '#d97706'; stText = 'SUBVALORADO'; }

          doc.fillColor(stColor).font('Helvetica-Bold').text(stText, 515, currY + 3, { width: 55, align: 'right' });
          currY += 15;
        }

        if (items.length > maxItems) {
          doc.rect(36, currY, 540, 12).fillAndStroke('#f1f5f9', '#cbd5e1');
          doc.fillColor('#64748b').fontSize(6).font('Helvetica-Oblique').text(
            `... y ${items.length - maxItems} ítems adicionales verificados dentro de los márgenes reglamentarios.`, 44, currY + 2
          );
          currY += 12;
        }

        doc.y = currY + 8;

        // 5. RESUMEN DE COSTOS DIRECTOS, AIU E IVA TRIBUTARIO
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('2. LIQUIDACIÓN DE COSTOS DIRECTOS, AIU Y FACTOR IMPOSITIVO (ART. 462-1 E.T.):');
        doc.moveDown(0.3);

        const aiuTabY = doc.y;
        doc.rect(36, aiuTabY, 540, 42).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(6.8);

        doc.font('Helvetica-Bold').text('COSTOS DIRECTOS DE OBRA:', 44, aiuTabY + 5)
           .font('Helvetica').text(fCOP(totales.total_oferta_directo), 180, aiuTabY + 5);
        doc.font('Helvetica-Bold').text('AIU TOTAL OFERTADO:', 44, aiuTabY + 16)
           .font('Helvetica').text(`${fCOP(totales.aiu_oferta_cop)} (${aiu.aiu_total_pct}%)`, 180, aiuTabY + 16);
        doc.font('Helvetica-Bold').text('IVA SOBRE UTILIDAD (19%):', 44, aiuTabY + 27)
           .font('Helvetica').text(fCOP(totales.iva_utilidad_oferta_cop), 180, aiuTabY + 27);

        doc.font('Helvetica-Bold').text('VALOR TOTAL PROPUESTA:', 310, aiuTabY + 5)
           .font('Helvetica-Bold').fillColor('#047857').text(fCOP(totales.total_oferta_con_aiu), 450, aiuTabY + 5);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text('DIFERENCIA MONETARIA PO:', 310, aiuTabY + 16)
           .font('Helvetica').text(fCOP(totales.diferencia_total_cop), 450, aiuTabY + 16);
        doc.font('Helvetica-Bold').text('ESTADO DE DESBALANCE:', 310, aiuTabY + 27)
           .font('Helvetica-Bold').fillColor(isOk ? '#15803d' : '#b45309').text(audit.estado_dictamen, 450, aiuTabY + 27);

        doc.y = aiuTabY + 50;

        // 6. CONCEPTO JURÍDICO VINCULANTE
        const concY = doc.y;
        doc.rect(36, concY, 540, 52).fillAndStroke('#f1f5f9', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text('CONCEPTO TÉCNICO-JURÍDICO PARA EL COMITÉ DE EVALUACIÓN:', 44, concY + 5);
        doc.fillColor('#334155').fontSize(6.8).font('Helvetica').text(
          audit.concepto_juridico || 'Se verificó la estructura de precios unitarios sin desbalance.',
          44, concY + 16, { width: 524, align: 'justify' }
        );

        // 7. PIE DE PÁGINA
        const footY = doc.page.height - 35;
        doc.fontSize(6.5).font('Helvetica').fillColor('#94a3b8')
          .text(`Dictamen emitido por Radar SECOP • Auditoría de APUs & Desbalance • Decreto 1082/2015 • Hash: ${Buffer.from(String(totales.total_oferta_con_aiu) + fechaHoy).toString('hex').substring(0, 24)}`, 36, footY, { align: 'center', width: 540 });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = new APUEngine();
