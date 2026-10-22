// ============================================================================
// RADAR SECOP - MOTOR DE GESTIÓN CONTRACTUAL POST-ADJUDICACIÓN, ACTAS Y PAGOS
// Normativa: Ley 80 de 1993 (Art. 40, 60), Ley 1150 de 2007 (Art. 11),
// Decreto 1082 de 2015 (Garantías Definitivas) y Estatuto Tributario.
// ============================================================================

const PDFDocument = require('pdfkit');
const dbPostgres = require('./dbPostgres');

class PostAdjudicacionEngine {
  /**
   * Semáforo de vigencia de pólizas conforme a días restantes
   */
  static calcularSemaforoPoliza(diasRestantes) {
    const d = parseInt(diasRestantes, 10);
    if (d < 0) {
      return { nivel: 'VENCIDA', color: '#ef4444', badgeBg: 'rgba(239, 68, 68, 0.2)', texto: `VENCIDA hace ${Math.abs(d)} días` };
    } else if (d <= 5) {
      return { nivel: 'NIVEL_3_EXTRAORDINARIO', color: '#ef4444', badgeBg: 'rgba(239, 68, 68, 0.2)', texto: `CRÍTICO: Vence en ${d} días` };
    } else if (d <= 15) {
      return { nivel: 'NIVEL_2_CRITICO', color: '#f97316', badgeBg: 'rgba(249, 115, 22, 0.2)', texto: `Alerta: Vence en ${d} días` };
    } else if (d <= 30) {
      return { nivel: 'NIVEL_1_PREVENTIVO', color: '#f59e0b', badgeBg: 'rgba(245, 158, 11, 0.2)', texto: `Preventivo: Vence en ${d} días` };
    } else {
      return { nivel: 'VIGENTE', color: '#10b981', badgeBg: 'rgba(16, 185, 129, 0.2)', texto: `Vigente (${d} días)` };
    }
  }

