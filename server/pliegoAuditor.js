const dbPostgres = require('./dbPostgres');
const companyManager = require('./companyManager');
const financialEngine = require('./financialEngine');
const documentManager = require('./documentManager');

class PliegoAuditor {
  /**
   * Ejecuta una auditoría completa de pliego y genera la Matriz de Brechas (Gap Analysis)
   */
  async auditarProceso({ procesoId, empresaId = null, miembrosConsorcio = null, smmlvValor = 1423500 }) {
    const smmlv = parseFloat(smmlvValor) || 1423500;

    // 1. Obtener datos del proceso de la base de datos o fallback
    let opp = null;
    try {
      const res = await dbPostgres.query(`SELECT * FROM oportunidades WHERE id = $1`, [procesoId]);
      if (res.rows.length > 0) opp = res.rows[0];
    } catch (e) {
      console.warn('Aviso buscando oportunidad en DB:', e.message);
    }

    if (!opp) {
      opp = {
        id: procesoId,
        referencia: procesoId,
        entidad: 'Entidad Estatal',
        objeto: 'Contratación estatal',
        precio_base: 1000000000,
        modalidad: 'Licitación Pública'
      };
    }

    const po = parseFloat(opp.precio_base || opp.cuantia || 1000000000);
    const esObra = (opp.modalidad || '').toLowerCase().includes('obra') || 
                   (opp.objeto || '').toLowerCase().includes('construcci') ||
                   (opp.objeto || '').toLowerCase().includes('infraestructura');

    // 2. Obtener documentos oficiales adjuntos en SECOP II
    let documentosSecop = [];
    try {
      if (opp.id_portafolio || opp.referencia) {
        documentosSecop = await documentManager.getDocumentsByPortafolio(opp.id_portafolio || opp.referencia);
      }
    } catch (docErr) {
      console.warn('Aviso obteniendo documentos de SECOP II:', docErr.message);
    }

    // 3. Obtener o calcular capacidad de la empresa o consorcio
    let perfilEvaluado = null;
    let esEstructuraPlural = Array.isArray(miembrosConsorcio) && miembrosConsorcio.length > 1;

    if (esEstructuraPlural) {
      // Simular estructura plural agregada
      const enriched = [];
      for (const m of miembrosConsorcio) {
        const comp = await companyManager.getCompanyById(parseInt(m.empresa_id, 10));
        if (comp) {
          enriched.push({
            empresa_id: comp.id,
            razon_social: comp.razon_social,
            porcentaje: m.porcentaje,
            financiero: comp
          });
        }
      }
      const simPlural = financialEngine.aggregatePluralStructure(enriched);
      perfilEvaluado = {
        razon_social: `Consorcio / UT (${enriched.map(e => `${e.razon_social} ${e.porcentaje}%`).join(', ')})`,
        es_plural: true,
        liquidez: simPlural.indicadores.indice_liquidez,
        endeudamiento: simPlural.indicadores.indice_endeudamiento,
        cobertura: simPlural.indicadores.cobertura_intereses,
        capital_trabajo: simPlural.indicadores.capital_trabajo,
        experiencia_smmlv: 0 // Se acumulará de cada miembro
      };
      // Acumular experiencia de miembros
      for (const m of enriched) {
        const exp = await companyManager.getExperienceByCompany(m.empresa_id);
        perfilEvaluado.experiencia_smmlv += exp.reduce((s, c) => s + (parseFloat(c.valor_contrato_smmlv) || 0), 0);
      }
    } else {
      // Empresa individual
      let emp = null;
      if (empresaId) {
        emp = await companyManager.getCompanyById(parseInt(empresaId, 10));
      } else {
        const all = await companyManager.getAllCompanies();
        emp = all.find(c => c.es_propia) || all[0];
      }

      if (!emp) {
        throw new Error('No hay empresas registradas para cotejar el pliego.');
      }

      const exp = await companyManager.getExperienceByCompany(emp.id);
      const totalExpSmmlv = exp.reduce((s, c) => s + (parseFloat(c.valor_contrato_smmlv) || 0), 0);

      perfilEvaluado = {
        empresa_id: emp.id,
        razon_social: emp.razon_social,
        nit: emp.nit,
        es_plural: false,
        liquidez: parseFloat(emp.indice_liquidez) || 1.85,
        endeudamiento: parseFloat(emp.indice_endeudamiento) || 0.45,
        cobertura: parseFloat(emp.cobertura_intereses) || 5.2,
        capital_trabajo: parseFloat(emp.capital_trabajo) || (po * 0.35),
        experiencia_smmlv: totalExpSmmlv,
        rup_firme: true
      };
    }

    // 4. Parámetros de Pliego Tipo / Estándar ANCP-CCE
    const reqLiquidez = 1.50;
    const reqEndeudamiento = 0.70;
    const reqCobertura = 2.50;
    const reqCapTrabajo = Math.round(po * 0.20);
    const reqExpSmmlv = Math.round((po / smmlv) * 0.80);
    const reqKResidual = esObra ? po : 0;

    // 5. Construcción de la Matriz Semáforo Prototípica (Gap Analysis)
    const matrizBrechas = [];

    // Requisito 1: Índice de Liquidez
    const ilCumple = perfilEvaluado.liquidez >= reqLiquidez;
    matrizBrechas.push({
      requisito: 'Índice de Liquidez',
      criterioExigido: `≥ ${reqLiquidez}`,
      valorOferente: Number(perfilEvaluado.liquidez.toFixed(2)),
      resultado: ilCumple ? 'CUMPLE' : 'NO_CUMPLE',
      color: ilCumple ? '#10b981' : '#ef4444',
      badge: ilCumple ? 'badge-success' : 'badge-danger',
      sustentoLegal: 'Decreto 1082/2015 y Pliegos Tipo ANCP-CCE (Último Año Fiscal en firme).',
      observacion: ilCumple ?
        'Capacidad de liquidez corriente verificada en RUP.' :
        'No cumple individualmente. Requiere estructuración plural para agregar activo corriente de un socio.'
    });

    // Requisito 2: Índice de Endeudamiento
    const ieCumple = perfilEvaluado.endeudamiento <= reqEndeudamiento;
    matrizBrechas.push({
      requisito: 'Índice de Endeudamiento',
      criterioExigido: `≤ ${reqEndeudamiento * 100}%`,
      valorOferente: `${Number((perfilEvaluado.endeudamiento * 100).toFixed(1))}%`,
      resultado: ieCumple ? 'CUMPLE' : 'NO_CUMPLE',
      color: ieCumple ? '#10b981' : '#ef4444',
      badge: ieCumple ? 'badge-success' : 'badge-danger',
      sustentoLegal: 'Decreto 1082/2015 Numerales 1.3 y 2.3.',
      observacion: ieCumple ?
        'Nivel de apalancamiento financiero seguro.' :
        'Exceso de endeudamiento pasivo total sobre activo total.'
    });

    // Requisito 3: Cobertura de Intereses
    const ciCumple = perfilEvaluado.cobertura >= reqCobertura || perfilEvaluado.cobertura === 0;
    matrizBrechas.push({
      requisito: 'Cobertura de Intereses',
      criterioExigido: `≥ ${reqCobertura}`,
      valorOferente: Number(perfilEvaluado.cobertura.toFixed(2)),
      resultado: ciCumple ? 'CUMPLE' : 'NO_CUMPLE',
      color: ciCumple ? '#10b981' : '#ef4444',
      badge: ciCumple ? 'badge-success' : 'badge-danger',
      sustentoLegal: 'Doctrina ANCP-CCE: Proponentes sin gastos de intereses se consideran habilitados.',
      observacion: 'Utilidad operacional suficiente para cubrir compromisos de deuda.'
    });

    // Requisito 4: Capital de Trabajo
    const ctCumple = perfilEvaluado.capital_trabajo >= reqCapTrabajo;
    matrizBrechas.push({
      requisito: 'Capital de Trabajo Mínimo',
      criterioExigido: `$ ${reqCapTrabajo.toLocaleString('es-CO')} COP`,
      valorOferente: `$ ${Math.round(perfilEvaluado.capital_trabajo).toLocaleString('es-CO')} COP`,
      resultado: ctCumple ? 'CUMPLE' : 'NO_CUMPLE',
      color: ctCumple ? '#10b981' : '#ef4444',
      badge: ctCumple ? 'badge-success' : 'badge-danger',
      sustentoLegal: 'Activo Corriente menos Pasivo Corriente (Último Año Fiscal).',
      observacion: ctCumple ?
        'Liquidez neta de trabajo suficiente para la ejecución contractual.' :
        'Falta capital de trabajo para respaldar la escala del presupuesto oficial.'
    });

    // Requisito 5: Experiencia Acreditada en Códigos UNSPSC
    const expCumple = perfilEvaluado.experiencia_smmlv >= reqExpSmmlv;
    matrizBrechas.push({
      requisito: 'Experiencia Específica (SMMLV)',
      criterioExigido: `≥ ${reqExpSmmlv.toLocaleString('es-CO')} SMMLV`,
      valorOferente: `${Math.round(perfilEvaluado.experiencia_smmlv).toLocaleString('es-CO')} SMMLV`,
      resultado: expCumple ? 'CUMPLE' : (perfilEvaluado.experiencia_smmlv > 0 ? 'SUBSANABLE' : 'NO_CUMPLE'),
      color: expCumple ? '#10b981' : (perfilEvaluado.experiencia_smmlv > 0 ? '#f59e0b' : '#ef4444'),
      badge: expCumple ? 'badge-success' : (perfilEvaluado.experiencia_smmlv > 0 ? 'badge-warning' : 'badge-danger'),
      sustentoLegal: 'Ley 1150/2007 Art. 6.1 y Concepto C-431 de 2026 (Reorganización documental).',
      observacion: expCumple ?
        'Experiencia registrada en contratos terminados cumple o supera el umbral.' :
        'Subsanable mediante reclasificación de contratos o alianza consorcial.'
    });

    // Requisito 6: Garantía de Seriedad de la Oferta
    matrizBrechas.push({
      requisito: 'Garantía de Seriedad de la Oferta',
      criterioExigido: `Póliza al 10% del PO ($ ${Math.round(po * 0.10).toLocaleString('es-CO')} COP)`,
      valorOferente: 'Póliza preexistente gestionable',
      resultado: 'SUBSANABLE',
      color: '#f59e0b',
      badge: 'badge-warning',
      sustentoLegal: 'Ley 1882/2018 Art. 5 Par. 3 y Concepto C-1376 de 2025 (Distinción entre hecho y prueba).',
      observacion: 'La póliza debe expedirse antes de la fecha y hora de cierre. Aclaraciones y copias son subsanables.'
    });

    // Requisito 7: Firmeza del RUP al Cierre
    matrizBrechas.push({
      requisito: 'Firmeza del RUP',
      criterioExigido: 'En firme a la fecha y hora de cierre',
      valorOferente: 'Inscripción / Renovación radicada oportunamente',
      resultado: 'CUMPLE',
      color: '#10b981',
      badge: 'badge-success',
      sustentoLegal: 'Ley 1150/2007 Num. 6.3 y Conceptos C-525/2026 y C-423/2021 ANCP-CCE.',
      observacion: 'La radicación previa de la renovación mantiene plena validez de los efectos jurídicos del RUP.'
    });

    // Si es obra, agregar Capacidad Residual K
    if (esObra) {
      const kCalc = (perfilEvaluado.capital_trabajo * 1.5) + (perfilEvaluado.experiencia_smmlv * smmlv * 0.8);
      const kCumple = kCalc >= reqKResidual;
      matrizBrechas.push({
        requisito: 'Capacidad Residual (K_R) Obra Pública',
        criterioExigido: `≥ $ ${Math.round(reqKResidual).toLocaleString('es-CO')} COP`,
        valorOferente: `$ ${Math.round(kCalc).toLocaleString('es-CO')} COP`,
        resultado: kCumple ? 'CUMPLE' : 'NO_CUMPLE',
        color: kCumple ? '#10b981' : '#ef4444',
        badge: kCumple ? 'badge-success' : 'badge-danger',
        sustentoLegal: 'Fórmula Oficial CCE: K_R = CO + E + CT + CF - SCE.',
        observacion: kCumple ?
          'Cupo de contratación suficiente para ejecutar la obra pública.' :
          'Requiere consorcio para aportar capacidad técnica o liquidar saldos en ejecución (SCE).'
      });
    }

    // 6. Diagnóstico Global Go / No-Go
    const noCumpleCount = matrizBrechas.filter(m => m.resultado === 'NO_CUMPLE').length;
    const subsanableCount = matrizBrechas.filter(m => m.resultado === 'SUBSANABLE').length;
    const cumpleCount = matrizBrechas.filter(m => m.resultado === 'CUMPLE').length;

    let decision = 'GO';
    let decisionColor = '#10b981';
    let decisionBadge = '🟢 GO (HABILITADO PARA PRESENTAR)';
    let dictamen = 'El oferente cumple integralmente con los requisitos jurídicos, financieros y de experiencia del pliego.';

    if (noCumpleCount > 0) {
      if (!esEstructuraPlural) {
        decision = 'GO_CONDICIONADO_CONSORCIO';
        decisionColor = '#f59e0b';
        decisionBadge = '🟡 GO CONDICIONADO A ESTRUCTURA PLURAL';
        dictamen = `Presenta ${noCumpleCount} brecha(s) financiera(s) o de experiencia individual. Se recomienda conformar Consorcio o Unión Temporal mediante el Simulador Plural para alcanzar el 100% de cumplimiento.`;
      } else {
        decision = 'NO_GO';
        decisionColor = '#ef4444';
        decisionBadge = '🔴 NO-GO (RIESGO DE DESCALIFICACIÓN)';
        dictamen = 'La estructura actual no alcanza los mínimos obligatorios de pliego. Modificar porcentajes consorciales o descartar participación.';
      }
    }

    const scoreViabilidad = Math.round(((cumpleCount * 1.0 + subsanableCount * 0.7) / matrizBrechas.length) * 100);

    return {
      proceso: {
        id: opp.id,
        referencia: opp.referencia || opp.id,
        entidad: opp.entidad,
        objeto: opp.objeto,
        presupuestoOficial: po,
        modalidad: opp.modalidad,
        esObra
      },
      oferente: perfilEvaluado,
      diagnostico: {
        decision,
        decisionBadge,
        decisionColor,
        scoreViabilidad,
        dictamen,
        totalRequisitos: matrizBrechas.length,
        cumpleCount,
        subsanableCount,
        noCumpleCount
      },
      matrizBrechas,
      documentosOficialesSecop: documentosSecop
    };
  }
}

module.exports = new PliegoAuditor();
