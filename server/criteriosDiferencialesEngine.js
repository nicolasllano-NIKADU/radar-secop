/**
 * ====================================================================
 * RADAR SECOP - MOTOR DE CRITERIOS DIFERENCIALES MIPYMES Y GÉNERO
 * Marco Normativo y Jurisprudencial:
 * - Ley 2069 de 2020 (Ley de Emprendimiento, Arts. 30, 31, 32 y 35)
 * - Decreto 1860 de 2021 (Reglamentario de Criterios Diferenciales e Incentivos de Género)
 * - Decreto 957 de 2019 (Clasificación de Tamaño Empresarial por Ingresos en UVT)
 * - Decreto 1082 de 2015 (Art. 2.2.1.2.4.2.14 y Reglas de Desempate)
 * - Ley 816 de 2003 (Protección a la Industria Nacional)
 * - Decreto 392 de 2018 (Incentivo a la Vinculación Laboral de Personas con Discapacidad)
 * ====================================================================
 */

const PDFDocument = require('pdfkit');

class CriteriosDiferencialesEngine {
  constructor() {
    this.VALOR_UVT_DEFAULT = 49799; // UVT aplicable (referencia 2026)
    this.UMBRAL_LIMITACION_MIPYME_USD = 125000; // USD 125.000 Art. 30 Ley 2069/2020
    this.TRM_REFERENCIA = 4200; // TRM aproximada para umbral de limitación ($525M COP)

    // Umbrales en UVT según Decreto 957 de 2019
    this.TABLA_UVT = {
      MANUFACTURA: {
        MICRO_MAX: 23563,
        PEQUENA_MAX: 204995,
        MEDIANA_MAX: 1736565
      },
      SERVICIOS: {
        MICRO_MAX: 32988,
        PEQUENA_MAX: 131951,
        MEDIANA_MAX: 483034
      },
      COMERCIO: {
        MICRO_MAX: 44769,
        PEQUENA_MAX: 431196,
        MEDIANA_MAX: 2160692
      }
    };
  }

  /**
   * Determina la categoría de la empresa según el Decreto 957 de 2019
   */
  clasificarTamanoEmpresa(ingresosCop = 0, sector = 'SERVICIOS', valorUvt = null) {
    const uvt = valorUvt || this.VALOR_UVT_DEFAULT;
    const ingresos = Math.max(0, parseFloat(ingresosCop) || 0);
    const ingresosUvt = Number((ingresos / uvt).toFixed(2));
    const sec = (sector || 'SERVICIOS').toUpperCase();
    const tabla = this.TABLA_UVT[sec] || this.TABLA_UVT.SERVICIOS;

    let categoria = 'GRAN_EMPRESA';
    let label = 'Gran Empresa';

    if (ingresosUvt <= tabla.MICRO_MAX) {
      categoria = 'MICRO';
      label = 'Microempresa';
    } else if (ingresosUvt <= tabla.PEQUENA_MAX) {
      categoria = 'PEQUEÑA';
      label = 'Pequeña Empresa';
    } else if (ingresosUvt <= tabla.MEDIANA_MAX) {
      categoria = 'MEDIANA';
      label = 'Mediana Empresa';
    }

    const esMipyme = categoria !== 'GRAN_EMPRESA';

    return {
      sector: sec,
      ingresos_cop: ingresos,
      ingresos_uvt: ingresosUvt,
      valor_uvt_aplicado: uvt,
      categoria,
      categoria_label: label,
      es_mipyme: esMipyme,
      limite_uvt_categoria: categoria === 'MICRO' ? tabla.MICRO_MAX : (categoria === 'PEQUEÑA' ? tabla.PEQUENA_MAX : tabla.MEDIANA_MAX)
    };
  }

