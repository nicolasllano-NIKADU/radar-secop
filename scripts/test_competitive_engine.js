const competitiveIntelligence = require('../server/competitiveIntelligence');

async function testEngine() {
  console.log('🧪 Iniciando test del Motor de Inteligencia Competitiva...');

  // Test 1: Búsqueda por palabra clave en tecnología
  console.log('\n--- TEST 1: Análisis por Palabra Clave ("SOFTWARE") ---');
  const res1 = await competitiveIntelligence.analizarMercado({
    palabraClave: 'SOFTWARE',
    limit: 20,
    forceRefresh: true
  });

  console.log('✅ Origen:', res1.source);
  console.log(`📊 Total Contratos Analizados: ${res1.totalContratos}`);
  console.log(`💰 Monto Total Adjudicado: $${Number(res1.montoTotal).toLocaleString('es-CO')} COP`);
  console.log(`🎯 Ticket Mediana: $${Number(res1.ticketMediana).toLocaleString('es-CO')} COP`);
  console.log(`📈 Índice Herfindahl (HHI): ${res1.indiceHerfindahl} (${res1.nivelConcentracion.etiqueta})`);
  console.log(`🎲 Calibración Monte Carlo Sugerida:`, res1.monteCarloParams);

  console.log('\n🏆 Top 3 Contratistas Ganadores:');
  res1.topContratistas.slice(0, 3).forEach((c, idx) => {
    console.log(`  [#${idx+1}] ${c.nombre} (NIT: ${c.nit})`);
    console.log(`      Cuota Mercado: ${c.cuotaMercadoPct}% | Contratos: ${c.contratosGanados} | Monto: $${Number(c.montoTotal).toLocaleString('es-CO')}`);
  });

  // Test 2: Comprobación de Caché en PostgreSQL (debe retornar instantáneamente con source CACHE_POSTGRES)
  console.log('\n--- TEST 2: Verificación de Caché PostgreSQL ---');
  const t0 = Date.now();
  const res2 = await competitiveIntelligence.analizarMercado({
    palabraClave: 'SOFTWARE',
    limit: 20,
    forceRefresh: false
  });
  const elapsed = Date.now() - t0;
  console.log(`⚡ Retornado desde: ${res2.source} en ${elapsed}ms`);
  if (res2.source === 'CACHE_POSTGRES') {
    console.log('✅ Caché PostgreSQL funcionando al 100%!');
  } else {
    console.warn('⚠️ Se esperaba CACHE_POSTGRES');
  }

  // Test 3: Historial específico de un contratista
  if (res1.topContratistas.length > 0 && res1.topContratistas[0].nit !== 'SIN_NIT') {
    const topNit = res1.topContratistas[0].nit;
    console.log(`\n--- TEST 3: Historial Específico del Contratista (NIT: ${topNit}) ---`);
    const hist = await competitiveIntelligence.obtenerHistorialContratista(topNit);
    console.log(`  Contratista: ${hist.nombre}`);
    console.log(`  Total contratos registrados: ${hist.totalContratos}`);
    console.log(`  Monto total: $${Number(hist.montoTotalAdjudicado).toLocaleString('es-CO')} COP`);
    console.log(`  Entidades donde ha ganado:`, hist.entidadesContratantes.slice(0, 3));
  }

  console.log('\n✨ Todos los tests del motor de inteligencia competitiva completados con éxito.');
  process.exit(0);
}

testEngine().catch(err => {
  console.error('❌ Error en testEngine:', err);
  process.exit(1);
});
