const db = require('./dbPostgres');

class ContractManager {
  /**
   * Crea un nuevo contrato ganado/adjudicado para seguimiento post-adjudicación
   */
  async createContract(empresaId, data) {
    const {
      numero_contrato,
      referencia_proceso = '',
      entidad_contratante,
      objeto_contractual,
      valor_adjudicado,
      fecha_suscripcion = null,
      plazo_dias = 30,
      tipo_plazo = 'CALENDARIO',
      supervisor_nombre = '',
      supervisor_email = '',
      interventoria_nombre = ''
    } = data;

    // Precalculo de fecha de terminación estimada
    let fechaTerminacion = null;
    if (fecha_suscripcion) {
      const dt = new Date(fecha_suscripcion);
      dt.setDate(dt.getDate() + parseInt(plazo_dias, 10));
      fechaTerminacion = dt.toISOString().slice(0, 10);
    }

    const query = `
      INSERT INTO contratos_gestion (
        empresa_id, numero_contrato, referencia_proceso, entidad_contratante,
        objeto_contractual, valor_adjudicado, fecha_suscripcion, plazo_dias,
        tipo_plazo, fecha_terminacion_estimada, supervisor_nombre,
        supervisor_email, interventoria_nombre
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;

    const res = await db.query(query, [
      empresaId,
      numero_contrato,
      referencia_proceso,
      entidad_contratante,
      objeto_contractual,
      parseFloat(valor_adjudicado) || 0,
      fecha_suscripcion,
      parseInt(plazo_dias, 10),
      tipo_plazo,
      fechaTerminacion,
      supervisor_nombre,
      supervisor_email,
      interventoria_nombre
    ]);

    return res.rows[0];
  }

  /**
   * Obtiene la lista de contratos en seguimiento para una empresa
   */
  async getContractsByCompany(empresaId) {
    const query = `
      SELECT cg.*,
        (SELECT COUNT(*) FROM contrato_polizas cp WHERE cp.contrato_id = cg.id) as total_polizas,
        (SELECT COUNT(*) FROM contrato_polizas cp WHERE cp.contrato_id = cg.id AND cp.fecha_fin_vigencia <= (CURRENT_DATE + INTERVAL '15 days')) as polizas_en_riesgo
      FROM contratos_gestion cg
      WHERE cg.empresa_id = $1
      ORDER BY cg.creado_en DESC;
    `;
    const res = await db.query(query, [empresaId]);
    return res.rows;
  }

  /**
   * Obtiene un contrato específico con sus pólizas y modificaciones
   */
  async getContractDetail(contratoId) {
    const contractRes = await db.query('SELECT * FROM contratos_gestion WHERE id = $1', [contratoId]);
    if (contractRes.rows.length === 0) return null;

    const contrato = contractRes.rows[0];

    // Obtener pólizas con semáforo de días restantes
    const polizasRes = await db.query(`
      SELECT cp.*,
        (cp.fecha_fin_vigencia - CURRENT_DATE) as dias_restantes
      FROM contrato_polizas cp
      WHERE cp.contrato_id = $1
      ORDER BY cp.fecha_fin_vigencia ASC;
    `, [contratoId]);

    // Obtener modificaciones (adiciones, prórrogas)
    const modRes = await db.query(`
      SELECT * FROM contrato_modificaciones
      WHERE contrato_id = $1
      ORDER BY creado_en DESC;
    `, [contratoId]);

    return {
      contrato,
      polizas: polizasRes.rows.map(p => ({
        ...p,
        semaforo_vencimiento: this.calculatePolicySemaphore(p.dias_restantes)
      })),
      modificaciones: modRes.rows
    };
  }

  /**
   * Agrega una póliza al contrato
   */
  async addPolicy(contratoId, policyData) {
    const {
      aseguradora,
      numero_poliza,
      tipo_amparo,
      porcentaje_amparado = 10,
      valor_asegurado,
      fecha_inicio_vigencia,
      fecha_fin_vigencia
    } = policyData;

    const query = `
      INSERT INTO contrato_polizas (
        contrato_id, aseguradora, numero_poliza, tipo_amparo,
        porcentaje_amparado, valor_asegurado, fecha_inicio_vigencia, fecha_fin_vigencia
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const res = await db.query(query, [
      contratoId,
      aseguradora,
      numero_poliza,
      tipo_amparo,
      parseFloat(porcentaje_amparado) || 10,
      parseFloat(valor_asegurado) || 0,
      fecha_inicio_vigencia,
      fecha_fin_vigencia
    ]);

    return res.rows[0];
  }

  /**
   * Registra una modificación contractual (con validación de tope 50% de adición Ley 80/1993 Art. 40)
   */
  async addModification(contratoId, modData) {
    const {
      tipo_modificacion,
      valor_adicion = 0,
      dias_prorroga = 0,
      fecha_suspension_inicio = null,
      fecha_suspension_fin = null,
      poliza_modificada_aprobada = false,
      justificacion
    } = modData;

    // 1. Validar tope de adición legal si es incremento presupuestal
    const contractRes = await db.query('SELECT valor_adjudicado, valor_adicionado FROM contratos_gestion WHERE id = $1', [contratoId]);
    if (contractRes.rows.length === 0) throw new Error('Contrato no encontrado');

    const c = contractRes.rows[0];
    const valorAdjudicado = parseFloat(c.valor_adjudicado) || 0;
    const valorAdicionadoActual = parseFloat(c.valor_adicionado) || 0;
    const topeMaximo = valorAdjudicado * 0.50;

    if (tipo_modificacion === 'ADICION_PRESUPUESTAL') {
      const nuevoTotalAdicionado = valorAdicionadoActual + parseFloat(valor_adicion);
      if (nuevoTotalAdicionado > topeMaximo) {
        throw new Error(`La adición excede el tope legal del 50% (Ley 80/1993 Art. 40). Tope permitido: $${topeMaximo.toLocaleString('es-CO')}. Total propuesto: $${nuevoTotalAdicionado.toLocaleString('es-CO')}`);
      }
    }

    // 2. Registrar modificación
    const queryMod = `
      INSERT INTO contrato_modificaciones (
        contrato_id, tipo_modificacion, valor_adicion, dias_prorroga,
        fecha_suspension_inicio, fecha_suspension_fin, poliza_modificada_aprobada, justificacion
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const resMod = await db.query(queryMod, [
      contratoId,
      tipo_modificacion,
      parseFloat(valor_adicion) || 0,
      parseInt(dias_prorroga, 10) || 0,
      fecha_suspension_inicio,
      fecha_suspension_fin,
      poliza_modificada_aprobada,
      justificacion
    ]);

    // 3. Actualizar valores acumulados en el contrato
    if (tipo_modificacion === 'ADICION_PRESUPUESTAL') {
      await db.query(`
        UPDATE contratos_gestion
        SET valor_adicionado = valor_adicionado + $2, actualizado_en = NOW()
        WHERE id = $1
      `, [contratoId, parseFloat(valor_adicion)]);
    }

    if (tipo_modificacion === 'PRORROGA_TIEMPO' && dias_prorroga > 0) {
      await db.query(`
        UPDATE contratos_gestion
        SET plazo_dias = plazo_dias + $2,
            fecha_terminacion_estimada = fecha_terminacion_estimada + ($2 || ' days')::interval,
            actualizado_en = NOW()
        WHERE id = $1
      `, [contratoId, parseInt(dias_prorroga, 10)]);
    }

    return resMod.rows[0];
  }

  /**
   * Calcula el nivel de alerta según días restantes de vigencia de póliza
   */
  calculatePolicySemaphore(diasRestantes) {
    const d = parseInt(diasRestantes, 10);
    if (d < 0) return { nivel: 'VENCIDA', color: 'var(--danger)', texto: 'Garantía Vencida' };
    if (d <= 5) return { nivel: 'NIVEL_3_EXTRAORDINARIO', color: '#ff1744', texto: 'Crítico: Vence en ≤ 5 días' };
    if (d <= 15) return { nivel: 'NIVEL_2_CRITICO', color: '#ff9100', texto: 'Alerta: Vence en ≤ 15 días' };
    if (d <= 30) return { nivel: 'NIVEL_1_PREVENTIVO', color: 'var(--champagne)', texto: 'Preventivo: Vence en ≤ 30 días' };
    return { nivel: 'VIGENTE', color: 'var(--success)', texto: 'Vigente y Conforme' };
  }
}

module.exports = new ContractManager();
