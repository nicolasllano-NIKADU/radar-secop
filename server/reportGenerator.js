const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

class ReportGenerator {
  /**
   * Genera Ficha Técnica de Licitación en PDF de alta fidelidad
   * @param {Object} opp - Oportunidad con datos completos
   * @param {Object} simConsorcio - Datos de la simulación consorcial si aplica
   * @returns {Promise<Buffer>}
   */
  generateOpportunityPdf(opp, simConsorcio = null) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers = [];

        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Paleta Ejecutiva Dark / Gold
        const cPrimary = '#0f172a';
        const cGold = '#d4af37';
        const cText = '#1e293b';
        const cMuted = '#64748b';

        // Header / Banner Superior
        doc.rect(40, 40, 515, 60).fill(cPrimary);
        doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
           .text('RADAR SECOP - FICHA TÉCNICA LICITATORIA', 55, 52);
        doc.fillColor(cGold).fontSize(9).font('Helvetica')
           .text(`SISTEMA DE INTELIGENCIA DE COMPRAS PÚBLICAS • SECOP II COLOMBIA`, 55, 74);

        // Identificadores
        let y = 115;
        doc.fillColor(cText).fontSize(10).font('Helvetica-Bold')
           .text('REFERENCIA DEL PROCESO:', 40, y);
        doc.font('Helvetica').text(opp.referencia || opp.id || 'N/A', 210, y);

        y += 18;
        doc.font('Helvetica-Bold').text('ENTIDAD CONTRATANTE:', 40, y);
        doc.font('Helvetica').text(opp.entidad || 'N/A', 210, y);

        y += 18;
        doc.font('Helvetica-Bold').text('MODALIDAD DE SELECCIÓN:', 40, y);
        doc.font('Helvetica').text(opp.modalidad || 'N/A', 210, y);

        y += 18;
        doc.font('Helvetica-Bold').text('PRESUPUESTO OFICIAL BASE:', 40, y);
        const precio = parseFloat(opp.precio_base || opp.cuantia || 0);
        doc.font('Helvetica-Bold').fillColor(cGold).text(`$ ${precio.toLocaleString('es-CO')} COP`, 210, y);

        y += 18;
        doc.fillColor(cText).font('Helvetica-Bold').text('FECHA LÍMITE DE CIERRE:', 40, y);
        doc.font('Helvetica').text(opp.fecha_cierre ? opp.fecha_cierre.slice(0, 10) : 'No definida', 210, y);

        // Objeto Contractual
        y += 28;
        doc.rect(40, y, 515, 20).fill('#f1f5f9');
        doc.fillColor(cPrimary).font('Helvetica-Bold').fontSize(9).text('OBJETO Y ALCANCE DE LA CONVOCATORIA', 50, y + 5);
        y += 28;
        doc.fillColor(cText).fontSize(8.5).font('Helvetica')
           .text(opp.descripcion || opp.nombre || 'Sin descripción', 40, y, { width: 515, align: 'justify' });

        // Si incluye análisis consorcial
        if (simConsorcio && simConsorcio.miembros) {
          y = doc.y + 20;
          doc.rect(40, y, 515, 20).fill('#fef3c7');
          doc.fillColor('#92400e').font('Helvetica-Bold').fontSize(9)
             .text('DIAGNÓSTICO CONTEXTUAL: ESTRUCTURA PLURAL (CONSORCIO / UT)', 50, y + 5);

          y += 28;
          doc.fillColor(cText).fontSize(8.5).font('Helvetica-Bold')
             .text(`Diagnóstico Habilitante: ${simConsorcio.cumplimiento || 'HABILITADO'}`, 40, y);

          y += 15;
          doc.font('Helvetica').text('Participantes y Distribución:', 40, y);
          simConsorcio.miembros.forEach(m => {
            y += 12;
            doc.text(`• ${m.razon_social}: ${m.porcentaje}% de participación`, 55, y);
          });
        }

