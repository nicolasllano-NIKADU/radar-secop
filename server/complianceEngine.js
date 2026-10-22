const crypto = require('crypto');
const db = require('./dbPostgres');

class ComplianceEngine {
  /**
   * Ejecuta la auditoría integral de Compliance, Inhabilidades y Riesgo LAFT
   * conforme a la Ley 80/1993 Art. 8, Ley 1474/2011, Ley 2014/2019 y Ley 2195/2022.
   * 
   * @param {Object} data - {
   *   empresa_id: number,
   *   nit: string,
   *   razon_social: string,
   *   representante_legal: string,
   *   documento_representante: string,
   *   miembros_consorcio: Array (si es consorcio / UT)
   * }
   */
  async runComplianceAudit(data) {
    const {
      empresa_id,
      nit,
      razon_social,
      representante_legal = '',
      documento_representante = '',
      miembros_consorcio = []
    } = data;

    const hallazgos = [];
    let scoreRiesgo = 0;
    const esEstructuraPlural = Array.isArray(miembros_consorcio) && miembros_consorcio.length > 1;

    // 1. Simulación de cruce con fuentes oficiales y antecedentes
    // En producción se consumen APIs de CGR, SIRI PGN, PONAL y listas OFAC
    const boletinFiscal = this.checkFiscalCGR(nit);
    const disciplinarios = this.checkDisciplinariosPGN(nit, documento_representante);
    const medidasCorrectivas = this.checkMedidasCorrectivasPONAL(documento_representante);
    const sancionesSECOP = this.checkSancionesSecop(nit);
    const listaOfac = this.checkOfacClinton(razon_social, representante_legal);
    const listaPep = this.checkPep(representante_legal);

    if (boletinFiscal) {
      hallazgos.push('Reporte activo en el Boletín de Responsables Fiscales de la Contraloría General de la República (CGR).');
      scoreRiesgo += 50;
    }

    if (disciplinarios) {
      hallazgos.push('Sanción disciplinaria vigente reportada en el SIRI de la Procuraduría General de la Nación (PGN).');
      scoreRiesgo += 50;
    }

    if (medidasCorrectivas) {
      hallazgos.push('Multa activa en el Registro Nacional de Medidas Correctivas (RNMC - Policía Nacional) sin comprobante de pago.');
      scoreRiesgo += 20;
    }

    if (sancionesSECOP) {
      hallazgos.push('Declaratoria de incumplimiento o caducidad contractual registrada en SECOP II dentro de los últimos 5 años.');
      scoreRiesgo += 60;
    }

    if (listaOfac) {
      hallazgos.push('ALERTA ROJA CRÍTICA: Coincidencia en Listas de Sancionados Internacionales (OFAC / ONU). Bloqueo preventivo de orden público.');
      scoreRiesgo += 100;
    }

    if (listaPep) {
      hallazgos.push('ALERTA AMARILLA: Representante legal clasificado como Persona Expuesta Políticamente (PEP). Requiere debida diligencia intensificada.');
      scoreRiesgo += 15;
    }

    // 2. Auditoría en Cascada si es Proponente Plural (Nivel 1 a Nivel 4)
    const detallesPlural = [];
    if (esEstructuraPlural) {
      let sumaPorcentajes = 0;
      for (const m of miembros_consorcio) {
        sumaPorcentajes += parseFloat(m.porcentaje) || 0;
        // Evaluar individualmente a cada consorciado
        const checkM = this.checkFiscalCGR(m.nit);
        if (checkM) {
          hallazgos.push(`Integrante del consorcio (${m.razon_social}) registra inhabilidad fiscal ante la CGR.`);
          scoreRiesgo += 40;
        }
        detallesPlural.push({
          razon_social: m.razon_social,
          nit: m.nit,
          porcentaje: m.porcentaje,
          cumplimiento_individual: checkM ? 'NO_CONFORME' : 'CONFORME'
        });
      }

      if (Math.abs(sumaPorcentajes - 100) > 0.01) {
        hallazgos.push(`Error de consistencia en acuerdo consorcial: La suma de participaciones es ${sumaPorcentajes}%, no el 100% legal exigido.`);
        scoreRiesgo += 30;
      }
    }

    // 3. Calificación Final del Semáforo
    let estadoCompliance = 'HABILITADO';
    if (scoreRiesgo >= 50 || listaOfac || boletinFiscal || disciplinarios || sancionesSECOP) {
      estadoCompliance = 'INHABILITADO_BLOQUEANTE';
    } else if (scoreRiesgo > 0) {
      estadoCompliance = 'ALERTA_PREVENTIVA';
    }

    // Hash criptográfico SHA-256 para constancia de auditoría inmutable
    const auditPayload = `${nit}|${razon_social}|${estadoCompliance}|${new Date().toISOString()}`;
    const certHash = crypto.createHash('sha256').update(auditPayload).digest('hex');

    // 4. Guardar en PostgreSQL
    const query = `
      INSERT INTO compliance_evaluaciones (
        empresa_id, nit_consultado, nombre_consultado, representante_legal,
        documento_representante, es_estructura_plural, consorcio_nombre, miembros_consorcio,
        boletin_fiscal_cgr, disciplinarios_pgn, medidas_correctivas_ponal,
        multas_secop_activas, sanciones_rup_activas, lista_ofac_clinton,
        lista_onu_pep, estado_compliance, score_riesgo, hallazgos,
        detalles_auditoria, certificado_hash
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *;
    `;

    const res = await db.query(query, [
      empresa_id,
      nit,
      razon_social,
      representante_legal,
      documento_representante,
      esEstructuraPlural,
      data.consorcio_nombre || null,
      JSON.stringify(detallesPlural),
      boletinFiscal,
      disciplinarios,
      medidasCorrectivas,
      sancionesSECOP,
      false,
      listaOfac,
      listaPep,
      estadoCompliance,
      Math.min(100, scoreRiesgo),
      hallazgos,
      JSON.stringify({
        fecha_evaluacion: new Date().toISOString(),
        auditor: 'Motor de Compliance SECOP II v2.0',
        detalles_miembros: detallesPlural
      }),
      certHash
    ]);

    return res.rows[0];
  }

  // Métodos de verificación y cruce (en entorno real conectan a servicios de datos gubernamentales)
  checkFiscalCGR(nit) {
    // Retorna false si está limpio
    return false;
  }

  checkDisciplinariosPGN(nit, docRep) {
    return false;
  }

  checkMedidasCorrectivasPONAL(docRep) {
    return false;
  }

  checkSancionesSecop(nit) {
    return false;
  }

  checkOfacClinton(razonSocial, repLegal) {
    const text = `${razonSocial} ${repLegal}`.toLowerCase();
    // Búsqueda de prueba por patrones ilícitos conocidos
    return text.includes('sancionado') || text.includes('cartel');
  }

  checkPep(repLegal) {
    return false;
  }

  /**
   * Obtiene el historial de auditorías de una empresa
   */
  async getComplianceHistory(empresaId) {
    const res = await db.query(`
      SELECT * FROM compliance_evaluaciones
      WHERE empresa_id = $1
      ORDER BY creado_en DESC
      LIMIT 20;
    `, [empresaId]);
    return res.rows;
  }
}

module.exports = new ComplianceEngine();
