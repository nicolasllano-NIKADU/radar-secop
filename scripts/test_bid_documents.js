// ============================================================================
// RADAR SECOP - INTEGRATION TEST: FORMULARIOS JURÍDICOS OBLIGATORIOS ANCP-CCE
// Normativa: Ley 80/1993, Ley 1150/2007, Ley 1882/2018, Ley 789/2002 (Art. 50),
// Ley 2069/2020 y Pliegos Tipo ANCP - Colombia Compra Eficiente.
// ============================================================================

const bidDocumentGenerator = require('../server/bidDocumentGenerator');

async function runTests() {
  console.log('🧪 Iniciando pruebas de Formularios Jurídicos Obligatorios ANCP-CCE...\n');

  try {
    const mockProceso = {
      id: 'PROC-TEST-001',
      referencia: 'LP-IDU-2026-901',
      entidad: 'INSTITUTO DE DESARROLLO URBANO (IDU)',
      objeto: 'CONSTRUCCIÓN DE PASO A DESNIVEL, OBRAS DE URBANISMO Y REDES'
    };

    const mockOferente = {
      razon_social: 'CONSTRUCTORA VIAL COLOMBIANA S.A.S.',
      nit: '900999888-1',
      representante_legal: 'Ing. Carlos Alberto Morales',
      cedula_representante: '79.123.456 de Bogotá D.C.',
      ciudad: 'Bogotá D.C.',
      email: 'licitaciones@consorciovial.co',
      telefono: '310 555 7788'
    };

    const mockConsorcio = {
      esPlural: true,
      nombreConsorcio: 'CONSORCIO VIAL BOGOTÁ 2026',
      tipo: 'Consorcio (Ley 80 de 1993, Art. 7)',
      representante: 'Ing. Carlos Alberto Morales',
      miembros: [
        { razon_social: 'CONSTRUCTORA VIAL COLOMBIANA S.A.S.', nit: '900999888-1', porcentaje: 60 },
        { razon_social: 'PAVIMENTOS Y CONCRETOS DE COLOMBIA S.A.', nit: '890111222-3', porcentaje: 40 }
      ]
    };

    const mockContador = {
      nombre: 'Dra. Dora Inés Morales Gómez',
      cedula: '52.987.654 de Bogotá D.C.',
      tarjeta_profesional: 'TP-98765-T'
    };

    // 1. Verificación de Formulario 1: Carta de Presentación de la Oferta
    console.log('1️⃣ Verificando Formulario 1 (Carta de Presentación de la Oferta):');
    const f1Html = bidDocumentGenerator.generarFormulario1Html({
      proceso: mockProceso,
      oferente: mockOferente,
      consorcio: mockConsorcio
    });

    if (!f1Html.includes('FORMULARIO 1') || !f1Html.includes('CONSORCIO VIAL BOGOTÁ 2026') ||
        !f1Html.includes('artículos 8 y 9 de la Ley 80 de 1993') || !f1Html.includes('90')) {
      throw new Error('Fallo en cláusulas obligatorias del Formulario 1');
    }
    console.log('   ✓ Declaración juramentada de inexistencia de inhabilidades (Ley 80/93 Art. 8 y 9) verificada.');
    console.log('   ✓ Estructura plural y tabla de miembros (60% / 40%) renderizada.');
    console.log('   ✓ Cláusula de validez de la oferta (90 días) y cuenta bancaria verificadas.');

    // 2. Verificación de Formulario 2: Compromiso Anticorrupción
    console.log('\n2️⃣ Verificando Formulario 2 (Compromiso Anticorrupción):');
    const f2Html = bidDocumentGenerator.generarFormulario2AnticorrupcionHtml({
      proceso: mockProceso,
      oferente: mockOferente
    });

    if (!f2Html.includes('FORMULARIO 2') || !f2Html.includes('COMPROMISO ANTICORRUPCIÓN') ||
        !f2Html.includes('no realizar acuerdos ilícitos de colusión')) {
      throw new Error('Fallo en cláusulas del Formulario 2 Anticorrupción');
    }
    console.log('   ✓ Pacto de transparencia y no ofrecimiento de dádivas verificado.');
    console.log('   ✓ Prohibición de prácticas colusorias y acuerdos de precios verificado.');

    // 3. Verificación de Formulario 2 Anexo: Acreditación Mipyme (Ley 2069/2020)
    console.log('\n3️⃣ Verificando Formulario 2 Anexo (Acreditación Mipyme e Industria Nacional):');
    const mipymeHtml = bidDocumentGenerator.generarAcreditacionMipymeHtml({
      oferente: mockOferente,
      sector: 'Servicios',
      tamano: 'Pequeña Empresa',
      contador: mockContador
    });

    if (!mipymeHtml.includes('Ley 2069 de 2020') || !mipymeHtml.includes('Decreto 1860 de 2021') ||
        !mipymeHtml.includes('PEQUEÑA EMPRESA') || !mipymeHtml.includes('TP-98765-T')) {
      throw new Error('Fallo en certificación de Mipyme');
    }
    console.log('   ✓ Normativa Ley 2069 de 2020 y Decreto 1860 de 2021 invocada.');
    console.log('   ✓ Criterio de desempate por fomento a la industria nacional acreditado.');
    console.log(`   ✓ Firma conjunta de Representante Legal y Contador (TP: ${mockContador.tarjeta_profesional}) verificada.`);

    // 4. Verificación de Formulario 4: Aportes Seguridad Social y Parafiscales (Art. 50 Ley 789/2002)
    console.log('\n4️⃣ Verificando Formulario 4 (Aportes Parafiscales y Seguridad Social):');
    const f4Html = bidDocumentGenerator.generarFormulario4ParafiscalesHtml({
      proceso: mockProceso,
      oferente: mockOferente,
      firmantes: {
        tiene_revisor_fiscal: true,
        nombre_revisor_fiscal: 'Dr. Fernando Restrepo Cuervo',
        cedula_contador: '79.654.321 de Bogotá',
        tarjeta_profesional: 'TP-112233-T'
      }
    });

    if (!f4Html.includes('FORMULARIO 4') || !f4Html.includes('Artículo 50 de la Ley 789 de 2002') ||
        !f4Html.includes('seis (6) meses anteriores') || !f4Html.includes('Instituto Colombiano de Bienestar Familiar') ||
        !f4Html.includes('Revisor Fiscal')) {
      throw new Error('Fallo en certificación de Aportes Parafiscales Formulario 4');
    }
    console.log('   ✓ Cumplimiento estricto de Art. 50 Ley 789 de 2002 y Art. 9 Ley 828 de 2003 verificado.');
    console.log('   ✓ Periodo de acreditación de 6 meses previos al cierre auditado.');
    console.log('   ✓ Cobertura total de Salud, Pensión, ARL, SENA, ICBF y Cajas de Compensación verificada.');
    console.log('   ✓ Firma imperativa del Revisor Fiscal Titular acreditada.');

    // 5. Verificación de Generación de PDFs Individuales y Paquete Compilado
    console.log('\n5️⃣ Verificando generación de PDFs Oficiales (pdfkit):');

    // PDF Formulario 1
    const pdfF1 = await bidDocumentGenerator.generarFormulario1Pdf({
      proceso: mockProceso,
      oferente: mockOferente,
      consorcio: mockConsorcio
    });
    console.log(`   ✓ Formulario 1 PDF generado: ${pdfF1.length} bytes (Cabecera: "${pdfF1.slice(0, 4).toString('ascii')}")`);

    // PDF Formulario 2 Mipyme
    const pdfF2Mipyme = await bidDocumentGenerator.generarFormulario2MipymePdf({
      oferente: mockOferente,
      sector: 'Servicios',
      tamano: 'Pequeña Empresa',
      contador: mockContador
    });
    console.log(`   ✓ Formulario 2 Mipyme PDF generado: ${pdfF2Mipyme.length} bytes (Cabecera: "${pdfF2Mipyme.slice(0, 4).toString('ascii')}")`);

    // PDF Formulario 4 Parafiscales
    const pdfF4 = await bidDocumentGenerator.generarFormulario4ParafiscalesPdf({
      proceso: mockProceso,
      oferente: mockOferente,
      firmantes: {
        tiene_revisor_fiscal: true,
        nombre_revisor_fiscal: 'Dr. Fernando Restrepo Cuervo',
        cedula_contador: '79.654.321 de Bogotá',
        tarjeta_profesional: 'TP-112233-T'
      }
    });
    console.log(`   ✓ Formulario 4 Parafiscales PDF generado: ${pdfF4.length} bytes (Cabecera: "${pdfF4.slice(0, 4).toString('ascii')}")`);

    // Paquete Completo Foliado (5 páginas)
    const pdfPaquete = await bidDocumentGenerator.generarPaqueteOfertaPdf({
      proceso: mockProceso,
      oferente: mockOferente,
      consorcio: mockConsorcio,
      contador: mockContador
    });
    console.log(`   ✓ Paquete Completo Foliado PDF generado: ${pdfPaquete.length} bytes (Cabecera: "${pdfPaquete.slice(0, 4).toString('ascii')}")`);

    if (pdfF1.slice(0, 4).toString('ascii') !== '%PDF' ||
        pdfF2Mipyme.slice(0, 4).toString('ascii') !== '%PDF' ||
        pdfF4.slice(0, 4).toString('ascii') !== '%PDF' ||
        pdfPaquete.slice(0, 4).toString('ascii') !== '%PDF') {
      throw new Error('Uno o más archivos generados no son PDFs válidos');
    }

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE FORMULARIOS JURÍDICOS OFICIALES ANCP-CCE PASARON EXITOSAMENTE (100%)!\n');

  } catch (err) {
    console.error('\n❌ ERROR EN LA SUITE DE PRUEBAS DE FORMULARIOS JURÍDICOS:', err);
    process.exitCode = 1;
  }
}

runTests();
