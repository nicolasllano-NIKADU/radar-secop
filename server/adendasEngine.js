// ============================================================================
// RADAR SECOP - MOTOR DE ADENDAS Y CONTROL DE CRONOGRAMA DINÁMICO (SECOP II)
// Normativa: Ley 80 de 1993, Ley 1150 de 2007, Ley 1882 de 2018 (Art. 4),
// Decreto 1082 de 2015 (Art. 2.2.1.1.2.2.1) y Pliegos Tipo ANCP-CCE.
// ============================================================================

const PDFDocument = require('pdfkit');
const dbPostgres = require('./dbPostgres');

class AdendasEngine {
  /**
   * Calcula días hábiles aproximados entre dos fechas (omite fines de semana)
   */
  static calcularDiasHabiles(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) return 0;
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    if (inicio >= fin) return 0;

    let count = 0;
    const cur = new Date(inicio);
    while (cur < fin) {
      cur.setDate(cur.getDate() + 1);
      const day = cur.getDay();
      if (day !== 0 && day !== 6) { // No domingo ni sábado
        count++;
      }
    }
    return count;
  }

  /**
   * Suma meses a una fecha
   */
  static sumarMeses(fechaStr, meses = 3) {
    const f = new Date(fechaStr);
    f.setMonth(f.getMonth() + meses);
    return f.toISOString().split('T')[0];
  }

  /**
   * Evalúa el impacto jurídico y operativo de la adenda sobre la oferta en preparación
   */
  static evaluarImpactoAdenda({
    proceso,
    numeroAdenda,
    fechaExpedicion,
    tipoModificacion = 'CRONOGRAMA',
    fechaCierreAnterior,
    fechaCierreNueva,
    descripcionCambios
  }) {
    let diasProrroga = 0;
    let impactoPoliza = false;
    let nuevaVigenciaPoliza = null;
    let impactoEconomico = false;
    let impactoHabilitantes = false;
    let nivelCriticidad = 'MEDIO';
    let cumplimientoLey1882 = true;
    let accionRequerida = '';

    const tipo = tipoModificacion.toUpperCase();
    const desc = (descripcionCambios || '').toLowerCase();

    // 1. Evaluación de Cronograma y Fecha de Cierre
    if (fechaCierreAnterior && fechaCierreNueva) {
      const fAnt = new Date(fechaCierreAnterior);
      const fNue = new Date(fechaCierreNueva);

      if (fNue > fAnt) {
        diasProrroga = Math.round((fNue - fAnt) / (1000 * 60 * 60 * 24));
        impactoPoliza = true;
        nuevaVigenciaPoliza = this.sumarMeses(fNue, 3);
        nivelCriticidad = 'ALTO';

        accionRequerida += `• PÓLIZA DE SERIEDAD: Modificar la garantía ante la aseguradora para amparar hasta el ${nuevaVigenciaPoliza} (3 meses desde el nuevo cierre). No actualizar la vigencia causará RECHAZO DE LA OFERTA.\n`;
        accionRequerida += `• PIPELINE: Se amplía el plazo de preparación en ${diasProrroga} días calendario. Reprogramar entregables del equipo.\n`;

        // Regla Ley 1882/2018 Art. 4: No adendas dentro de los 3 días hábiles anteriores salvo prórroga ≥ 3 días hábiles
        const diasHabilesPreCierre = this.calcularDiasHabiles(fechaExpedicion, fAnt);
        const diasHabilesProrroga = this.calcularDiasHabiles(fAnt, fNue);

        if (diasHabilesPreCierre < 3 && diasHabilesProrroga < 3) {
          cumplimientoLey1882 = false;
          accionRequerida += `• ALERTA LEGAL (Ley 1882/2018): La adenda fue expedida a menos de 3 días hábiles del cierre sin conceder una prórroga de al menos 3 días hábiles. Es susceptible de observación o revocatoria directa.\n`;
        }
      }
    }

    // 2. Evaluación de Formulario Económico / Presupuesto
    if (tipo.includes('ECONOMICO') || desc.includes('presupuesto') || desc.includes('apu') || desc.includes('formulario económico') || desc.includes('precios')) {
      impactoEconomico = true;
      nivelCriticidad = 'ALTO';
      accionRequerida += `• OFERTA ECONÓMICA: Descargar la nueva versión oficial del Formulario Económico expedida con la adenda. Presentar la versión desactualizada genera causal de rechazo de la oferta.\n`;
    }

    // 3. Evaluación de Requisitos Habilitantes
    if (tipo.includes('HABILITANTE') || desc.includes('experiencia') || desc.includes('unspsc') || desc.includes('financiero') || desc.includes('rup') || desc.includes('k residual')) {
      impactoHabilitantes = true;
      if (nivelCriticidad !== 'ALTO') nivelCriticidad = 'ALTO';
      accionRequerida += `• REQUISITOS HABILITANTES: Ejecutar un nuevo Gap Analysis (Auditoría de Pliego) para validar si los nuevos umbrales o códigos UNSPSC impactan la calificación habilitante.\n`;
    }

    // 4. Modificaciones Técnicas o de Riesgos
    if (desc.includes('riesgo') || desc.includes('garantía') || desc.includes('plazo de entrega') || desc.includes('especificaciones')) {
      if (nivelCriticidad === 'MEDIO') nivelCriticidad = 'MEDIO';
      accionRequerida += `• REVISIÓN TÉCNICA: Ajustar la propuesta técnica y verificar amparos adicionales de la matriz de riesgos.\n`;
    }

    if (!accionRequerida) {
      accionRequerida = '• Adenda meramente informativa o de aclaración sin impacto sustancial en la propuesta.';
      nivelCriticidad = 'INFORMATIVO';
    }

    return {
      proceso_id: String(proceso.id || proceso.referencia || 'PROC-001'),
      numero_proceso: proceso.referencia || proceso.numero_proceso || 'PROCESO-SECOP',
      entidad_nombre: proceso.entidad || proceso.entidad_nombre || 'Entidad Estatal',
      numero_adenda: numeroAdenda || 'Adenda No. 1',
      fecha_expedicion: fechaExpedicion || new Date().toISOString(),
      tipo_modificacion: tipoModificacion,
      fecha_cierre_anterior: fechaCierreAnterior || null,
      fecha_cierre_nueva: fechaCierreNueva || null,
      dias_prorroga: diasProrroga,
      descripcion_cambios: descripcionCambios || 'Modificación general de condiciones.',
      impacto_poliza_seriedad: impactoPoliza,
      nueva_vigencia_poliza_requerida: nuevaVigenciaPoliza,
      impacto_oferta_economica: impactoEconomico,
      impacto_habilitantes: impactoHabilitantes,
      nivel_criticidad: nivelCriticidad,
      accion_requerida: accionRequerida,
      cumplimiento_ley_1882: cumplimientoLey1882,
      estado_gestion: 'PENDIENTE_REVISION'
    };
  }

  /**
   * Guarda o registra una adenda en la base de datos PostgreSQL
   */
  static async registrarAdenda(adendaData) {
    const res = await dbPostgres.query(`
      INSERT INTO adendas_proceso (
        proceso_id, numero_proceso, entidad_nombre, numero_adenda,
        fecha_expedicion, tipo_modificacion, fecha_cierre_anterior,
        fecha_cierre_nueva, dias_prorroga, descripcion_cambios,
        impacto_poliza_seriedad, nueva_vigencia_poliza_requerida,
        impacto_oferta_economica, impacto_habilitantes, nivel_criticidad,
        accion_requerida, cumplimiento_ley_1882, estado_gestion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id, creado_en
    `, [
      adendaData.proceso_id,
      adendaData.numero_proceso,
      adendaData.entidad_nombre,
      adendaData.numero_adenda,
      adendaData.fecha_expedicion,
      adendaData.tipo_modificacion,
      adendaData.fecha_cierre_anterior,
      adendaData.fecha_cierre_nueva,
      adendaData.dias_prorroga,
      adendaData.descripcion_cambios,
      adendaData.impacto_poliza_seriedad,
      adendaData.nueva_vigencia_poliza_requerida,
      adendaData.impacto_oferta_economica,
      adendaData.impacto_habilitantes,
      adendaData.nivel_criticidad,
      adendaData.accion_requerida,
      adendaData.cumplimiento_ley_1882,
      adendaData.estado_gestion || 'PENDIENTE_REVISION'
    ]);

    return { success: true, id: res.rows[0].id, creado_en: res.rows[0].creado_en };
  }

  /**
   * Obtiene todas las adendas registradas para un proceso
   */
  static async getAdendasPorProceso(procesoId) {
    const res = await dbPostgres.query(`
      SELECT * FROM adendas_proceso
      WHERE proceso_id = $1
      ORDER BY id DESC
    `, [procesoId]);
    return res.rows;
  }

  /**
   * Actualiza el estado de gestión de la adenda (APLICADA / ARCHIVADA)
   */
  static async actualizarEstadoAdenda(id, estadoGestion) {
    const res = await dbPostgres.query(`
      UPDATE adendas_proceso
      SET estado_gestion = $1, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, estado_gestion
    `, [estadoGestion, id]);
    return res.rows[0];
  }

  /**
   * Elimina un registro de adenda
   */
  static async eliminarAdenda(id) {
    await dbPostgres.query('DELETE FROM adendas_proceso WHERE id = $1', [id]);
    return { success: true };
  }

  /**
   * Genera reporte formal de auditoría de adendas en PDF (Portrait)
   */
  static generarReporteAdendasPdf(proceso, adendas) {
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

        // Header
        doc.fontSize(8).fillColor('#64748b').text('SISTEMA INTEGRAL DE GESTIÓN LICITATORIA • RADAR SECOP', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(14).fillColor('#0f172a').font('Helvetica-Bold').text('MATRIZ DE ADENDAS Y CRONOGRAMA DINÁMICO', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(8.5).fillColor('#475569').font('Helvetica').text('Auditoría de Impacto en la Oferta y Cumplimiento de la Ley 1882 de 2018 (Art. 4)', { align: 'center' });
        doc.moveDown(0.8);

        // Metadatos
        const metaY = doc.y;
        doc.rect(40, metaY, 532, 45).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(7.5);
        doc.font('Helvetica-Bold').text('PROCESO:', 48, metaY + 6).font('Helvetica').text(proceso.referencia || proceso.numero_proceso || 'PROCESO-SECOP', 95, metaY + 6);
        doc.font('Helvetica-Bold').text('ENTIDAD:', 48, metaY + 18).font('Helvetica').text(proceso.entidad || 'N/A', 95, metaY + 18);
        doc.font('Helvetica-Bold').text('TOTAL ADENDAS:', 48, metaY + 30).font('Helvetica').text(`${adendas.length} expedida(s) en SECOP II`, 125, metaY + 30);

        doc.y = metaY + 54;
        doc.moveDown(0.5);

        if (adendas.length === 0) {
          doc.fontSize(9).font('Helvetica-Oblique').fillColor('#64748b').text('No se han registrado adendas ni modificaciones al pliego de condiciones.', { align: 'center' });
          doc.end();
          return;
        }

        // Listado de Adendas
        adendas.forEach((ad, idx) => {
          if (doc.y > 640) doc.addPage();

          const cardY = doc.y;
          const criticidadColor = ad.nivel_criticidad === 'ALTO' ? '#ef4444' : ad.nivel_criticidad === 'MEDIO' ? '#f59e0b' : '#3b82f6';

          doc.rect(40, cardY, 532, 18).fill('#0f172a');
          doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
          doc.text(`${ad.numero_adenda.toUpperCase()} • TIPO: ${ad.tipo_modificacion}`, 48, cardY + 5);

          // Badge criticidad
          doc.rect(480, cardY + 3, 85, 12).fill(criticidadColor);
          doc.fillColor('#ffffff').fontSize(6).font('Helvetica-Bold').text(`CRITICIDAD: ${ad.nivel_criticidad}`, 480, cardY + 5, { width: 85, align: 'center' });

          let bodyY = cardY + 22;
          doc.rect(40, bodyY, 532, 80).fillAndStroke('#ffffff', '#e2e8f0');

          doc.fillColor('#0f172a').fontSize(7).font('Helvetica-Bold').text('Fecha de Expedición:', 48, bodyY + 6);
          doc.font('Helvetica').text(new Date(ad.fecha_expedicion).toLocaleString('es-CO'), 140, bodyY + 6);

          if (ad.fecha_cierre_anterior && ad.fecha_cierre_nueva) {
            doc.font('Helvetica-Bold').fillColor('#b91c1c').text('Cierre Anterior:', 48, bodyY + 16);
            doc.font('Helvetica').text(new Date(ad.fecha_cierre_anterior).toLocaleString('es-CO'), 140, bodyY + 16);

            doc.font('Helvetica-Bold').fillColor('#15803d').text('Nuevo Cierre:', 280, bodyY + 16);
            doc.font('Helvetica').text(`${new Date(ad.fecha_cierre_nueva).toLocaleString('es-CO')} (+${ad.dias_prorroga} días)`, 345, bodyY + 16);
          }

          doc.font('Helvetica-Bold').fillColor('#0f172a').text('Descripción de Cambios:', 48, bodyY + 28);
          doc.font('Helvetica').fillColor('#334155').text(ad.descripcion_cambios, 48, bodyY + 38, { width: 516, height: 18, ellipsis: true });

          doc.font('Helvetica-Bold').fillColor('#b45309').text('Acciones Requeridas:', 48, bodyY + 54);
          doc.font('Helvetica').fontSize(6.5).fillColor('#1e293b').text(ad.accion_requerida.replace(/\n/g, ' | '), 48, bodyY + 64, { width: 516, height: 14, ellipsis: true });

          doc.y = bodyY + 90;
        });

        // Cierre y Certificación de Auditoría
        if (doc.y > 660) doc.addPage();
        doc.moveDown(0.8);
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a').text('MARCO LEGAL VINCULANTE (Ley 1882 de 2018 Art. 4):');
        doc.font('Helvetica').fontSize(6.5).fillColor('#475569').text('Las adendas expedidas en el SECOP II modifican de pleno derecho los plazos, requisitos habilitantes y especificaciones técnicas. Toda prórroga de cierre obliga al proponente a gestionar el anexo de ampliación de vigencia de la garantía de seriedad de la oferta (3 meses desde el nuevo cierre) para evitar causales de rechazo.');

        doc.moveDown(1.5);
        const sigY = doc.y;
        doc.moveTo(40, sigY).lineTo(250, sigY).stroke('#0f172a');
        doc.moveTo(320, sigY).lineTo(530, sigY).stroke('#0f172a');

        doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text('LÍDER DE LICITACIONES Y PROPUESTAS', 40, sigY + 4);
        doc.font('Helvetica').fontSize(6).text('Verificación de Cronograma & Adendas', 40, sigY + 13);

        doc.font('Helvetica-Bold').fontSize(7).text('REPRESENTANTE LEGAL / AUDITORÍA JURÍDICA', 320, sigY + 4);
        doc.font('Helvetica').fontSize(6).text('Actualización de Pólizas & Formulario Económico', 320, sigY + 13);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = AdendasEngine;
