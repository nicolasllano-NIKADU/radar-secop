/**
 * ====================================================================
 * RADAR SECOP - GESTOR DE PIPELINE KANBAN Y TRABAJO EN EQUIPO (MÓDULO 6)
 * Normativa: Ley 80/1993, Ley 1150/2007, Ley 1882/2018
 * Funcionalidad: Ciclo de vida licitatorio, Go/No-Go, tareas interdisciplinarias
 * ====================================================================
 */

const dbPostgres = require('./dbPostgres');

class PipelineManager {
  constructor() {
    this.FASES = [
      { id: 'IDENTIFICADO', label: 'Identificado', orden: 1, color: '#38bdf8', icon: '🔍' },
      { id: 'EVALUADO', label: 'Go / No-Go', orden: 2, color: '#f59e0b', icon: '⚖️' },
      { id: 'EN_PREPARACION', label: 'En Preparación', orden: 3, color: '#a855f7', icon: '📝' },
      { id: 'PRESENTADO', label: 'Presentado SECOP II', orden: 4, color: '#06b6d4', icon: '🚀' },
      { id: 'SUBSANACION', label: 'En Traslado / Subsanación', orden: 5, color: '#ec4899', icon: '⏳' },
      { id: 'ADJUDICADO', label: 'Adjudicado / Ganado', orden: 6, color: '#10b981', icon: '🏆' },
      { id: 'PERDIDO', label: 'Perdido / Desierto', orden: 7, color: '#ef4444', icon: '❌' }
    ];
  }

  /**
   * Obtiene el estado consolidado del pipeline con métricas de valor y tareas
   */
  async getPipeline(empresaId = null) {
    let queryProc = `SELECT * FROM pipeline_procesos`;
    const paramsProc = [];
    if (empresaId) {
      queryProc += ` WHERE empresa_id = $1`;
      paramsProc.push(parseInt(empresaId, 10));
    }
    queryProc += ` ORDER BY actualizado_en DESC;`;

    const resProc = await dbPostgres.query(queryProc, paramsProc);
    const procesos = resProc.rows;

    if (procesos.length === 0) {
      return {
        metricas: {
          total_procesos: 0,
          valor_total_pipeline: 0,
          valor_ponderado_riesgo: 0,
          procesos_adjudicados: 0,
          win_rate: 0
        },
        columnas: this.FASES.map(f => ({ ...f, items: [] }))
      };
    }

    // Traer todas las tareas y bitácora asociadas a estos procesos
    const ids = procesos.map(p => p.id);
    const resTareas = await dbPostgres.query(
      `SELECT * FROM pipeline_tareas WHERE pipeline_id = ANY($1) ORDER BY creado_en ASC;`,
      [ids]
    );
    const resBitacora = await dbPostgres.query(
      `SELECT * FROM pipeline_bitacora WHERE pipeline_id = ANY($1) ORDER BY creado_en DESC;`,
      [ids]
    );

    // Mapear tareas y bitácora a cada proceso
    const tareasMap = {};
    resTareas.rows.forEach(t => {
      if (!tareasMap[t.pipeline_id]) tareasMap[t.pipeline_id] = [];
      tareasMap[t.pipeline_id].push(t);
    });

    const bitacoraMap = {};
    resBitacora.rows.forEach(b => {
      if (!bitacoraMap[b.pipeline_id]) bitacoraMap[b.pipeline_id] = [];
      bitacoraMap[b.pipeline_id].push(b);
    });

    let valorTotal = 0;
    let valorPonderado = 0;
    let adjudicados = 0;
    let cerrados = 0;

    const enriquecidos = procesos.map(p => {
      const pres = parseFloat(p.presupuesto) || 0;
      const prob = parseInt(p.probabilidad_exito, 10) || 50;

      if (p.fase !== 'PERDIDO') {
        valorTotal += pres;
        valorPonderado += pres * (prob / 100);
      }

      if (p.fase === 'ADJUDICADO') adjudicados++;
      if (p.fase === 'ADJUDICADO' || p.fase === 'PERDIDO') cerrados++;

      const tareas = tareasMap[p.id] || [];
      const completadas = tareas.filter(t => t.completada).length;

      return {
        ...p,
        presupuesto: pres,
        probabilidad_exito: prob,
        tareas_totales: tareas.length,
        tareas_completadas: completadas,
        tareas: tareas,
        bitacora: bitacoraMap[p.id] || []
      };
    });

    const winRate = cerrados > 0 ? Number(((adjudicados / cerrados) * 100).toFixed(1)) : 0;

    // Agrupar en las columnas visuales del Kanban
    const columnas = this.FASES.map(f => {
      return {
        ...f,
        items: enriquecidos.filter(p => p.fase === f.id)
      };
    });

    return {
      metricas: {
        total_procesos: enriquecidos.length,
        valor_total_pipeline: Math.round(valorTotal),
        valor_ponderado_riesgo: Math.round(valorPonderado),
        procesos_adjudicados: adjudicados,
        win_rate: winRate
      },
      columnas
    };
  }

