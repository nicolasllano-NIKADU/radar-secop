// ============================================================================
// RADAR SECOP - INTEGRATION TEST: INTELIGENCIA COMERCIAL PAA (FASE 3 BLUEPRINT)
// Normativa: Ley 1150/2007, Decreto 1082/2015, Decreto 003/2025 (Interoperabilidad PAA)
// y SODA REST API (Dataset 9sue-ezhx de Colombia Compra Eficiente).
// ============================================================================

const paaManager = require('../server/paaManager');
const dbPostgres = require('../server/dbPostgres');

async function runTests() {
  console.log('🧪 Iniciando pruebas de Inteligencia Comercial y Seguimiento del PAA (Fase 3)...\n');
  let testEmpresaId = null;
  const createdPaaIds = [];

  try {
    // 1. Verificación del Algoritmo de Matching Predictivo de 3 Factores
    console.log('1️⃣ Verificando Algoritmo de Matching Predictivo:');
    console.log('   Fórmula: Score_Match = w1*Sim_UNSPSC (40%) + w2*Fit_Financial (40%) + w3*Proximity_Geo (20%)');

    const mockEmpresa = {
      id: 9999,
      razon_social: 'CONSTRUCTORA DE INFRAESTRUCTURA NACIONAL SAS',
      nit: '900123456-7',
      capital_trabajo: 3000000000,
      patrimonio: 8000000000
    };

    const mockPerfil = {
      palabras_clave: ['pavimentacion', 'mantenimiento vial', 'redes de acueducto'],
      codigos_unspsc: ['72141000', '72141100'],
      departamentos: ['Bogota', 'Cundinamarca']
    };

    const mockItemAltaAfinidad = {
      descripcion: 'Pavimentacion y mantenimiento vial tramo troncal Bogotá',
      categorias_unspsc: '72141000;72141100',
      valor_total_esperado: 2500000000,
      nombre_entidad: 'Alcaldía Mayor de Bogotá D.C.'
    };

    const scoreAlto = paaManager.calculatePredictiveScore(mockEmpresa, mockPerfil, mockItemAltaAfinidad);
    console.log(`   ✓ Match de Alta Afinidad: Score Total = ${scoreAlto.scoreTotal}% (UNSPSC: ${scoreAlto.simUnspsc}%, Fit Fin: ${scoreAlto.fitFinanciero}%, Geo: ${scoreAlto.proximidadGeo}%)`);

    if (scoreAlto.scoreTotal < 85) {
      throw new Error(`Score de alta afinidad esperado >= 85%, obtenido: ${scoreAlto.scoreTotal}%`);
    }

    const mockItemBajaAfinidad = {
      descripcion: 'Suministro de papelería de oficina y útiles de aseo',
      categorias_unspsc: '14111500;44121500',
      valor_total_esperado: 50000000000, // Cuantía desproporcionada
      nombre_entidad: 'Gobernación del Amazonas'
    };

    const scoreBajo = paaManager.calculatePredictiveScore(mockEmpresa, mockPerfil, mockItemBajaAfinidad);
    console.log(`   ✓ Match de Baja Afinidad: Score Total = ${scoreBajo.scoreTotal}% (UNSPSC: ${scoreBajo.simUnspsc}%, Fit Fin: ${scoreBajo.fitFinanciero}%, Geo: ${scoreBajo.proximidadGeo}%)`);

    if (scoreBajo.scoreTotal > 55) {
      throw new Error(`Score de baja afinidad esperado <= 55%, obtenido: ${scoreBajo.scoreTotal}%`);
    }

    // 2. Preparar Empresa de Prueba en PostgreSQL
    console.log('\n2️⃣ Verificando empresa de prueba en PostgreSQL:');
    let empRes = await dbPostgres.query('SELECT id, razon_social FROM empresas LIMIT 1');
    if (empRes.rows.length > 0) {
      testEmpresaId = empRes.rows[0].id;
    } else {
      const newEmp = await dbPostgres.query(`
        INSERT INTO empresas (nit, razon_social, correo_contacto, capital_trabajo)
        VALUES ('901999111-9', 'INGENIERÍA Y CONSTRUCCIONES PAA TEST SAS', 'gerencia@paatest.co', 4000000000)
        RETURNING id
      `);
      testEmpresaId = newEmp.rows[0].id;
    }
    console.log(`   ✓ Empresa vinculada con ID ${testEmpresaId}.`);

    // 3. Insertar Oportunidades PAA de Prueba distribuidas en Q1, Q2, Q3, Q4
    console.log('\n3️⃣ Insertando compras proyectadas PAA en los 4 trimestres (Q1 - Q4):');
    const mockPaaItems = [
      {
        id: 'TEST-PAA-Q1-01',
        desc: 'Construcción y mejoramiento calzada vial sector norte',
        entidad: 'INSTITUTO NACIONAL DE VÍAS (INVIAS)',
        modalidad: 'Licitación Pública',
        unspsc: '72141000',
        mes: 'Febrero',
        valor: 2000000000,
        score: 95
      },
      {
        id: 'TEST-PAA-Q2-02',
        desc: 'Mantenimiento preventivo puentes vehiculares y peatonales',
        entidad: 'INSTITUTO DE DESARROLLO URBANO (IDU)',
        modalidad: 'Licitación Pública',
        unspsc: '72141100',
        mes: 'Mayo',
        valor: 3500000000,
        score: 90
      },
      {
        id: 'TEST-PAA-Q3-03',
        desc: 'Adecuación redes hidráulicas y alcantarillado pluvial',
        entidad: 'EMPRESA DE ACUEDUCTO DE BOGOTÁ',
        modalidad: 'Selección Abreviada',
        unspsc: '72141000',
        mes: 'Agosto',
        valor: 1800000000,
        score: 82
      },
      {
        id: 'TEST-PAA-Q4-04',
        desc: 'Construcción de ciclorrutas y espacio público integral',
        entidad: 'GOBERNACIÓN DE CUNDINAMARCA',
        modalidad: 'Licitación Pública',
        unspsc: '72141000',
        mes: 'Noviembre',
        valor: 4200000000,
        score: 88
      }
    ];

    for (const item of mockPaaItems) {
      createdPaaIds.push(item.id);

      await dbPostgres.query(`
        INSERT INTO paa_adquisiciones (
          id, identificador_unico, descripcion, nombre_entidad,
          modalidad, categorias_unspsc, fecha_esperada_inicio,
          valor_total_esperado, annio
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '2026')
        ON CONFLICT (id) DO UPDATE SET
          descripcion = EXCLUDED.descripcion,
          valor_total_esperado = EXCLUDED.valor_total_esperado;
      `, [item.id, item.id, item.desc, item.entidad, item.modalidad, item.unspsc, item.mes, item.valor]);

      await dbPostgres.query(`
        INSERT INTO paa_empresa_match (
          paa_id, empresa_id, score_predictivo, similitud_unspsc,
          fit_financiero, proximidad_geo, mes_estimado
        ) VALUES ($1, $2, $3, 90, 90, 85, $4)
        ON CONFLICT (paa_id, empresa_id) DO UPDATE SET
          score_predictivo = EXCLUDED.score_predictivo;
      `, [item.id, testEmpresaId, item.score, item.mes]);

      console.log(`   ✓ Compra PAA registrada: ${item.id} (${item.mes} - Presupuesto: $${item.valor.toLocaleString('es-CO')})`);
    }

    // 4. Verificación del Cockpit Trimestral (Q1 a Q4)
    console.log('\n4️⃣ Verificando agregación de Calendario Trimestral PAA:');
    const calendario = await paaManager.getCalendarioTrimestral(testEmpresaId);

    console.log(`   ✓ Total Oportunidades Mapeadas: ${calendario.total_oportunidades}`);
    console.log(`   ✓ Inversión Pública Proyectada Total: $${calendario.valor_total_proyectado.toLocaleString('es-CO')} COP`);
    console.log(`   ✓ Score Predictivo Promedio: ${calendario.promedio_match_score}%`);
    console.log(`   ✓ Q1 (Ene - Mar): ${calendario.trimestres.Q1.count} procesos ($${calendario.trimestres.Q1.valorTotal.toLocaleString('es-CO')})`);
    console.log(`   ✓ Q2 (Abr - Jun): ${calendario.trimestres.Q2.count} procesos ($${calendario.trimestres.Q2.valorTotal.toLocaleString('es-CO')})`);
    console.log(`   ✓ Q3 (Jul - Sep): ${calendario.trimestres.Q3.count} procesos ($${calendario.trimestres.Q3.valorTotal.toLocaleString('es-CO')})`);
    console.log(`   ✓ Q4 (Oct - Dic): ${calendario.trimestres.Q4.count} procesos ($${calendario.trimestres.Q4.valorTotal.toLocaleString('es-CO')})`);

    if (calendario.trimestres.Q1.count < 1 || calendario.trimestres.Q2.count < 1 ||
        calendario.trimestres.Q3.count < 1 || calendario.trimestres.Q4.count < 1) {
      throw new Error('Fallo en la distribución trimestral del calendario PAA');
    }

    const valorEsperadoMock = 2000000000 + 3500000000 + 1800000000 + 4200000000;
    if (calendario.valor_total_proyectado < valorEsperadoMock) {
      throw new Error('Fallo en la sumatoria de valores proyectados');
    }

    // 5. Generación de Informe Comercial Preventivo del PAA en PDF (pdfkit)
    console.log('\n5️⃣ Generando Informe de Inteligencia Comercial PAA en PDF (pdfkit):');
    const pdfBuffer = await paaManager.generarInformeComercialPdf(testEmpresaId);

    console.log(`   ✓ Informe Comercial PDF generado exitosamente: ${pdfBuffer.length} bytes.`);
    const pdfHeader = pdfBuffer.slice(0, 4).toString('ascii');
    if (pdfHeader !== '%PDF') {
      throw new Error(`Encabezado de archivo PDF inválido: ${pdfHeader}`);
    }
    console.log(`   ✓ Cabecera binaria validada: "${pdfHeader}"`);

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE INTELIGENCIA COMERCIAL PAA PASARON EXITOSAMENTE (100%)!\n');

  } catch (err) {
    console.error('\n❌ ERROR EN LA SUITE DE PRUEBAS DEL PAA:', err);
    process.exitCode = 1;
  } finally {
    // Limpieza de datos de prueba
    if (createdPaaIds.length > 0) {
      try {
        await dbPostgres.query('DELETE FROM paa_adquisiciones WHERE id = ANY($1)', [createdPaaIds]);
        console.log(`🧹 ${createdPaaIds.length} compras PAA de prueba eliminadas limpiamente (CASCADE).`);
      } catch (cleanErr) {
        console.warn('Advertencia durante limpieza:', cleanErr.message);
      }
    }
    await dbPostgres.pool.end();
  }
}

runTests();
