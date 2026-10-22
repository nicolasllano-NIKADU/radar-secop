/**
 * ====================================================================
 * RADAR SECOP - MOTOR DE VERIFICACIÓN DE GARANTÍAS Y PÓLIZAS CCE
 * Marco Normativo y Jurisprudencial:
 * - Decreto 1082 de 2015 (Subsección 1 a 3: Garantías en la Contratación Estatal)
 *   * Art. 2.2.1.2.3.1.7: Amparos de la Garantía Única de Cumplimiento
 *   * Art. 2.2.1.2.3.1.8: Garantía de Responsabilidad Civil Extracontractual (RCE)
 *   * Art. 2.2.1.2.3.1.9: Garantía de Seriedad de la Oferta
 *   * Art. 2.2.1.2.3.1.17: Restablecimiento o ampliación de la garantía
 * - Ley 80 de 1993 (Art. 25 num. 19: Obligatoriedad de las garantías)
 * - Ley 1150 de 2007 (Art. 7: Régimen de garantías contractuales)
 * - Código Sustantivo del Trabajo (Art. 488: Prescripción trienal de acciones laborales)
 * - Código Civil Colombiano (Art. 2060: Responsabilidad quinquenal del constructor)
 * ====================================================================
 */

const PDFDocument = require('pdfkit');

class GarantiasEngine {
  constructor() {
    this.SMMLV_VIGENTE = 1423500; // SMMLV legal de referencia

    this.CATALOGO_AMPAROS = {
      SERIEDAD_OFERTA: {
        codigo: 'SERIEDAD_OFERTA',
        nombre: 'Seriedad de la Oferta',
        etapa: 'PRECONTRACTUAL',
        porcentajeSugerido: 10.0,
        baseCalculo: 'Presupuesto Oficial (o valor de la oferta según pliego)',
        vigenciaRegla: 'Desde el cierre y por el plazo de validez de la oferta (mínimo 90 días calendario)',
        diasVigenciaSugeridos: 90,
        fundamentoLegal: 'Art. 2.2.1.2.3.1.9 Decreto 1082 de 2015',
        descripcionRiesgo: 'Garantiza la suscripción del contrato en caso de adjudicación y el no retiro injustificado de la propuesta.'
      },
      CUMPLIMIENTO_CONTRATO: {
        codigo: 'CUMPLIMIENTO_CONTRATO',
        nombre: 'Cumplimiento del Contrato',
        etapa: 'CONTRACTUAL',
        porcentajeSugerido: 10.0, // 20.0 en obra
        baseCalculo: 'Valor total del contrato',
        vigenciaRegla: 'Plazo de ejecución del contrato y liquidación (Plazo + 6 meses)',
        mesesAdicionalesVigencia: 6,
        fundamentoLegal: 'Art. 2.2.1.2.3.1.7 num. 2 Decreto 1082 de 2015',
        descripcionRiesgo: 'Ampara el cumplimiento cabal, oportuno y según especificaciones de todas las obligaciones contractuales.'
      },
      BUEN_MANEJO_ANTICIPO: {
        codigo: 'BUEN_MANEJO_ANTICIPO',
        nombre: 'Buen Manejo y Correcta Inversión del Anticipo',
        etapa: 'CONTRACTUAL',
        porcentajeSugerido: 100.0,
        baseCalculo: 'Monto total concedido como anticipo financiero',
        vigenciaRegla: 'Plazo de ejecución del contrato y liquidación (Plazo + 4 meses)',
        mesesAdicionalesVigencia: 4,
        fundamentoLegal: 'Art. 2.2.1.2.3.1.7 num. 1 Decreto 1082 de 2015',
        descripcionRiesgo: 'Garantiza la destinación exclusiva y reintegro del anticipo entregado al contratista.'
      },
      PAGO_SALARIOS_PRESTACIONES: {
        codigo: 'PAGO_SALARIOS_PRESTACIONES',
        nombre: 'Pago de Salarios, Prestaciones Sociales e Indemnizaciones',
        etapa: 'CONTRACTUAL',
        porcentajeSugerido: 5.0, // 5% a 10%
        baseCalculo: 'Valor total del contrato',
        vigenciaRegla: 'Plazo de ejecución del contrato y tres (3) años más (Art. 488 CST)',
        mesesAdicionalesVigencia: 36,
        fundamentoLegal: 'Art. 2.2.1.2.3.1.7 num. 3 Decreto 1082 de 2015 y Art. 488 CST',
        descripcionRiesgo: 'Protege al Estado frente a eventuales demandas por solidaridad laboral del personal contratado.'
      },
      ESTABILIDAD_CALIDAD_OBRA: {
        codigo: 'ESTABILIDAD_CALIDAD_OBRA',
        nombre: 'Estabilidad y Calidad de la Obra (o Calidad del Servicio)',
        etapa: 'POSTCONTRACTUAL',
        porcentajeSugerido: 10.0, // 10% a 20%
        baseCalculo: 'Valor final de las obras recibidas o bienes suministrados',
        vigenciaRegla: 'Cinco (5) años contados a partir del acta de recibo final (Obra Civil) o 1-3 años (Servicios)',
        mesesAdicionalesVigencia: 60,
        fundamentoLegal: 'Art. 2.2.1.2.3.1.7 num. 4 Decreto 1082/2015 y Art. 2060 Código Civil',
        descripcionRiesgo: 'Cubre los deterioros o ruina de la obra que sobrevengan por vicios del suelo, materiales o construcción.'
      },
      RESPONSABILIDAD_CIVIL_EXTRACONTRACTUAL: {
        codigo: 'RESPONSABILIDAD_CIVIL_EXTRACONTRACTUAL',
        nombre: 'Responsabilidad Civil Extracontractual (RCE)',
        etapa: 'CONTRACTUAL',
        porcentajeSugerido: 5.0,
        baseCalculo: 'Valor del contrato o mínimo 200 a 500 SMMLV según cuantía',
        vigenciaRegla: 'Durante todo el plazo de ejecución del contrato hasta el recibo a satisfacción',
        mesesAdicionalesVigencia: 0,
        fundamentoLegal: 'Art. 2.2.1.2.3.1.8 Decreto 1082 de 2015',
        descripcionRiesgo: 'Ampara los perjuicios patrimoniales y extrapatrimoniales causados a terceros en desarrollo de las labores.',
        deducibleMaximo: '10% del siniestro, mínimo 2 SMMLV'
      }
    };
  }

