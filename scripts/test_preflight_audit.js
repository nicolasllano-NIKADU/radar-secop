// ============================================================================
// RADAR SECOP - INTEGRATION TEST: AUDITORÍA PRE-FLIGHT (20 PUNTOS DE CONTROL)
// ============================================================================

const preflightAuditEngine = require('../server/preflightAuditEngine');
const dbPostgres = require('../server/dbPostgres');

async function runTests() {
  console.log('🧪 Iniciando pruebas de Auditoría Pre-Flight SECOP II (20 Puntos de Control)...\n');

  try {
    // 1. Catálogo maestro de 20 controles
    console.log('1️⃣ Verificando catálogo maestro de 20 puntos de control:');
    const catalogo = preflightAuditEngine.getControlesMaestros();
    if (catalogo.length !== 20) {
      throw new Error(`Se esperaban 20 controles, pero se obtuvieron ${catalogo.length}`);
    }

    const areas = {};
    catalogo.forEach(c => { areas[c.area] = (areas[c.area] || 0) + 1; });
    console.log(`   ✓ Total controles: ${catalogo.length}`);
    console.log(`   ✓ Distribución por área: Jurídico=${areas['JURÍDICO']}, Pólizas=${areas['PÓLIZAS']}, Financiero=${areas['FINANCIERO']}, Económico/Téc=${areas['ECONÓMICO_TÉCNICO']}`);

    // 2. Evaluación "All Clear" (100% Aprobado / GO)
    console.log('\n2️⃣ Verificando evaluación "All Clear" (Apto para Radicar):');
    const procesoMock = {
      id: 'TEST-PROC-PREFLIGHT-001',
      referencia: 'SAMC-ALCALDIA-BOG-2026',
      entidad: 'ALCALDÍA MAYOR DE BOGOTÁ D.C.',
      objeto: 'SUMINISTRO E INSTALACIÓN DE INFRAESTRUCTURA DE CIBERSEGURIDAD',
      cuantia: 1200000000
    };

    const oferenteMock = {
      nit: '900.555.444-3',
      razon_social: 'SEGURIDAD DIGITAL ANDINA S.A.S.'
    };

    const resClean = preflightAuditEngine.ejecutarAuditoriaPreflight({
      proceso: procesoMock,
      oferente: oferenteMock
    });

    if (resClean.auditoria.estado_global !== 'APTO_PARA_RADICAR' || resClean.auditoria.controles_aprobados !== 20 || resClean.auditoria.puntaje_cumplimiento !== 100) {
      throw new Error(`Fallo en evaluación limpia: Estado=${resClean.auditoria.estado_global}, Aprobados=${resClean.auditoria.controles_aprobados}, Puntaje=${resClean.auditoria.puntaje_cumplimiento}%`);
    }
    console.log(`   ✓ Estado: [${resClean.auditoria.estado_global}] con ${resClean.auditoria.puntaje_cumplimiento}% de cumplimiento.`);

    // 3. Evaluación con Advertencia Subsanable
    console.log('\n3️⃣ Verificando detección de Advertencia Subsanable:');
    const resWarn = preflightAuditEngine.ejecutarAuditoriaPreflight({
      proceso: procesoMock,
      oferente: oferenteMock,
      respuestasUsuario: {
        'CTRL-POL-04': 'ADVERTENCIA' // Falta soporte de pago pero póliza está vigente
      }
    });

    if (resWarn.auditoria.estado_global !== 'SUBSANACION_PENDIENTE' || resWarn.auditoria.controles_advertencia !== 1) {
      throw new Error(`Fallo en advertencia: Estado=${resWarn.auditoria.estado_global}, Advertencias=${resWarn.auditoria.controles_advertencia}`);
    }
    console.log(`   ✓ Estado: [${resWarn.auditoria.estado_global}] detectado correctamente con 1 advertencia formal subsanable.`);

    // 4. Evaluación con Causal de Rechazo Insubsanable (Alerta Roja NO-GO)
    console.log('\n4️⃣ Verificando detección de Causal de Rechazo de Plano (Alerta Roja):');
    const resRechazo = preflightAuditEngine.ejecutarAuditoriaPreflight({
      proceso: procesoMock,
      oferente: oferenteMock,
      respuestasUsuario: {
        'CTRL-POL-01': 'RECHAZO', // Póliza no alcanza el 10%
        'CTRL-ECO-01': 'RECHAZO'  // Oferta económica alterada
      }
    });

    if (resRechazo.auditoria.estado_global !== 'RIESGO_RECHAZO' || resRechazo.auditoria.controles_rechazo !== 2) {
      throw new Error(`Fallo en rechazo: Estado=${resRechazo.auditoria.estado_global}, Rechazos=${resRechazo.auditoria.controles_rechazo}`);
    }
    console.log(`   ✓ Estado: [${resRechazo.auditoria.estado_global}] con ${resRechazo.auditoria.controles_rechazo} causales insubsanables identificadas.`);
    console.log(`   ✓ Mensaje: "${resRechazo.auditoria.diagnostico_ejecutivo.slice(0, 70)}..."`);

    // 5. Persistencia en PostgreSQL
    console.log('\n5️⃣ Verificando guardado y recuperación en PostgreSQL:');
    const saveRes = await preflightAuditEngine.guardarAuditoria(resClean);
    console.log(`   ✓ Guardado en base de datos con ID: ${saveRes.id}`);

    const guardada = await preflightAuditEngine.getAuditoria(procesoMock.id);
    if (!guardada || guardada.total_controles !== 20 || guardada.estado_global !== 'APTO_PARA_RADICAR') {
      throw new Error('Fallo al recuperar auditoría guardada en PostgreSQL');
    }
    console.log(`   ✓ Recuperado de PostgreSQL: ${guardada.controles_items.length} controles verificados.`);

    // 6. Generación de Certificado Pre-Flight PDF
    console.log('\n6️⃣ Verificando generación del Certificado Pre-Flight PDF:');
    const pdfBuffer = await preflightAuditEngine.generarCertificadoPdf(resClean.auditoria);
    if (!pdfBuffer || pdfBuffer.length < 5000) {
      throw new Error(`Buffer PDF defectuoso o incompleto: ${pdfBuffer?.length} bytes`);
    }
    console.log(`   ✓ Certificado Pre-Flight generado exitosamente: ${pdfBuffer.length} bytes (Membrete oficial, semáforo y firmas de líderes).`);

    // Limpieza
    await dbPostgres.query('DELETE FROM preflight_audits WHERE proceso_id = $1', [procesoMock.id]);
    console.log('   ✓ Registro mock limpiado en DB.');

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE AUDITORÍA PRE-FLIGHT PASARON AL 100%!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERROR EN PRUEBAS:', err);
    process.exit(1);
  }
}

runTests();
