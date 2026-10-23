// ============================================================================
// RADAR SECOP - MOTOR DE MATRIZ DE RIESGOS CONTRACTUALES (ANCP-CCE)
// Normativa: Ley 1150 de 2007 (Art. 4), Decreto 1082 de 2015 (Art. 2.2.1.1.1.6.1 a 2.2.1.1.1.6.3),
// y Manual M-ICR-01 de Colombia Compra Eficiente.
// ============================================================================

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const dbPostgres = require('./dbPostgres');

class RiskMatrixEngine {
  /**
   * Calcula el nivel y categoría de riesgo según la matriz 5x5 oficial CCE
   * @param {number} probabilidad (1 a 5)
   * @param {number} impacto (1 a 5)
   * @returns {{ calificacion: number, categoria: string, color: string, badgeBg: string, label: string }}
   */
  static calcularNivelRiesgo(probabilidad, impacto) {
    const p = Math.max(1, Math.min(5, parseInt(probabilidad, 10) || 1));
    const i = Math.max(1, Math.min(5, parseInt(impacto, 10) || 1));
    const calificacion = p * i;

    if (calificacion <= 4) {
      return {
        calificacion,
        categoria: 'BAJO',
        color: '#10b981',
        badgeBg: '#ecfdf5',
        label: 'Bajo (Aceptable con controles rutinarios)'
      };
    } else if (calificacion <= 8) {
      return {
        calificacion,
        categoria: 'MEDIO',
        color: '#f59e0b',
        badgeBg: '#fffbeb',
        label: 'Medio (Monitoreo activo y controles preventivos)'
      };
    } else if (calificacion <= 15) {
      return {
        calificacion,
        categoria: 'ALTO',
        color: '#f97316',
        badgeBg: '#fff7ed',
        label: 'Alto (Mitigación prioritaria y pólizas de garantía)'
      };
    } else {
      return {
        calificacion,
        categoria: 'EXTREMO',
        color: '#ef4444',
        badgeBg: '#fef2f2',
        label: 'Extremo (Crítico: Contingencia y transferencia contractual)'
      };
    }
  }