  /**
   * Calcula la matriz reglamentaria de amparos obligatorios y suficiencia requerida
   * 
   * @param {Object} params
   * @param {number} params.presupuestoOficial - PO en COP
   * @param {number} params.valorContrato - Valor pactado o de oferta (por defecto = PO)
   * @param {number} params.plazoMeses - Plazo de ejecución en meses (ej: 6)
   * @param {number} params.anticipoPorcentaje - Porcentaje de anticipo pactado (0 a 50)
   * @param {string} params.tipoProceso - 'OBRA_PUBLICA', 'CONSULTORIA', 'SERVICIOS_BIENES'
   * @param {string|Date} params.fechaBase - Fecha de cierre (precontractual) o inicio (contractual)
   * @param {number} params.smmlv - SMMLV aplicable (por defecto 1.423.500)
   */
  calcularRequisitosObligatorios(params = {}) {
    const po = parseFloat(params.presupuestoOficial) || 0;
    const valorContrato = parseFloat(params.valorContrato) || po;
    const plazoMeses = parseInt(params.plazoMeses, 10) || 6;
    const anticipoPct = parseFloat(params.anticipoPorcentaje) || 0;
    const tipoProceso = params.tipoProceso || 'OBRA_PUBLICA';
    const smmlv = parseFloat(params.smmlv) || this.SMMLV_VIGENTE;
    const fechaBase = params.fechaBase ? new Date(params.fechaBase) : new Date();

    const isObra = tipoProceso === 'OBRA_PUBLICA';

    // 1. Seriedad de la Oferta (10% PO, 90 días calendario)
    const valSeriedad = Math.round(po * 0.10);
    const fechaVenceSeriedad = new Date(fechaBase);
    fechaVenceSeriedad.setDate(fechaVenceSeriedad.getDate() + 90);

    // 2. Cumplimiento (Obra: 20%, Bienes/Servicios: 10%)
    const pctCumplimiento = isObra ? 20.0 : 10.0;
    const valCumplimiento = Math.round(valorContrato * (pctCumplimiento / 100));
    const fechaVenceCumplimiento = new Date(fechaBase);
    fechaVenceCumplimiento.setMonth(fechaVenceCumplimiento.getMonth() + plazoMeses + 6);

    // 3. Buen Manejo del Anticipo (100% del monto de anticipo)
    const valMontoAnticipo = Math.round(valorContrato * (anticipoPct / 100));
    const valAnticipo = valMontoAnticipo; // 100% del anticipo
    const fechaVenceAnticipo = new Date(fechaBase);
    fechaVenceAnticipo.setMonth(fechaVenceAnticipo.getMonth() + plazoMeses + 4);

    // 4. Pago de Salarios y Prestaciones (5% a 10% del contrato, plazo + 3 años laborales)
    const pctSalarios = isObra ? 10.0 : 5.0;
    const valSalarios = Math.round(valorContrato * (pctSalarios / 100));
    const fechaVenceSalarios = new Date(fechaBase);
    fechaVenceSalarios.setMonth(fechaVenceSalarios.getMonth() + plazoMeses + 36);

    // 5. Estabilidad de la Obra / Calidad del Servicio (Obra: 5 años = 60 meses, Servicios: 12 meses)
    const pctEstabilidad = isObra ? 10.0 : 10.0;
    const valEstabilidad = Math.round(valorContrato * (pctEstabilidad / 100));
    const mesesEstabilidad = isObra ? 60 : 12;
    const fechaVenceEstabilidad = new Date(fechaBase);
    fechaVenceEstabilidad.setMonth(fechaVenceEstabilidad.getMonth() + plazoMeses + mesesEstabilidad);

    // 6. RCE (5% del contrato con piso reglamentario de 200 a 400 SMMLV)
    const pisoRceSmmlv = valorContrato > 1500000000 ? 400 : 200;
    const minRceCop = pisoRceSmmlv * smmlv;
    const calcRce = valorContrato * 0.05;
    const valRce = Math.round(Math.max(minRceCop, calcRce));
    const fechaVenceRce = new Date(fechaBase);
    fechaVenceRce.setMonth(fechaVenceRce.getMonth() + plazoMeses);

    return {
      parametros_entrada: {
        presupuesto_oficial: po,
        valor_contrato: valorContrato,
        plazo_meses: plazoMeses,
        anticipo_porcentaje: anticipoPct,
        monto_anticipo_cop: valMontoAnticipo,
        tipo_proceso: tipoProceso,
        fecha_base: fechaBase.toISOString().slice(0, 10),
        smmlv_aplicable: smmlv
      },
      amparos_requeridos: [
        {
          codigo: 'SERIEDAD_OFERTA',
          nombre: this.CATALOGO_AMPAROS.SERIEDAD_OFERTA.nombre,
          etapa: 'PRECONTRACTUAL',
          porcentaje_exigido: 10.0,
          valor_minimo_cop: valSeriedad,
          fecha_inicio_requerida: fechaBase.toISOString().slice(0, 10),
          fecha_fin_requerida: fechaVenceSeriedad.toISOString().slice(0, 10),
          dias_minimos: 90,
          fundamento_legal: this.CATALOGO_AMPAROS.SERIEDAD_OFERTA.fundamentoLegal,
          obligatorio: true
        },
        {
          codigo: 'CUMPLIMIENTO_CONTRATO',
          nombre: this.CATALOGO_AMPAROS.CUMPLIMIENTO_CONTRATO.nombre,
          etapa: 'CONTRACTUAL',
          porcentaje_exigido: pctCumplimiento,
          valor_minimo_cop: valCumplimiento,
          fecha_inicio_requerida: fechaBase.toISOString().slice(0, 10),
          fecha_fin_requerida: fechaVenceCumplimiento.toISOString().slice(0, 10),
          vigencia_regla: `Plazo (${plazoMeses} meses) + 6 meses liquidación`,
          fundamento_legal: this.CATALOGO_AMPAROS.CUMPLIMIENTO_CONTRATO.fundamentoLegal,
          obligatorio: true
        },
        {
          codigo: 'BUEN_MANEJO_ANTICIPO',
          nombre: this.CATALOGO_AMPAROS.BUEN_MANEJO_ANTICIPO.nombre,
          etapa: 'CONTRACTUAL',
          porcentaje_exigido: 100.0,
          valor_minimo_cop: valAnticipo,
          fecha_inicio_requerida: fechaBase.toISOString().slice(0, 10),
          fecha_fin_requerida: fechaVenceAnticipo.toISOString().slice(0, 10),
          vigencia_regla: `Plazo (${plazoMeses} meses) + 4 meses liquidación`,
          fundamento_legal: this.CATALOGO_AMPAROS.BUEN_MANEJO_ANTICIPO.fundamentoLegal,
          obligatorio: anticipoPct > 0
        },
        {
          codigo: 'PAGO_SALARIOS_PRESTACIONES',
          nombre: this.CATALOGO_AMPAROS.PAGO_SALARIOS_PRESTACIONES.nombre,
          etapa: 'CONTRACTUAL',
          porcentaje_exigido: pctSalarios,
          valor_minimo_cop: valSalarios,
          fecha_inicio_requerida: fechaBase.toISOString().slice(0, 10),
          fecha_fin_requerida: fechaVenceSalarios.toISOString().slice(0, 10),
          vigencia_regla: `Plazo (${plazoMeses} meses) + 3 años laborales (Art. 488 CST)`,
          fundamento_legal: this.CATALOGO_AMPAROS.PAGO_SALARIOS_PRESTACIONES.fundamentoLegal,
          obligatorio: true
        },
        {
          codigo: 'ESTABILIDAD_CALIDAD_OBRA',
          nombre: this.CATALOGO_AMPAROS.ESTABILIDAD_CALIDAD_OBRA.nombre,
          etapa: 'POSTCONTRACTUAL',
          porcentaje_exigido: pctEstabilidad,
          valor_minimo_cop: valEstabilidad,
          fecha_inicio_requerida: fechaBase.toISOString().slice(0, 10),
          fecha_fin_requerida: fechaVenceEstabilidad.toISOString().slice(0, 10),
          vigencia_regla: isObra ? '5 años a partir del recibo final (Art. 2060 C.C.)' : '12 meses tras recibo final',
          fundamento_legal: this.CATALOGO_AMPAROS.ESTABILIDAD_CALIDAD_OBRA.fundamentoLegal,
          obligatorio: true
        },
        {
          codigo: 'RESPONSABILIDAD_CIVIL_EXTRACONTRACTUAL',
          nombre: this.CATALOGO_AMPAROS.RESPONSABILIDAD_CIVIL_EXTRACONTRACTUAL.nombre,
          etapa: 'CONTRACTUAL',
          porcentaje_exigido: 5.0,
          valor_minimo_cop: valRce,
          fecha_inicio_requerida: fechaBase.toISOString().slice(0, 10),
          fecha_fin_requerida: fechaVenceRce.toISOString().slice(0, 10),
          vigencia_regla: `Todo el plazo de ejecución (${plazoMeses} meses)`,
          deducible_maximo: this.CATALOGO_AMPAROS.RESPONSABILIDAD_CIVIL_EXTRACONTRACTUAL.deducibleMaximo,
          fundamento_legal: this.CATALOGO_AMPAROS.RESPONSABILIDAD_CIVIL_EXTRACONTRACTUAL.fundamentoLegal,
          obligatorio: true
        }
      ]
    };
  }

