/**
 * ====================================================================
 * RADAR SECOP - SUITE DE PRUEBAS DE CRITERIOS DIFERENCIALES Y GÉNERO
 * Marco: Ley 2069/2020 • Decreto 1860/2021 • Decreto 957/2019 • Ley 816/2003
 * ====================================================================
 */

const engine = require('../server/criteriosDiferencialesEngine');
const dbPostgres = require('../server/dbPostgres');
const assert = require('assert');

async function runTestSuite() {
  console.log('======================================================================');
  console.log('🧪 INICIANDO TEST SUITE: CRITERIOS DIFERENCIALES MIPYMES Y GÉNERO');
  console.log('   Marco: Ley 2069 de 2020 • Decreto 1860 de 2021 • Decreto 957 de 2019');
  console.log('======================================================================\n');

  // ---------------------------------------------------------
  // TEST 1: Clasificación de Tamaño Empresarial (Decreto 957 de 2019)
  // ---------------------------------------------------------
  console.log('--- TEST 1: Clasificación de Tamaño Empresarial por UVT (Dec. 957/2019) ---');
  const UVT = 49799;

  // Servicios: Micro <= 32.988 UVT ($1.642M COP)
  const cMicro = engine.clasificarTamanoEmpresa(1000000000, 'SERVICIOS', UVT);
  assert.strictEqual(cMicro.categoria, 'MICRO');
  assert.strictEqual(cMicro.es_mipyme, true);
  console.log(`  ✅ $1.000M COP en Servicios -> ${cMicro.categoria_label} (${cMicro.ingresos_uvt} UVT)`);

  // Servicios: Pequeña <= 131.951 UVT (Ej: $4.000M COP = 80.322 UVT)
  const cPequena = engine.clasificarTamanoEmpresa(4000000000, 'SERVICIOS', UVT);
  assert.strictEqual(cPequena.categoria, 'PEQUEÑA');
  assert.strictEqual(cPequena.es_mipyme, true);
  console.log(`  ✅ $4.000M COP en Servicios -> ${cPequena.categoria_label} (${cPequena.ingresos_uvt} UVT)`);

  // Manufactura: Mediana <= 1.736.565 UVT (Ej: $25.000M COP = 502.018 UVT)
  const cMediana = engine.clasificarTamanoEmpresa(25000000000, 'MANUFACTURA', UVT);
  assert.strictEqual(cMediana.categoria, 'MEDIANA');
  assert.strictEqual(cMediana.es_mipyme, true);
  console.log(`  ✅ $25.000M COP en Manufactura -> ${cMediana.categoria_label} (${cMediana.ingresos_uvt} UVT)`);

  // Comercio: Gran Empresa > 2.160.692 UVT (Ej: $150.000M COP)
  const cGran = engine.clasificarTamanoEmpresa(150000000000, 'COMERCIO', UVT);
  assert.strictEqual(cGran.categoria, 'GRAN_EMPRESA');
  assert.strictEqual(cGran.es_mipyme, false);
  console.log(`  ✅ $150.000M COP en Comercio -> ${cGran.categoria_label} (${cGran.ingresos_uvt} UVT) [No Mipyme]`);

  // ---------------------------------------------------------
  // TEST 2: Acreditación de Empresas de Mujeres (Decreto 1860 de 2021)
  // ---------------------------------------------------------
  console.log('\n--- TEST 2: Supuestos de Emprendimiento Femenino (Dec. 1860/2021) ---');
  // Supuesto A: Propiedad > 50% y Representante mujer >= 1 año
  const evA = engine.evaluarEmpresaMujeres({
    supuesto: 'SUPUESTO_A_PROPIEDAD_CONTROL',
    porcentajePropiedadFemenina: 60,
    representanteMujerMasUnAno: true
  });
  assert.strictEqual(evA.es_empresa_mujeres, true);
  assert.strictEqual(evA.supuesto_acreditado, 'SUPUESTO_A_PROPIEDAD_CONTROL');
  assert.strictEqual(evA.puntaje_incentivo, 1.0);
  console.log(`  ✅ Supuesto A (Propiedad y Control): Cumple (Incentivo: +${evA.puntaje_incentivo} Pts)`);

  // Supuesto B: Cargos directivos >= 50% ocupados por mujeres
  const evB = engine.evaluarEmpresaMujeres({
    supuesto: 'SUPUESTO_B_DIRECCION',
    porcentajeDirectivoFemenino: 50
  });
  assert.strictEqual(evB.es_empresa_mujeres, true);
  assert.strictEqual(evB.supuesto_acreditado, 'SUPUESTO_B_DIRECCION');
  console.log(`  ✅ Supuesto B (Nivel Directivo >= 50%): Cumple`);

  // Supuesto C: Persona Natural Mujer
  const evC = engine.evaluarEmpresaMujeres({
    supuesto: 'SUPUESTO_C_PERSONA_NATURAL',
    esPersonaNaturalMujer: true
  });
  assert.strictEqual(evC.es_empresa_mujeres, true);
  assert.strictEqual(evC.supuesto_acreditado, 'SUPUESTO_C_PERSONA_NATURAL');
  console.log(`  ✅ Supuesto C (Persona Natural Mujer): Cumple`);

  // No cumple
  const evNone = engine.evaluarEmpresaMujeres({
    supuesto: 'NINGUNO',
    porcentajePropiedadFemenina: 20
  });
  assert.strictEqual(evNone.es_empresa_mujeres, false);
  assert.strictEqual(evNone.puntaje_incentivo, 0.0);
  console.log(`  ✅ Sin acreditación de género -> es_empresa_mujeres: false`);

  // ---------------------------------------------------------
  // TEST 3: Evaluación Integral y Árbol de Desempate Jerárquico
  // ---------------------------------------------------------
  console.log('\n--- TEST 3: Matriz Integral y Árbol de Desempate (Ley 2069 Art. 35) ---');
  const mat = engine.evaluarMatrizCriterios({
    empresa: { razon_social: 'TECNOLOGÍAS FEMTECH COLOMBIA S.A.S.', nit: '901.456.789-0' },
    proceso: { referencia: 'SAMC-005-2026', entidad: 'Alcaldía de Medellín', precio_base: 350000000 }, // $350M < USD 125k
    ingresosBrutosCop: 1200000000,
    sector: 'SERVICIOS',
    datosMujeres: {
      supuesto: 'SUPUESTO_A_PROPIEDAD_CONTROL',
      porcentajePropiedadFemenina: 70,
      representanteMujerMasUnAno: true
    },
    acreditaDiscapacidad: true,
    acreditaPrimerEmpleo: true,
    acreditaReincorporadosVictimas: false,
    acreditaIndustriaNacional: true
  });

  assert.strictEqual(mat.clasificacion_tamano.categoria, 'MICRO');
  assert.strictEqual(mat.evaluacion_mujeres.es_empresa_mujeres, true);
  assert.strictEqual(mat.limitacion_convocatoria_mipyme.es_apto, true, 'Debe ser apto para solicitar limitación Mipyme');
  assert.strictEqual(mat.posicion_desempate, 1, 'Cumple Industria Nacional (Prioridad 1)');
  assert.strictEqual(mat.puntajes_diferenciales.total_puntos, 12.5, '10 (Ind. Nac) + 1.0 (Mujer) + 1.0 (Discap) + 0.5 (Primer Empleo) = 12.5');
  console.log(`  ✅ Clasificación: ${mat.clasificacion_tamano.categoria_label} (${mat.clasificacion_tamano.ingresos_uvt} UVT)`);
  console.log(`  ✅ Convocatoria Limitada a Mipymes: ${mat.limitacion_convocatoria_mipyme.es_apto ? 'APTO' : 'NO APTO'} ($350M < Tope $525M)`);
  console.log(`  ✅ Puntos Diferenciales Acumulados: +${mat.puntajes_diferenciales.total_puntos} Pts`);
  console.log(`  ✅ Posición Desempate: Nivel #${mat.posicion_desempate} (Preferencia Nacional)`);

  // ---------------------------------------------------------
  // TEST 4: Generación de Certificación Conjunta Oficial en PDF
  // ---------------------------------------------------------
  console.log('\n--- TEST 4: Generación de Certificación Oficial en PDF ---');
  const pdfBuffer = await engine.generarCertificacionPdf(mat, {
    representante: { nombre: 'Dra. Marcela Restrepo', cedula: '43.123.456' },
    contador: { nombre: 'Dr. Alejandro Torres', cedula: '71.987.654', tarjeta_profesional: '98765-T' }
  });

  assert.ok(Buffer.isBuffer(pdfBuffer), 'Debe retornar un Buffer binario');
  assert.ok(pdfBuffer.length > 2500, `El PDF debe ser sustancial (>2.5KB), tamaño: ${pdfBuffer.length} bytes`);
  assert.strictEqual(pdfBuffer.slice(0, 4).toString(), '%PDF', 'Debe comenzar con la cabecera %PDF');
  console.log(`  ✅ Certificación Oficial en PDF generada con éxito: ${pdfBuffer.length} bytes emitidos.`);

  // ---------------------------------------------------------
  // TEST 5: Persistencia ACID y Consulta en PostgreSQL
  // ---------------------------------------------------------
  console.log('\n--- TEST 5: Persistencia en PostgreSQL (criterios_diferenciales_evaluaciones) ---');
  const refTest = `TEST-CRIT-DIF-${Date.now()}`;
  const insertSql = `
    INSERT INTO criterios_diferenciales_evaluaciones (
      proceso_referencia, entidad, sector_economico, ingresos_brutos_cop,
      ingresos_uvt, clasificacion_tamano, acredita_mipyme, es_empresa_mujeres,
      supuesto_mujeres, puntaje_diferencial_total, posicion_arbol_desempate,
      resumen_evaluacion
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id, proceso_referencia, clasificacion_tamano, es_empresa_mujeres;
  `;

  const qInsert = await dbPostgres.query(insertSql, [
    refTest,
    'Alcaldía de Medellín',
    mat.clasificacion_tamano.sector,
    mat.clasificacion_tamano.ingresos_cop,
    mat.clasificacion_tamano.ingresos_uvt,
    mat.clasificacion_tamano.categoria,
    mat.clasificacion_tamano.es_mipyme,
    mat.evaluacion_mujeres.es_empresa_mujeres,
    mat.evaluacion_mujeres.supuesto_acreditado,
    mat.puntajes_diferenciales.total_puntos,
    mat.posicion_desempate,
    JSON.stringify(mat)
  ]);

  const insertedId = qInsert.rows[0].id;
  assert.ok(insertedId > 0, 'Debe retornar ID autoincremental de PostgreSQL');
  console.log(`  ✅ Registro insertado en DB con ID #${insertedId} (Ref: ${refTest})`);

  const qSelect = await dbPostgres.query('SELECT * FROM criterios_diferenciales_evaluaciones WHERE id = $1', [insertedId]);
  assert.strictEqual(qSelect.rows.length, 1);
  assert.strictEqual(qSelect.rows[0].proceso_referencia, refTest);
  assert.strictEqual(qSelect.rows[0].clasificacion_tamano, 'MICRO');
  assert.strictEqual(qSelect.rows[0].es_empresa_mujeres, true);
  console.log(`  ✅ Integridad referencial verificada: ${qSelect.rows[0].proceso_referencia} | Mipyme: ${qSelect.rows[0].clasificacion_tamano} | Mujeres: ${qSelect.rows[0].es_empresa_mujeres}`);

  // Limpieza
  await dbPostgres.query('DELETE FROM criterios_diferenciales_evaluaciones WHERE id = $1', [insertedId]);
  console.log(`  ✅ Limpieza de registro de prueba completada.`);

  console.log('\n======================================================================');
  console.log('🎉 TODOS LOS TESTS DE CRITERIOS DIFERENCIALES Y GÉNERO PASARON AL 100%');
  console.log('======================================================================\n');
}

runTestSuite()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error en suite de pruebas:', err);
    process.exit(1);
  });