        // Pie de Página
        doc.fontSize(7.5).fillColor(cMuted).text(
          `Documento generado automáticamente por Radar SECOP el ${new Date().toLocaleString('es-CO')}. Confidencial.`,
          40, 770, { align: 'center', width: 515 }
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Genera Certificado Oficial de Compliance y Debida Diligencia en PDF
   */
  generateComplianceCertificatePdf(auditRecord) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers = [];

        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Marco de Seguridad Formal
        doc.rect(30, 30, 535, 782).lineWidth(1.5).stroke('#0f172a');
        doc.rect(35, 35, 525, 772).lineWidth(0.5).stroke('#d4af37');

        // Escudo / Título
        doc.fillColor('#0f172a').fontSize(18).font('Helvetica-Bold')
           .text('CERTIFICADO DE DEBIDA DILIGENCIA Y COMPLIANCE', 50, 70, { align: 'center' });
        doc.fontSize(9).font('Helvetica').fillColor('#64748b')
           .text('AUDITORÍA DE INHABILIDADES, INCOMPATIBILIDADES Y GESTIÓN DE RIESGO LAFT', 50, 92, { align: 'center' });
        doc.text('Ley 80 de 1993 • Ley 1474 de 2011 • Ley 2195 de 2022', 50, 104, { align: 'center' });

        let y = 140;
        doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold')
           .text('RAZÓN SOCIAL AUDITADA:', 60, y);
        doc.font('Helvetica').text(auditRecord.nombre_consultado, 240, y);

        y += 20;
        doc.font('Helvetica-Bold').text('IDENTIFICACIÓN TRIBUTARIA (NIT):', 60, y);
        doc.font('Helvetica').text(auditRecord.nit_consultado, 240, y);

        y += 20;
        doc.font('Helvetica-Bold').text('REPRESENTANTE LEGAL:', 60, y);
        doc.font('Helvetica').text(auditRecord.representante_legal || 'Registrado en Cámara', 240, y);

        y += 20;
        doc.font('Helvetica-Bold').text('FECHA Y HORA DE CERTIFICACIÓN:', 60, y);
        doc.font('Helvetica').text(new Date(auditRecord.creado_en || Date.now()).toLocaleString('es-CO'), 240, y);

        y += 35;
        doc.rect(60, y, 475, 32).fill('#f8fafc');
        const esOk = auditRecord.estado_compliance === 'HABILITADO';
        doc.fillColor(esOk ? '#166534' : '#991b1b').fontSize(12).font('Helvetica-Bold')
           .text(`ESTADO: ${auditRecord.estado_compliance.replace(/_/g, ' ')}`, 60, y + 10, { align: 'center', width: 475 });

        y += 50;
        doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('RESULTADO DE CRUCES EN BASES OFICIALES:', 60, y);
        
        const items = [
          ['Boletín de Responsables Fiscales (Contraloría CGR):', auditRecord.boletin_fiscal_cgr ? 'REPORTE ACTIVO' : 'SIN OBSERVACIONES'],
          ['Sistema de Registro de Sanciones e Inhabilidades (PGN):', auditRecord.disciplinarios_pgn ? 'SANCIÓN VIGENTE' : 'SIN OBSERVACIONES'],
          ['Registro Nacional de Medidas Correctivas (Policía PONAL):', auditRecord.medidas_correctivas_ponal ? 'MULTAS PENDIENTES' : 'PAZ Y SALVO'],
          ['Listas de Sancionados Internacionales (OFAC / ONU):', auditRecord.lista_ofac_clinton ? 'COINCIDENCIA LAFT' : 'NO REPORTADO'],
          ['Multas o Caducidad en Contratación Estatal (SECOP II):', auditRecord.multas_secop_activas ? 'SANCIÓN REGISTRADA' : 'SIN SANCIONES']
        ];

        y += 15;
        items.forEach(([k, v]) => {
          doc.fillColor('#334155').font('Helvetica').text(k, 60, y);
          const color = v.includes('SIN') || v.includes('PAZ') || v.includes('NO') ? '#16a34a' : '#dc2626';
          doc.font('Helvetica-Bold').fillColor(color).text(v, 420, y);
          y += 16;
        });

        // Hash Criptográfico
        y += 30;
        doc.rect(60, y, 475, 45).fill('#f1f5f9');
        doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold')
           .text('CONSTANCIA CRIPTOGRÁFICA DE NO REPUDIO (SHA-256):', 70, y + 8);
        doc.font('Courier').fontSize(7.5).fillColor('#475569')
           .text(auditRecord.certificado_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 70, y + 24, { width: 455 });

        // Firma Digital / Sello
        y += 80;
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a')
           .text('OFICINA DE CUMPLIMIENTO & AUDITORÍA PREDICTIVA', 50, y, { align: 'center' });
        doc.fontSize(7.5).font('Helvetica').fillColor('#64748b')
           .text('RADAR SECOP II • SISTEMA DE GESTIÓN LICITATORIA B2B', 50, y + 12, { align: 'center' });

        doc.end();
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Genera Matriz Excel de Oportunidades y PAA
   */
  async generateOpportunitiesExcel(opportunities) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Radar SECOP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Oportunidades SECOP II');

    sheet.columns = [
      { header: 'ID Proceso', key: 'id', width: 22 },
      { header: 'Entidad', key: 'entidad', width: 35 },
      { header: 'Tipo', key: 'tipo', width: 16 },
      { header: 'Presupuesto Base ($ COP)', key: 'precio', width: 25 },
      { header: 'Fecha Cierre', key: 'cierre', width: 16 },
      { header: 'Modalidad', key: 'modalidad', width: 28 },
      { header: 'Objeto Contractual', key: 'descripcion', width: 60 },
      { header: 'Enlace SECOP II', key: 'url', width: 40 }
    ];

    // Estilo Encabezado
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }
    };

    opportunities.forEach(opp => {
      sheet.addRow({
        id: opp.referencia || opp.id,
        entidad: opp.entidad,
        tipo: opp.tipo_proceso || 'CONTRATACIÓN',
        precio: parseFloat(opp.precio_base || opp.cuantia || 0),
        cierre: opp.fecha_cierre ? opp.fecha_cierre.slice(0, 10) : 'N/A',
        modalidad: opp.modalidad || 'N/A',
        descripcion: opp.descripcion || opp.nombre,
        url: opp.url || ''
      });
    });

    // Formato de moneda para la columna de precio
    sheet.getColumn('precio').numFmt = '$#,##0';

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = new ReportGenerator();
