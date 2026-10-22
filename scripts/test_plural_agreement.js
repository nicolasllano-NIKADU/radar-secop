// ============================================================================
// RADAR SECOP - INTEGRATION TEST: ACUERDOS PLURALES (FORMULARIO 3 CCE)
// ============================================================================

const pluralAgreementEngine = require('../server/pluralAgreementEngine');
const dbPostgres = require('../server/dbPostgres');

async function runTests() {
  console.log('🧪 Iniciando pruebas de Acuerdos de Constitución Plural (Formulario 3 CCE)...\n');

  try {
    // 1. Prueba de Ponderación Financiera CCE
    console.log('1️⃣ Verificando ponderación financiera de estructuras plurales:');
    const miembrosMock = [
      {
        razon_social: 'EMPRESA A S.A.S.',
        nit: '900.111.111-1',
        porcentaje: 60,
        indicadores_financieros: {
          indice_liquidez: 2.0,
          indice_endeudamiento: 40,
          cobertura_interes: 6.0,
          rentabilidad_patrimonio: 15,
          rentabilidad_activo: 10,
          activo_corriente: 1000000000,
          pasivo_corriente: 500000000,
          patrimonio: 2000000000
        }
      },
      {
        razon_social: 'EMPRESA B S.A.S.',
        nit: '900.222.222-2',
        porcentaje: 40,
        indicadores_financieros: {
          indice_liquidez: 1.5,
          indice_endeudamiento: 60,
          cobertura_interes: 4.0,
          rentabilidad_patrimonio: 10,
          rentabilidad_activo: 5,
          activo_corriente: 600000000,
          pasivo_corriente: 400000000,
          patrimonio: 1000000000
        }
      }
    ];

    const pond = pluralAgreementEngine.calcularIndicadoresPonderados(miembrosMock);
    // Liquidez esperada: (2.0 * 0.6) + (1.5 * 0.4) = 1.2 + 0.6 = 1.80
    // Endeudamiento esperado: (40 * 0.6) + (60 * 0.4) = 24 + 24 = 48.0%
    if (pond.indice_liquidez !== 1.80 || pond.indice_endeudamiento !== 48.0) {
      throw new Error(`Ponderación financiera errónea: Liquidez=${pond.indice_liquidez} (esperado 1.8), Endeudamiento=${pond.indice_endeudamiento} (esperado 48)`);
    }
    console.log(`   ✓ Liquidez Ponderada: ${pond.indice_liquidez} (conforme Pliegos Tipo)`);
    console.log(`   ✓ Endeudamiento Ponderado: ${pond.indice_endeudamiento}%`);
    console.log(`   ✓ Cobertura de Intereses: ${pond.cobertura_intereses}`);
    console.log(`   ✓ ROE: ${pond.rentabilidad_patrimonio}% | ROA: ${pond.rentabilidad_activo}%`);

    // 2. Prueba de Generación y Validación de Minuta Formal (Unión Temporal)
    console.log('\n2️⃣ Verificando generación jurídica de Formulario 3 (Unión Temporal):');
    const procesoMock = {
      id: 'TEST-PLURAL-2026',
      referencia: 'LP-MINVIVIENDA-012-2026',
      entidad: 'MINISTERIO DE VIVIENDA, CIUDAD Y TERRITORIO',
      objeto: 'CONSTRUCCIÓN DE SOLUCIONES HABITACIONALES Y REDES DE ACUEDUCTO',
      cuantia: 8500000000
    };

    const estructuraMock = {
      nombre_estructura: 'UNIÓN TEMPORAL HÁBITAT ANDINO 2026',
      tipo_estructura: 'UNION_TEMPORAL',
      duracion_meses: 36,
      domicilio_contractual: 'Bogotá D.C.',
      rep_legal_nombre: 'Santiago Morales Pardo',
      rep_legal_cedula: '80.123.456',
      rep_legal_ciudad_exp: 'Bogotá D.C.',
      rep_suplente_nombre: 'Laura Victoria Restrepo',
      rep_suplente_cedula: '53.987.654',
      modalidad_facturacion: 'NIT_PROPIO',
      miembro_facturador: 'EMPRESA A S.A.S.',
      integrantes: miembrosMock
    };

    const acuerdoGenerado = pluralAgreementEngine.generarAcuerdoPlural({
      proceso: procesoMock,
      datosEstructura: estructuraMock
    });

    if (!acuerdoGenerado.documento_html.includes('UNIÓN TEMPORAL HÁBITAT ANDINO 2026')) {
      throw new Error('Fallo en la inclusión del nombre de la estructura en la minuta');
    }
    if (!acuerdoGenerado.documento_html.includes('CLÁUSULA QUINTA. RESPONSABILIDAD ANTE LA ENTIDAD ESTATAL')) {
      throw new Error('Falta cláusula legal de responsabilidad Ley 80 Art. 7');
    }
    console.log(`   ✓ Acuerdo formal generado correctamente (${acuerdoGenerado.documento_html.length} caracteres HTML).`);

    // 3. Prueba de Guardado y Consulta en PostgreSQL
    console.log('\n3️⃣ Verificando persistencia en PostgreSQL:');
    const saveRes = await pluralAgreementEngine.guardarAcuerdo(acuerdoGenerado);
    console.log(`   ✓ Guardado en base de datos exitoso con ID: ${saveRes.id}`);

    const recuperados = await pluralAgreementEngine.getAcuerdosPorProceso(procesoMock.id);
    if (!recuperados || recuperados.length === 0 || recuperados[0].nombre_estructura !== estructuraMock.nombre_estructura) {
      throw new Error('Fallo al consultar acuerdos plurales en PostgreSQL');
    }
    console.log(`   ✓ Recuperado de PostgreSQL: ${recuperados.length} acuerdo(s) encontrado(s) para el proceso.`);

    // 4. Prueba de Generación PDF Oficial
    console.log('\n4️⃣ Verificando compilación de PDF oficial (Formulario 3 CCE):');
    const pdfBuffer = await pluralAgreementEngine.generarAcuerdoPdf(acuerdoGenerado);
    if (!pdfBuffer || pdfBuffer.length < 5000) {
      throw new Error(`Buffer PDF defectuoso o incompleto: ${pdfBuffer?.length} bytes`);
    }
    console.log(`   ✓ PDF oficial generado exitosamente: ${pdfBuffer.length} bytes (Tablas, membrete y bloques de firmas).`);

    // Limpieza
    await dbPostgres.query('DELETE FROM acuerdos_plurales_cce WHERE proceso_id = $1', [procesoMock.id]);
    console.log('   ✓ Registro mock limpiado en DB.');

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE ACUERDOS PLURALES PASARON AL 100%!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERROR EN PRUEBAS:', err);
    process.exit(1);
  }
}

runTests();