  /**
   * Genera el catálogo contextual de riesgos previsibles según el objeto contractual
   */
  static generarCatalogoRiesgos(proceso, oferente, tipoContratoInput) {
    const objeto = (proceso.objeto || '').toLowerCase();
    const tipoContrato = tipoContratoInput || (proceso.tipo_contrato || 'Prestación de Servicios / Suministro');

    // Catálogo base transversal según ANCP-CCE
    const items = [
      {
        codigo_riesgo: 'RSK-OPE-01',
        etapa: 'Ejecución',
        tipo: 'Operacional',
        descripcion_riesgo: 'Retrasos, desabastecimiento o escasez en la cadena de suministro nacional o internacional de insumos, materiales y licencias requeridas para la ejecución.',
        consecuencia_evento: 'Desfase en el cronograma de hitos contractuales, eventual requerimiento de la supervisión y posibles multas conminatorias.',
        probabilidad: 2,
        impacto: 3,
        a_quien_se_asigna: 'CONTRATISTA',
        tratamiento: 'MITIGAR',
        acciones_mitigacion: 'Pre-acuerdos con al menos dos proveedores alternativos calificados, stock de seguridad mínimo del 15% y órdenes de compra tempranas una vez perfeccionado el contrato.',
        mecanismo_transferencia: 'Póliza de Cumplimiento (Amparo de Cumplimiento del Contrato - 20% del valor total).',
        periodicidad_monitoreo: 'Quincenal',
        responsable_monitoreo: 'Director de Operaciones / Coordinador Logístico'
      },
      {
        codigo_riesgo: 'RSK-OPE-02',
        etapa: 'Ejecución',
        tipo: 'Operacional',
        descripcion_riesgo: 'Deserción, renuncia o incapacidad médica prolongada del personal profesional, técnico o especialistas habilitados en la oferta técnica.',
        consecuencia_evento: 'Disminución temporal del rendimiento operativo y riesgo de glosa o sanción por incumplimiento del equipo de trabajo exigido en pliegos.',
        probabilidad: 3,
        impacto: 2,
        a_quien_se_asigna: 'CONTRATISTA',
        tratamiento: 'MITIGAR',
        acciones_mitigacion: 'Mantenimiento de un banco de hojas de vida pre-validadas con perfiles equivalentes o superiores a los del pliego tipo, para reemplazo formal en máximo cinco (5) días hábiles ante la Interventoría.',
        mecanismo_transferencia: 'Póliza de Pago de Salarios, Prestaciones Sociales e Indemnizaciones Laborales (5% a 10% del valor total).',
        periodicidad_monitoreo: 'Mensual',
        responsable_monitoreo: 'Líder de Talento Humano / Director de Proyecto'
      },
      {
        codigo_riesgo: 'RSK-FIN-01',
        etapa: 'Ejecución',
        tipo: 'Financiero',
        descripcion_riesgo: 'Fluctuación macroeconómica, devaluación de la TRM en insumos importados e incremento del índice de precios por encima de las proyecciones iniciales de la propuesta.',
        consecuencia_evento: 'Sobrecostos directos en la canasta de insumos y reducción del margen de utilidad pactado en la oferta económica.',
        probabilidad: 3,
        impacto: 3,
        a_quien_se_asigna: 'COMPARTIDO',
        tratamiento: 'TRANSFERIR',
        acciones_mitigacion: 'Fijación de cotizaciones con proveedores aliados, coberturas cambiarias y eventual solicitud formal de reequilibrio de la ecuación económica del contrato (Art. 27 Ley 80/1993) en caso de superar la banda de alea normal.',
        mecanismo_transferencia: 'Cláusula de Ajuste e Indexación de Precios / Cobertura Financiera Bancaria.',
        periodicidad_monitoreo: 'Mensual',
        responsable_monitoreo: 'Director Financiero / Revisor Fiscal'
      },
      {
        codigo_riesgo: 'RSK-FIN-02',
        etapa: 'Ejecución',
        tipo: 'Financiero',
        descripcion_riesgo: 'Retraso en la aprobación de actas parciales de recibo, expedición de certificados de cumplimiento o trámites ante el Programa Anual Mensualizado de Caja (PAC) / Tesorería de la Entidad.',
        consecuencia_evento: 'Dificultad de flujo de caja para solventar nómina operativa directa y pago expedito a proveedores del proyecto.',
        probabilidad: 3,
        impacto: 3,
        a_quien_se_asigna: 'ENTIDAD',
        tratamiento: 'MITIGAR',
        acciones_mitigacion: 'Línea de crédito rotativo de tesorería institucional que soporte hasta sesenta (60) días de operación sin pago, radicación temprana de cuentas con estricta verificación documental previa.',
        mecanismo_transferencia: 'Cobro de intereses moratorios a la tasa legal vigente (Art. 4 numeral 8 Ley 80 de 1993).',
        periodicidad_monitoreo: 'Mensual',
        responsable_monitoreo: 'Gerente Financiero / Coordinador de Cuentas'
      },
      {
        codigo_riesgo: 'RSK-TEC-01',
        etapa: 'Ejecución',
        tipo: 'Tecnológico/Ciberseguridad',
        descripcion_riesgo: 'Falla de infraestructura tecnológica, incidentes de ciberseguridad (ransomware, DDoS) o incompatibilidad de interoperabilidad con plataformas SECOP II o sistemas de la Entidad.',
        consecuencia_evento: 'Indisponibilidad del servicio, vulneración de confidencialidad o pérdida de integridad de información protegida bajo la Ley 1581 de 2012.',
        probabilidad: 2,
        impacto: 4,
        a_quien_se_asigna: 'CONTRATISTA',
        tratamiento: 'MITIGAR',
        acciones_mitigacion: 'Infraestructura redundante multi-región con 99.9% de SLA, copias de respaldo inmutables diarias, cifrado de datos AES-256 y protocolos de respuesta a incidentes bajo estándar ISO 27001.',
        mecanismo_transferencia: 'Póliza de Responsabilidad Civil Extracontractual y Cobertura de Ciberriesgos.',
        periodicidad_monitoreo: 'Semanal',
        responsable_monitoreo: 'Oficial de Seguridad de la Información (CISO) / Administrador Cloud'
      },
      {
        codigo_riesgo: 'RSK-REG-01',
        etapa: 'Ejecución',
        tipo: 'Regulatorio',
        descripcion_riesgo: 'Modificación de disposiciones tributarias, normatividad técnica sectorial o exigencias de permisos expedidos con posterioridad al cierre del proceso de selección.',
        consecuencia_evento: 'Mayores cargas de retención fiscal o necesidad de readecuación de procesos operativos para certificar estándares sobrevinientes.',
        probabilidad: 2,
        impacto: 2,
        a_quien_se_asigna: 'CONTRATISTA',
        tratamiento: 'ACEPTAR',
        acciones_mitigacion: 'Monitoreo normativo continuado y adecuación ágil mediante comités de control con el equipo jurídico de la empresa.',
        mecanismo_transferencia: 'Revisión en comités operativos conjuntos con la Interventoría / Supervisión de la Entidad.',
        periodicidad_monitoreo: 'Bimestral',
        responsable_monitoreo: 'Asesor Jurídico Contractual'
      },
      {
        codigo_riesgo: 'RSK-AMB-01',
        etapa: 'Ejecución',
        tipo: 'Social/Ambiental',
        descripcion_riesgo: 'Bloqueos viales por manifestaciones sociales, paros comunitarios o eventos climáticos extremos (ola invernal / derrumbes) que impidan el acceso a los frentes de trabajo o sitios de entrega.',
        consecuencia_evento: 'Paralización de la ejecución en campo e imposibilidad física de cumplir con el cronograma previsto.',
        probabilidad: 2,
        impacto: 4,
        a_quien_se_asigna: 'COMPARTIDO',
        tratamiento: 'MITIGAR',
        acciones_mitigacion: 'Plan de rutas alternas, comunicación preventiva con líderes comunales y autoridades locales, y formalización expedita de actas de suspensión concertadas por causas no atribuibles al contratista.',
        mecanismo_transferencia: 'Cláusula de Suspensión por Fuerza Mayor o Caso Fortuito (Decreto 1082 de 2015).',
        periodicidad_monitoreo: 'Semanal',
        responsable_monitoreo: 'Director de Obra / Gestor Social del Proyecto'
      },
      {
        codigo_riesgo: 'RSK-LIQ-01',
        etapa: 'Liquidación',
        tipo: 'Operacional',
        descripcion_riesgo: 'Falta de conciliación oportuna de saldos contables, demoras en la emisión de paz y salvos y dilación en la suscripción del acta de liquidación bilateral dentro del término legal.',
        consecuencia_evento: 'Costos financieros adicionales por mantenimiento innecesario de pólizas de garantía y congelamiento del pago final de la retención contractual.',
        probabilidad: 2,
        impacto: 2,
        a_quien_se_asigna: 'COMPARTIDO',
        tratamiento: 'MITIGAR',
        acciones_mitigacion: 'Mesa de cierre financiero y técnico convocada con treinta (30) días de anticipación al vencimiento del plazo, con entrega consolidada de soportes y carpetas de archivo.',
        mecanismo_transferencia: 'Suscripción de Acta de Liquidación Bilateral conforme al Art. 11 de la Ley 1150 de 2007.',
        periodicidad_monitoreo: 'Hito de Cierre',
        responsable_monitoreo: 'Representante Legal / Contador / Interventoría'
      }
    ];

    // Inyecciones específicas por sector y objeto
    if (objeto.includes('obra') || objeto.includes('construc') || objeto.includes('infraestructura') || tipoContrato.toLowerCase().includes('obra')) {
      items.push({
        codigo_riesgo: 'RSK-OBR-01',
        etapa: 'Ejecución',
        tipo: 'Técnico/Geológico',
        descripcion_riesgo: 'Aparición de interferencias subterráneas no inventariadas (redes de acueducto/energía/gas) o inestabilidad imprevista del terreno geotécnico en excavaciones.',
        consecuencia_evento: 'Necesidad de obras adicionales, replanteo de cimentación y suspensión temporal de tramos constructivos.',
        probabilidad: 3,
        impacto: 4,
        a_quien_se_asigna: 'COMPARTIDO',
        tratamiento: 'MITIGAR',
        acciones_mitigacion: 'Sondeos y apiques exploratorios previos en coordinación con empresas de servicios públicos domiciliarios (ESP), plan de contingencia geotécnica.',
        mecanismo_transferencia: 'Póliza de Estabilidad de la Obra (Decreto 1082/2015) y Acta de Modificación / Adición aprobada por la Entidad.',
        periodicidad_monitoreo: 'Semanal',
        responsable_monitoreo: 'Ingeniero Residente / Especialista en Geotecnia'
      });
    }

    if (objeto.includes('salud') || objeto.includes('medicament') || objeto.includes('hospital') || objeto.includes('reactiv')) {
      items.push({
        codigo_riesgo: 'RSK-MED-01',
        etapa: 'Ejecución',
        tipo: 'Regulatorio/Sanitario',
        descripcion_riesgo: 'Pérdida de la cadena de frío durante el transporte o vencimiento extemporáneo de registros sanitarios INVIMA de lotes de insumos médicos.',
        consecuencia_evento: 'Rechazo inmediato del lote por la farmacia institucional y riesgo para la seguridad del paciente.',
        probabilidad: 1,
        impacto: 5,
        a_quien_se_asigna: 'CONTRATISTA',
        tratamiento: 'EVITAR',
        acciones_mitigacion: 'Monitores de temperatura con registro continuo por GPS (data-loggers calibrados), sustitución de lotes con vigencia superior a dieciocho (18) meses.',
        mecanismo_transferencia: 'Póliza de Calidad y Correcto Funcionamiento de los Bienes Suministrados.',
        periodicidad_monitoreo: 'Por Despacho',
        responsable_monitoreo: 'Químico Farmacéutico / Director Técnico'
      });
    }

    if (objeto.includes('software') || objeto.includes('nube') || objeto.includes('tecnolog') || objeto.includes('sistemas')) {
      items.push({
        codigo_riesgo: 'RSK-DAT-01',
        etapa: 'Ejecución',
        tipo: 'Tecnológico/Ciberseguridad',
        descripcion_riesgo: 'Indisponibilidad prolongada de la plataforma cloud o pérdida de integridad en la migración de bases de datos de producción.',
        consecuencia_evento: 'Interrupción de trámites a la ciudadanía y activación de cláusula penal pecuniaria por incumplimiento de Acuerdos de Niveles de Servicio (ANS).',
        probabilidad: 2,
        impacto: 4,
        a_quien_se_asigna: 'CONTRATISTA',
        tratamiento: 'MITIGAR',
        acciones_mitigacion: 'Ventanas de mantenimiento programadas en horario no hábil con rollback automatizado validado en ambiente staging previo al despliegue.',
        mecanismo_transferencia: 'Póliza de Cumplimiento y Responsabilidad Civil Profesional.',
        periodicidad_monitoreo: 'Continuo 24/7',
        responsable_monitoreo: 'Líder de Infraestructura y DevOps'
      });
    }

    // Calcular clasificaciones individuales
    return items.map((item, index) => {
      const calc = this.calcularNivelRiesgo(item.probabilidad, item.impacto);
      return {
        ...item,
        orden: index + 1,
        nivel_riesgo_calificacion: calc.calificacion,
        nivel_riesgo_categoria: calc.categoria,
        color: calc.color,
        badgeBg: calc.badgeBg,
        label_severidad: calc.label
      };
    });
  }