  /**
   * Obtiene el tablero consolidado de ejecución contractual, balance financiero, pólizas, actas y pagos
   */
  static async getTableroEjecucion(contratoId) {
    // 1. Datos básicos del contrato
    const resCtr = await dbPostgres.query(`
      SELECT cg.*, e.razon_social as empresa_razon_social, e.nit as empresa_nit
      FROM contratos_gestion cg
      LEFT JOIN empresas e ON e.id = cg.empresa_id
      WHERE cg.id = $1
    `, [contratoId]);

    if (resCtr.rows.length === 0) return null;
    const contrato = resCtr.rows[0];

    const valAdjudicado = parseFloat(contrato.valor_adjudicado) || 0;
    const valAdicionado = parseFloat(contrato.valor_adicionado) || 0;
    const valTotalVigente = valAdjudicado + valAdicionado;
    const topeAdicion50 = valAdjudicado * 0.50;
    const saldoAdicionDisponible = Math.max(0, topeAdicion50 - valAdicionado);

    // 2. Pólizas y semáforos
    const resPol = await dbPostgres.query(`
      SELECT cp.*, (cp.fecha_fin_vigencia - CURRENT_DATE) as dias_restantes
      FROM contrato_polizas cp
      WHERE cp.contrato_id = $1
      ORDER BY cp.fecha_fin_vigencia ASC
    `, [contratoId]);

    let polizasVencidas = 0;
    let polizasEnRiesgo = 0;
    const polizasConSemaforo = resPol.rows.map(p => {
      const sem = this.calcularSemaforoPoliza(p.dias_restantes);
      if (sem.nivel === 'VENCIDA') polizasVencidas++;
      if (sem.nivel === 'NIVEL_3_EXTRAORDINARIO' || sem.nivel === 'NIVEL_2_CRITICO') polizasEnRiesgo++;
      return { ...p, semaforo: sem };
    });

    // 3. Actas del ciclo de vida contractual
    const resAct = await dbPostgres.query(`
      SELECT * FROM contrato_actas
      WHERE contrato_id = $1
      ORDER BY fecha_acta ASC, id ASC
    `, [contratoId]);

    let ultimoAvanceFisico = 0;
    let ultimoAvanceFinanciero = 0;
    let tieneActaInicio = contrato.tiene_acta_inicio;
    let tieneLiquidacion = false;

    resAct.rows.forEach(a => {
      if (a.tipo_acta === 'INICIO') tieneActaInicio = true;
      if (a.tipo_acta === 'LIQUIDACION') tieneLiquidacion = true;
      if (parseFloat(a.porcentaje_avance_fisico) > ultimoAvanceFisico) {
        ultimoAvanceFisico = parseFloat(a.porcentaje_avance_fisico);
      }
      if (parseFloat(a.porcentaje_avance_financiero) > ultimoAvanceFinanciero) {
        ultimoAvanceFinanciero = parseFloat(a.porcentaje_avance_financiero);
      }
    });

    // 4. Facturación y Pagos PAC
    const resPag = await dbPostgres.query(`
      SELECT * FROM contrato_facturacion_pagos
      WHERE contrato_id = $1
      ORDER BY fecha_radicacion DESC, id DESC
    `, [contratoId]);

    let totalFacturadoBruto = 0;
    let totalPagadoNeto = 0;
    let totalEnTramite = 0;
    let totalRetenciones = 0;

    resPag.rows.forEach(f => {
      const bruto = parseFloat(f.valor_bruto) || 0;
      const neto = parseFloat(f.valor_neto_girar) || 0;
      const ret = parseFloat(f.valor_retenciones) || 0;

      totalFacturadoBruto += bruto;
      totalRetenciones += ret;

      if (f.estado_pago === 'PAGADA') {
        totalPagadoNeto += neto;
      } else if (f.estado_pago !== 'GLOSADA') {
        totalEnTramite += neto;
      }
    });

    const saldoPorFacturar = Math.max(0, valTotalVigente - totalFacturadoBruto);

    return {
      contrato: {
        ...contrato,
        valor_total_vigente: valTotalVigente,
        tope_adicion_50: topeAdicion50,
        saldo_adicion_disponible: saldoAdicionDisponible,
        porcentaje_adicionado_usado: topeAdicion50 > 0 ? parseFloat(((valAdicionado / topeAdicion50) * 100).toFixed(1)) : 0
      },
      balance_financiero: {
        valor_adjudicado: valAdjudicado,
        valor_adicionado: valAdicionado,
        valor_total_vigente: valTotalVigente,
        total_facturado_bruto: totalFacturadoBruto,
        total_pagado_neto: totalPagadoNeto,
        total_en_tramite_pac: totalEnTramite,
        total_retenciones_acumuladas: totalRetenciones,
        saldo_por_facturar: saldoPorFacturar,
        porcentaje_ejecucion_financiera: valTotalVigente > 0 ? parseFloat(((totalFacturadoBruto / valTotalVigente) * 100).toFixed(1)) : 0
      },
      avances: {
        avance_fisico_pct: ultimoAvanceFisico,
        avance_financiero_pct: ultimoAvanceFinanciero,
        tiene_acta_inicio: tieneActaInicio,
        tiene_liquidacion: tieneLiquidacion
      },
      resumen_polizas: {
        total: polizasConSemaforo.length,
        vencidas: polizasVencidas,
        en_riesgo: polizasEnRiesgo,
        al_dia: polizasConSemaforo.length - polizasVencidas - polizasEnRiesgo
      },
      polizas: polizasConSemaforo,
      actas: resAct.rows,
      pagos: resPag.rows
    };
  }

