/**
 * Motor de Auditoría Legal, Subsanabilidad y Detección de Causales de Rechazo Insubsanables
 * Normativa: Ley 80/1993, Ley 1150/2007 (Art. 5 Par. 1), Ley 1882/2018 (Art. 5),
 * Decreto 1082/2015, Pliegos Tipo ANCP-CCE y Conceptos C-057/2026, C-1376/2025, C-525/2026, C-933/2026.
 */

class SubsanabilidadEngine {
  constructor() {
    // Causales de rechazo insubsanables taxativas según Ley 1882/2018 y Pliegos Tipo
    this.causalesInsubsanables = [
      {
        codigo: 'RECHAZO_PUNTAJE_MODIFICADO',
        nombre: 'Modificación de elementos asignatarios de puntaje',
        fundamento: 'Ley 1150/2007 Art. 5; Ley 1882/2018 Art. 5; Concepto C-1376/2025',
        descripcion: 'Alterar la oferta económica, el valor unitario o cualquier factor técnico que otorgue puntaje ponderable en etapa de subsanación.',
        tipo: 'INSUBSANABLE'
      },
      {
        codigo: 'RECHAZO_RUP_CESACION_EFECTOS',
        nombre: 'Cesación de efectos del RUP o falta de firmeza pre-cierre',
        fundamento: 'Decreto 1082/2015 Art. 2.2.1.1.1.5.1; Conceptos C-423/2021, C-525/2026 y C-933/2026',
        descripcion: 'No haber radicado la renovación del RUP dentro del 5° día hábil de abril o presentar inscripción nueva sin firmeza antes del cierre.',
        tipo: 'INSUBSANABLE'
      },
      {
        codigo: 'RECHAZO_CIRCUNSTANCIA_POST_CIERRE',
        nombre: 'Hecho o circunstancia ocurrida con posterioridad al cierre',
        fundamento: 'Ley 1882/2018 Art. 5 Par. 1; Consejo de Estado Sec. Tercera; Concepto C-057/2026',
        descripcion: 'Pretender acreditar una experiencia, grado académico o situación patrimonial cuya ocurrencia material fue posterior a la fecha de cierre.',
        tipo: 'INSUBSANABLE'
      },
      {
        codigo: 'RECHAZO_INHABILIDAD_LEGAL',
        nombre: 'Inhabilidad, incompatibilidad o conflicto de interés',
        fundamento: 'Constitución Política Art. 122; Ley 80/1993 Art. 8; Ley 1474/2011',
        descripcion: 'Reporte activo en Boletín Fiscal (CGR), Antecedentes Disciplinarios (PGN) o Medidas Correctivas.',
        tipo: 'INSUBSANABLE'
      },
      {
        codigo: 'RECHAZO_NO_SUBSANACION_PLAZO',
        nombre: 'No subsanar dentro del término perentorio de traslado',
        fundamento: 'Ley 1882/2018 Art. 5; Pliegos Tipo ANCP-CCE',
        descripcion: 'Vencimiento del plazo improrrogable otorgado por la entidad sin adjuntar la aclaración o soporte requerido.',
        tipo: 'INSUBSANABLE'
      }
    ];

    // Reglas de subsanabilidad plena (Derecho sustancial vs formalismo ritual)
    this.reglasSubsanables = [
      {
        codigo: 'SUBSANABLE_FECHA_DOCUMENTO_POSTERIOR',
        nombre: 'Certificado expedido con fecha posterior al cierre',
        doctrina: 'Conceptos C-057/2026 y C-1376/2025 ANCP-CCE',
        regla: 'VÁLIDO Y SUBSANABLE: La ley exige que el HECHO (terminación del contrato o grado) haya ocurrido antes del cierre. El DOCUMENTO probatorio puede tener fecha posterior.'
      },
      {
        codigo: 'SUBSANABLE_RUP_CONSULTA_PUBLICA',
        nombre: 'Falta de adjuntar copia física o PDF del RUP o Cámara de Comercio',
        doctrina: 'Decreto Ley 019/2012 Art. 15; Ley 1450/2011 Art. 227; Concepto C-525/2026',
        regla: 'VÁLIDO Y SUBSANABLE: La entidad tiene el deber legal de verificar en línea los registros públicos. No puede descalificar por omisión de adjuntar el archivo si está en firme.'
      },
      {
        codigo: 'SUBSANABLE_POLIZA_SERIEDAD_ACLARACION',
        nombre: 'Inconsistencias formales o falta de recibo de pago en garantía de seriedad',
        doctrina: 'Concepto C-410/2022 y C-702/2024 ANCP-CCE',
        regla: 'VÁLIDO Y SUBSANABLE: Errores tipográficos, falta de certificación de pago o anexos de la póliza pueden aclararse o subsanarse, siempre que la cobertura material ampare desde el cierre.'
      },
      {
        codigo: 'SUBSANABLE_CERTIFICACION_PARAFISCALES',
        nombre: 'Certificación de aportes parafiscales y seguridad social',
        doctrina: 'Ley 1150/2007 Art. 5; Concepto C-312/2023',
        regla: 'VÁLIDO Y SUBSANABLE: La omisión de la firma del revisor fiscal o del representante legal se puede subsanar hasta antes de la adjudicación.'
      }
    ];
  }