  /**
   * Agrega un nuevo proceso al pipeline con tareas iniciales por defecto
   */
  async addProceso(data) {
    const {
      empresa_id,
      proceso_referencia,
      entidad,
      objeto,
      presupuesto = 0,
      fecha_cierre = null,
      fase = 'IDENTIFICADO',
      decision_go_nogo = 'PENDIENTE',
      probabilidad_exito = 50,
      responsable = 'Por Asignar',
      departamento = 'Colombia',
      url_secop = null
    } = data;

    const q = `
      INSERT INTO pipeline_procesos (
        empresa_id, proceso_referencia, entidad, objeto, presupuesto,
        fecha_cierre, fase, decision_go_nogo, probabilidad_exito,
        responsable, departamento, url_secop
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;
    const values = [
      empresa_id ? parseInt(empresa_id, 10) : null,
      proceso_referencia,
      entidad,
      objeto || '',
      parseFloat(presupuesto) || 0,
      fecha_cierre ? new Date(fecha_cierre) : null,
      fase,
      decision_go_nogo,
      parseInt(probabilidad_exito, 10) || 50,
      responsable,
      departamento,
      url_secop
    ];

    const res = await dbPostgres.query(q, values);
    const nuevo = res.rows[0];

    // Crear checklist inicial interdisciplinario
    const defaultTasks = [
      { perfil: 'JURIDICO', titulo: 'Verificar RUP, objeto social y facultades del Representante Legal' },
      { perfil: 'FINANCIERO', titulo: 'Validar ratios Decreto 1082/2015 y simular Consorcio si aplica' },
      { perfil: 'TECNICO', titulo: 'Construir APUs y validar certificados de experiencia requerida' },
      { perfil: 'GENERAL', titulo: 'Comité de decisión estratégica Go / No-Go' }
    ];

    for (const t of defaultTasks) {
      await dbPostgres.query(
        `INSERT INTO pipeline_tareas (pipeline_id, perfil, titulo) VALUES ($1, $2, $3);`,
        [nuevo.id, t.perfil, t.titulo]
      );
    }

    // Registrar bitácora de apertura
    await dbPostgres.query(
      `INSERT INTO pipeline_bitacora (pipeline_id, autor, comentario) VALUES ($1, $2, $3);`,
      [nuevo.id, 'Radar SECOP', `Oportunidad incorporada al Pipeline en fase: ${fase}`]
    );

    return nuevo;
  }

  /**
   * Actualiza la fase de un proceso en el Kanban
   */
  async updateFase(id, nuevaFase, autor = 'Equipo') {
    const q = `
      UPDATE pipeline_procesos 
      SET fase = $1, actualizado_en = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *;
    `;
    const res = await dbPostgres.query(q, [nuevaFase, parseInt(id, 10)]);
    if (res.rows.length === 0) return null;

    await dbPostgres.query(
      `INSERT INTO pipeline_bitacora (pipeline_id, autor, comentario) VALUES ($1, $2, $3);`,
      [id, autor, `Proceso transferido a fase: ${nuevaFase}`]
    );

    return res.rows[0];
  }

  /**
   * Actualiza la decisión Go / No-Go
   */
  async updateGoNoGo(id, decision, autor = 'Comité') {
    const q = `
      UPDATE pipeline_procesos 
      SET decision_go_nogo = $1, actualizado_en = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *;
    `;
    const res = await dbPostgres.query(q, [decision, parseInt(id, 10)]);
    if (res.rows.length === 0) return null;

    await dbPostgres.query(
      `INSERT INTO pipeline_bitacora (pipeline_id, autor, comentario) VALUES ($1, $2, $3);`,
      [id, autor, `Decisión estratégica actualizada a: ${decision}`]
    );

    return res.rows[0];
  }

  /**
   * Agrega una tarea interdisciplinaria al proceso
   */
  async addTask(pipelineId, { perfil = 'GENERAL', titulo, fecha_limite = null }) {
    const q = `
      INSERT INTO pipeline_tareas (pipeline_id, perfil, titulo, fecha_limite)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const res = await dbPostgres.query(q, [
      parseInt(pipelineId, 10),
      perfil,
      titulo,
      fecha_limite ? new Date(fecha_limite) : null
    ]);
    return res.rows[0];
  }

  /**
   * Marca o desmarca una tarea
   */
  async toggleTask(taskId, completada) {
    const q = `
      UPDATE pipeline_tareas 
      SET completada = $1 
      WHERE id = $2 
      RETURNING *;
    `;
    const res = await dbPostgres.query(q, [completada, parseInt(taskId, 10)]);
    return res.rows[0];
  }

  /**
   * Agrega un comentario en la bitácora
   */
  async addBitacora(pipelineId, autor, comentario) {
    const q = `
      INSERT INTO pipeline_bitacora (pipeline_id, autor, comentario)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const res = await dbPostgres.query(q, [
      parseInt(pipelineId, 10),
      autor || 'Equipo',
      comentario
    ]);
    return res.rows[0];
  }

  /**
   * Elimina un proceso del pipeline
   */
  async deleteProceso(id) {
    const q = `DELETE FROM pipeline_procesos WHERE id = $1 RETURNING id;`;
    const res = await dbPostgres.query(q, [parseInt(id, 10)]);
    return res.rowCount > 0;
  }
}

module.exports = new PipelineManager();