  /**
   * Registra una nueva acta en el ciclo de vida del contrato
   */
  static async registrarActa(datosActa) {
    const {
      contrato_id,
      tipo_acta, // 'INICIO', 'PARCIAL_RECIBO', 'SUSPENSION', 'REINICIO', 'ENTREGA_FINAL', 'LIQUIDACION'
      numero_acta,
      fecha_acta,
      porcentaje_avance_fisico = 0,
      porcentaje_avance_financiero = 0,
      valor_acta = 0,
      observaciones = ''
    } = datosActa;

    const res = await dbPostgres.query(`
      INSERT INTO contrato_actas (
        contrato_id, tipo_acta, numero_acta, fecha_acta,
        porcentaje_avance_fisico, porcentaje_avance_financiero,
        valor_acta, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      contrato_id,
      tipo_acta,
      numero_acta,
      fecha_acta,
      parseFloat(porcentaje_avance_fisico) || 0,
      parseFloat(porcentaje_avance_financiero) || 0,
      parseFloat(valor_acta) || 0,
      observaciones
    ]);

    // Actualizaciones de estado en contrato_gestion
    if (tipo_acta === 'INICIO') {
      await dbPostgres.query(`
        UPDATE contratos_gestion
        SET fecha_acta_inicio = $2, tiene_acta_inicio = TRUE, estado_ejecucion = 'EN_EJECUCION', actualizado_en = NOW()
        WHERE id = $1
      `, [contrato_id, fecha_acta]);
    } else if (tipo_acta === 'SUSPENSION') {
      await dbPostgres.query(`
        UPDATE contratos_gestion
        SET estado_ejecucion = 'SUSPENDIDO', actualizado_en = NOW()
        WHERE id = $1
      `, [contrato_id]);
    } else if (tipo_acta === 'REINICIO') {
      await dbPostgres.query(`
        UPDATE contratos_gestion
        SET estado_ejecucion = 'EN_EJECUCION', actualizado_en = NOW()
        WHERE id = $1
      `, [contrato_id]);
    } else if (tipo_acta === 'LIQUIDACION') {
      await dbPostgres.query(`
        UPDATE contratos_gestion
        SET estado_ejecucion = 'LIQUIDADO', actualizado_en = NOW()
        WHERE id = $1
      `, [contrato_id]);
    }

    return res.rows[0];
  }

  /**
   * Registra una factura o cuenta de cobro en radicación ante la Entidad
   */
  static async registrarFactura(datosFactura) {
    const {
      contrato_id,
      numero_factura,
      fecha_emision,
      fecha_radicacion,
      concepto,
      valor_bruto,
      valor_iva = 0,
      valor_retenciones = 0,
      valor_neto_girar,
      estado_pago = 'RADICADA',
      fecha_pago = null,
      comprobante_egreso_no = null
    } = datosFactura;

    const bruto = parseFloat(valor_bruto) || 0;
    const iva = parseFloat(valor_iva) || 0;
    const ret = parseFloat(valor_retenciones) || 0;
    const neto = valor_neto_girar ? parseFloat(valor_neto_girar) : (bruto + iva - ret);

    const res = await dbPostgres.query(`
      INSERT INTO contrato_facturacion_pagos (
        contrato_id, numero_factura, fecha_emision, fecha_radicacion,
        concepto, valor_bruto, valor_iva, valor_retenciones,
        valor_neto_girar, estado_pago, fecha_pago, comprobante_egreso_no
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      contrato_id,
      numero_factura,
      fecha_emision,
      fecha_radicacion,
      concepto,
      bruto,
      iva,
      ret,
      neto,
      estado_pago,
      fecha_pago,
      comprobante_egreso_no
    ]);

    return res.rows[0];
  }

  /**
   * Actualiza el estado de una factura (ej. RADICADA -> PAGADA o EN_TESORERIA_PAC)
   */
  static async actualizarEstadoFactura(facturaId, { estado_pago, fecha_pago, comprobante_egreso_no }) {
    const res = await dbPostgres.query(`
      UPDATE contrato_facturacion_pagos
      SET estado_pago = $1, fecha_pago = $2, comprobante_egreso_no = $3
      WHERE id = $4
      RETURNING *
    `, [estado_pago, fecha_pago || null, comprobante_egreso_no || null, facturaId]);
    return res.rows[0];
  }

