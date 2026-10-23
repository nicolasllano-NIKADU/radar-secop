/**
 * ====================================================================
 * RADAR SECOP - MOTOR DE TRAZABILIDAD DE ANTICIPOS Y CUENTA FIDUCIA
 * Marco Normativo y Jurisprudencial:
 * - Ley 80 de 1993 (Art. 40: Límite del 50% del valor del contrato)
 * - Ley 1474 de 2011 (Art. 91: Estatuto Anticorrupción - Fiducia obligatoria)
 * - Decreto 1082 de 2015 (Garantía de Buen Manejo y Régimen Fiduciario)
 * - Consejo de Estado Sección Tercera (Rad. 13649) & Corte Constitucional C-069/2013
 *   (Diferencia jurídica sustantiva: Anticipo vs Pago Anticipado y Rendimientos DGCPTN)
 * ====================================================================
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

class AnticiposFiduciaEngine {
  constructor() {
    this.MAX_ANTICIPO_LEGAL_PCT = 50.0; // Art. 40 Ley 80 de 1993
    this.TASA_RENDIMIENTO_DEFAULT_ANUAL = 9.5; // Tasa promedio cuentas fiduciarias en COP

    // Topes técnicos recomendados en buenas prácticas y Pliegos Tipo ANCP-CCE
    this.TOPES_RUBROS_RECOMENDADOS = {
      CAMPAMENTO_SENALIZACION: {
        codigo: 'CAMPAMENTO_SENALIZACION',
        nombre: 'Campamento, Cerramiento y Señalización Provisional',
        maxPctRecomendado: 15.0,
        descripcion: 'Instalaciones provisionales, vallas de obra, cerramiento perimetral y señalización preventiva.'
      },
      ACOPIO_MATERIALES: {
        codigo: 'ACOPIO_MATERIALES',
        nombre: 'Acopio y Adquisición Anticipada de Materiales',
        maxPctRecomendado: 50.0,
        descripcion: 'Adquisición de acero, cemento, agregados pétreos, tuberías y suministros directos de obra.'
      },
      MAQUINARIA_EQUIPOS: {
        codigo: 'MAQUINARIA_EQUIPOS',
        nombre: 'Movilización de Maquinaria y Equipos',
        maxPctRecomendado: 30.0,
        descripcion: 'Fletes, instalación en sitio y alistamiento de maquinaria pesada y equipos especializados.'
      },
      NOMINA_ARRANQUE: {
        codigo: 'NOMINA_ARRANQUE',
        nombre: 'Nómina Inicial de Arranque (Mes 1)',
        maxPctRecomendado: 20.0,
        descripcion: 'Costos laborales directos del primer mes del personal técnico y operativo en frente de obra.'
      },
      ENSAYOS_LABORATORIO: {
        codigo: 'ENSAYOS_LABORATORIO',
        nombre: 'Ensayos de Laboratorio y Topografía Inicial',
        maxPctRecomendado: 10.0,
        descripcion: 'Comisión topográfica de replanteo, estudios de mecánica de suelos y calibración de mezclas.'
      },
      OTROS_PRELIMINARES: {
        codigo: 'OTROS_PRELIMINARES',
        nombre: 'Otros Costos Preliminares Debidamente Justificados',
        maxPctRecomendado: 10.0,
        descripcion: 'Licencias preliminares de intervención de espacio público, PMT o requerimientos especiales.'
      }
    };
  }

  /**
   * Valida la estructuración del Plan de Inversión del Anticipo
   * 
   * @param {Object} params
   * @param {number} params.valorContrato
   * @param {number} params.anticipoMonto
   * @param {Array<Object>} params.rubros - Lista de rubros ({ codigo, nombre, valor, justificacion })
   * @returns {Object}
   */
  validarPlanInversion({ valorContrato, anticipoMonto, rubros = [] }) {
    const contrato = Number(valorContrato) || 0;
    const anticipo = Number(anticipoMonto) || 0;
    const anticipoPct = contrato > 0 ? (anticipo / contrato) * 100 : 0;

    const alertas = [];
    const advertencias = [];

    // 1. Validación de tope legal del 50% (Ley 80/1993 Art. 40)
    if (anticipoPct > this.MAX_ANTICIPO_LEGAL_PCT + 0.001) {
      alertas.push({
        severidad: 'CRITICA',
        norma: 'Ley 80 de 1993, Art. 40',
        mensaje: `El anticipo solicitado (${anticipoPct.toFixed(2)}%) excede el límite legal máximo permitido del 50.00% del valor total del contrato ($${contrato.toLocaleString('es-CO')}).`
      });
    }

    // 2. Sumatoria de rubros frente al valor total del anticipo
    let sumaRubros = 0;
    const rubrosAnalizados = rubros.map(r => {
      const val = Number(r.valor) || 0;
      sumaRubros += val;
      const pctSobreAnticipo = anticipo > 0 ? (val / anticipo) * 100 : 0;
      const ref = this.TOPES_RUBROS_RECOMENDADOS[r.codigo] || null;

      let estadoRubro = 'ADMISIBLE';
      let notaRubro = 'Cumple parámetros estándar.';

      if (ref && pctSobreAnticipo > ref.maxPctRecomendado) {
        estadoRubro = 'OBSERVADO';
        notaRubro = `Supera el porcentaje técnico sugerido (${ref.maxPctRecomendado.toFixed(1)}%). Requiere concepto motivado de la Interventoría.`;
        advertencias.push({
          rubro: r.nombre || r.codigo,
          porcentaje: pctSobreAnticipo.toFixed(2),
          topeSugerido: ref.maxPctRecomendado,
          mensaje: `El rubro ${r.nombre || r.codigo} representa el ${pctSobreAnticipo.toFixed(2)}% del anticipo, por encima del parámetro estándar de ${ref.maxPctRecomendado}%.`
        });
      }

      // Advertencia si pretenden deducir comisiones fiduciarias del anticipo público
      if (r.codigo === 'COMISIONES_FIDUCIARIAS' || (r.nombre && r.nombre.toLowerCase().includes('comisi') && r.nombre.toLowerCase().includes('fidu'))) {
        estadoRubro = 'NO_CONFORME_LEY1474';
        notaRubro = 'Conforme al Art. 91 Ley 1474/2011, los costos fiduciarios son a cargo del contratista y NO pueden deducirse del anticipo.';
        alertas.push({
          severidad: 'GRAVE',
          norma: 'Ley 1474 de 2011, Art. 91',
          mensaje: 'El contratista no puede imputar comisiones fiduciarias al saldo del anticipo público. Deben asumirse con recursos propios.'
        });
      }

      return {
        codigo: r.codigo || 'OTRO',
        nombre: r.nombre || 'Rubro preliminar',
        valor: val,
        porcentaje_sobre_anticipo: Number(pctSobreAnticipo.toFixed(2)),
        estado: estadoRubro,
        nota: notaRubro,
        justificacion: r.justificacion || 'Sin justificación detallada'
      };
    });

    const diferencia = Math.abs(anticipo - sumaRubros);
    const balanceado = diferencia < 1.0; // margen de redondeo

    if (!balanceado) {
      if (sumaRubros < anticipo) {
        alertas.push({
          severidad: 'ERROR',
          norma: 'Estructuración Financiera de Pliegos',
          mensaje: `El plan de inversión está incompleto: la suma de rubros ($${sumaRubros.toLocaleString('es-CO')}) es inferior al anticipo aprobado ($${anticipo.toLocaleString('es-CO')}). Faltan $${diferencia.toLocaleString('es-CO')}.`
        });
      } else {
        alertas.push({
          severidad: 'ERROR',
          norma: 'Estructuración Financiera de Pliegos',
          mensaje: `El plan de inversión excede el anticipo: la suma de rubros ($${sumaRubros.toLocaleString('es-CO')}) sobrepasa el monto asignado ($${anticipo.toLocaleString('es-CO')}) en $${diferencia.toLocaleString('es-CO')}.`
        });
      }
    }

    return {
      es_valido: alertas.filter(a => a.severidad === 'CRITICA' || a.severidad === 'ERROR').length === 0,
      valor_contrato: contrato,
      anticipo_monto: anticipo,
      anticipo_porcentaje: Number(anticipoPct.toFixed(2)),
      suma_rubros: sumaRubros,
      diferencia: diferencia,
      balanceado: balanceado,
      rubros_analizados: rubrosAnalizados,
      alertas: alertas,
      advertencias: advertencias
    };
  }

  /**
   * Simula y proyecta el cronograma de amortización del anticipo en actas parciales
   * y el cálculo de rendimientos financieros para el reintegro a la DGCPTN
   * 
   * @param {Object} params
   * @param {number} params.valorContrato
   * @param {number} params.anticipoPct - Porcentaje pactado (ej. 20.0%)
   * @param {number} params.plazoMeses - Plazo contractual en meses
   * @param {number} [params.tasaRendimientoFiduciarioAnual=9.5] - Rendimiento anual estimado en cuenta fiducia
   * @param {Array<Object>} [params.actasProgramadas] - Actas específicas o null para proyección automática
   * @returns {Object}
   */
  simularPlanAmortizacion({
    valorContrato,
    anticipoPct,
    plazoMeses = 6,
    tasaRendimientoFiduciarioAnual = 9.5,
    actasProgramadas = null
  }) {
    const contrato = Number(valorContrato) || 0;
    const pctAnticipo = Number(anticipoPct) || 0;
    const montoAnticipo = (contrato * pctAnticipo) / 100;
    const meses = Math.max(1, parseInt(plazoMeses, 10) || 6);
    const tasaMensual = (Number(tasaRendimientoFiduciarioAnual) || 9.5) / 100 / 12;

    let cronograma = [];
    let saldoAnticipo = montoAnticipo;
    let ejecucionAcumulada = 0;
    let rendimientosTotales = 0;
    let totalAmortizado = 0;

    // Si no se proporcionaron actas específicas, proyectar curva de obra típica
    let actasBase = [];
    if (Array.isArray(actasProgramadas) && actasProgramadas.length > 0) {
      actasBase = actasProgramadas;
    } else {
      // Proyección estándar: Curva S suave o cuotas proporcionales
      // El mes 1 arranca con preliminares (ej. 10% del contrato), luego sube
      const valorPorMesPromedio = contrato / meses;
      for (let i = 1; i <= meses; i++) {
        actasBase.push({
          numero_acta: i,
          mes: i,
          valor_bruto: valorPorMesPromedio,
          porcentaje_amortizacion: pctAnticipo // Amortización estándar = % anticipo
        });
      }
    }

    const hoy = new Date();

    for (let i = 0; i < actasBase.length; i++) {
      const actaIn = actasBase[i];
      const numActa = actaIn.numero_acta || (i + 1);
      const valorBruto = Number(actaIn.valor_bruto) || 0;
      
      // Fecha estimada del acta
      const fechaActa = new Date(hoy);
      fechaActa.setMonth(fechaActa.getMonth() + i + 1);
      const fechaStr = fechaActa.toISOString().split('T')[0];

      // Amortización calculada:
      // Si es la última acta, se amortiza obligatoriamente todo el saldo remanente
      let pctAmort = Number(actaIn.porcentaje_amortizacion) || pctAnticipo;
      let valorAmortizar = (valorBruto * pctAmort) / 100;

      const esUltimaActa = (i === actasBase.length - 1);

      if (esUltimaActa && saldoAnticipo > 0) {
        valorAmortizar = saldoAnticipo; // Liquidación total del anticipo
        pctAmort = valorBruto > 0 ? (valorAmortizar / valorBruto) * 100 : 100;
      } else if (valorAmortizar > saldoAnticipo) {
        valorAmortizar = saldoAnticipo;
        pctAmort = valorBruto > 0 ? (valorAmortizar / valorBruto) * 100 : 100;
      }

      const saldoPrevio = saldoAnticipo;
      const saldoRestante = Math.max(0, saldoPrevio - valorAmortizar);
      
      // Rendimientos financieros fiduciarios generados sobre el saldo promedio del mes
      const saldoPromedioMes = (saldoPrevio + saldoRestante) / 2;
      const rendimientosMes = saldoPromedioMes * tasaMensual;
      rendimientosTotales += rendimientosMes;
      totalAmortizado += valorAmortizar;

      ejecucionAcumulada += valorBruto;
      const pctEjecucionAcumulada = contrato > 0 ? (ejecucionAcumulada / contrato) * 100 : 0;
      const pctAmortizadoAcumulado = montoAnticipo > 0 ? (totalAmortizado / montoAnticipo) * 100 : 0;

      saldoAnticipo = saldoRestante;

      cronograma.push({
        numero_acta: numActa,
        fecha_proyectada: fechaStr,
        valor_bruto_acta: Number(valorBruto.toFixed(2)),
        porcentaje_amortizacion: Number(pctAmort.toFixed(2)),
        valor_amortizado: Number(valorAmortizar.toFixed(2)),
        saldo_anticipo_previo: Number(saldoPrevio.toFixed(2)),
        saldo_anticipo_restante: Number(saldoRestante.toFixed(2)),
        rendimientos_generados_mes: Number(rendimientosMes.toFixed(2)),
        reintegro_tesoro_acumulado: Number(rendimientosTotales.toFixed(2)),
        garantia_requerida_saldo: Number(saldoRestante.toFixed(2)),
        porcentaje_ejecucion_acumulada: Number(pctEjecucionAcumulada.toFixed(2)),
        porcentaje_amortizado_acumulado: Number(pctAmortizadoAcumulado.toFixed(2)),
        estado_acta: 'PROYECTADA'
      });
    }

    const saldoFinal = saldoAnticipo;
    let semaforoAmortizacion = 'EXITOSO';
    let mensajeSemaforo = 'El anticipo queda 100% amortizado en el cronograma programado.';

    if (saldoFinal > 1.0) {
      semaforoAmortizacion = 'DEFICIT_AMORTIZACION';
      mensajeSemaforo = `Al final del plazo contractual queda un saldo insoluto de anticipo por amortizar de $${saldoFinal.toLocaleString('es-CO')}. Requiere ajuste de cuotas.`;
    }

    return {
      valor_contrato: contrato,
      anticipo_porcentaje: pctAnticipo,
      anticipo_monto: montoAnticipo,
      plazo_meses: meses,
      tasa_rendimiento_anual: tasaRendimientoFiduciarioAnual,
      total_amortizado: Number(totalAmortizado.toFixed(2)),
      saldo_final_pendiente: Number(saldoFinal.toFixed(2)),
      rendimientos_totales_proyectados: Number(rendimientosTotales.toFixed(2)),
      semaforo: semaforoAmortizacion,
      mensaje_semaforo: mensajeSemaforo,
      cronograma_actas: cronograma
    };
  }

  /**
   * Genera el Dictamen Oficial Institucional de Aprobación de Anticipo y Amortización en PDF
   * Cumple lineamientos de Ley 1474/2011 Art. 91 y formato ANCP-CCE
   * 
   * @param {Object} data - Datos completos del plan y simulación
   * @returns {Promise<Buffer>}
   */
  async generarPlanAmortizacionPdf(data) {
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
          proceso_numero = 'SECOP-II-2026',
          contrato_numero = 'CTO-OBRA-001',
          entidad_nombre = 'ENTIDAD ESTATAL CONTRATANTE',
          contratista_nombre = 'CONSORCIO INFRAESTRUCTURA COLOMBIA',
          contratista_nit = '900.123.456-7',
          fiduciaria_nombre = 'FIDUCIARIA BANCOLOMBIA S.A.',
          numero_encargo_patrimonio = 'PA-OBRA-987452',
          tipo_instrumento = 'PATRIMONIO_AUTÓNOMO IRREVOCABLE',
          valor_contrato = 0,
          anticipo_porcentaje = 0,
          anticipo_monto = 0,
          plazo_meses = 6,
          tasa_rendimiento_anual = 9.5,
          rubros = [],
          simulacion = {}
        } = data;

        const primaryColor = '#1E3A8A';   // Azul institucional ANCP
        const secondaryColor = '#059669'; // Verde esmeralda SECOP
        const darkText = '#0F172A';
        const grayText = '#475569';
        const lightBg = '#F8FAFC';
        const accentRed = '#DC2626';

        // -------------------------------------------------------------
        // ENCABEZADO INSTITUCIONAL
        // -------------------------------------------------------------
        doc.rect(36, 36, 540, 48).fillAndStroke('#F1F5F9', '#CBD5E1');
        
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold')
           .text('REPÚBLICA DE COLOMBIA • CONTRATACIÓN PÚBLICA ESTATAL', 46, 44, { align: 'center', width: 520 });
        doc.fillColor(darkText).fontSize(11).font('Helvetica-Bold')
           .text('PLAN DE INVERSIÓN Y AMORTIZACIÓN DE ANTICIPO • CUENTA FIDUCIA', 46, 58, { align: 'center', width: 520 });
        doc.fillColor(grayText).fontSize(8).font('Helvetica')
           .text('Marco Legal: Ley 80 de 1993 Art. 40 • Ley 1474 de 2011 Art. 91 • Decreto 1082 de 2015', 46, 71, { align: 'center', width: 520 });

        doc.y = 94;

        // -------------------------------------------------------------
        // SECCIÓN 1: DATOS GENERALES Y CONTRATO
        // -------------------------------------------------------------
        doc.rect(36, doc.y, 540, 75).fillAndStroke(lightBg, '#E2E8F0');
        const cardY = doc.y + 6;

        doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('INFORMACIÓN CONTRACTUAL Y FIDUCIARIA', 44, cardY);
        
        const col1 = 44;
        const col2 = 310;
        let lineY = cardY + 12;

        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(darkText).text('Entidad Contratante: ', col1, lineY, { continued: true })
           .font('Helvetica').text(entidad_nombre);
        doc.font('Helvetica-Bold').text('Proceso / Contrato: ', col2, lineY, { continued: true })
           .font('Helvetica').text(`${proceso_numero} / ${contrato_numero}`);

        lineY += 11;
        doc.font('Helvetica-Bold').text('Contratista / Proponente: ', col1, lineY, { continued: true })
           .font('Helvetica').text(`${contratista_nombre} (NIT: ${contratista_nit})`);
        doc.font('Helvetica-Bold').text('Plazo Contractual: ', col2, lineY, { continued: true })
           .font('Helvetica').text(`${plazo_meses} Meses`);

        lineY += 11;
        doc.font('Helvetica-Bold').text('Entidad Fiduciaria: ', col1, lineY, { continued: true })
           .font('Helvetica').text(fiduciaria_nombre);
        doc.font('Helvetica-Bold').text('Instrumento Fiduciario: ', col2, lineY, { continued: true })
           .font('Helvetica').text(`${tipo_instrumento} N° ${numero_encargo_patrimonio}`);

        lineY += 11;
        doc.font('Helvetica-Bold').text('Valor Total Contrato: ', col1, lineY, { continued: true })
           .font('Helvetica').text(`$${Number(valor_contrato).toLocaleString('es-CO')} COP`);
        doc.font('Helvetica-Bold').text('Anticipo Aprobado: ', col2, lineY, { continued: true })
           .font('Helvetica-Bold').fillColor(secondaryColor)
           .text(`$${Number(anticipo_monto).toLocaleString('es-CO')} COP (${Number(anticipo_porcentaje).toFixed(2)}%)`);

        doc.y = cardY + 75;

        // -------------------------------------------------------------
        // SECCIÓN 2: DICTAMEN JURÍDICO Y REGLAS DE DESTINACIÓN (Art. 91)
        // -------------------------------------------------------------
        doc.rect(36, doc.y, 540, 48).fillAndStroke('#FEF3C7', '#FDE68A'); // amarillo suave
        const dictamenY = doc.y + 5;
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#92400E')
           .text('RÉGIMEN LEGAL Y DESTINACIÓN EXCLUSIVA DEL ANTICIPO (Art. 91 Ley 1474 de 2011)', 44, dictamenY);
        doc.font('Helvetica').fontSize(6.8).fillColor('#78350F')
           .text('• Los recursos concedidos a título de anticipo continúan siendo dineros públicos hasta su efectiva amortización en actas de obra.\n' +
                 '• El patrimonio autónomo o fiducia mercantil garantiza su aplicación EXCLUSIVA al contrato. Comisiones fiduciarias a cargo del contratista.\n' +
                 '• Los rendimientos financieros generados NO pertenecen al contratista; deben ser liquidados y reintegrados a la DGCPTN o Tesorería.', 44, dictamenY + 11, { width: 520, lineGap: 1.5 });

        doc.y = dictamenY + 48;

        // -------------------------------------------------------------
        // SECCIÓN 3: PLAN DE INVERSIÓN DEL ANTICIPO (DESGLOSE DE RUBROS)
        // -------------------------------------------------------------
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text('1. DESGLOSE DEL PLAN DE INVERSIÓN INICIAL DEL ANTICIPO', 36, doc.y);
        doc.y += 12;

        const tableRubrosY = doc.y;
        doc.rect(36, tableRubrosY, 540, 16).fill(primaryColor);
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#FFFFFF');
        doc.text('CÓDIGO / RUBRO PRELIMINAR', 42, tableRubrosY + 4, { width: 200 });
        doc.text('JUSTIFICACIÓN TÉCNICA', 246, tableRubrosY + 4, { width: 140 });
        doc.text('% ANTICIPO', 390, tableRubrosY + 4, { width: 55, align: 'right' });
        doc.text('VALOR ASIGNADO (COP)', 450, tableRubrosY + 4, { width: 120, align: 'right' });

        let curY = tableRubrosY + 16;
        let totalRubrosSuma = 0;

        if (Array.isArray(rubros) && rubros.length > 0) {
          rubros.forEach((r, idx) => {
            const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
            doc.rect(36, curY, 540, 15).fillAndStroke(rowBg, '#E2E8F0');
            
            const v = Number(r.valor) || 0;
            totalRubrosSuma += v;
            const pct = Number(r.porcentaje_sobre_anticipo) || (anticipo_monto > 0 ? (v / anticipo_monto) * 100 : 0);

            doc.font('Helvetica-Bold').fontSize(6.8).fillColor(darkText)
               .text(r.nombre || r.codigo, 42, curY + 3.5, { width: 200, ellipsis: true });
            doc.font('Helvetica').fontSize(6.5).fillColor(grayText)
               .text(r.justificacion || 'Gastos de arranque de obra', 246, curY + 3.5, { width: 140, ellipsis: true });
            doc.font('Helvetica-Bold').fontSize(6.8).fillColor(darkText)
               .text(`${pct.toFixed(2)}%`, 390, curY + 3.5, { width: 55, align: 'right' });
            doc.font('Helvetica').fontSize(6.8).fillColor(darkText)
               .text(`$${v.toLocaleString('es-CO')}`, 450, curY + 3.5, { width: 120, align: 'right' });

            curY += 15;
          });
        }

        // Fila Total Rubros
        doc.rect(36, curY, 540, 16).fillAndStroke('#E0E7FF', '#C7D2FE');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(primaryColor)
           .text('TOTAL PLAN DE INVERSIÓN APROBADO:', 42, curY + 4, { width: 340 });
        doc.text(`100.00%`, 390, curY + 4, { width: 55, align: 'right' });
        doc.text(`$${totalRubrosSuma.toLocaleString('es-CO')} COP`, 450, curY + 4, { width: 120, align: 'right' });

        doc.y = curY + 22;

        // -------------------------------------------------------------
        // SECCIÓN 4: CRONOGRAMA Y TABLA DE AMORTIZACIÓN EN ACTAS DE OBRA
        // -------------------------------------------------------------
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text('2. CRONOGRAMA DE AMORTIZACIÓN POR ACTAS PARCIALES Y RENDIMIENTOS', 36, doc.y);
        doc.y += 12;

        const tableActasY = doc.y;
        doc.rect(36, tableActasY, 540, 16).fill(secondaryColor);
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#FFFFFF');
        doc.text('ACTA', 40, tableActasY + 4, { width: 25 });
        doc.text('FECHA', 68, tableActasY + 4, { width: 50 });
        doc.text('VALOR BRUTO OBRA', 122, tableActasY + 4, { width: 85, align: 'right' });
        doc.text('% AMORT.', 212, tableActasY + 4, { width: 45, align: 'right' });
        doc.text('AMORTIZACIÓN', 260, tableActasY + 4, { width: 80, align: 'right' });
        doc.text('SALDO ANTICIPO', 345, tableActasY + 4, { width: 80, align: 'right' });
        doc.text('RENDIMIENTOS', 430, tableActasY + 4, { width: 70, align: 'right' });
        doc.text('ESTADO', 505, tableActasY + 4, { width: 65, align: 'center' });

        let actaRowY = tableActasY + 16;
        const actas = simulacion.cronograma_actas || [];

        actas.forEach((acta, idx) => {
          // Si nos acercamos al final de página, crear nueva página
          if (actaRowY > 680) {
            doc.addPage();
            actaRowY = 36;
          }

          const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F0FDF4';
          doc.rect(36, actaRowY, 540, 14).fillAndStroke(rowBg, '#DCFCE7');

          doc.font('Helvetica-Bold').fontSize(6.5).fillColor(darkText)
             .text(`N° ${acta.numero_acta}`, 40, actaRowY + 3.5, { width: 25 });
          doc.font('Helvetica').fontSize(6.2).fillColor(grayText)
             .text(acta.fecha_proyectada || '2026-XX', 68, actaRowY + 3.5, { width: 50 });
          doc.font('Helvetica').fontSize(6.5).fillColor(darkText)
             .text(`$${Number(acta.valor_bruto_acta).toLocaleString('es-CO')}`, 122, actaRowY + 3.5, { width: 85, align: 'right' });
          doc.font('Helvetica-Bold').fontSize(6.5).fillColor(primaryColor)
             .text(`${Number(acta.porcentaje_amortizacion).toFixed(1)}%`, 212, actaRowY + 3.5, { width: 45, align: 'right' });
          doc.font('Helvetica-Bold').fontSize(6.5).fillColor(secondaryColor)
             .text(`$${Number(acta.valor_amortizado).toLocaleString('es-CO')}`, 260, actaRowY + 3.5, { width: 80, align: 'right' });
          doc.font('Helvetica').fontSize(6.5).fillColor(darkText)
             .text(`$${Number(acta.saldo_anticipo_restante).toLocaleString('es-CO')}`, 345, actaRowY + 3.5, { width: 80, align: 'right' });
          doc.font('Helvetica').fontSize(6.5).fillColor('#B45309')
             .text(`$${Number(acta.rendimientos_generados_mes).toLocaleString('es-CO')}`, 430, actaRowY + 3.5, { width: 70, align: 'right' });
          doc.font('Helvetica-Bold').fontSize(6.2).fillColor(secondaryColor)
             .text(acta.estado_acta || 'PROYECTADA', 505, actaRowY + 3.5, { width: 65, align: 'center' });

          actaRowY += 14;
        });

        // Totales Cronograma
        doc.rect(36, actaRowY, 540, 16).fillAndStroke('#DCFCE7', '#86EFAC');
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#166534')
           .text('TOTALES CONSOLIDADOS:', 40, actaRowY + 4, { width: 170 });
        doc.text(`$${Number(simulacion.total_amortizado || anticipo_monto).toLocaleString('es-CO')}`, 260, actaRowY + 4, { width: 80, align: 'right' });
        doc.text(`SALDO: $${Number(simulacion.saldo_final_pendiente || 0).toLocaleString('es-CO')}`, 345, actaRowY + 4, { width: 80, align: 'right' });
        doc.text(`$${Number(simulacion.rendimientos_totales_proyectados || 0).toLocaleString('es-CO')}`, 430, actaRowY + 4, { width: 70, align: 'right' });
        doc.text('AMORT. 100%', 505, actaRowY + 4, { width: 65, align: 'center' });

        actaRowY += 22;

        // -------------------------------------------------------------
        // SECCIÓN 5: CONTROL DE RENDIMIENTOS FINANCIEROS Y REINTEGRO
        // -------------------------------------------------------------
        if (actaRowY > 640) {
          doc.addPage();
          actaRowY = 36;
        }

        doc.rect(36, actaRowY, 540, 36).fillAndStroke('#F8FAFC', '#E2E8F0');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(primaryColor)
           .text('OBLIGACIÓN DE REINTEGRO DE RENDIMIENTOS FINANCIEROS A LA TESORERÍA / DGCPTN', 44, actaRowY + 5);
        doc.font('Helvetica').fontSize(6.8).fillColor(darkText)
           .text(`Los rendimientos financieros totales estimados en la cuenta fiduciaria ascienden a $${Number(simulacion.rendimientos_totales_proyectados || 0).toLocaleString('es-CO')} COP. Conforme a las instrucciones del Ministerio de Hacienda y el Decreto 1082/2015, deberán ser consignados por la Fiduciaria mensualmente en la cuenta de la Dirección General de Crédito Público y Tesoro Nacional (DGCPTN), adjuntando copia de la consignación a las actas parciales.`, 44, actaRowY + 15, { width: 520, lineGap: 1.2 });

        actaRowY += 44;

        // -------------------------------------------------------------
        // SECCIÓN 6: BLOQUE FORMAL DE FIRMAS
        // -------------------------------------------------------------
        if (actaRowY > 620) {
          doc.addPage();
          actaRowY = 36;
        }

        doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('FIRMAS Y APROBACIONES OFICIALES', 36, actaRowY);
        actaRowY += 12;

        const firmaWidth = 165;
        const firmaGap = 22;
        const fx1 = 36;
        const fx2 = fx1 + firmaWidth + firmaGap;
        const fx3 = fx2 + firmaWidth + firmaGap;

        // Cuadros de firma
        [fx1, fx2, fx3].forEach(x => {
          doc.rect(x, actaRowY, firmaWidth, 54).fillAndStroke('#FFFFFF', '#CBD5E1');
          doc.moveTo(x + 10, actaRowY + 36).lineTo(x + firmaWidth - 10, actaRowY + 36).stroke('#94A3B8');
        });

        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(darkText);
        doc.text('CONTRATISTA / PROPONENTE', fx1, actaRowY + 39, { width: firmaWidth, align: 'center' });
        doc.font('Helvetica').fontSize(6).fillColor(grayText)
           .text(`${contratista_nombre}\nNIT: ${contratista_nit}`, fx1, actaRowY + 47, { width: firmaWidth, align: 'center' });

        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(darkText);
        doc.text('INTERVENTORÍA / SUPERVISIÓN', fx2, actaRowY + 39, { width: firmaWidth, align: 'center' });
        doc.font('Helvetica').fontSize(6).fillColor(grayText)
           .text('Interventor Técnico y Financiero\nMatrícula Profesional Vigente', fx2, actaRowY + 47, { width: firmaWidth, align: 'center' });

        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(darkText);
        doc.text('ORDENADOR DEL GASTO / ENTIDAD', fx3, actaRowY + 39, { width: firmaWidth, align: 'center' });
        doc.font('Helvetica').fontSize(6).fillColor(grayText)
           .text(`${entidad_nombre}\nDelegado del Proceso Contractual`, fx3, actaRowY + 47, { width: firmaWidth, align: 'center' });

        // -------------------------------------------------------------
        // NUMERACIÓN DE PÁGINAS Y PIE DE PÁGINA
        // -------------------------------------------------------------
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(6.5).font('Helvetica').fillColor('#94A3B8')
             .text(`Radar SECOP • Dictamen Oficial de Anticipos y Cuenta Fiducia (Ley 1474/2011) • Contrato ${contrato_numero} • Página ${i + 1} de ${pages.count}`, 36, doc.page.height - 24, { align: 'center', width: 540 });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Genera el Libro Excel (.xlsx) estructurado con fórmulas nativas de cálculo
   * para el Plan de Inversión y Cronograma de Amortización Mensual
   * 
   * @param {Object} data
   * @returns {Promise<Buffer>}
   */
  async generarPlanAmortizacionExcel(data) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Radar SECOP - NIKADU IA';
    workbook.lastModifiedBy = 'Radar SECOP';
    workbook.created = new Date();
    workbook.modified = new Date();

    const {
      proceso_numero = 'SECOP-II-2026',
      contrato_numero = 'CTO-OBRA-001',
      entidad_nombre = 'ENTIDAD ESTATAL CONTRATANTE',
      contratista_nombre = 'CONSORCIO INFRAESTRUCTURA COLOMBIA',
      contratista_nit = '900.123.456-7',
      fiduciaria_nombre = 'FIDUCIARIA BANCOLOMBIA S.A.',
      numero_encargo_patrimonio = 'PA-OBRA-987452',
      tipo_instrumento = 'PATRIMONIO_AUTÓNOMO IRREVOCABLE',
      valor_contrato = 0,
      anticipo_porcentaje = 0,
      anticipo_monto = 0,
      plazo_meses = 6,
      tasa_rendimiento_anual = 9.5,
      rubros = [],
      simulacion = {}
    } = data;

    // -------------------------------------------------------------
    // HOJA 1: RESUMEN Y PLAN DE INVERSIÓN INICIAL
    // -------------------------------------------------------------
    const wsInversion = workbook.addWorksheet('1. Plan de Inversión Anticipo');
    wsInversion.views = [{ showGridLines: true }];

    wsInversion.columns = [
      { width: 25 },
      { width: 35 },
      { width: 22 },
      { width: 25 }
    ];

    wsInversion.mergeCells('A1:D1');
    wsInversion.getCell('A1').value = 'REPÚBLICA DE COLOMBIA • RADAR SECOP NIKADU IA';
    wsInversion.getCell('A1').font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
    wsInversion.getCell('A1').alignment = { horizontal: 'center' };

    wsInversion.mergeCells('A2:D2');
    wsInversion.getCell('A2').value = 'ESTRUCTURACIÓN Y PLAN DE INVERSIÓN DEL ANTICIPO (LEY 1474 DE 2011)';
    wsInversion.getCell('A2').font = { size: 12, bold: true, color: { argb: 'FF1E3A8A' } };
    wsInversion.getCell('A2').alignment = { horizontal: 'center' };

    wsInversion.addRow([]);
    wsInversion.addRow(['NÚMERO DE PROCESO:', proceso_numero, 'CONTRATO NÚMERO:', contrato_numero]);
    wsInversion.addRow(['ENTIDAD CONTRATANTE:', entidad_nombre, 'FECHA ELABORACIÓN:', new Date().toLocaleDateString('es-CO')]);
    wsInversion.addRow(['CONTRATISTA:', contratista_nombre, 'NIT CONTRATISTA:', contratista_nit]);
    wsInversion.addRow(['SOCIEDAD FIDUCIARIA:', fiduciaria_nombre, 'INSTRUMENTO:', tipo_instrumento]);
    wsInversion.addRow(['N° ENCARGO / PATRIMONIO:', numero_encargo_patrimonio, 'PLAZO TOTAL:', `${plazo_meses} Meses`]);
    wsInversion.addRow(['VALOR TOTAL CONTRATO:', Number(valor_contrato), 'PORCENTAJE ANTICIPO:', `${anticipo_porcentaje}%`]);
    wsInversion.addRow(['MONTO TOTAL ANTICIPO:', Number(anticipo_monto), 'TASA REND. FIDUCIA:', `${tasa_rendimiento_anual}% E.A.`]);

    ['A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10'].forEach(c => {
      wsInversion.getCell(c).font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
    });

    // Formatear montos
    wsInversion.getCell('B9').numFmt = '$#,##0.00;($#,##0.00);"-"';
    wsInversion.getCell('B10').numFmt = '$#,##0.00;($#,##0.00);"-"';
    wsInversion.getCell('B10').font = { bold: true, color: { argb: 'FF059669' } };

    wsInversion.addRow([]);
    wsInversion.addRow(['DESGLOSE DE RUBROS PRELIMINARES DEL ANTICIPO:']);
    wsInversion.getCell('A12').font = { bold: true, size: 11, color: { argb: 'FF1E3A8A' } };

    const headerRubrosRow = 13;
    wsInversion.addRow(['CÓDIGO', 'RUBRO / CONCEPTO TÉCNICO', 'JUSTIFICACIÓN TÉCNICA', 'VALOR ASIGNADO (COP)']);
    wsInversion.getRow(headerRubrosRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsInversion.getRow(headerRubrosRow).alignment = { horizontal: 'center', vertical: 'middle' };
    ['A13', 'B13', 'C13', 'D13'].forEach(cell => {
      wsInversion.getCell(cell).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }
      };
    });

    let rowIdx = 14;
    (rubros || []).forEach(r => {
      wsInversion.addRow([
        r.codigo || 'RUBRO',
        r.nombre || 'Concepto',
        r.justificacion || 'Preliminares de obra',
        Number(r.valor) || 0
      ]);
      wsInversion.getCell(`D${rowIdx}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
      rowIdx++;
    });

    // Fila totalizadora con fórmula nativa SUM de Excel
    wsInversion.addRow(['TOTAL', 'SUMATORIA DEL PLAN DE INVERSIÓN', 'Fórmula Excel nativa:', { formula: `SUM(D14:D${rowIdx - 1})` }]);
    wsInversion.getRow(rowIdx).font = { bold: true, color: { argb: 'FF1E3A8A' } };
    wsInversion.getCell(`D${rowIdx}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
    ['A', 'B', 'C', 'D'].forEach(col => {
      wsInversion.getCell(`${col}${rowIdx}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' }
      };
      wsInversion.getCell(`${col}${rowIdx}`).border = {
        top: { style: 'thin' },
        bottom: { style: 'double' }
      };
    });

    // -------------------------------------------------------------
    // HOJA 2: CRONOGRAMA DE AMORTIZACIÓN Y RENDIMIENTOS
    // -------------------------------------------------------------
    const wsAmort = workbook.addWorksheet('2. Cronograma Amortización');
    wsAmort.views = [{ showGridLines: true }];

    wsAmort.columns = [
      { width: 12 }, // Acta
      { width: 15 }, // Fecha
      { width: 22 }, // Valor Bruto
      { width: 15 }, // % Amort
      { width: 22 }, // Valor Amortizado
      { width: 22 }, // Saldo Previo
      { width: 22 }, // Saldo Restante
      { width: 20 }, // Rendimientos Mes
      { width: 18 }  // Estado
    ];

    wsAmort.mergeCells('A1:I1');
    wsAmort.getCell('A1').value = 'CRONOGRAMA OFICIAL DE AMORTIZACIÓN Y LIQUIDACIÓN DE RENDIMIENTOS FIDUCIARIOS';
    wsAmort.getCell('A1').font = { size: 12, bold: true, color: { argb: 'FF059669' } };
    wsAmort.getCell('A1').alignment = { horizontal: 'center' };

    wsAmort.mergeCells('A2:I2');
    wsAmort.getCell('A2').value = `CONTRATO: ${contrato_numero} • VALOR TOTAL: $${Number(valor_contrato).toLocaleString('es-CO')} • ANTICIPO: $${Number(anticipo_monto).toLocaleString('es-CO')} (${anticipo_porcentaje}%)`;
    wsAmort.getCell('A2').font = { size: 9, italic: true, color: { argb: 'FF475569' } };
    wsAmort.getCell('A2').alignment = { horizontal: 'center' };

    wsAmort.addRow([]);

    const headerAmortRow = 4;
    wsAmort.addRow([
      'N° ACTA',
      'FECHA ACTA',
      'VALOR BRUTO OBRA',
      '% AMORT.',
      'VALOR AMORTIZADO',
      'SALDO PREVIO',
      'SALDO RESTANTE',
      'RENDIMIENTOS MES',
      'ESTADO ACTA'
    ]);

    wsAmort.getRow(headerAmortRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsAmort.getRow(headerAmortRow).alignment = { horizontal: 'center', vertical: 'middle' };
    ['A4', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4', 'H4', 'I4'].forEach(c => {
      wsAmort.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF059669' }
      };
    });

    let aRow = 5;
    const actas = simulacion.cronograma_actas || [];

    actas.forEach((acta, i) => {
      // Usar fórmulas dinámicas de Excel para mantener la integridad de cálculo
      const saldoPrevioFormula = (i === 0) 
        ? `'1. Plan de Inversión Anticipo'!B10` 
        : `G${aRow - 1}`;
      
      const valorAmortizadoFormula = `C${aRow}*(D${aRow}/100)`;
      const saldoRestanteFormula = `MAX(0, F${aRow}-E${aRow})`;

      wsAmort.addRow([
        `Acta ${acta.numero_acta}`,
        acta.fecha_proyectada || '2026-XX',
        Number(acta.valor_bruto_acta),
        Number(acta.porcentaje_amortizacion),
        { formula: valorAmortizadoFormula },
        { formula: saldoPrevioFormula },
        { formula: saldoRestanteFormula },
        Number(acta.rendimientos_generados_mes),
        acta.estado_acta || 'PROYECTADA'
      ]);

      wsAmort.getCell(`C${aRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
      wsAmort.getCell(`D${aRow}`).numFmt = '0.00"%"';
      wsAmort.getCell(`E${aRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
      wsAmort.getCell(`F${aRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
      wsAmort.getCell(`G${aRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
      wsAmort.getCell(`H${aRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';

      wsAmort.getCell(`E${aRow}`).font = { bold: true, color: { argb: 'FF059669' } };
      wsAmort.getCell(`G${aRow}`).font = { bold: true };

      aRow++;
    });

    // Fila Totalizadora de Amortización
    wsAmort.addRow([
      'TOTALES',
      'CONSOLIDADOS',
      { formula: `SUM(C5:C${aRow - 1})` },
      '-',
      { formula: `SUM(E5:E${aRow - 1})` },
      '-',
      { formula: `G${aRow - 1}` }, // Saldo final remanente
      { formula: `SUM(H5:H${aRow - 1})` },
      'LIQUIDADO'
    ]);

    wsAmort.getRow(aRow).font = { bold: true, color: { argb: 'FF0F172A' } };
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach(col => {
      wsAmort.getCell(`${col}${aRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDCFCE7' }
      };
      wsAmort.getCell(`${col}${aRow}`).border = {
        top: { style: 'thin' },
        bottom: { style: 'double' }
      };
    });

    wsAmort.getCell(`C${aRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
    wsAmort.getCell(`E${aRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
    wsAmort.getCell(`G${aRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';
    wsAmort.getCell(`H${aRow}`).numFmt = '$#,##0.00;($#,##0.00);"-"';

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = new AnticiposFiduciaEngine();