  /**
   * Evalúa el cumplimiento de los supuestos del Decreto 1860 de 2021 para Empresas de Mujeres
   */
  evaluarEmpresaMujeres(params = {}) {
    const {
      supuesto = 'NINGUNO', // SUPUESTO_A_PROPIEDAD_CONTROL, SUPUESTO_B_DIRECCION, SUPUESTO_C_PERSONA_NATURAL, SUPUESTO_D_ASOCIATIVO, NINGUNO
      porcentajePropiedadFemenina = 0,
      representanteMujerMasUnAno = false,
      porcentajeDirectivoFemenino = 0,
      esPersonaNaturalMujer = false,
      porcentajeAsociadosMujeres = 0
    } = params;

    let esEmpresaMujeres = false;
    let supuestoAcreditado = 'NINGUNO';
    let detalleFundamento = 'No acredita los requisitos del Decreto 1860 de 2021.';
    let puntajeIncentivo = 0.0;

    if (supuesto === 'SUPUESTO_A_PROPIEDAD_CONTROL' || (porcentajePropiedadFemenina > 50 && representanteMujerMasUnAno)) {
      esEmpresaMujeres = true;
      supuestoAcreditado = 'SUPUESTO_A_PROPIEDAD_CONTROL';
      detalleFundamento = 'Acredita más del 50% de cuotas/acciones en cabeza de mujeres y representación legal femenina ejercida por más de un (1) año (Decreto 1860 de 2021, Art. 2.2.1.2.4.2.14 num. 1).';
      puntajeIncentivo = 1.0;
    } else if (supuesto === 'SUPUESTO_B_DIRECCION' || porcentajeDirectivoFemenino >= 50) {
      esEmpresaMujeres = true;
      supuestoAcreditado = 'SUPUESTO_B_DIRECCION';
      detalleFundamento = 'Acredita que al menos el 50% de los empleos del nivel directivo están ocupados por mujeres durante al menos un (1) año (Decreto 1860 de 2021, Art. 2.2.1.2.4.2.14 num. 2).';
      puntajeIncentivo = 1.0;
    } else if (supuesto === 'SUPUESTO_C_PERSONA_NATURAL' || esPersonaNaturalMujer) {
      esEmpresaMujeres = true;
      supuestoAcreditado = 'SUPUESTO_C_PERSONA_NATURAL';
      detalleFundamento = 'Persona natural mujer con matrícula mercantil y actividad comercial activa por más de un (1) año (Decreto 1860 de 2021, Art. 2.2.1.2.4.2.14 num. 3).';
      puntajeIncentivo = 1.0;
    } else if (supuesto === 'SUPUESTO_D_ASOCIATIVO' || porcentajeAsociadosMujeres >= 50) {
      esEmpresaMujeres = true;
      supuestoAcreditado = 'SUPUESTO_D_ASOCIATIVO';
      detalleFundamento = 'Entidad asociativa, cooperativa o comunitaria donde al menos el 50% de los asociados son mujeres (Decreto 1860 de 2021, Art. 2.2.1.2.4.2.14 num. 4).';
      puntajeIncentivo = 1.0;
    }

    return {
      es_empresa_mujeres: esEmpresaMujeres,
      supuesto_acreditado: supuestoAcreditado,
      detalle_fundamento: detalleFundamento,
      puntaje_incentivo: puntajeIncentivo,
      porcentaje_propiedad: porcentajePropiedadFemenina,
      porcentaje_directivo: porcentajeDirectivoFemenino
    };
  }

