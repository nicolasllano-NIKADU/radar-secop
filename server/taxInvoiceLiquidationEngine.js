/**
 * ====================================================================
 * RADAR SECOP - MOTOR DE FACTURACIÓN ELECTRÓNICA DIAN & CUENTAS DE COBRO
 * Marco Legal y Tributario:
 * - Estatuto Tributario Nacional (E.T.): Retención en la fuente (Art. 392), IVA y ReteIVA (Art. 437-1), Base gravable AIU (Art. 462-1)
 * - Ley 1106 de 2006, Art. 6 (Contribución especial del 5% de contratos de obra pública)
 * - Acuerdos Municipales y Distritales de Retención de ICA (ReteICA) y Avisos y Tableros
 * - Ley 1276 de 2009 (Estampilla Pro-Adulto Mayor) y Ley 397 de 1997 (Estampilla Pro-Cultura)
 * - Ley 789 de 2002, Art. 50 (Control de aportes al Sistema de Seguridad Social y Planilla PILA)
 * ====================================================================
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

class TaxInvoiceLiquidationEngine {
  constructor() {
    this.TARIFA_OBRA_PUBLICA_LEY_1106 = 5.0; // 5.0% estricto de obra pública
    this.TARIFA_IVA_GENERAL = 19.0;          // 19.0% IVA
    this.TARIFA_RETE_IVA = 15.0;             // 15.0% del IVA liquidado (Art. 437-1 E.T.)
    this.TARIFA_RETE_FUENTE_OBRA = 2.0;      // 2.0% contratos de construcción / obra
    this.TARIFA_RETE_ICA_DEFAULT = 9.66;     // 9.66 por mil (Construcción / Servicios)
    this.TARIFA_ESTAMPILLA_ANCIANOS = 2.0;   // 2.0% Pro-Adulto Mayor (Ley 1276/2009)
    this.TARIFA_ESTAMPILLA_CULTURA = 1.0;    // 1.0% Pro-Cultura (Ley 397/1997)
    this.TARIFA_ESTAMPILLA_DESARROLLO = 1.0; // 1.0% Pro-Desarrollo territorial
  }

  /**
   * Liquida una factura electrónica o cuenta de cobro contractual
   * 
   * @param {Object} params
   * @param {number} params.valorBruto
   * @param {string} [params.modalidadTributaria='OBRA_PUBLICA_AIU']
   * @param {number} [params.porcentajeAIU=10.0]
   * @param {number} [params.amortizacionAnticipoMonto=0]
   * @param {number} [params.amortizacionAnticipoPct=0]
   * @param {number} [params.tarifaReteFuentePct=2.0]
   * @param {number} [params.tarifaReteIcaPorMil=9.66]
   * @param {boolean} [params.aplicaReteIva=true]
   * @param {boolean} [params.aplicaLey1106=true]
   * @param {boolean} [params.aplicaEstampillaAncianos=true]
   * @param {boolean} [params.aplicaEstampillaCultura=true]
   * @param {boolean} [params.aplicaEstampillaDesarrollo=false]
   * @param {boolean} [params.pilaVerificada=true]
   * @returns {Object}
   */
  liquidarCuentaCobroActa({
    valorBruto = 0,
    modalidadTributaria = 'OBRA_PUBLICA_AIU',
    porcentajeAIU = 10.0,
    amortizacionAnticipoMonto = 0,
    amortizacionAnticipoPct = 0,
    tarifaReteFuentePct = 2.0,
    tarifaReteIcaPorMil = 9.66,
    aplicaReteIva = true,
    aplicaLey1106 = true,
    aplicaEstampillaAncianos = true,
    aplicaEstampillaCultura = true,
    aplicaEstampillaDesarrollo = false,
    pilaVerificada = true
  }) {
    const bruto = Math.max(0, Number(valorBruto) || 0);

    // 1. Amortización del anticipo fiduciario
    let amortizacionCalculada = Number(amortizacionAnticipoMonto) || 0;
    if (amortizacionCalculada === 0 && amortizacionAnticipoPct > 0) {
      amortizacionCalculada = (bruto * Number(amortizacionAnticipoPct)) / 100;
    }
    amortizacionCalculada = Math.min(bruto, amortizacionCalculada);
    const subtotalAmortizado = Math.max(0, bruto - amortizacionCalculada);

    // 2. Base gravable e IVA
    let baseGravableIva = 0;
    let ivaLiquidado = 0;
    const aiuPct = Number(porcentajeAIU) || 0;

    if (modalidadTributaria === 'OBRA_PUBLICA_AIU') {
      // Art. 462-1 E.T.: El IVA se genera exclusivamente sobre la porción de Utilidad del AIU
      baseGravableIva = (subtotalAmortizado * aiuPct) / 100;
      ivaLiquidado = (baseGravableIva * this.TARIFA_IVA_GENERAL) / 100;
    } else if (modalidadTributaria === 'GENERAL_IVA_19') {
      baseGravableIva = subtotalAmortizado;
      ivaLiquidado = (baseGravableIva * this.TARIFA_IVA_GENERAL) / 100;
    } else if (modalidadTributaria === 'SERVICIOS_PROFESIONALES') {
      baseGravableIva = subtotalAmortizado;
      ivaLiquidado = (baseGravableIva * this.TARIFA_IVA_GENERAL) / 100;
    } else {
      // EXENTO_IVA
      baseGravableIva = 0;
      ivaLiquidado = 0;
    }

    const valorBrutoMasIva = subtotalAmortizado + ivaLiquidado;

    // 3. Deducciones Tributarias Nacionales y Territoriales
    // 3.1 Contribución de Obra Pública Ley 1106 de 2006 (Art. 6): 5% estricto del valor bruto
    let contribucionObra5pct = 0;
    if (aplicaLey1106 && (modalidadTributaria === 'OBRA_PUBLICA_AIU' || modalidadTributaria === 'OBRA_PUBLICA')) {
      contribucionObra5pct = (bruto * this.TARIFA_OBRA_PUBLICA_LEY_1106) / 100;
    }

    // 3.2 Retención en la fuente por renta (E.T. Art. 392)
    const reteFuentePct = Number(tarifaReteFuentePct) >= 0 ? Number(tarifaReteFuentePct) : this.TARIFA_RETE_FUENTE_OBRA;
    const reteFuenteMonto = (subtotalAmortizado * reteFuentePct) / 100;

    // 3.3 Retención de ICA (ReteICA) sobre subtotal antes de IVA
    const reteIcaTarifa = Number(tarifaReteIcaPorMil) >= 0 ? Number(tarifaReteIcaPorMil) : this.TARIFA_RETE_ICA_DEFAULT;
    const reteIcaMonto = (subtotalAmortizado * (reteIcaTarifa / 1000));

    // 3.4 Retención de IVA (ReteIVA): 15% del IVA
    let reteIvaMonto = 0;
    if (aplicaReteIva && ivaLiquidado > 0) {
      reteIvaMonto = (ivaLiquidado * this.TARIFA_RETE_IVA) / 100;
    }

    // 3.5 Estampillas Territoriales sobre el valor bruto
    let estampillaAncianosMonto = 0;
    if (aplicaEstampillaAncianos) {
      estampillaAncianosMonto = (bruto * this.TARIFA_ESTAMPILLA_ANCIANOS) / 100;
    }

    let estampillaCulturaMonto = 0;
    if (aplicaEstampillaCultura) {
      estampillaCulturaMonto = (bruto * this.TARIFA_ESTAMPILLA_CULTURA) / 100;
    }

    let estampillaDesarrolloMonto = 0;
    if (aplicaEstampillaDesarrollo) {
      estampillaDesarrolloMonto = (bruto * this.TARIFA_ESTAMPILLA_DESARROLLO) / 100;
    }

    // 4. Totales Consolidados
    const totalDeducciones = (
      contribucionObra5pct +
      reteFuenteMonto +
      reteIcaMonto +
      reteIvaMonto +
      estampillaAncianosMonto +
      estampillaCulturaMonto +
      estampillaDesarrolloMonto
    );

    const netoAGirar = Math.max(0, valorBrutoMasIva - totalDeducciones);
    const cargaTributariaEfectivaPct = bruto > 0 ? (totalDeducciones / bruto) * 100 : 0;

    return {
      valor_bruto_facturado: Number(bruto.toFixed(2)),
      modalidad_tributaria: modalidadTributaria,
      porcentaje_aiu: aiuPct,
      amortizacion_anticipo_monto: Number(amortizacionCalculada.toFixed(2)),
      subtotal_amortizado: Number(subtotalAmortizado.toFixed(2)),
      base_gravable_iva: Number(baseGravableIva.toFixed(2)),
      porcentaje_iva: modalidadTributaria === 'EXENTO_IVA' ? 0 : this.TARIFA_IVA_GENERAL,
      iva_liquidado: Number(ivaLiquidado.toFixed(2)),
      valor_bruto_con_iva: Number(valorBrutoMasIva.toFixed(2)),
      deducciones: {
        contribucion_obra_publica_5pct: {
          aplica: contribucionObra5pct > 0,
          porcentaje: this.TARIFA_OBRA_PUBLICA_LEY_1106,
          monto: Number(contribucionObra5pct.toFixed(2)),
          fundamento: 'Art. 6 Ley 1106/2006 (Contribución 5% Obra Pública)'
        },
        retencion_fuente_renta: {
          aplica: reteFuenteMonto > 0,
          porcentaje: reteFuentePct,
          monto: Number(reteFuenteMonto.toFixed(2)),
          fundamento: 'Art. 392 E.T. (Retención en la fuente por renta)'
        },
        rete_ica: {
          aplica: reteIcaMonto > 0,
          tarifa_por_mil: reteIcaTarifa,
          monto: Number(reteIcaMonto.toFixed(2)),
          fundamento: 'Acuerdo Distrital/Municipal (Retención de ICA)'
        },
        rete_iva: {
          aplica: reteIvaMonto > 0,
          porcentaje: this.TARIFA_RETE_IVA,
          monto: Number(reteIvaMonto.toFixed(2)),
          fundamento: 'Art. 437-1 E.T. (15% del IVA facturado)'
        },
        estampilla_pro_ancianos: {
          aplica: estampillaAncianosMonto > 0,
          porcentaje: this.TARIFA_ESTAMPILLA_ANCIANOS,
          monto: Number(estampillaAncianosMonto.toFixed(2)),
          fundamento: 'Ley 1276/2009 (Pro-Adulto Mayor)'
        },
        estampilla_pro_cultura: {
          aplica: estampillaCulturaMonto > 0,
          porcentaje: this.TARIFA_ESTAMPILLA_CULTURA,
          monto: Number(estampillaCulturaMonto.toFixed(2)),
          fundamento: 'Ley 397/1997 (Pro-Cultura)'
        },
        estampilla_pro_desarrollo: {
          aplica: estampillaDesarrolloMonto > 0,
          porcentaje: this.TARIFA_ESTAMPILLA_DESARROLLO,
          monto: Number(estampillaDesarrolloMonto.toFixed(2)),
          fundamento: 'Ordenanza Departamental Pro-Desarrollo'
        }
      },
      total_deducciones_tributarias: Number(totalDeducciones.toFixed(2)),
      neto_a_girar_contratista: Number(netoAGirar.toFixed(2)),
      carga_tributaria_efectiva_pct: Number(cargaTributariaEfectivaPct.toFixed(2)),
      verificacion_pila: {
        cumple: Boolean(pilaVerificada),
        estado: pilaVerificada ? 'CONFORME_PAZ_Y_SALVO' : 'PENDIENTE_PLANILLA_PILA',
        mensaje: pilaVerificada
          ? 'Paz y salvo acreditado conforme al Art. 50 Ley 789/2002. Trámite de giro autorizado.'
          : 'Alerta: No se ha certificado el pago de aportes parafiscales y seguridad social.'
      }
    };
  }

  /**
   * Genera la Orden Oficial de Pago y Liquidación Tributaria para Tesorería en PDF
   * 
   * @param {Object} data
   * @returns {Promise<Buffer>}
   */
  async generarOrdenPagoPdf(data) {
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
          entidad_nombre = 'INSTITUTO NACIONAL DE VÍAS - INVIAS',
          contratista_nombre = 'CONSORCIO VIAL DE COLOMBIA',
          contratista_nit = '901.456.789-1',
          numero_factura_cuenta = 'FAC-E-0089',
          fecha_emision = '2026-10-20',
          fecha_radicacion = '2026-10-22',
          cufe_dian = 'c8b4f23e7890a12d34e56f7890ab12cd34ef567890ab12cd34ef567890ab12cd',
          tipo_documento = 'FACTURA_ELECTRONICA_DIAN',
          numero_planilla_pila = 'PILA-8877665544',
          cuenta_bancaria = 'Ahorros Bancolombia No. 456-987123-01',
          liquidacion = {}
        } = data;

        const primaryColor = '#0F766E';   // Teal institucional DIAN
        const darkText = '#0F172A';
        const grayText = '#475569';
        const lightBg = '#F8FAFC';
        const accentGreen = '#059669';

        // -------------------------------------------------------------
        // ENCABEZADO FISCAL (DIAN & TESORERÍA)
        // -------------------------------------------------------------
        doc.rect(36, 36, 540, 50).fillAndStroke('#F0FDFA', '#99F6E4');

        doc.fillColor(primaryColor).fontSize(9.5).font('Helvetica-Bold')
           .text('REPÚBLICA DE COLOMBIA • RADAR SECOP TESORERÍA & GESTIÓN FISCAL', 46, 44, { align: 'center', width: 520 });
        doc.fillColor(darkText).fontSize(11).font('Helvetica-Bold')
           .text('ORDEN OFICIAL DE PAGO Y CERTIFICADO DE LIQUIDACIÓN TRIBUTARIA', 46, 57, { align: 'center', width: 520 });
        doc.fillColor(grayText).fontSize(7).font('Helvetica')
           .text('Estatuto Tributario • Contribución 5% Obra Pública Ley 1106/2006 • ReteFuente • ReteICA • Paz y Salvo PILA Art. 50 Ley 789/2002', 46, 71, { align: 'center', width: 520 });

        doc.y = 96;

        // -------------------------------------------------------------
        // CUADRO DE INFORMACIÓN GENERAL DEL CONTRATO Y FACTURA
        // -------------------------------------------------------------
        doc.rect(36, doc.y, 540, 78).fillAndStroke(lightBg, '#CBD5E1');
        const cy = doc.y + 6;

        doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('DATOS DE FACTURACIÓN & REGISTRO DIAN', 44, cy);

        let ly = cy + 12;
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(darkText).text('Entidad Contratante: ', 44, ly, { continued: true })
           .font('Helvetica').text(entidad_nombre);
        doc.font('Helvetica-Bold').text('Contrato / Proceso: ', 320, ly, { continued: true })
           .font('Helvetica').text(`${contrato_numero} / ${proceso_numero}`);

        ly += 11;
        doc.font('Helvetica-Bold').text('Contratista Titular: ', 44, ly, { continued: true })
           .font('Helvetica').text(`${contratista_nombre} (NIT: ${contratista_nit})`);
        doc.font('Helvetica-Bold').text('Factura / Radicado: ', 320, ly, { continued: true })
           .font('Helvetica-Bold').fillColor(primaryColor).text(`${numero_factura_cuenta} (${tipo_documento})`);

        ly += 11;
        doc.font('Helvetica-Bold').fillColor(darkText).text('Fecha Emisión / Radicación: ', 44, ly, { continued: true })
           .font('Helvetica').text(`${fecha_emision} / ${fecha_radicacion}`);
        doc.font('Helvetica-Bold').text('Cuenta Bancaria: ', 320, ly, { continued: true })
           .font('Helvetica').text(cuenta_bancaria);

        ly += 11;
        doc.font('Helvetica-Bold').text('Planilla PILA Verificada: ', 44, ly, { continued: true })
           .font('Helvetica-Bold').fillColor(accentGreen).text(`${numero_planilla_pila} (PAZ Y SALVO CONFORME)`);
        doc.font('Helvetica-Bold').fillColor(darkText).text('Modalidad Tributaria: ', 320, ly, { continued: true })
           .font('Helvetica').text(liquidacion.modalidad_tributaria || 'OBRA_PUBLICA_AIU');

        ly += 11;
        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(darkText).text('CUFE DIAN: ', 44, ly, { continued: true })
           .font('Courier').fontSize(6.5).fillColor(grayText).text(cufe_dian);

        doc.y = 184;

        // -------------------------------------------------------------
        // DESGLOSE FINANCIERO: BASE, AMORTIZACIÓN E IVA
        // -------------------------------------------------------------
        doc.rect(36, doc.y, 540, 16).fill('#0F766E');
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF')
           .text('1. LIQUIDACIÓN DE VALOR BRUTO, AMORTIZACIÓN Y BASE IVA', 44, doc.y + 4);

        doc.y += 18;

        const baseTableY = doc.y;
        doc.rect(36, baseTableY, 540, 54).fillAndStroke('#FFFFFF', '#E2E8F0');

        const col1 = 44;
        const col2 = 320;

        let by = baseTableY + 4;
        doc.font('Helvetica').fontSize(7.5).fillColor(darkText).text('Valor Bruto Facturado en Acta:', col1, by);
        doc.font('Helvetica-Bold').text(`$ ${Number(liquidacion.valor_bruto_facturado || 0).toLocaleString('es-CO')} COP`, col2, by, { align: 'right', width: 240 });

        by += 12;
        doc.font('Helvetica').text('(-) Amortización de Anticipo Fiduciario:', col1, by);
        doc.font('Helvetica-Bold').fillColor('#DC2626').text(`-$ ${Number(liquidacion.amortizacion_anticipo_monto || 0).toLocaleString('es-CO')} COP`, col2, by, { align: 'right', width: 240 });

        by += 12;
        doc.font('Helvetica-Bold').fillColor(darkText).text('(=) Subtotal Amortizado (Base Gravable Neta):', col1, by);
        doc.font('Helvetica-Bold').text(`$ ${Number(liquidacion.subtotal_amortizado || 0).toLocaleString('es-CO')} COP`, col2, by, { align: 'right', width: 240 });

        by += 12;
        doc.font('Helvetica').text(`(+) IVA Liquidado (${liquidacion.modalidad_tributaria === 'OBRA_PUBLICA_AIU' ? `Sobre ${liquidacion.porcentaje_aiu}% Utilidad AIU` : `${liquidacion.porcentaje_iva}% General`}):`, col1, by);
        doc.font('Helvetica-Bold').fillColor(primaryColor).text(`+$ ${Number(liquidacion.iva_liquidado || 0).toLocaleString('es-CO')} COP`, col2, by, { align: 'right', width: 240 });

        doc.y = baseTableY + 62;

        // -------------------------------------------------------------
        // DESGLOSE DETALLADO DE DEDUCCIONES TRIBUTARIAS
        // -------------------------------------------------------------
        doc.rect(36, doc.y, 540, 16).fill('#1E293B');
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF')
           .text('2. DISCRIMINACIÓN DE DEDUCCIONES Y RETENCIONES APLICADAS', 44, doc.y + 4);

        doc.y += 18;

        const tableTop = doc.y;
        doc.rect(36, tableTop, 540, 15).fill('#F1F5F9');
        doc.font('Helvetica-Bold').fontSize(7).fillColor(darkText);
        doc.text('CONCEPTO DE RETENCIÓN / DEDUCCIÓN', 44, tableTop + 4, { width: 170 });
        doc.text('NORMA LEGAL APLICABLE', 215, tableTop + 4, { width: 170 });
        doc.text('TARIFA', 390, tableTop + 4, { width: 60, align: 'center' });
        doc.text('VALOR RETENIDO (COP)', 450, tableTop + 4, { width: 115, align: 'right' });

        let dy = tableTop + 16;
        const ded = liquidacion.deducciones || {};

        const rows = [
          {
            nombre: 'Contribución de Obra Pública (5%)',
            norma: 'Ley 1106/2006 Art. 6 (Nación / Mpio)',
            tarifa: '5.00%',
            monto: ded.contribucion_obra_publica_5pct?.monto || 0,
            aplica: ded.contribucion_obra_publica_5pct?.aplica
          },
          {
            nombre: 'Retención en la Fuente por Renta',
            norma: 'E.T. Art. 392 (Construcción / Obra)',
            tarifa: `${ded.retencion_fuente_renta?.porcentaje || 2.0}%`,
            monto: ded.retencion_fuente_renta?.monto || 0,
            aplica: ded.retencion_fuente_renta?.aplica
          },
          {
            nombre: 'Retención de ICA (ReteICA)',
            norma: 'Estatuto Tributario Territorial',
            tarifa: `${ded.rete_ica?.tarifa_por_mil || 9.66} ‰`,
            monto: ded.rete_ica?.monto || 0,
            aplica: ded.rete_ica?.aplica
          },
          {
            nombre: 'Retención de IVA (ReteIVA)',
            norma: 'E.T. Art. 437-1 (15% del IVA)',
            tarifa: '15.00%',
            monto: ded.rete_iva?.monto || 0,
            aplica: ded.rete_iva?.aplica
          },
          {
            nombre: 'Estampilla Pro-Adulto Mayor',
            norma: 'Ley 1276 de 2009',
            tarifa: '2.00%',
            monto: ded.estampilla_pro_ancianos?.monto || 0,
            aplica: ded.estampilla_pro_ancianos?.aplica
          },
          {
            nombre: 'Estampilla Pro-Cultura',
            norma: 'Ley 397 de 1997',
            tarifa: '1.00%',
            monto: ded.estampilla_pro_cultura?.monto || 0,
            aplica: ded.estampilla_pro_cultura?.aplica
          },
          {
            nombre: 'Estampilla Pro-Desarrollo',
            norma: 'Ordenanza Departamental',
            tarifa: '1.00%',
            monto: ded.estampilla_pro_desarrollo?.monto || 0,
            aplica: ded.estampilla_pro_desarrollo?.aplica
          }
        ];

        rows.forEach((r, idx) => {
          if (idx % 2 === 1) {
            doc.rect(36, dy, 540, 13).fill('#F8FAFC');
          }
          doc.font('Helvetica').fontSize(6.8).fillColor(darkText);
          doc.text(r.nombre, 44, dy + 3, { width: 170 });
          doc.text(r.norma, 215, dy + 3, { width: 170 });
          doc.text(r.tarifa, 390, dy + 3, { width: 60, align: 'center' });
          doc.font('Helvetica-Bold').fillColor(r.monto > 0 ? '#DC2626' : grayText)
             .text(`$ ${Number(r.monto).toLocaleString('es-CO')} COP`, 450, dy + 3, { width: 115, align: 'right' });
          dy += 13;
        });

        // Fila Total Deducciones
        doc.rect(36, dy, 540, 16).fill('#FEE2E2');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#B91C1C');
        doc.text('TOTAL DEDUCCIONES Y RETENCIONES TRIBUTARIAS:', 44, dy + 4, { width: 340 });
        doc.text(`$ ${Number(liquidacion.total_deducciones_tributarias || 0).toLocaleString('es-CO')} COP`, 450, dy + 4, { width: 115, align: 'right' });

        dy += 22;

        // -------------------------------------------------------------
        // BANNER DE VALOR NETO A GIRAR (ORDEN DE PAGO)
        // -------------------------------------------------------------
        doc.rect(36, dy, 540, 36).fillAndStroke('#ECFDF5', '#6EE7B7');
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(accentGreen)
           .text('VALOR LÍQUIDO AUTORIZADO A GIRAR AL CONTRATISTA:', 44, dy + 6);
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#065F46')
           .text(`$ ${Number(liquidacion.neto_a_girar_contratista || 0).toLocaleString('es-CO')} COP`, 44, dy + 18, { align: 'right', width: 520 });

        dy += 44;

        // -------------------------------------------------------------
        // FIRMAS DE LEGALIZACIÓN Y AUTORIZACIÓN
        // -------------------------------------------------------------
        doc.rect(36, dy, 540, 68).fillAndStroke('#FFFFFF', '#CBD5E1');
        const signY = dy;
        const sWidth = 120;

        // Firma 1: Contratista
        doc.moveTo(46, signY + 44).lineTo(46 + sWidth, signY + 44).stroke('#94A3B8');
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(darkText)
           .text('CONTRATISTA DE OBRA', 46, signY + 47, { width: sWidth, align: 'center' });
        doc.font('Helvetica').fontSize(5.5).fillColor(grayText)
           .text(contratista_nombre, 46, signY + 55, { width: sWidth, align: 'center' });

        // Firma 2: Interventor Técnico
        doc.moveTo(180, signY + 44).lineTo(180 + sWidth, signY + 44).stroke('#94A3B8');
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(darkText)
           .text('INTERVENTORÍA TÉCNICA', 180, signY + 47, { width: sWidth, align: 'center' });
        doc.font('Helvetica').fontSize(5.5).fillColor(grayText)
           .text('Revisión Técnica y PILA Conforme', 180, signY + 55, { width: sWidth, align: 'center' });

        // Firma 3: Supervisor
        doc.moveTo(314, signY + 44).lineTo(314 + sWidth, signY + 44).stroke('#94A3B8');
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(darkText)
           .text('SUPERVISOR DESIGNADO', 314, signY + 47, { width: sWidth, align: 'center' });
        doc.font('Helvetica').fontSize(5.5).fillColor(grayText)
           .text('Entidad Estatal Contratante', 314, signY + 55, { width: sWidth, align: 'center' });

        // Firma 4: Ordenador de Gasto / Tesorero
        doc.moveTo(446, signY + 44).lineTo(446 + sWidth, signY + 44).stroke('#94A3B8');
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(darkText)
           .text('ORDENADOR DEL GASTO / TESORERÍA', 446, signY + 47, { width: sWidth, align: 'center' });
        doc.font('Helvetica').fontSize(5.5).fillColor(grayText)
           .text('Aprobación de Giro & Egreso', 446, signY + 55, { width: sWidth, align: 'center' });

        // Numeración de páginas
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(6.5).font('Helvetica').fillColor('#94A3B8')
             .text(
               `Radar SECOP • Orden Oficial de Pago DIAN • Página ${i + 1} de ${pages.count}`,
               36,
               doc.page.height - 24,
               { align: 'center', width: 540 }
             );
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Genera el Libro de Conciliación y Liquidación Tributaria en Excel (.xlsx)
   * 
   * @param {Object} data
   * @returns {Promise<Buffer>}
   */
  async generarLiquidacionTributariaExcel(data) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Radar SECOP - NIKADU IA';
    workbook.lastModifiedBy = 'Radar SECOP';
    workbook.created = new Date();
    workbook.modified = new Date();

    const {
      proceso_numero = 'LP-OBRA-2026-001',
      contrato_numero = 'CTO-2026-045',
      entidad_nombre = 'ENTIDAD ESTATAL CONTRATANTE',
      contratista_nombre = 'CONSORCIO VIAL DE COLOMBIA',
      numero_factura_cuenta = 'FAC-E-0089',
      cufe_dian = 'c8b4f23e7890a12d34e56f7890ab12cd',
      liquidacion = {}
    } = data;

    const ws = workbook.addWorksheet('Liquidación Tributaria DIAN');
    ws.views = [{ showGridLines: true }];

    ws.columns = [
      { width: 34 },
      { width: 36 },
      { width: 24 },
      { width: 24 }
    ];

    ws.mergeCells('A1:D1');
    ws.getCell('A1').value = 'REPÚBLICA DE COLOMBIA • RADAR SECOP TESORERÍA';
    ws.getCell('A1').font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
    ws.getCell('A1').alignment = { horizontal: 'center' };

    ws.mergeCells('A2:D2');
    ws.getCell('A2').value = 'LIQUIDACIÓN TRIBUTARIA & ORDEN DE GIRO (ESTATUTO TRIBUTARIO / LEY 1106)';
    ws.getCell('A2').font = { size: 12, bold: true, color: { argb: 'FF0F766E' } };
    ws.getCell('A2').alignment = { horizontal: 'center' };

    ws.addRow([]);
    ws.addRow(['NÚMERO DE CONTRATO:', contrato_numero, 'PROCESO SECOP:', proceso_numero]);
    ws.addRow(['ENTIDAD CONTRATANTE:', entidad_nombre, 'FACTURA / CUENTA:', numero_factura_cuenta]);
    ws.addRow(['CONTRATISTA:', contratista_nombre, 'CUFE DIAN:', cufe_dian.substring(0, 30) + '...']);
    ws.addRow(['MODALIDAD TRIBUTARIA:', liquidacion.modalidad_tributaria || 'OBRA_PUBLICA_AIU', 'FECHA LIQUIDACIÓN:', new Date().toLocaleDateString('es-CO')]);

    ['A4', 'A5', 'A6', 'A7', 'C4', 'C5', 'C6', 'C7'].forEach(c => {
      ws.getCell(c).font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
    });

    ws.addRow([]);
    ws.addRow(['DESGLOSE FINANCIERO Y BASE DE RETENCIONES:']);
    ws.getCell('A9').font = { bold: true, size: 11, color: { argb: 'FF0F766E' } };

    const hRow = 10;
    ws.addRow(['CONCEPTO', 'FUNDAMENTO LEGAL', 'VALOR MONETARIO (COP)', 'TIPO']);
    ws.getRow(hRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ['A10', 'B10', 'C10', 'D10'].forEach(c => {
      ws.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F766E' }
      };
    });

    ws.addRow(['Valor Bruto Facturado en Acta', 'Acta de entrega / recibo de obra', Number(liquidacion.valor_bruto_facturado || 0), 'BRUTO']);
    ws.addRow(['(-) Amortización Anticipo', 'Descuento fiducia de anticipo', Number(liquidacion.amortizacion_anticipo_monto || 0), 'DESCUENTO']);
    ws.addRow(['(=) Subtotal Amortizado', '=C11-C12', { formula: 'C11-C12' }, 'BASE']);
    ws.addRow(['(+) IVA Liquidado', 'Art. 462-1 / Art. 437 E.T.', Number(liquidacion.iva_liquidado || 0), 'IMPUESTO']);
    ws.addRow(['(=) Total Facturado con IVA', '=C13+C14', { formula: 'C13+C14' }, 'TOTAL BRUTO']);

    ws.getCell('C11').numFmt = '$#,##0.00;($#,##0.00);"-"';
    ws.getCell('C12').numFmt = '$#,##0.00;($#,##0.00);"-"';
    ws.getCell('C13').numFmt = '$#,##0.00;($#,##0.00);"-"';
    ws.getCell('C14').numFmt = '$#,##0.00;($#,##0.00);"-"';
    ws.getCell('C15').numFmt = '$#,##0.00;($#,##0.00);"-"';

    ws.addRow([]);
    ws.addRow(['DEDUCCIONES Y RETENCIONES TRIBUTARIAS:']);
    ws.getCell('A17').font = { bold: true, size: 11, color: { argb: 'FFDC2626' } };

    const dRow = 18;
    ws.addRow(['RETENCIÓN', 'NORMATIVA', 'TARIFA', 'MONTO RETENIDO (COP)']);
    ws.getRow(dRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ['A18', 'B18', 'C18', 'D18'].forEach(c => {
      ws.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' }
      };
    });

    const ded = liquidacion.deducciones || {};
    ws.addRow(['Contribución Obra Pública (5%)', 'Ley 1106/2006 Art. 6', '5.00%', Number(ded.contribucion_obra_publica_5pct?.monto || 0)]);
    ws.addRow(['Retención en la Fuente por Renta', 'Art. 392 E.T.', `${ded.retencion_fuente_renta?.porcentaje || 2.0}%`, Number(ded.retencion_fuente_renta?.monto || 0)]);
    ws.addRow(['Retención de ICA (ReteICA)', 'Acuerdo Territorial', `${ded.rete_ica?.tarifa_por_mil || 9.66} por mil`, Number(ded.rete_ica?.monto || 0)]);
    ws.addRow(['Retención de IVA (ReteIVA)', 'Art. 437-1 E.T. (15%)', '15.00%', Number(ded.rete_iva?.monto || 0)]);
    ws.addRow(['Estampilla Pro-Adulto Mayor', 'Ley 1276 de 2009', '2.00%', Number(ded.estampilla_pro_ancianos?.monto || 0)]);
    ws.addRow(['Estampilla Pro-Cultura', 'Ley 397 de 1997', '1.00%', Number(ded.estampilla_pro_cultura?.monto || 0)]);
    ws.addRow(['Estampilla Pro-Desarrollo', 'Ordenanza Departamental', '1.00%', Number(ded.estampilla_pro_desarrollo?.monto || 0)]);

    for (let r = 19; r <= 25; r++) {
      ws.getCell(`D${r}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
    }

    ws.addRow(['TOTAL DEDUCCIONES TRIBUTARIAS', 'Suma de retenciones', 'DEDUCCIONES', { formula: 'SUM(D19:D25)' }]);
    ws.getCell('D26').numFmt = '$#,##0.00;($#,##0.00);"-"';
    ws.getRow(26).font = { bold: true, color: { argb: 'FFDC2626' } };
    ['A26', 'B26', 'C26', 'D26'].forEach(c => {
      ws.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    });

    ws.addRow([]);
    ws.addRow(['VALOR LÍQUIDO A GIRAR (NETO)', 'Orden de giro tesorería', 'NETO', { formula: 'C15-D26' }]);
    ws.getCell('D28').numFmt = '$#,##0.00;($#,##0.00);"-"';
    ws.getRow(28).font = { bold: true, size: 12, color: { argb: 'FF065F46' } };
    ['A28', 'B28', 'C28', 'D28'].forEach(c => {
      ws.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    });

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = new TaxInvoiceLiquidationEngine();