  /**
   * Genera el objeto consolidado de la Matriz de Riesgos
   */
  static generarMatrizRiesgos({ proceso, oferente, tipoContrato }) {
    const items = this.generarCatalogoRiesgos(proceso, oferente, tipoContrato);

    let riesgosExtremos = 0;
    let riesgosAltos = 0;
    let riesgosMedios = 0;
    let riesgosBajos = 0;

    let contratistaCount = 0;
    let entidadCount = 0;
    let compartidoCount = 0;

    items.forEach(it => {
      if (it.nivel_riesgo_categoria === 'EXTREMO') riesgosExtremos++;
      else if (it.nivel_riesgo_categoria === 'ALTO') riesgosAltos++;
      else if (it.nivel_riesgo_categoria === 'MEDIO') riesgosMedios++;
      else riesgosBajos++;

      if (it.a_quien_se_asigna === 'CONTRATISTA') contratistaCount++;
      else if (it.a_quien_se_asigna === 'ENTIDAD') entidadCount++;
      else compartidoCount++;
    });

    const valorEstimado = parseFloat(proceso.valor_estimado || proceso.cuantia || 0) || 0;

    const resumenEjecutivo = `La presente Matriz de Riesgos Contractuales ha sido estructurada en observancia estricta del Artículo 4 de la Ley 1150 de 2007, el Decreto 1082 de 2015 (Artículos 2.2.1.1.1.6.1 a 2.2.1.1.1.6.3) y la metodología M-ICR-01 de la Agencia Nacional de Contratación Pública - Colombia Compra Eficiente (ANCP-CCE). Se identificaron un total de ${items.length} riesgos previsibles tipificados en las etapas de Planeación, Ejecución y Liquidación. De estos, ${riesgosExtremos} tienen calificación Extrema, ${riesgosAltos} Alta, ${riesgosMedios} Media y ${riesgosBajos} Baja. La asignación del riesgo preserva el equilibrio económico del contrato: ${contratistaCount} riesgos asignados al Contratista, ${entidadCount} a la Entidad y ${compartidoCount} de carácter Compartido amparados mediante la Garantía Única de Cumplimiento y cláusulas de equilibrio contractual.`;

    return {
      matriz: {
        proceso_id: String(proceso.id || proceso.referencia || 'PROC-001'),
        numero_proceso: proceso.referencia || proceso.numero_proceso || 'PROCESO-SECOP',
        entidad_nombre: proceso.entidad || proceso.entidad_nombre || 'Entidad Estatal de Colombia',
        objeto_proceso: proceso.objeto || proceso.objeto_proceso || 'Objeto contractual de contratación estatal',
        tipo_contrato: tipoContrato || proceso.tipo_contrato || 'Servicios / Suministro',
        valor_estimado: valorEstimado,
        proponente_nit: oferente?.nit || '800.000.000-1',
        proponente_razon_social: oferente?.razon_social || 'CONTRATISTA SELECCIONADO S.A.S.',
        estado: 'BORRADOR',
        resumen_ejecutivo: resumenEjecutivo,
        total_riesgos: items.length,
        riesgos_extremos: riesgosExtremos,
        riesgos_altos: riesgosAltos,
        riesgos_medios: riesgosMedios,
        riesgos_bajos: riesgosBajos,
        distribucion_asignacion: {
          contratista: contratistaCount,
          entidad: entidadCount,
          compartido: compartidoCount
        }
      },
      items
    };
  }