  /**
   * Evalúa la matriz completa de criterios diferenciales, incentivos de inclusión y árbol de desempate
   */
  evaluarMatrizCriterios({
    empresa = {},
    proceso = {},
    ingresosBrutosCop = 0,
    sector = 'SERVICIOS',
    datosMujeres = {},
    acreditaDiscapacidad = false,
    acreditaPrimerEmpleo = false,
    acreditaReincorporadosVictimas = false,
    acreditaIndustriaNacional = true
  }) {
    // 1. Clasificación Mipyme
    const clasificacion = this.clasificarTamanoEmpresa(ingresosBrutosCop, sector);

    // 2. Evaluación de Género
    const evaluacionMujeres = this.evaluarEmpresaMujeres(datosMujeres);

    // 3. Verificación de Convocatoria Limitada a Mipymes (Art. 30 Ley 2069/2020)
    const presupuestoCop = parseFloat(proceso.precio_base || proceso.cuantia || 0);
    const topeLimitacionCop = this.UMBRAL_LIMITACION_MIPYME_USD * this.TRM_REFERENCIA; // Aprox $525.000.000 COP
    const esAptoLimitacionMipyme = clasificacion.es_mipyme && presupuestoCop > 0 && presupuestoCop <= topeLimitacionCop;

    // 4. Puntajes Diferenciales de Pliego
    let puntajeIndustriaNacional = acreditaIndustriaNacional ? 10.0 : 0.0;
    let puntajeMujeres = evaluacionMujeres.es_empresa_mujeres ? evaluacionMujeres.puntaje_incentivo : 0.0;
    let puntajeDiscapacidad = acreditaDiscapacidad ? 1.0 : 0.0;
    let puntajePrimerEmpleo = acreditaPrimerEmpleo ? 0.5 : 0.0;

    const puntajeDiferencialTotal = Number((
      puntajeIndustriaNacional +
      puntajeMujeres +
      puntajeDiscapacidad +
      puntajePrimerEmpleo
    ).toFixed(2));

    // 5. Árbol Jerárquico de Desempate Oficial (Decreto 1860 de 2021 & Ley 2069 de 2020 Art. 35)
    const arbolDesempate = [
      {
        prioridad: 1,
        criterio: 'Preferencia de Oferta Nacional (Bienes o Servicios Colombianos)',
        fundamento: 'Ley 816 de 2003 y Ley 2069 de 2020 Art. 35',
        cumple: acreditaIndustriaNacional,
        impacto: 'Gana el empate frente a cualquier oferta de origen extranjero sin reciprocidad.'
      },
      {
        prioridad: 2,
        criterio: 'Proponente con Calidad de Mipyme Colombiana',
        fundamento: 'Ley 2069 de 2020 Art. 35 Num. 2 y Decreto 957 de 2019',
        cumple: clasificacion.es_mipyme,
        impacto: `Acreditado como ${clasificacion.categoria_label} (${clasificacion.ingresos_uvt} UVT). Desempata frente a grandes empresas.`
      },
      {
        prioridad: 3,
        criterio: 'Empresa de Mujeres / Emprendimiento Femenino',
        fundamento: 'Decreto 1860 de 2021 y Ley 2069 de 2020 Art. 35 Num. 3',
        cumple: evaluacionMujeres.es_empresa_mujeres,
        impacto: evaluacionMujeres.es_empresa_mujeres
          ? `Cumple ${evaluacionMujeres.supuesto_acreditado}. Prioridad legal sobre empresas sin enfoque de género.`
          : 'No acreditado.'
      },
      {
        prioridad: 4,
        criterio: 'Vinculación de Personal con Discapacidad (>=10% Nómina)',
        fundamento: 'Decreto 392 de 2018 y Ley 2069 de 2020 Art. 35 Num. 4',
        cumple: acreditaDiscapacidad,
        impacto: acreditaDiscapacidad ? 'Acredita personal en situación de discapacidad con contrato >= 1 año.' : 'No acreditado.'
      },
      {
        prioridad: 5,
        criterio: 'Vinculación de Población en Reincorporación o Víctimas',
        fundamento: 'Ley 1448 de 2011 y Ley 2069 de 2020 Art. 35 Num. 5',
        cumple: acreditaReincorporadosVictimas,
        impacto: acreditaReincorporadosVictimas ? 'Acredita vinculación de población vulnerable o reincorporada.' : 'No acreditado.'
      },
      {
        prioridad: 6,
        criterio: 'Incentivo al Primer Empleo (Jóvenes 18 a 28 años)',
        fundamento: 'Ley 1780 de 2016 y Decreto 1860 de 2021',
        cumple: acreditaPrimerEmpleo,
        impacto: acreditaPrimerEmpleo ? 'Acredita empleados en nómina en rango de primer empleo.' : 'No acreditado.'
      },
      {
        prioridad: 7,
        criterio: 'Sorteo Aleatorio (Balotas en Audiencia Pública)',
        fundamento: 'Decreto 1082 de 2015 Criterio Residual',
        cumple: true,
        impacto: 'Mecanismo final si persiste paridad absoluta en todos los factores.'
      }
    ];

    // Determinar la posición más ventajosa en el árbol
    const mejorCriterio = arbolDesempate.find(c => c.cumple && c.prioridad < 7);
    const posicionDesempate = mejorCriterio ? mejorCriterio.prioridad : 7;

    return {
      empresa: {
        razon_social: empresa.razon_social || 'EMPRESA PROPONENTE S.A.S.',
        nit: empresa.nit || '900.000.000-1',
        representante_legal: empresa.representante_legal || 'Representante Legal'
      },
      proceso: {
        referencia: proceso.referencia || proceso.id || 'PROC-001',
        entidad: proceso.entidad || 'Entidad Contratante',
        cuantia: presupuestoCop
      },
      clasificacion_tamano: clasificacion,
      evaluacion_mujeres: evaluacionMujeres,
      inclusion_social: {
        acredita_discapacidad: acreditaDiscapacidad,
        acredita_primer_empleo: acreditaPrimerEmpleo,
        acredita_reincorporados: acreditaReincorporadosVictimas,
        acredita_industria_nacional: acreditaIndustriaNacional
      },
      limitacion_convocatoria_mipyme: {
        es_apto: esAptoLimitacionMipyme,
        tope_cop: topeLimitacionCop,
        presupuesto_proceso: presupuestoCop,
        motivo: esAptoLimitacionMipyme
          ? `La cuantía ($${presupuestoCop.toLocaleString('es-CO')}) es menor a USD $125.000 y el proponente es Mipyme. Procede solicitud formal de limitación.`
          : (presupuestoCop > topeLimitacionCop ? 'La cuantía supera el tope legal de USD $125.000 para limitar la convocatoria.' : 'Requiere certificar calidad de Mipyme.')
      },
      puntajes_diferenciales: {
        industria_nacional: puntajeIndustriaNacional,
        incentivo_mujeres: puntajeMujeres,
        discapacidad: puntajeDiscapacidad,
        primer_empleo: puntajePrimerEmpleo,
        total_puntos: puntajeDiferencialTotal
      },
      posicion_desempate: posicionDesempate,
      arbol_desempate: arbolDesempate,
      concepto_estrategico: `El proponente alcanza una posición de desempate de Nivel ${posicionDesempate} (${mejorCriterio ? mejorCriterio.criterio : 'Sorteo Residual'}) acumulando +${puntajeDiferencialTotal} puntos adicionales en factores diferenciales.`
    };
  }