  /**
   * Evalúa y audita las pólizas presentadas frente a los requisitos legales de CCE
   * 
   * @param {Object} requisitosConsolidados - Objeto retornado por calcularRequisitosObligatorios
   * @param {Array<Object>} polizasPresentadas - Lista de pólizas presentadas por el proponente
   * @param {Object} metadatosProponente - Información del proponente (individual o consorcio)
   */
  evaluarSuficienciaGarantias(requisitosConsolidados, polizasPresentadas = [], metadatosProponente = {}) {
    const requeridos = requisitosConsolidados.amparos_requeridos || [];
    let conformesCount = 0;
    let deficitCount = 0;
    let obligatoriosEvaluados = 0;

    const evaluacionItems = requeridos.map(req => {
      if (!req.obligatorio) {
        return {
          codigo: req.codigo,
          nombre: req.nombre,
          etapa: req.etapa,
          obligatorio: false,
          estado: 'NO_APLICA',
          cumple_valor: true,
          cumple_vigencia: true,
          mensaje_dictamen: 'Amparo no exigible (No se contempló anticipo financiero en el pliego)'
        };
      }

      obligatoriosEvaluados++;

      // Buscar póliza o amparo correspondiente entre las presentadas
      const presentadas = polizasPresentadas.filter(p => 
        p.tipo_amparo === req.codigo || p.codigo === req.codigo || (p.nombre && p.nombre.toLowerCase().includes(req.codigo.toLowerCase().split('_')[0]))
      );

      if (presentadas.length === 0) {
        deficitCount++;
        return {
          codigo: req.codigo,
          nombre: req.nombre,
          etapa: req.etapa,
          obligatorio: true,
          valor_minimo_cop: req.valor_minimo_cop,
          fecha_fin_requerida: req.fecha_fin_requerida,
          valor_presentado_cop: 0,
          fecha_fin_presentada: null,
          cumple_valor: false,
          cumple_vigencia: false,
          estado: 'NO_PRESENTADO',
          deficit_cop: req.valor_minimo_cop,
          deficit_dias: 0,
          mensaje_dictamen: `🚨 AMPARO NO PRESENTADO: El pliego exige amparar $ ${req.valor_minimo_cop.toLocaleString('es-CO')} COP.`
        };
      }

      // Consolidar valor asegurado y vigencia máxima entre los amparos presentados
      const valorTotalPresentado = presentadas.reduce((acc, p) => acc + (parseFloat(p.valor_asegurado) || 0), 0);
      const fechasFin = presentadas.map(p => p.fecha_fin ? new Date(p.fecha_fin) : new Date(0));
      const maxFechaFin = new Date(Math.max(...fechasFin));
      const targetFechaFin = new Date(req.fecha_fin_requerida);

      const cumpleValor = valorTotalPresentado >= req.valor_minimo_cop;
      const deficitValor = cumpleValor ? 0 : req.valor_minimo_cop - valorTotalPresentado;

      // Diferencia en días de vigencia (positivo = cumple, negativo = falta vigencia)
      const diffTime = maxFechaFin.getTime() - targetFechaFin.getTime();
      const diffDias = Math.round(diffTime / (1000 * 3600 * 24));
      const cumpleVigencia = diffDias >= 0;

      let estado = 'CONFORME';
      let mensaje = '✅ Póliza y amparo conformes a los pliegos tipo y Decreto 1082/2015.';

      if (!cumpleValor && !cumpleVigencia) {
        estado = 'DEFICIT_VALOR_Y_VIGENCIA';
        deficitCount++;
        mensaje = `⚠️ DÉFICIT DOBLE: Falta valor por $ ${deficitValor.toLocaleString('es-CO')} y vigencia por ${Math.abs(diffDias)} días.`;
      } else if (!cumpleValor) {
        estado = 'DEFICIT_VALOR';
        deficitCount++;
        mensaje = `⚠️ DÉFICIT EN VALOR: Valor asegurado ($ ${valorTotalPresentado.toLocaleString('es-CO')}) inferior al mínimo exigido ($ ${req.valor_minimo_cop.toLocaleString('es-CO')}). Faltan $ ${deficitValor.toLocaleString('es-CO')}.`;
      } else if (!cumpleVigencia) {
        estado = 'DEFICIT_VIGENCIA';
        deficitCount++;
        mensaje = `⚠️ DÉFICIT EN VIGENCIA: Vence el ${maxFechaFin.toISOString().slice(0, 10)}, se requiere hasta el ${req.fecha_fin_requerida} (Faltan ${Math.abs(diffDias)} días).`;
      } else {
        conformesCount++;
      }

      return {
        codigo: req.codigo,
        nombre: req.nombre,
        etapa: req.etapa,
        obligatorio: true,
        porcentaje_exigido: req.porcentaje_exigido,
        valor_minimo_cop: req.valor_minimo_cop,
        valor_presentado_cop: valorTotalPresentado,
        deficit_cop: deficitValor,
        porcentaje_cubierto: Number(((valorTotalPresentado / req.valor_minimo_cop) * 100).toFixed(1)),
        fecha_inicio_requerida: req.fecha_inicio_requerida,
        fecha_fin_requerida: req.fecha_fin_requerida,
        fecha_fin_presentada: maxFechaFin.toISOString().slice(0, 10),
        dias_margen_vigencia: diffDias,
        cumple_valor: cumpleValor,
        cumple_vigencia: cumpleVigencia,
        estado: estado,
        aseguradora: presentadas[0].aseguradora || 'Aseguradora Vigilada',
        numero_poliza: presentadas[0].numero_poliza || 'N/A',
        fundamento_legal: req.fundamento_legal,
        mensaje_dictamen: mensaje
      };
    });

    const porcentajeGlobal = obligatoriosEvaluados > 0 
      ? Number(((conformesCount / obligatoriosEvaluados) * 100).toFixed(1))
      : 100;

    let veredictoGlobal = 'APROBADO_CONFORME';
    let conceptoJuridico = '';

    if (deficitCount === 0) {
      veredictoGlobal = 'APROBADO_CONFORME';
      conceptoJuridico = 'La garantía analizada cumple a cabalidad con la totalidad de los amparos, suficiencias porcentuales y vigencias temporales exigidas por el Decreto 1082 de 2015 y los Pliegos Tipo de Colombia Compra Eficiente. Se emite concepto FAVORABLE DE APROBACIÓN.';
    } else {
      const tieneSeriedadDeficit = evaluacionItems.some(it => it.codigo === 'SERIEDAD_OFERTA' && it.estado !== 'CONFORME');
      if (tieneSeriedadDeficit) {
        veredictoGlobal = 'OBSERVADO_DEFICIT_SUBSANABLE';
        conceptoJuridico = 'Se detectaron inconsistencias en la Garantía de Seriedad de la Oferta. Conforme a la reiterada jurisprudencia del Consejo de Estado (Sentencia 2014-00023) y la Circular de CCE, la ausencia o déficit en el texto formal de la póliza de seriedad es SUBSANABLE dentro del término de traslado, siempre que la cobertura haya sido contratada antes del cierre de la convocatoria.';
      } else {
        veredictoGlobal = 'OBSERVADO_REQUERIDO_AJUSTE';
        conceptoJuridico = `Se identificaron ${deficitCount} amparo(s) con déficit en valor asegurado o vigencia temporal. Es imperativo solicitar al contratista o proponente el anexo modificatorio / certificado de endoso emitido por la compañía aseguradora antes del perfeccionamiento o suscripción del acta de inicio.`;
      }
    }

    return {
      parametros: requisitosConsolidados.parametros_entrada,
      resumen_auditoria: {
        total_amparos_evaluados: obligatoriosEvaluados,
        amparos_conformes: conformesCount,
        amparos_con_deficit: deficitCount,
        porcentaje_cumplimiento: porcentajeGlobal,
        veredicto_global: veredictoGlobal,
        concepto_juridico: conceptoJuridico
      },
      amparos: evaluacionItems
    };
  }

