const pliegoAuditor = require('../server/pliegoAuditor');
const bidDocumentGenerator = require('../server/bidDocumentGenerator');
const companyManager = require('../server/companyManager');
const dbPostgres = require('../server/dbPostgres');

async function runTests() {
  console.log('========================================================');
  console.log('🧪 INICIANDO TEST: AUDITORÍA DE PLIEGO Y GENERADOR DE OFERTAS');
  console.log('========================================================\n');

  try {
    // 1. Obtener usuario y empresas de prueba
    const user = await companyManager.getOrCreateDefaultUser();
    let companies = await companyManager.getCompaniesByUser(user.id);

    if (companies.length === 0) {
      console.log('🌱 Creando empresa de prueba para el test...');
      const created = await companyManager.createCompany(user.id, {
        nit: '901999888',
        digito_verificacion: '3',
        razon_social: 'INGENIERÍA & CONSTRUCCIONES COLOMBIA S.A.S.',
        sigla: 'INGCOL',
        es_propia: true,
        tamano_empresa: 'MEDIANA'
      });
      await companyManager.saveFinancialData(created.id, {
        anio_fiscal: 2025,
        activo_corriente: 1200000000,
        pasivo_corriente: 500000000,
        activo_total: 2500000000,
        pasivo_total: 900000000,
        patrimonio: 1600000000,
        utilidad_operacional: 350000000,
        gastos_intereses: 45000000,
        capacidad_residual_k: 1800000000
      });
      companies = await companyManager.getCompaniesByUser(user.id);
    }

    const testCompany = companies[0];
    console.log(`🏢 Empresa evaluada: ${testCompany.razon_social} (NIT: ${testCompany.nit})`);
    console.log(`   - Liquidez: ${testCompany.indice_liquidez || 2.4}`);
    console.log(`   - Endeudamiento: ${testCompany.indice_endeudamiento || 0.36}`);
    console.log(`   - Patrimonio: $${(parseFloat(testCompany.patrimonio) || 0).toLocaleString('es-CO')}`);

    // 2. Test Pliego Auditor
    console.log('\n--- 1. AUDITORÍA DE PLIEGO & GAP ANALYSIS ---');
    const mockProcesoId = 'CO1.BDOS.TEST.2026.01';
    
    const auditRes = await pliegoAuditor.auditarProceso({
      procesoId: mockProcesoId,
      empresaId: testCompany.id,
      smmlvValor: 1423500
    });

    console.log(`📋 Proceso auditado: ${auditRes.proceso.referencia}`);
    console.log(`💰 Presupuesto Oficial: $${auditRes.proceso.presupuestoOficial.toLocaleString('es-CO')}`);
    console.log(`🚦 Dictamen: ${auditRes.diagnostico.decisionBadge}`);
    console.log(`📈 Score de Viabilidad: ${auditRes.diagnostico.scoreViabilidad}%`);
    console.log(`📊 Matriz de Brechas (${auditRes.matrizBrechas.length} Requisitos auditados):`);
    
    auditRes.matrizBrechas.forEach((req, idx) => {
      console.log(`   [${req.resultado}] ${idx + 1}. ${req.requisito}`);
      console.log(`      Exigido: ${req.criterioExigido} | Acreditado: ${req.valorOferente}`);
      console.log(`      Fundamento Legal: ${req.sustentoLegal}`);
      console.log(`      Observación: ${req.observacion}`);
    });

    if (auditRes.matrizBrechas.length < 5) {
      throw new Error('Matriz de brechas incompleta');
    }

    // 3. Test Generación de Formularios Oficiales HTML
    console.log('\n--- 2. GENERADOR DE DOCUMENTOS LICITATORIOS (HTML) ---');
    const f1Html = bidDocumentGenerator.generarFormulario1Html({
      proceso: auditRes.proceso,
      oferente: testCompany,
      banco: {
        nombre: 'Bancolombia S.A.',
        tipo: 'Cuenta Corriente',
        numero: '123-456789-01'
      },
      ciudad: 'Bogotá D.C.'
    });

    console.log(`✅ Formulario 1 generado (${f1Html.length} caracteres)`);
    if (!f1Html.includes('FORMULARIO 1: CARTA DE PRESENTACIÓN DE LA PROPUESTA')) {
      throw new Error('Formulario 1 no contiene el encabezado legal');
    }

    const f2Html = bidDocumentGenerator.generarFormulario2AnticorrupcionHtml({
      proceso: auditRes.proceso,
      oferente: testCompany,
      ciudad: 'Bogotá D.C.'
    });
    console.log(`✅ Formulario 2 Anticorrupción generado (${f2Html.length} caracteres)`);
    if (!f2Html.includes('FORMULARIO 2: COMPROMISO ANTICORRUPCIÓN')) {
      throw new Error('Formulario 2 no contiene el título legal');
    }

    const mipymeHtml = bidDocumentGenerator.generarAcreditacionMipymeHtml({
      proceso: auditRes.proceso,
      oferente: testCompany,
      contador: {
        nombre: 'Dora Inés Morales Gómez',
        tp: 'TP-98765-T',
        cedula: '52.987.654'
      },
      ciudad: 'Bogotá D.C.'
    });
    console.log(`✅ Certificación Mipyme Ley 2069/2020 generada (${mipymeHtml.length} caracteres)`);

    // 4. Test Generación de Paquete Completo en PDF
    console.log('\n--- 3. COMPILADOR DE PAQUETE OFERTA PDF ---');
    const pdfBuffer = await bidDocumentGenerator.generarPaqueteOfertaPdf({
      proceso: auditRes.proceso,
      oferente: testCompany
    });

    console.log(`✅ Buffer PDF generado exitosamente: ${pdfBuffer.length} bytes`);
    const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
    console.log(`📄 Encabezado binario: "${pdfHeader}" (Esperado: "%PDF-")`);
    if (pdfHeader !== '%PDF-') {
      throw new Error('El buffer generado no es un documento PDF válido.');
    }

    console.log('\n========================================================');
    console.log('🎉 TODOS LOS TESTS DE AUDITORÍA Y LICITACIÓN PASARON EXITOSAMENTE!');
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ Error durante la ejecución del test:', err);
    process.exit(1);
  } finally {
    await dbPostgres.pool.end();
  }
}

runTests();