  /**
   * Genera la Certificación Conjunta de Criterios Diferenciales en PDF con pdfkit
   */
  async generarCertificacionPdf(evaluacionData, firmantes = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          layout: 'portrait',
          margins: { top: 36, bottom: 36, left: 36, right: 36 }
        });

        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const fCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);
        const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

        const emp = evaluacionData.empresa || {};
        const proc = evaluacionData.proceso || {};
        const clas = evaluacionData.clasificacion_tamano || {};
        const muj = evaluacionData.evaluacion_mujeres || {};
        const inc = evaluacionData.inclusion_social || {};
        const pts = evaluacionData.puntajes_diferenciales || {};

        const rep = firmantes.representante || { nombre: emp.representante_legal, cedula: '1.000.000.000' };
        const cont = firmantes.contador || { nombre: 'Contador Público Titulado', cedula: '52.000.000', tarjeta_profesional: '123456-T' };

        // 1. ENCABEZADO INSTITUCIONAL
        doc.fontSize(7.5).fillColor('#64748b').text('REPÚBLICA DE COLOMBIA • CONTRATACIÓN PÚBLICA Y ESTATAL', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(10.5).fillColor('#0f172a').font('Helvetica-Bold').text('CERTIFICACIÓN CONJUNTA DE CONDICIÓN MIPYME Y EMPRENDIMIENTO FEMENINO', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(7.5).fillColor('#475569').font('Helvetica').text('Ley 2069 de 2020 • Decreto 1860 de 2021 • Decreto 957 de 2019 • Ley 816 de 2003', { align: 'center' });
        doc.moveDown(0.6);

        // 2. BLOQUE DE IDENTIFICACIÓN
        const topY = doc.y;
        doc.rect(36, topY, 540, 48).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(7);

        doc.font('Helvetica-Bold').text('ENTIDAD ESTATAL:', 44, topY + 6).font('Helvetica').text(proc.entidad || 'Entidad Contratante', 145, topY + 6);
        doc.font('Helvetica-Bold').text('NÚMERO DE PROCESO:', 44, topY + 17).font('Helvetica').text(proc.referencia || 'PROC-001', 145, topY + 17);
        doc.font('Helvetica-Bold').text('PROPONENTE:', 44, topY + 28).font('Helvetica').text(`${emp.razon_social} (NIT: ${emp.nit})`, 145, topY + 28);
        doc.font('Helvetica-Bold').text('FECHA DE EMISIÓN:', 44, topY + 38).font('Helvetica').text(fechaHoy, 145, topY + 38);

        doc.font('Helvetica-Bold').text('TAMAÑO EMPRESARIAL:', 340, topY + 6).font('Helvetica-Bold').fillColor('#1e3a8a').text(clas.categoria_label || 'Mipyme', 465, topY + 6);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text('INGRESOS EN UVT:', 340, topY + 17).font('Helvetica').text(`${clas.ingresos_uvt} UVT`, 465, topY + 17);
        doc.font('Helvetica-Bold').text('ENFOQUE DE GÉNERO:', 340, topY + 28).font('Helvetica-Bold').fillColor(muj.es_empresa_mujeres ? '#15803d' : '#64748b').text(muj.es_empresa_mujeres ? 'ACREDITADO' : 'NO APLICA', 465, topY + 28);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text('PUNTAJE DIFERENCIAL:', 340, topY + 38).font('Helvetica-Bold').fillColor('#047857').text(`+${pts.total_puntos || 0} Pts`, 465, topY + 38);

        doc.y = topY + 56;

        // 3. TARJETA HERO: VEREDICTO DE CONDICIÓN
        const heroY = doc.y;
        doc.rect(36, heroY, 540, 42).fillAndStroke('#f0fdf4', '#86efac');
        doc.fillColor('#166534').fontSize(7).font('Helvetica-Bold').text('DICTAMEN DE HABILITACIÓN PARA CRITERIOS DIFERENCIALES Y DESEMPATE:', 46, heroY + 5);
        doc.fillColor('#15803d').fontSize(11).font('Helvetica-Bold').text(
          `✅ PROPONENTE HABILITADO COMO ${clas.categoria_label.toUpperCase()} ${muj.es_empresa_mujeres ? '• EMPRESA DE MUJERES' : ''}`,
          46, heroY + 16
        );
        doc.fillColor('#334155').fontSize(6.8).font('Helvetica').text(
          `Posición de Desempate: Nivel ${evaluacionData.posicion_desempate || 1} • Apoyo Industria Nacional: ${inc.acredita_industria_nacional ? 'SÍ (+10 Pts)' : 'NO'}`,
          46, heroY + 30
        );

        doc.y = heroY + 50;

        // 4. DECLARACIONES LEGALES VINCULANTES
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text('DECLARACIÓN BAJO LA GRAVEDAD DEL JURAMENTO:');
        doc.moveDown(0.2);

        const declaraciones = [
          `1. CLASIFICACIÓN EMPRESARIAL (DECRETO 957 DE 2019): Certificamos que los ingresos por actividades ordinarias de la vigencia fiscal anterior fueron de ${fCOP(clas.ingresos_cop)}, equivalentes a ${clas.ingresos_uvt} UVT para el sector ${clas.sector}, ostentando la calidad de ${clas.categoria_label.toUpperCase()}.`,
          `2. EMPRENDIMIENTO Y EMPRESAS DE MUJERES (DECRETO 1860 DE 2021): ${muj.es_empresa_mujeres ? muj.detalle_fundamento : 'La entidad no solicita el incentivo de empresa de mujeres en esta convocatoria.'}`,
          `3. INDUSTRIA Y MANO DE OBRA NACIONAL (LEY 816 DE 2003): Certificamos que los bienes y servicios ofrecidos incorporan componente 100% de origen colombiano, haciéndonos acreedores al puntaje máximo de fomento a la industria nacional.`,
          `4. INCLUSIÓN LABORAL: Acreditamos el cumplimiento de los estándares de vinculación de ${inc.acredita_discapacidad ? 'personal en situación de discapacidad (Decreto 392/2018)' : 'personal bajo normativa laboral estándar'}${inc.acredita_primer_empleo ? ' y jóvenes en primer empleo (Ley 1780/2016)' : ''}.`,
          `5. VERACIDAD: Manifestamos bajo la gravedad del juramento que la información aquí consignada es fidedigna y concuerda estrictamente con los libros de contabilidad, estados financieros y el Registro Único de Proponentes (RUP).`
        ];

        doc.font('Helvetica').fontSize(6.8).fillColor('#334155');
        declaraciones.forEach(dec => {
          doc.text(dec, { align: 'justify' });
          doc.moveDown(0.2);
        });

        doc.moveDown(0.3);

        // 5. TABLA RESUMEN DE CRITERIOS DE DESEMPATE
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text('ORDEN DE PRELACIÓN EN EL ÁRBOL DE DESEMPATE (LEY 2069 DE 2020 ART. 35):');
        doc.moveDown(0.2);

        const tabY = doc.y;
        doc.rect(36, tabY, 540, 13).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(6.5).font('Helvetica-Bold');
        doc.text('ORD', 42, tabY + 3, { width: 30 });
        doc.text('CRITERIO DE DESEMPATE OFICIAL', 75, tabY + 3, { width: 260 });
        doc.text('FUNDAMENTO LEGAL', 340, tabY + 3, { width: 140 });
        doc.text('ESTADO', 485, tabY + 3, { width: 85, align: 'center' });

        let currY = tabY + 13;
        const arbol = evaluacionData.arbol_desempate || [];

        for (let i = 0; i < arbol.length; i++) {
          const it = arbol[i];
          doc.rect(36, currY, 540, 13).fillAndStroke(i % 2 === 0 ? '#f8fafc' : '#ffffff', '#e2e8f0');

          doc.fillColor('#0f172a').fontSize(6.2).font('Helvetica-Bold').text(`#${it.prioridad}`, 42, currY + 3, { width: 30 });
          doc.font('Helvetica').text(it.criterio.slice(0, 55), 75, currY + 3, { width: 260 });
          doc.text(it.fundamento.slice(0, 35), 340, currY + 3, { width: 140 });

          const stCol = it.cumple ? '#15803d' : '#94a3b8';
          const stTxt = it.cumple ? '✅ ACREDITADO' : 'NO APLICA';
          doc.fillColor(stCol).font('Helvetica-Bold').text(stTxt, 485, currY + 3, { width: 85, align: 'center' });

          currY += 13;
        }

        doc.y = currY + 12;

        // 6. BLOQUE DE FIRMAS CONJUNTAS
        const sigY = doc.page.height - 95;
        doc.rect(36, sigY, 540, 62).fillAndStroke('#ffffff', '#cbd5e1');

        doc.fillColor('#0f172a').fontSize(6.8).font('Helvetica-Bold');
        doc.text('___________________________________________', 50, sigY + 22);
        doc.text(rep.nombre || 'Representante Legal', 50, sigY + 32);
        doc.font('Helvetica').fontSize(6).fillColor('#64748b').text(`C.C. ${rep.cedula} • Representante Legal`, 50, sigY + 40);

        doc.fillColor('#0f172a').fontSize(6.8).font('Helvetica-Bold');
        doc.text('___________________________________________', 320, sigY + 22);
        doc.text(cont.nombre || 'Contador Público / Revisor Fiscal', 320, sigY + 32);
        doc.font('Helvetica').fontSize(6).fillColor('#64748b').text(`C.C. ${cont.cedula} • Tarjeta Profesional: ${cont.tarjeta_profesional}`, 320, sigY + 40);

        // Pie de página
        doc.fontSize(6).font('Helvetica').fillColor('#94a3b8').text(
          `Certificación generada por Radar SECOP • Ley 2069/2020 • Decreto 1860/2021 • Proceso ${proc.referencia}`,
          36, doc.page.height - 24, { align: 'center', width: 540 }
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = new CriteriosDiferencialesEngine();
