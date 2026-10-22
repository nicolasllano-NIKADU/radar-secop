// ============================================================================
// RADAR SECOP - INTEGRATION TEST: ADENDAS Y CRONOGRAMA DINÁMICO (SECOP II)
// ============================================================================

const adendasEngine = require('../server/adendasEngine');
const dbPostgres = require('../server/dbPostgres');

async function runTests() {
  console.log('🧪 Iniciando pruebas de Asistente de Adendas y Control de Cronograma Dinámico...\n');

  try {
    const procesoMock = {
      id: 'TEST-PROC-ADENDAS-001',
      referencia: 'LP-IDU-099-2026',
      entidad: 'INSTITUTO DE DESARROLLO URBANO (IDU)',
      objeto: 'CONSTRUCCIÓN DE PASO A DESNIVEL Y CICLORRUTA',
      fecha_cierre: '2026-11-10T15:00:00Z'
    };

    // 1. Prueba de Evaluación de Adenda con Prórroga (Impacto en Póliza y Cronograma)
    console.log('1️⃣ Verificando evaluación de adenda con prórroga de cierre:');
    const adenda1 = adendasEngine.evaluarImpactoAdenda({
      proceso: procesoMock,
      numeroAdenda: 'Adenda No. 1',
      fechaExpedicion: '2026-11-02T10:00:00Z',
      tipoModificacion: 'CRONOGRAMA',
      fechaCierreAnterior: '2026-11-10T15:00:00Z',
      fechaCierreNueva: '2026-11-20T15:00:00Z',
      descripcionCambios: 'Se prorroga la fecha de cierre del proceso de selección por 10 días calendario a solicitud de los oferentes.'
    });

    if (!adenda1.impacto_poliza_seriedad || adenda1.dias_prorroga !== 10 || adenda1.nivel_criticidad !== 'ALTO') {
      throw new Error(`Fallo en evaluación de cronograma: Prórroga=${adenda1.dias_prorroga}, Póliza=${adenda1.impacto_poliza_seriedad}, Criticidad=${adenda1.nivel_criticidad}`);
    }
    console.log(`   ✓ Días de prórroga calculados: +${adenda1.dias_prorroga} días.`);
    console.log(`   ✓ Impacto en Póliza de Seriedad detectado: ${adenda1.impacto_poliza_seriedad} (Nueva vigencia requerida: ${adenda1.nueva_vigencia_poliza_requerida}).`);
    console.log(`   ✓ Cumplimiento Ley 1882/2018 (3 días hábiles): ${adenda1.cumplimiento_ley_1882 ? 'CONFORME ✅' : 'NO CONFORME ⚠️'}`);

    // 2. Prueba de Adenda con Modificación de Formulario Económico y Requisitos Habilitantes
    console.log('\n2️⃣ Verificando evaluación de adenda con cambio en Formulario Económico y RUP:');
    const adenda2 = adendasEngine.evaluarImpactoAdenda({
      proceso: procesoMock,
      numeroAdenda: 'Adenda No. 2',
      fechaExpedicion: '2026-11-05T14:00:00Z',
      tipoModificacion: 'MULTIPLE',
      descripcionCambios: 'Se modifica el Formulario Económico oficial cambiando el ítem 3.4 de excavación y se ajustan los códigos UNSPSC de experiencia habilitante en el RUP.'
    });

    if (!adenda2.impacto_oferta_economica || !adenda2.impacto_habilitantes || adenda2.nivel_criticidad !== 'ALTO') {
      throw new Error(`Fallo en evaluación múltiple: Económico=${adenda2.impacto_oferta_economica}, Habilitantes=${adenda2.impacto_habilitantes}`);
    }
    console.log(`   ✓ Impacto en Oferta Económica: ${adenda2.impacto_oferta_economica}`);
    console.log(`   ✓ Impacto en Requisitos Habilitantes: ${adenda2.impacto_habilitantes}`);
    console.log(`   ✓ Criticidad: ${adenda2.nivel_criticidad}`);

    // 3. Prueba de Infracción a la Regla de los 3 Días Hábiles (Ley 1882/2018 Art. 4)
    console.log('\n3️⃣ Verificando detección de inobservancia a la Ley 1882/2018:');
    const adendaIlegal = adendasEngine.evaluarImpactoAdenda({
      proceso: procesoMock,
      numeroAdenda: 'Adenda No. 3',
      fechaExpedicion: '2026-11-09T18:00:00Z', // Víspera del cierre
      tipoModificacion: 'CRONOGRAMA',
      fechaCierreAnterior: '2026-11-10T15:00:00Z',
      fechaCierreNueva: '2026-11-11T15:00:00Z', // Solo 1 día de prórroga (< 3 días hábiles)
      descripcionCambios: 'Modificación extemporánea de cierre.'
    });

    if (adendaIlegal.cumplimiento_ley_1882 !== false) {
      throw new Error('No se detectó la inobservancia de la regla de los 3 días hábiles de la Ley 1882/2018');
    }
    console.log(`   ✓ Inobservancia de Ley 1882 detectada: cumplimiento_ley_1882 = ${adendaIlegal.cumplimiento_ley_1882}`);
    console.log(`   ✓ Alerta generada: "${adendaIlegal.accion_requerida.trim().slice(0, 80)}..."`);

    // 4. Persistencia en PostgreSQL
    console.log('\n4️⃣ Verificando guardado y consulta en PostgreSQL:');
    const regRes = await adendasEngine.registrarAdenda(adenda1);
    console.log(`   ✓ Adenda guardada en base de datos con ID: ${regRes.id}`);

    const lista = await adendasEngine.getAdendasPorProceso(procesoMock.id);
    if (!lista || lista.length === 0 || lista[0].numero_adenda !== 'Adenda No. 1') {
      throw new Error('Fallo consultando adendas del proceso en DB');
    }
    console.log(`   ✓ Recuperado de PostgreSQL: ${lista.length} adenda(s) encontrada(s).`);

    // Actualizar estado de gestión
    const updated = await adendasEngine.actualizarEstadoAdenda(regRes.id, 'ACCION_APLICADA');
    if (updated.estado_gestion !== 'ACCION_APLICADA') throw new Error('Fallo actualizando estado de gestión');
    console.log(`   ✓ Estado de gestión actualizado a: ${updated.estado_gestion}`);

    // 5. Generación de Reporte PDF
    console.log('\n5️⃣ Verificando generación de Reporte de Adendas PDF:');
    const pdfBuffer = await adendasEngine.generarReporteAdendasPdf(procesoMock, lista);
    if (!pdfBuffer || pdfBuffer.length < 1500) {
      throw new Error(`Buffer PDF de adendas defectuoso: ${pdfBuffer?.length} bytes`);
    }
    console.log(`   ✓ Reporte de Adendas PDF generado exitosamente: ${pdfBuffer.length} bytes.`);

    // Limpieza
    await dbPostgres.query('DELETE FROM adendas_proceso WHERE proceso_id = $1', [procesoMock.id]);
    console.log('   ✓ Registros mock limpiados en DB.');

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE ADENDAS PASARON AL 100%!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERROR EN PRUEBAS:', err);
    process.exit(1);
  }
}

runTests();
