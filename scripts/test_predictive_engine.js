const predictiveEngine = require('../server/predictiveEngine');

async function testPredictive() {
  console.log('🧪 Probando Motor Predictivo de Vencimientos y Prórrogas...');

  // Test 1: Búsqueda con horizonte a 90 días
  console.log('\n--- TEST 1: Consulta de Vencimientos a 90 días ---');
  const res1 = await predictiveEngine.obtenerVencimientos({
    perfil: 'NIKADU_IA',
    diasHorizonte: 90,
    minValor: 30000000,
    limit: 10,
    forceRefresh: true
  });

  console.log(`✅ Origen: ${res1.source}`);
  console.log(`📊 Total Contratos Detectados: ${res1.totalContratos}`);
  console.log(`💰 Monto Próximo a Vencer: $${Number(res1.montoTotal).toLocaleString('es-CO')} COP`);
  console.log(`🏢 Entidades Clave Detectadas: ${res1.resumenEntidades.length}`);

  if (res1.contratos.length > 0) {
    console.log('\n🏆 Muestra de Primer Contrato por Vencer:');
    const c = res1.contratos[0];
    console.log(`  Entidad: ${c.entidad}`);
    console.log(`  Objeto: ${c.objeto.slice(0, 100)}...`);
    console.log(`  Valor: $${Number(c.valor).toLocaleString('es-CO')} COP`);
    console.log(`  Titular actual: ${c.proveedorActual} (NIT: ${c.nitProveedor})`);
    console.log(`  Fecha Fin: ${c.fechaFin} (Días restantes: ${c.diasRestantes})`);
    console.log(`  Urgencia: ${c.urgencia.etiqueta}`);
    console.log(`  Certeza Nueva Licitación: ${c.certezaNuevaLicitacion.nivel} (${c.certezaNuevaLicitacion.probabilidad}%)`);
  }

  // Test 2: Caché PostgreSQL
  console.log('\n--- TEST 2: Verificación de Caché PostgreSQL ---');
  const t0 = Date.now();
  const res2 = await predictiveEngine.obtenerVencimientos({
    perfil: 'NIKADU_IA',
    diasHorizonte: 90,
    minValor: 30000000,
    limit: 10,
    forceRefresh: false
  });
  console.log(`⚡ Retornado desde: ${res2.source} en ${Date.now() - t0}ms`);
  if (res2.source !== 'CACHE_POSTGRES') throw new Error('Se esperaba CACHE_POSTGRES');

  // Test 3: Incorporación al Pipeline
  if (res1.contratos.length > 0) {
    const c = res1.contratos[0];
    console.log('\n--- TEST 3: Incorporación de Vencimiento al Pipeline ---');
    const lead = await predictiveEngine.incorporarAlPipeline(null, {
      idContrato: c.idContrato,
      entidad: c.entidad,
      objeto: c.objeto,
      valor: c.valor,
      fechaFin: c.fechaFin,
      proveedorActual: c.proveedorActual,
      nitProveedor: c.nitProveedor
    });
    console.log(`✅ Creado en Pipeline ID: ${lead.id} | Fase: ${lead.fase}`);
  }

  console.log('\n✨ Todos los tests del motor predictivo pasaron con éxito!');
  process.exit(0);
}

testPredictive().catch(err => {
  console.error('❌ Error en testPredictive:', err);
  process.exit(1);
});