  /**
   * Guarda o actualiza la Matriz de Riesgos en la Base de Datos PostgreSQL
   */
  static async guardarMatrizRiesgos({ matriz, items }) {
    const client = await dbPostgres.pool.connect();
    try {
      await client.query('BEGIN');

      // Buscar si ya existe una matriz para este proceso
      const checkRes = await client.query(
        'SELECT id FROM matriz_riesgos_proceso WHERE proceso_id = $1 LIMIT 1',
        [matriz.proceso_id]
      );

      let matrizId;
      if (checkRes.rows.length > 0) {
        matrizId = checkRes.rows[0].id;
        await client.query(`
          UPDATE matriz_riesgos_proceso
          SET numero_proceso = $1, entidad_nombre = $2, objeto_proceso = $3,
              tipo_contrato = $4, valor_estimado = $5, proponente_nit = $6,
              proponente_razon_social = $7, estado = $8, resumen_ejecutivo = $9,
              total_riesgos = $10, riesgos_extremos = $11, riesgos_altos = $12,
              riesgos_medios = $13, riesgos_bajos = $14, distribucion_asignacion = $15,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $16
        `, [
          matriz.numero_proceso,
          matriz.entidad_nombre,
          matriz.objeto_proceso,
          matriz.tipo_contrato,
          matriz.valor_estimado,
          matriz.proponente_nit,
          matriz.proponente_razon_social,
          matriz.estado || 'BORRADOR',
          matriz.resumen_ejecutivo,
          matriz.total_riesgos,
          matriz.riesgos_extremos,
          matriz.riesgos_altos,
          matriz.riesgos_medios,
          matriz.riesgos_bajos,
          JSON.stringify(matriz.distribucion_asignacion),
          matrizId
        ]);

        // Borrar items antiguos para refrescarlos limpiamente
        await client.query('DELETE FROM matriz_riesgos_items WHERE matriz_id = $1', [matrizId]);
      } else {
        const insertRes = await client.query(`
          INSERT INTO matriz_riesgos_proceso (
            proceso_id, numero_proceso, entidad_nombre, objeto_proceso,
            tipo_contrato, valor_estimado, proponente_nit, proponente_razon_social,
            estado, resumen_ejecutivo, total_riesgos, riesgos_extremos,
            riesgos_altos, riesgos_medios, riesgos_bajos, distribucion_asignacion
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING id
        `, [
          matriz.proceso_id,
          matriz.numero_proceso,
          matriz.entidad_nombre,
          matriz.objeto_proceso,
          matriz.tipo_contrato,
          matriz.valor_estimado,
          matriz.proponente_nit,
          matriz.proponente_razon_social,
          matriz.estado || 'BORRADOR',
          matriz.resumen_ejecutivo,
          matriz.total_riesgos,
          matriz.riesgos_extremos,
          matriz.riesgos_altos,
          matriz.riesgos_medios,
          matriz.riesgos_bajos,
          JSON.stringify(matriz.distribucion_asignacion)
        ]);
        matrizId = insertRes.rows[0].id;
      }

      // Insertar items
      for (const item of items) {
        const calc = this.calcularNivelRiesgo(item.probabilidad, item.impacto);
        await client.query(`
          INSERT INTO matriz_riesgos_items (
            matriz_id, codigo_riesgo, etapa, tipo, descripcion_riesgo,
            consecuencia_evento, probabilidad, impacto, nivel_riesgo_calificacion,
            nivel_riesgo_categoria, a_quien_se_asigna, tratamiento,
            acciones_mitigacion, mecanismo_transferencia, periodicidad_monitoreo,
            responsable_monitoreo
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
          matrizId,
          item.codigo_riesgo,
          item.etapa || 'Ejecución',
          item.tipo,
          item.descripcion_riesgo,
          item.consecuencia_evento,
          item.probabilidad,
          item.impacto,
          calc.calificacion,
          calc.categoria,
          item.a_quien_se_asigna,
          item.tratamiento || 'MITIGAR',
          item.acciones_mitigacion,
          item.mecanismo_transferencia || 'Garantía Única de Cumplimiento',
          item.periodicidad_monitoreo || 'Mensual',
          item.responsable_monitoreo || 'Director de Proyecto'
        ]);
      }

      await client.query('COMMIT');
      return { success: true, matrizId, proceso_id: matriz.proceso_id };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error al guardar matriz de riesgos:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene la matriz de riesgos guardada para un proceso
   */
  static async getMatrizRiesgos(procesoId) {
    const resMatriz = await dbPostgres.query(
      'SELECT * FROM matriz_riesgos_proceso WHERE proceso_id = $1 ORDER BY id DESC LIMIT 1',
      [procesoId]
    );

    if (resMatriz.rows.length === 0) return null;
    const matriz = resMatriz.rows[0];

    const resItems = await dbPostgres.query(
      'SELECT * FROM matriz_riesgos_items WHERE matriz_id = $1 ORDER BY id ASC',
      [matriz.id]
    );

    const items = resItems.rows.map(it => {
      const calc = this.calcularNivelRiesgo(it.probabilidad, it.impacto);
      return {
        ...it,
        color: calc.color,
        badgeBg: calc.badgeBg,
        label_severidad: calc.label
      };
    });

    return { matriz, items };
  }

  /**
   * Genera el HTML formateado oficial de la Matriz de Riesgos según ANCP-CCE
   */
  static generarMatrizRiesgosHtml({ matriz, items }) {
    const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const valorFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(matriz.valor_estimado || 0);

    const rowsHtml = items.map(it => `
      <tr>
        <td style="font-weight: bold; text-align: center; font-size: 11px;">${it.codigo_riesgo}</td>
        <td style="font-size: 11px;">${it.etapa}</td>
        <td style="font-size: 11px;"><b>${it.tipo}</b></td>
        <td style="font-size: 11px; text-align: justify;">${it.descripcion_riesgo}</td>
        <td style="font-size: 11px; text-align: justify;">${it.consecuencia_evento}</td>
        <td style="text-align: center; font-weight: bold; font-size: 11px;">${it.probabilidad}</td>
        <td style="text-align: center; font-weight: bold; font-size: 11px;">${it.impacto}</td>
        <td style="text-align: center; font-weight: bold; font-size: 11px;">${it.nivel_riesgo_calificacion}</td>
        <td style="text-align: center;">
          <span style="background: ${it.badgeBg}; color: ${it.color}; font-weight: bold; padding: 3px 8px; border-radius: 4px; font-size: 10px; border: 1px solid ${it.color};">
            ${it.nivel_riesgo_categoria}
          </span>
        </td>
        <td style="font-size: 11px; font-weight: bold; text-align: center;">${it.a_quien_se_asigna}</td>
        <td style="font-size: 11px; text-align: center;">${it.tratamiento}</td>
        <td style="font-size: 11px; text-align: justify;">${it.acciones_mitigacion}</td>
        <td style="font-size: 10px;">${it.mecanismo_transferencia || 'N/A'}</td>
        <td style="font-size: 10px; text-align: center;">${it.periodicidad_monitoreo}</td>
        <td style="font-size: 10px;">${it.responsable_monitoreo}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Matriz de Riesgos ANCP-CCE - Proceso ${matriz.numero_proceso}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #1e293b; margin: 30px; background: #fff; }
    .header-box { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
    .title { font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin: 0 0 4px 0; }
    .subtitle { font-size: 12px; color: #64748b; margin: 0; font-weight: 500; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 11px; }
    .meta-item b { color: #0f172a; display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .stats-bar { display: flex; gap: 10px; margin-bottom: 18px; }
    .stat-pill { flex: 1; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0; background: #f8fafc; }
    .stat-pill .num { font-size: 18px; font-weight: 800; }
    .stat-pill .lbl { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600; }
    .risk-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11px; }
    .risk-table th { background: #0f172a; color: #ffffff; padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #334155; }
    .risk-table td { padding: 6px 6px; border: 1px solid #e2e8f0; vertical-align: top; }
    .risk-table tr:nth-child(even) { background: #f8fafc; }
    .legal-note { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; border-radius: 4px; font-size: 11px; line-height: 1.5; color: #1e3a8a; margin-bottom: 24px; }
    .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
    .sig-line { border-top: 1px solid #0f172a; padding-top: 6px; font-size: 11px; }
  </style>
</head>
<body>
  <div class="header-box">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h1 class="title">MATRIZ DE RIESGOS CONTRACTUALES PREVISIBLES</h1>
        <p class="subtitle">Estructura oficial conforme al Manual M-ICR-01 de Colombia Compra Eficiente (ANCP-CCE) y Ley 1150 de 2007 (Art. 4)</p>
      </div>
      <div style="text-align: right; font-size: 11px; color: #64748b;">
        <b>Fecha de Expedición:</b> ${fecha}<br>
        <b>Estado:</b> ${matriz.estado || 'BORRADOR OFICIAL'}
      </div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><b>Entidad Contratante:</b> ${matriz.entidad_nombre}</div>
    <div class="meta-item"><b>Proceso No.:</b> ${matriz.numero_proceso}</div>
    <div class="meta-item"><b>Tipo de Contrato:</b> ${matriz.tipo_contrato}</div>
    <div class="meta-item"><b>Valor Estimado:</b> ${valorFormateado}</div>
    <div class="meta-item" style="grid-column: span 2;"><b>Proponente:</b> ${matriz.proponente_razon_social} (NIT: ${matriz.proponente_nit})</div>
    <div class="meta-item" style="grid-column: span 2;"><b>Objeto:</b> ${matriz.objeto_proceso}</div>
  </div>

  <div class="stats-bar">
    <div class="stat-pill"><div class="num" style="color: #0f172a;">${matriz.total_riesgos}</div><div class="lbl">Total Riesgos</div></div>
    <div class="stat-pill"><div class="num" style="color: #ef4444;">${matriz.riesgos_extremos}</div><div class="lbl">Extremos (≥16)</div></div>
    <div class="stat-pill"><div class="num" style="color: #f97316;">${matriz.riesgos_altos}</div><div class="lbl">Altos (9-15)</div></div>
    <div class="stat-pill"><div class="num" style="color: #f59e0b;">${matriz.riesgos_medios}</div><div class="lbl">Medios (5-8)</div></div>
    <div class="stat-pill"><div class="num" style="color: #10b981;">${matriz.riesgos_bajos}</div><div class="lbl">Bajos (≤4)</div></div>
    <div class="stat-pill"><div class="num" style="color: #3b82f6;">${matriz.distribucion_asignacion?.contratista || 0} / ${matriz.distribucion_asignacion?.entidad || 0} / ${matriz.distribucion_asignacion?.compartido || 0}</div><div class="lbl">Contratista / Entidad / Comp.</div></div>
  </div>

  <div class="legal-note">
    <b>MARCO DE LEGALIDAD Y ASIGNACIÓN EQUITATIVA:</b><br>
    ${matriz.resumen_ejecutivo}
  </div>

  <table class="risk-table">
    <thead>
      <tr>
        <th style="width: 45px; text-align: center;">Cód.</th>
        <th style="width: 55px;">Etapa</th>
        <th style="width: 80px;">Tipo</th>
        <th>Descripción del Riesgo</th>
        <th>Consecuencia</th>
        <th style="width: 25px; text-align: center;">P</th>
        <th style="width: 25px; text-align: center;">I</th>
        <th style="width: 25px; text-align: center;">P×I</th>
        <th style="width: 60px; text-align: center;">Categoría</th>
        <th style="width: 75px; text-align: center;">Asignado A</th>
        <th style="width: 65px; text-align: center;">Tratamiento</th>
        <th>Acciones de Mitigación</th>
        <th style="width: 85px;">Garantía / Mecanismo</th>
        <th style="width: 55px; text-align: center;">Monitoreo</th>
        <th style="width: 80px;">Responsable</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="signature-grid">
    <div>
      <div class="sig-line">
        <b>POR EL PROPONENTE / CONTRATISTA:</b><br>
        Firma Representante Legal: ________________________________<br>
        Razón Social: ${matriz.proponente_razon_social}<br>
        NIT: ${matriz.proponente_nit}
      </div>
    </div>
    <div>
      <div class="sig-line">
        <b>POR LA ENTIDAD ESTATAL / SUPERVISIÓN:</b><br>
        Firma Ordenador del Gasto / Interventoría: ________________________________<br>
        Entidad: ${matriz.entidad_nombre}<br>
        Proceso: ${matriz.numero_proceso}
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Genera el documento PDF formal con diseño apaisado (Landscape) para tabla legal completa
   */
  static generarMatrizRiesgosPdf({ matriz, items }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          layout: 'landscape',
          margin: 30
        });

        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const valorFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(matriz.valor_estimado || 0);

        // Encabezado
        doc.fontSize(8).fillColor('#64748b').text('REPÚBLICA DE COLOMBIA • CONTRATACIÓN PÚBLICA (ANCP-CCE)', 30, 25);
        doc.fontSize(14).fillColor('#0f172a').font('Helvetica-Bold').text('MATRIZ DE RIESGOS CONTRACTUALES PREVISIBLES', 30, 38);
        doc.fontSize(8).fillColor('#475569').font('Helvetica').text('Conforme al Manual M-ICR-01 de Colombia Compra Eficiente y el Art. 4 de la Ley 1150 de 2007', 30, 54);

        doc.rect(550, 25, 210, 40).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fontSize(7).fillColor('#64748b').text('PROCESO / REFERENCIA:', 555, 30);
        doc.fontSize(9).fillColor('#0f172a').font('Helvetica-Bold').text(matriz.numero_proceso || 'PROCESO-SECOP', 555, 40);
        doc.fontSize(7).fillColor('#64748b').font('Helvetica').text(`Valor: ${valorFormateado} | Estado: ${matriz.estado || 'BORRADOR'}`, 555, 52);

        // Caja de Metadatos
        doc.rect(30, 72, 730, 42).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fillColor('#0f172a').fontSize(7);
        doc.font('Helvetica-Bold').text('ENTIDAD:', 35, 76).font('Helvetica').text(matriz.entidad_nombre || 'N/A', 75, 76);
        doc.font('Helvetica-Bold').text('PROPONENTE:', 35, 88).font('Helvetica').text(`${matriz.proponente_razon_social} (NIT: ${matriz.proponente_nit})`, 95, 88);
        doc.font('Helvetica-Bold').text('OBJETO:', 35, 100).font('Helvetica').text((matriz.objeto_proceso || '').slice(0, 140) + '...', 75, 100);

        doc.font('Helvetica-Bold').text(`TOTAL RIESGOS: ${matriz.total_riesgos}`, 480, 76);
        doc.font('Helvetica').text(`Extremos: ${matriz.riesgos_extremos} | Altos: ${matriz.riesgos_altos} | Medios: ${matriz.riesgos_medios} | Bajos: ${matriz.riesgos_bajos}`, 480, 88);
        doc.font('Helvetica').text(`Asignación: Contratista (${matriz.distribucion_asignacion?.contratista || 0}) | Entidad (${matriz.distribucion_asignacion?.entidad || 0}) | Compartido (${matriz.distribucion_asignacion?.compartido || 0})`, 480, 100);

        // Tabla de Riesgos (Columnas calibradas para Landscape 730px ancho útil)
        let currentY = 122;

        const drawTableHeader = (y) => {
          doc.rect(30, y, 730, 18).fill('#0f172a');
          doc.fillColor('#ffffff').fontSize(6.5).font('Helvetica-Bold');
          doc.text('CÓD.', 34, y + 5, { width: 35 });
          doc.text('ETAPA', 72, y + 5, { width: 40 });
          doc.text('TIPO', 115, y + 5, { width: 55 });
          doc.text('DESCRIPCIÓN DEL RIESGO', 173, y + 5, { width: 150 });
          doc.text('P', 326, y + 5, { width: 10, align: 'center' });
          doc.text('I', 339, y + 5, { width: 10, align: 'center' });
          doc.text('P×I', 352, y + 5, { width: 15, align: 'center' });
          doc.text('NIVEL', 370, y + 5, { width: 45, align: 'center' });
          doc.text('ASIGNADO A', 418, y + 5, { width: 55, align: 'center' });
          doc.text('ACCIONES DE MITIGACIÓN Y TRANSFERENCIA', 476, y + 5, { width: 195 });
          doc.text('RESPONSABLE', 674, y + 5, { width: 80 });
        };

        drawTableHeader(currentY);
        currentY += 18;

        items.forEach((item, idx) => {
          // Altura estimada por ítem
          const rowHeight = 32;

          // Salto de página si excede el límite
          if (currentY + rowHeight > 540) {
            doc.addPage({ size: 'LETTER', layout: 'landscape', margin: 30 });
            currentY = 30;
            drawTableHeader(currentY);
            currentY += 18;
          }

          // Fondo alternado
          if (idx % 2 === 0) {
            doc.rect(30, currentY, 730, rowHeight).fill('#f8fafc');
          } else {
            doc.rect(30, currentY, 730, rowHeight).fill('#ffffff');
          }
          doc.rect(30, currentY, 730, rowHeight).stroke('#e2e8f0');

          doc.fillColor('#0f172a').fontSize(6).font('Helvetica-Bold');
          doc.text(item.codigo_riesgo, 34, currentY + 4, { width: 35 });

          doc.font('Helvetica').fillColor('#334155');
          doc.text(item.etapa, 72, currentY + 4, { width: 40 });
          doc.font('Helvetica-Bold').text(item.tipo, 115, currentY + 4, { width: 55 });

          doc.font('Helvetica').fontSize(5.5).fillColor('#1e293b');
          doc.text(item.descripcion_riesgo, 173, currentY + 3, { width: 150, height: 26, ellipsis: true });

          doc.fontSize(6).font('Helvetica-Bold').text(String(item.probabilidad), 326, currentY + 6, { width: 10, align: 'center' });
          doc.text(String(item.impacto), 339, currentY + 6, { width: 10, align: 'center' });
          doc.text(String(item.nivel_riesgo_calificacion), 352, currentY + 6, { width: 15, align: 'center' });

          // Badge categoría
          const badgeColor = item.color || '#10b981';
          doc.rect(370, currentY + 5, 45, 12).fill(badgeColor);
          doc.fillColor('#ffffff').fontSize(5.5).font('Helvetica-Bold').text(item.nivel_riesgo_categoria, 370, currentY + 8, { width: 45, align: 'center' });

          doc.fillColor('#0f172a').fontSize(6).font('Helvetica-Bold').text(item.a_quien_se_asigna, 418, currentY + 6, { width: 55, align: 'center' });

          const mitigacionTexto = `${item.acciones_mitigacion} | Garantía: ${item.mecanismo_transferencia || 'Póliza de Cumplimiento'}`;
          doc.font('Helvetica').fontSize(5.5).fillColor('#334155');
          doc.text(mitigacionTexto, 476, currentY + 3, { width: 195, height: 26, ellipsis: true });

          doc.fontSize(5.5).fillColor('#475569').text(item.responsable_monitoreo || 'Director de Proyecto', 674, currentY + 6, { width: 80, height: 22, ellipsis: true });

          currentY += rowHeight;
        });

        // Firmas y cierre
        if (currentY + 50 > 560) {
          doc.addPage({ size: 'LETTER', layout: 'landscape', margin: 30 });
          currentY = 40;
        } else {
          currentY += 15;
        }

        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text('ACEPTACIÓN VINCULANTE DE LA DISTRIBUCIÓN DEL RIESGO (Ley 1150 de 2007 Art. 4):', 30, currentY);
        currentY += 10;
        doc.fontSize(5.5).font('Helvetica').fillColor('#64748b').text('El proponente certifica que ha valorado y asume la distribución de riesgos contenida en la presente matriz, manifestando que su propuesta económica contempla los costos de mitigación y primas de seguros correspondientes.', 30, currentY, { width: 730 });

        currentY += 22;
        doc.moveTo(50, currentY).lineTo(300, currentY).stroke('#0f172a');
        doc.moveTo(450, currentY).lineTo(700, currentY).stroke('#0f172a');

        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text(`POR EL PROPONENTE: ${matriz.proponente_razon_social}`, 50, currentY + 4);
        doc.fontSize(6).font('Helvetica').text(`NIT: ${matriz.proponente_nit} • Representante Legal`, 50, currentY + 14);

        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text(`POR LA ENTIDAD ESTATAL: ${matriz.entidad_nombre}`, 450, currentY + 4);
        doc.fontSize(6).font('Helvetica').text(`Supervisión / Ordenador del Gasto • Proceso: ${matriz.numero_proceso}`, 450, currentY + 14);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Genera el archivo Excel (.xlsx) estructurado oficial de Matriz de Riesgos CONPES 3714 / ANCP-CCE
   * @param {{ matriz: Object, items: Array }} param0
   * @returns {Promise<Buffer>}
   */
  static async generarMatrizRiesgosExcel({ matriz, items = [] }) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Radar SECOP - NIKADU IA';
    workbook.lastModifiedBy = 'Radar SECOP';
    workbook.created = new Date();
    workbook.modified = new Date();

    const fCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);

    // -----------------------------------------------------------------
    // HOJA 1: RESUMEN EJECUTIVO Y TIPOLOGÍA CONPES 3714
    // -----------------------------------------------------------------
    const wsResumen = workbook.addWorksheet('1. Resumen CONPES 3714');
    wsResumen.views = [{ showGridLines: true }];
    wsResumen.columns = [{ width: 28 }, { width: 35 }, { width: 22 }, { width: 30 }];

    wsResumen.mergeCells('A1:D1');
    wsResumen.getCell('A1').value = 'REPÚBLICA DE COLOMBIA • AGENCIA NACIONAL DE CONTRATACIÓN PÚBLICA (ANCP-CCE)';
    wsResumen.getCell('A1').font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
    wsResumen.getCell('A1').alignment = { horizontal: 'center' };

    wsResumen.mergeCells('A2:D2');
    wsResumen.getCell('A2').value = 'MATRIZ DE TIPIFICACIÓN, ESTIMACIÓN Y ASIGNACIÓN DE RIESGOS PREVISIBLES';
    wsResumen.getCell('A2').font = { size: 12, bold: true, color: { argb: 'FF0F172A' } };
    wsResumen.getCell('A2').alignment = { horizontal: 'center' };

    wsResumen.mergeCells('A3:D3');
    wsResumen.getCell('A3').value = 'Documento CONPES 3714 • Ley 1150 de 2007 Art. 4 • Decreto 1082 de 2015';
    wsResumen.getCell('A3').font = { size: 8, italic: true, color: { argb: 'FF475569' } };
    wsResumen.getCell('A3').alignment = { horizontal: 'center' };

    wsResumen.addRow([]);
    wsResumen.addRow(['NÚMERO DE PROCESO:', matriz.numero_proceso || 'PROCESO-001', 'FECHA DE REVISIÓN:', new Date().toLocaleDateString('es-CO')]);
    wsResumen.addRow(['ENTIDAD CONTRATANTE:', matriz.entidad_nombre || 'Entidad Estatal', 'TIPO DE CONTRATO:', matriz.tipo_contrato || 'Obra Pública']);
    wsResumen.addRow(['PROPONENTE / ADJUDICATARIO:', matriz.proponente_razon_social || 'Contratista', 'NIT PROPONENTE:', matriz.proponente_nit || '900.000.000-1']);
    wsResumen.addRow(['VALOR ESTIMADO CONTRATO:', fCOP(matriz.valor_estimado), 'TOTAL RIESGOS TIPIFICADOS:', `${items.length} Riesgos`]);

    ['A5', 'A6', 'A7', 'A8', 'C5', 'C6', 'C7', 'C8'].forEach(c => {
      wsResumen.getCell(c).font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
    });

    wsResumen.addRow([]);
    wsResumen.addRow(['CONSOLIDADO Y BALANCES DE SEVERIDAD']);
    wsResumen.getCell('A10').font = { bold: true, size: 11, color: { argb: 'FF1E3A8A' } };

    wsResumen.addRow(['CATEGORÍA SEVERIDAD', 'CANTIDAD RIESGOS', 'PORCENTAJE (%)', 'IMPACTO EN EQUILIBRIO']);
    wsResumen.getRow(11).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ['A11', 'B11', 'C11', 'D11'].forEach(c => {
      wsResumen.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    });

    const tot = items.length || 1;
    wsResumen.addRow(['Riesgos Extremos (≥16)', matriz.riesgos_extremos || 0, `${((matriz.riesgos_extremos || 0) / tot * 100).toFixed(1)}%`, 'Mitigación obligatoria y amparo de póliza']);
    wsResumen.addRow(['Riesgos Altos (9-15)', matriz.riesgos_altos || 0, `${((matriz.riesgos_altos || 0) / tot * 100).toFixed(1)}%`, 'Monitoreo activo quincenal']);
    wsResumen.addRow(['Riesgos Medios (5-8)', matriz.riesgos_medios || 0, `${((matriz.riesgos_medios || 0) / tot * 100).toFixed(1)}%`, 'Controles preventivos operacionales']);
    wsResumen.addRow(['Riesgos Bajos (≤4)', matriz.riesgos_bajos || 0, `${((matriz.riesgos_bajos || 0) / tot * 100).toFixed(1)}%`, 'Aceptables con controles de rutina']);

    wsResumen.getCell('A12').font = { bold: true, color: { argb: 'FFEF4444' } };
    wsResumen.getCell('A13').font = { bold: true, color: { argb: 'FFF97316' } };
    wsResumen.getCell('A14').font = { bold: true, color: { argb: 'FFF59E0B' } };
    wsResumen.getCell('A15').font = { bold: true, color: { argb: 'FF10B981' } };

    wsResumen.addRow([]);
    wsResumen.addRow(['DISTRIBUCIÓN Y ASIGNACIÓN CONTRACTUAL (Art. 4 Ley 1150/2007)']);
    wsResumen.getCell('A17').font = { bold: true, size: 11, color: { argb: 'FF1E3A8A' } };

    wsResumen.addRow(['SUJETO OBLIGADO', 'TOTAL ASIGNADOS', 'PARTICIPACIÓN (%)', 'MECANISMO DE ABSORCIÓN']);
    wsResumen.getRow(18).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ['A18', 'B18', 'C18', 'D18'].forEach(c => {
      wsResumen.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    });

    const dist = matriz.distribucion_asignacion || {};
    wsResumen.addRow(['Contratista', dist.contratista || 0, `${((dist.contratista || 0) / tot * 100).toFixed(1)}%`, 'Garantía Única de Cumplimiento / RCE / AIU']);
    wsResumen.addRow(['Entidad Estatal', dist.entidad || 0, `${((dist.entidad || 0) / tot * 100).toFixed(1)}%`, 'Presupuesto oficial y reequilibrio económico']);
    wsResumen.addRow(['Compartido', dist.compartido || 0, `${((dist.compartido || 0) / tot * 100).toFixed(1)}%`, 'Cláusulas de indexación y acuerdos bilaterales']);

    // -----------------------------------------------------------------
    // HOJA 2: MATRIZ DE RIESGOS CONPES 3714 (17 COLUMNAS ESTÁNDAR)
    // -----------------------------------------------------------------
    const wsMatriz = workbook.addWorksheet('2. Matriz CONPES 3714');
    wsMatriz.views = [{ showGridLines: true }];

    wsMatriz.columns = [
      { key: 'orden', width: 6 },
      { key: 'codigo', width: 14 },
      { key: 'clase', width: 12 },
      { key: 'fuente', width: 12 },
      { key: 'etapa', width: 12 },
      { key: 'tipo', width: 18 },
      { key: 'descripcion', width: 38 },
      { key: 'consecuencia', width: 32 },
      { key: 'p_ini', width: 8 },
      { key: 'i_ini', width: 8 },
      { key: 'val_ini', width: 10 },
      { key: 'cat_ini', width: 12 },
      { key: 'asignado', width: 14 },
      { key: 'tratamiento', width: 12 },
      { key: 'mitigacion', width: 38 },
      { key: 'transferencia', width: 28 },
      { key: 'responsable', width: 24 }
    ];

    wsMatriz.mergeCells('A1:Q1');
    wsMatriz.getCell('A1').value = `MATRIZ DETALLADA DE RIESGOS PREVISIBLES (CONPES 3714) - PROCESO: ${matriz.numero_proceso || ''}`;
    wsMatriz.getCell('A1').font = { size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    wsMatriz.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    wsMatriz.getCell('A1').alignment = { horizontal: 'center' };

    const header = wsMatriz.addRow([
      'No.', 'CÓDIGO', 'CLASE', 'FUENTE', 'ETAPA', 'TIPO', 'DESCRIPCIÓN DEL RIESGO', 'CONSECUENCIA',
      'PROB', 'IMP', 'VALORAC.', 'SEVERIDAD', 'A QUIÉN SE ASIGNA', 'TRATAMIENTO', 'ACCIONES DE MITIGACIÓN',
      'MECANISMO TRANSFERENCIA', 'RESPONSABLE MONITOREO'
    ]);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 8 };
    for (let c = 1; c <= 17; c++) {
      header.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      header.getCell(c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }

    items.forEach((it, idx) => {
      const calc = RiskMatrixEngine.calcularNivelRiesgo(it.probabilidad, it.impacto);
      const row = wsMatriz.addRow([
        idx + 1,
        it.codigo_riesgo,
        it.clase || 'Específico',
        it.fuente || (it.a_quien_se_asigna === 'ENTIDAD' ? 'Interno' : 'Externo'),
        it.etapa,
        it.tipo,
        it.descripcion_riesgo,
        it.consecuencia_evento,
        it.probabilidad,
        it.impacto,
        calc.calificacion,
        calc.categoria,
        it.a_quien_se_asigna,
        it.tratamiento,
        it.acciones_mitigacion,
        it.mecanismo_transferencia,
        it.responsable_monitoreo
      ]);

      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(9).alignment = { horizontal: 'center' };
      row.getCell(10).alignment = { horizontal: 'center' };
      row.getCell(11).alignment = { horizontal: 'center' };
      row.getCell(12).alignment = { horizontal: 'center' };
      row.getCell(13).alignment = { horizontal: 'center' };
      row.getCell(14).alignment = { horizontal: 'center' };

      // Colores de severidad
      if (calc.categoria === 'EXTREMO') {
        row.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
        row.getCell(12).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      } else if (calc.categoria === 'ALTO') {
        row.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } };
        row.getCell(12).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      } else if (calc.categoria === 'MEDIO') {
        row.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
        row.getCell(12).font = { bold: true, color: { argb: 'FF0F172A' } };
      } else {
        row.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
        row.getCell(12).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      }
    });

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = RiskMatrixEngine;