  /**
   * Genera el Dictamen Técnico Oficial de Verificación de Garantías y Pólizas en PDF
   * 
   * @param {Object} evaluacionConsolidada - Resultado de evaluarSuficienciaGarantias
   * @param {Object} procesoInfo - Datos del proceso (referencia, entidad, proponente, etc.)
   * @returns {Promise<Buffer>}
   */
  async generarDictamenGarantiasPdf(evaluacionConsolidada, procesoInfo = {}) {
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

        const params = evaluacionConsolidada.parametros || {};
        const resAuditoria = evaluacionConsolidada.resumen_auditoria || {};
        const amparos = evaluacionConsolidada.amparos || [];

        // 1. ENCABEZADO INSTITUCIONAL RADAR SECOP & DECRETO 1082/2015
        doc.fontSize(7.5).fillColor('#64748b').text('REPÚBLICA DE COLOMBIA • SISTEMA INTEGRADO DE CONTRATACIÓN ESTATAL (SECOP II)', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text('DICTAMEN TÉCNICO-JURÍDICO DE VERIFICACIÓN DE GARANTÍAS Y PÓLIZAS CCE', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(7.5).fillColor('#475569').font('Helvetica').text('Decreto 1082 de 2015 • Ley 80 de 1993 • Ley 1150 de 2007 • Pliegos Tipo ANCP-CCE', { align: 'center' });
        doc.moveDown(0.6);

        // 2. BLOQUE DE IDENTIFICACIÓN DEL PROCESO Y CONTRATISTA
        const topY = doc.y;
        doc.rect(36, topY, 540, 52).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(7);

        doc.font('Helvetica-Bold').text('ENTIDAD ESTATAL:', 44, topY + 6).font('Helvetica').text(procesoInfo.entidad || 'ENTIDAD ESTATAL CONTRATANTE', 145, topY + 6);
        doc.font('Helvetica-Bold').text('NÚMERO DE PROCESO:', 44, topY + 17).font('Helvetica').text(procesoInfo.referencia || 'LP-001-2026', 145, topY + 17);
        doc.font('Helvetica-Bold').text('PROPONENTE / TOMADOR:', 44, topY + 28).font('Helvetica').text(procesoInfo.proponente || 'PROPONENTE O CONTRATISTA', 145, topY + 28);
        doc.font('Helvetica-Bold').text('FECHA DE VERIFICACIÓN:', 44, topY + 39).font('Helvetica').text(fechaHoy, 145, topY + 39);

        doc.font('Helvetica-Bold').text('PRESUPUESTO / CONTRATO:', 350, topY + 6).font('Helvetica-Bold').fillColor('#1e3a8a').text(fCOP(params.valor_contrato || params.presupuesto_oficial), 475, topY + 6);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text('PLAZO DE EJECUCIÓN:', 350, topY + 17).font('Helvetica').text(`${params.plazo_meses || 6} Meses`, 475, topY + 17);
        doc.font('Helvetica-Bold').text('ANTICIPO PACTADO:', 350, topY + 28).font('Helvetica').text(`${params.anticipo_porcentaje || 0}% (${fCOP(params.monto_anticipo_cop)})`, 475, topY + 28);
        doc.font('Helvetica-Bold').text('SMMLV APLICABLE:', 350, topY + 39).font('Helvetica').text(fCOP(params.smmlv_aplicable), 475, topY + 39);

        doc.y = topY + 60;

        // 3. TARJETA DE VEREDICTO GLOBAL DE AUDITORÍA
        const heroY = doc.y;
        const isAprobado = resAuditoria.veredicto_global === 'APROBADO_CONFORME';
        const cardBg = isAprobado ? '#f0fdf4' : '#fffbeb';
        const cardBorder = isAprobado ? '#86efac' : '#fde047';
        const titleColor = isAprobado ? '#166534' : '#854d0e';

        doc.rect(36, heroY, 540, 48).fillAndStroke(cardBg, cardBorder);
        doc.fillColor(titleColor).fontSize(7.5).font('Helvetica-Bold').text('VEREDICTO GLOBAL DE AUDITORÍA DE PÓLIZAS:', 46, heroY + 6);
        doc.fillColor(isAprobado ? '#15803d' : '#b45309').fontSize(13).font('Helvetica-Bold').text(
          isAprobado ? '✅ APROBADO CONFORME - GARANTÍAS IDÓNEAS' : `⚠️ OBSERVADO: ${resAuditoria.amparos_con_deficit} AMPARO(S) CON DÉFICIT`,
          46, heroY + 18
        );
        doc.fillColor('#475569').fontSize(7).font('Helvetica').text(
          `Suficiencia reglamentaria: ${resAuditoria.porcentaje_cumplimiento}% • Cumplen: ${resAuditoria.amparos_conformes} de ${resAuditoria.total_amparos_evaluados} amparos obligatorios`,
          46, heroY + 34
        );

        doc.y = heroY + 56;

        // 4. TABLA COMPARATIVA DE SUFICIENCIA DE LOS 6 AMPAROS
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('1. MATRIZ DETALLADA DE VERIFICACIÓN DE AMPAROS (DECRETO 1082/2015):');
        doc.moveDown(0.3);

        const tabY = doc.y;
        doc.rect(36, tabY, 540, 14).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(6.5).font('Helvetica-Bold');
        doc.text('AMPARO LEGAL', 42, tabY + 4, { width: 145 });
        doc.text('VALOR EXIGIDO', 190, tabY + 4, { width: 85, align: 'right' });
        doc.text('VALOR PRESENTADO', 280, tabY + 4, { width: 90, align: 'right' });
        doc.text('VENCE EXIGIDO', 375, tabY + 4, { width: 65, align: 'center' });
        doc.text('VENCE POLIZA', 445, tabY + 4, { width: 65, align: 'center' });
        doc.text('ESTADO', 515, tabY + 4, { width: 55, align: 'right' });

        let currY = tabY + 14;
        amparos.forEach((a, idx) => {
          doc.rect(36, currY, 540, 16).fillAndStroke(idx % 2 === 0 ? '#f8fafc' : '#ffffff', '#e2e8f0');

          doc.fillColor('#0f172a').fontSize(6.5).font('Helvetica-Bold').text(a.nombre, 42, currY + 3, { width: 145 });
          doc.font('Helvetica').text(fCOP(a.valor_minimo_cop), 190, currY + 3, { width: 85, align: 'right' });
          doc.text(fCOP(a.valor_presentado_cop), 280, currY + 3, { width: 90, align: 'right' });
          doc.text(a.fecha_fin_requerida || '--', 375, currY + 3, { width: 65, align: 'center' });
          doc.text(a.fecha_fin_presentada || '--', 445, currY + 3, { width: 65, align: 'center' });

          let stColor = '#15803d';
          let stText = 'CONFORME';
          if (a.estado === 'DEFICIT_VALOR') { stColor = '#b45309'; stText = 'DEF. VALOR'; }
          else if (a.estado === 'DEFICIT_VIGENCIA') { stColor = '#b45309'; stText = 'DEF. PLAZO'; }
          else if (a.estado === 'NO_PRESENTADO') { stColor = '#b91c1c'; stText = 'FALTANTE'; }
          else if (a.estado === 'NO_APLICA') { stColor = '#64748b'; stText = 'N/A'; }

          doc.fillColor(stColor).font('Helvetica-Bold').text(stText, 515, currY + 3, { width: 55, align: 'right' });
          currY += 16;
        });

        doc.y = currY + 10;

        // 5. DICTAMEN TÉCNICO-JURÍDICO Y REGLAS DE SUBSANABILIDAD
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('2. CONCEPTO JURÍDICO Y TRATAMIENTO DE SUBSANABILIDAD:');
        doc.moveDown(0.3);

        const concY = doc.y;
        doc.rect(36, concY, 540, 68).fillAndStroke('#f1f5f9', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text('CRITERIO TÉCNICO Y FUNDAMENTO REGLAMENTARIO:', 44, concY + 6);
        doc.fillColor('#334155').fontSize(6.8).font('Helvetica').text(
          resAuditoria.concepto_juridico || 'Se verificó la suficiencia y concordancia de las coberturas con los pliegos tipo.',
          44, concY + 18, { width: 524, align: 'justify' }
        );

        doc.fillColor('#1e40af').fontSize(6.8).font('Helvetica-Bold').text(
          'Recomendación Operativa:', 44, concY + 46
        );
        doc.fillColor('#334155').fontSize(6.8).font('Helvetica').text(
          'Verificar que el certificado de modificación / endoso emitido por la compañía de seguros identifique con precisión el número de proceso, amparo subsanado y se anexe el recibo de pago de prima correspondiente.',
          44, concY + 54, { width: 524, align: 'justify' }
        );

        // 6. FIRMA Y PIE DE PÁGINA
        const footY = doc.page.height - 40;
        doc.fontSize(6.5).font('Helvetica').fillColor('#94a3b8')
          .text(`Dictamen emitido por Radar SECOP • Módulo de Garantías Decreto 1082/2015 • Verificación de Idoneidad: ${Buffer.from(String(params.presupuesto_oficial) + fechaHoy).toString('hex').substring(0, 24)}`, 36, footY, { align: 'center', width: 540 });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = new GarantiasEngine();