  /**
   * Audita una oferta o requerimiento de la entidad y diagnostica si es subsanable o causal de rechazo.
   * 
   * @param {Object} caso - {
   *   tipoRequisito: 'HABILITANTE' | 'PUNTAJE',
   *   afectaPuntaje: boolean,
   *   fechaHecho: string (YYYY-MM-DD),
   *   fechaDocumento: string (YYYY-MM-DD),
   *   fechaCierreProceso: string (YYYY-MM-DD),
   *   categoria: string,
   *   descripcion: string
   * }
   */
  diagnoseCompliance(caso) {
    const {
      afectaPuntaje = false,
      fechaHecho = null,
      fechaDocumento = null,
      fechaCierreProceso = null,
      categoria = 'EXPERIENCIA',
      descripcion = ''
    } = caso;

    const alertas = [];
    const fundamentosDoctrinales = [];

    // 1. Regla de Oro: ¿Afecta puntaje?
    if (afectaPuntaje) {
      return {
        calificacion: 'RECHAZO_INSUBSANABLE',
        esSubsanable: false,
        motivo: 'El requisito o documento solicitado modifica o impacta factores de asignación de puntaje.',
        fundamentoLegal: 'Ley 1150 de 2007 Art. 5; Ley 1882 de 2018 Art. 5; Concepto C-1376 de 2025 ANCP-CCE.',
        recomendacionDefensa: 'No es jurídicamente viable modificar la oferta económica o técnica con posterioridad al cierre. Debe defenderse la propuesta original sin alteraciones.'
      };
    }

    // 2. Evaluación Temporal: Hecho vs Documento
    let fechaHechoDate = fechaHecho ? new Date(fechaHecho) : null;
    let fechaCierreDate = fechaCierreProceso ? new Date(fechaCierreProceso) : null;
    let fechaDocDate = fechaDocumento ? new Date(fechaDocumento) : null;

    if (fechaHechoDate && fechaCierreDate) {
      if (fechaHechoDate > fechaCierreDate) {
        return {
          calificacion: 'RECHAZO_INSUBSANABLE',
          esSubsanable: false,
          motivo: 'El hecho material habilitante (ej. liquidación del contrato, grado profesional o balance) ocurrió DESPUÉS del cierre del proceso licitatorio.',
          fundamentoLegal: 'Ley 1882 de 2018 Art. 5 Par. 1; Consejo de Estado Sec. Tercera; Concepto C-057 de 2026 ANCP-CCE.',
          recomendacionDefensa: 'Causal de rechazo no saneable. La capacidad habilitante debe estar consolidada antes del vencimiento del plazo de presentación de ofertas.'
        };
      }
    }

    // 3. Caso especial: Documento con fecha posterior pero hecho anterior
    if (fechaDocDate && fechaCierreDate && fechaHechoDate) {
      if (fechaDocDate > fechaCierreDate && fechaHechoDate <= fechaCierreDate) {
        fundamentosDoctrinales.push({
          principio: 'Prevalencia del Derecho Sustancial sobre las Formas (Art. 228 CP)',
          regla: 'La fecha de expedición del documento probatorio es irrelevante si el hecho acreditado ocurrió antes del cierre.',
          doctrinaAplicable: 'Concepto C-057 de 2026 y C-1376 de 2025 ANCP-CCE'
        });
      }
    }

    // 4. Diagnóstico de Subsanabilidad Plena
    return {
      calificacion: 'PLENAMENTE_SUBSANABLE',
      esSubsanable: true,
      motivo: 'Requisito habilitante que no otorga puntaje y cuya condición material ocurrió antes del cierre. La Entidad Estatal tiene el DEBER LEGAL de requerir y aceptar la subsanación.',
      fundamentoLegal: 'Ley 80 de 1993 Art. 25 Num. 15; Ley 1150 de 2007 Art. 5 Par. 1 (modificado por Ley 1882 de 2018); Decreto Ley 019 de 2012 Art. 15.',
      doctrinas: fundamentosDoctrinales,
      plantillaRespuesta: `Señores Comité Evaluador:\nEn atención al requerimiento de subsanación formulado y al amparo del artículo 5 de la Ley 1150 de 2007 (modificado por la Ley 1882 de 2018), el artículo 228 de la Constitución Política y la doctrina reiterada de Colombia Compra Eficiente (Conceptos C-057/2026 y C-525/2026), nos permitimos allegar el soporte solicitado. Reiteramos que el hecho habilitante acaeció de forma previa al cierre del proceso licitatorio, por lo cual este aporte no constituye mejora de la oferta, garantizando la prevalencia del derecho sustancial sobre formalismos rituales.`
    };
  }

  /**
   * Retorna el catálogo completo de reglas de subsanabilidad y causales de rechazo
   */
  getCatalog() {
    return {
      insubsanables: this.causalesInsubsanables,
      subsanables: this.reglasSubsanables
    };
  }
}

module.exports = new SubsanabilidadEngine();