  /**
   * Registra una nueva póliza contractual
   */
  static async registrarPoliza(contratoId, polizaData) {
    const {
      aseguradora,
      numero_poliza,
      tipo_amparo,
      porcentaje_amparado = 10,
      valor_asegurado,
      fecha_inicio_vigencia,
      fecha_fin_vigencia,
      estado_aprobacion = 'APROBADA'
    } = polizaData;

    const res = await dbPostgres.query(`
      INSERT INTO contrato_polizas (
        contrato_id, aseguradora, numero_poliza, tipo_amparo,
        porcentaje_amparado, valor_asegurado, fecha_inicio_vigencia,
        fecha_fin_vigencia, estado_aprobacion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      contratoId,
      aseguradora,
      numero_poliza,
      tipo_amparo,
      parseFloat(porcentaje_amparado) || 10,
      parseFloat(valor_asegurado) || 0,
      fecha_inicio_vigencia,
      fecha_fin_vigencia,
      estado_aprobacion
    ]);

    return res.rows[0];
  }

  /**
   * Genera el Acta Bilateral de Liquidación y Balance Económico Definitivo en PDF
   */
  static async generarActaLiquidacionPdf(contratoId) {
    const tablero = await this.getTableroEjecucion(contratoId);
    if (!tablero) throw new Error('Contrato no encontrado para liquidación');

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          layout: 'portrait',
          margin: 40
        });

        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const c = tablero.contrato;
        const b = tablero.balance_financiero;

        const fCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);

        // Encabezado
        doc.fontSize(8).fillColor('#64748b').text('REPÚBLICA DE COLOMBIA • CONTRATACIÓN PÚBLICA', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(13).fillColor('#0f172a').font('Helvetica-Bold').text('ACTA BILATERAL DE LIQUIDACIÓN Y BALANCE ECONÓMICO DEFINITIVO', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(8.5).fillColor('#475569').font('Helvetica').text('Conforme al Artículo 11 de la Ley 1150 de 2007 y Artículo 60 de la Ley 80 de 1993', { align: 'center' });
        doc.moveDown(0.8);

        // Cuadro Resumen del Contrato
        const startY = doc.y;
        doc.rect(40, startY, 532, 54).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(7.5);
        doc.font('Helvetica-Bold').text('ENTIDAD ESTATAL:', 48, startY + 6).font('Helvetica').text(c.entidad_contratante, 140, startY + 6);
        doc.font('Helvetica-Bold').text('CONTRATO No.:', 48, startY + 18).font('Helvetica').text(`${c.numero_contrato} (Proceso: ${c.referencia_proceso || 'SECOP'})`, 140, startY + 18);
        doc.font('Helvetica-Bold').text('CONTRATISTA:', 48, startY + 30).font('Helvetica').text(`${c.empresa_razon_social || 'Contratista'} (NIT: ${c.empresa_nit || 'N/A'})`, 140, startY + 30);
        doc.font('Helvetica-Bold').text('SUPERVISOR / INTERV.:', 48, startY + 42).font('Helvetica').text(c.supervisor_nombre || c.interventoria_nombre || 'Supervisión Designada', 155, startY + 42);

        doc.y = startY + 64;

        // Declaración Introductoria
        doc.font('Helvetica').fontSize(8).fillColor('#334155').text(
          `En la ciudad de Bogotá D.C., a los ${new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}, se reunieron el Supervisor del contrato por parte de ${c.entidad_contratante} y el Representante Legal del Contratista, con el fin de suscribir el ACTA BILATERAL DE LIQUIDACIÓN Y BALANCE ECONÓMICO FINAL, declarando a satisfacción el cumplimiento de las obligaciones contractuales.`,
          { align: 'justify', lineGap: 1.5 }
        );
        doc.moveDown(0.8);

        // Balance Económico y Financiero
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('1. BALANCE FINANCIERO Y LIQUIDACIÓN DE CUENTAS:');
        doc.moveDown(0.4);

        const balY = doc.y;
        doc.rect(40, balY, 532, 70).fillAndStroke('#f1f5f9', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(7.5);

        doc.font('Helvetica-Bold').text('Valor Inicial Adjudicado:', 48, balY + 8).font('Helvetica').text(fCOP(b.valor_adjudicado), 180, balY + 8);
        doc.font('Helvetica-Bold').text('Valor Adicionado:', 48, balY + 20).font('Helvetica').text(fCOP(b.valor_adicionado), 180, balY + 20);
        doc.font('Helvetica-Bold').text('Valor Total Vigente Contratado:', 48, balY + 32).font('Helvetica').text(fCOP(b.valor_total_vigente), 180, balY + 32);

        doc.font('Helvetica-Bold').text('Total Facturado Bruto:', 320, balY + 8).font('Helvetica').text(fCOP(b.total_facturado_bruto), 440, balY + 8);
        doc.font('Helvetica-Bold').text('Total Pagado Neto (PAC):', 320, balY + 20).font('Helvetica').text(fCOP(b.total_pagado_neto), 440, balY + 20);
        doc.font('Helvetica-Bold').text('Retenciones Aplicadas:', 320, balY + 32).font('Helvetica').text(fCOP(b.total_retenciones_acumuladas), 440, balY + 32);

        doc.rect(40, balY + 48, 532, 22).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
        doc.text(`SALDO A FAVOR DEL CONTRATISTA: ${fCOP(b.total_en_tramite_pac)}`, 48, balY + 54);
        doc.text(`SALDO POR LIBERAR A LA ENTIDAD: ${fCOP(b.saldo_por_facturar)}`, 320, balY + 54);

        doc.y = balY + 80;

        // Historial de Pólizas y Garantías
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('2. ESTADO FINAL DE PÓLIZAS Y AMPAROS POST-CONTRACTUALES:');
        doc.moveDown(0.4);

        const polY = doc.y;
        doc.rect(40, polY, 532, 14).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(6.5).font('Helvetica-Bold');
        doc.text('AMPARO', 48, polY + 3, { width: 120 });
        doc.text('ASEGURADORA', 170, polY + 3, { width: 110 });
        doc.text('PÓLIZA NO.', 285, polY + 3, { width: 85 });
        doc.text('VALOR ASEGURADO', 375, polY + 3, { width: 85, align: 'right' });
        doc.text('ESTADO / VIGENCIA', 470, polY + 3, { width: 95, align: 'center' });

        let currentPolY = polY + 14;
        tablero.polizas.forEach((p, idx) => {
          doc.rect(40, currentPolY, 532, 16).fillAndStroke(idx % 2 === 0 ? '#f8fafc' : '#ffffff', '#e2e8f0');
          doc.fillColor('#0f172a').fontSize(6.5).font('Helvetica-Bold').text(p.tipo_amparo, 48, currentPolY + 4, { width: 120 });
          doc.font('Helvetica').text(p.aseguradora, 170, currentPolY + 4, { width: 110 });
          doc.text(p.numero_poliza, 285, currentPolY + 4, { width: 85 });
          doc.text(fCOP(p.valor_asegurado), 375, currentPolY + 4, { width: 85, align: 'right' });
          doc.text(p.semaforo.texto, 470, currentPolY + 4, { width: 95, align: 'center' });
          currentPolY += 16;
        });

        doc.y = currentPolY + 12;

        // Cláusula de Paz y Salvo
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('3. DECLARACIÓN DE PAZ Y SALVO RECÍPROCO:');
        doc.font('Helvetica').fontSize(7.5).fillColor('#334155').text(
          'Las partes declaran formalmente que una vez girado el saldo final reconocido en este balance, quedan a paz y salvo recíproco por todo concepto derivado del contrato, sus modificaciones y actas parciales, sin perjuicio de las garantías de estabilidad y calidad que deban permanecer vigentes con posterioridad a la liquidación.',
          { align: 'justify', lineGap: 1.5 }
        );

        // Firmas
        doc.moveDown(2);
        const sigY = doc.y;
        doc.moveTo(40, sigY).lineTo(250, sigY).stroke('#0f172a');
        doc.moveTo(320, sigY).lineTo(530, sigY).stroke('#0f172a');

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text('POR LA ENTIDAD ESTATAL:', 40, sigY + 4);
        doc.font('Helvetica').fontSize(6.5).text(c.supervisor_nombre || 'Supervisor del Contrato', 40, sigY + 14);
        doc.text(c.entidad_contratante, 40, sigY + 23);

        doc.font('Helvetica-Bold').fontSize(7.5).text('POR EL CONTRATISTA:', 320, sigY + 4);
        doc.font('Helvetica').fontSize(6.5).text(c.empresa_razon_social || 'Representante Legal Contratista', 320, sigY + 14);
        doc.text(`NIT: ${c.empresa_nit || 'N/A'}`, 320, sigY + 23);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = PostAdjudicacionEngine;
