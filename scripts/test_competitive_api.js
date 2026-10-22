process.env.NODE_ENV = 'test';
process.env.PORT = '3006';

const { app, server } = require('../server/app');
const BASE_URL = 'http://127.0.0.1:3006';

async function testApi() {
  console.log('🧪 Iniciando verificación de endpoints de Inteligencia Competitiva...');
  await new Promise(r => setTimeout(r, 1200));

  try {
    // 1. Test GET /api/competencia/analizar
    console.log('\n[1/5] Probando GET /api/competencia/analizar...');
    const res1 = await fetch(`${BASE_URL}/api/competencia/analizar?palabra_clave=SOFTWARE&limit=10`);
    const json1 = await res1.json();
    console.log(`  Status: ${res1.status} | Success: ${json1.success}`);
    console.log(`  Source: ${json1.data.source} | Contratos: ${json1.data.totalContratos}`);
    console.log(`  HHI: ${json1.data.indiceHerfindahl} (${json1.data.nivelConcentracion.etiqueta})`);
    if (!json1.success || json1.data.totalContratos === 0) throw new Error('Fallo en endpoint /api/competencia/analizar');

    // 2. Test GET /api/competencia/contratista/:nit
    const topNit = json1.data.topContratistas[0]?.nit || '900320612';
    console.log(`\n[2/5] Probando GET /api/competencia/contratista/${topNit}...`);
    const res2 = await fetch(`${BASE_URL}/api/competencia/contratista/${topNit}`);
    const json2 = await res2.json();
    console.log(`  Status: ${res2.status} | Success: ${json2.success}`);
    console.log(`  Proveedor: ${json2.data.nombre} | Contratos: ${json2.data.totalContratos}`);
    if (!json2.success) throw new Error('Fallo en endpoint /api/competencia/contratista/:nit');

    // 3. Test POST /api/competencia/seguimiento
    console.log('\n[3/5] Probando POST /api/competencia/seguimiento...');
    const res3 = await fetch(`${BASE_URL}/api/competencia/seguimiento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nit: topNit,
        nombre: json2.data.nombre,
        sector: 'Tecnología y Software',
        notas: 'Competidor estratégico detectado por Radar SECOP'
      })
    });
    const json3 = await res3.json();
    console.log(`  Status: ${res3.status} | Success: ${json3.success} | Item ID: ${json3.data.id}`);
    if (!json3.success || !json3.data.id) throw new Error('Fallo en POST /api/competencia/seguimiento');
    const trackingId = json3.data.id;

    // 4. Test GET /api/competencia/seguimiento
    console.log('\n[4/5] Probando GET /api/competencia/seguimiento...');
    const res4 = await fetch(`${BASE_URL}/api/competencia/seguimiento`);
    const json4 = await res4.json();
    console.log(`  Status: ${res4.status} | Success: ${json4.success} | Total en seguimiento: ${json4.data.length}`);
    const found = json4.data.some(c => c.id === trackingId);
    if (!found) throw new Error('No se encontró el competidor recién agregado en la lista');

    // 5. Test DELETE /api/competencia/seguimiento/:id
    console.log(`\n[5/5] Probando DELETE /api/competencia/seguimiento/${trackingId}...`);
    const res5 = await fetch(`${BASE_URL}/api/competencia/seguimiento/${trackingId}`, {
      method: 'DELETE'
    });
    const json5 = await res5.json();
    console.log(`  Status: ${res5.status} | Deleted: ${json5.deleted}`);
    if (!json5.success || !json5.deleted) throw new Error('Fallo en DELETE /api/competencia/seguimiento/:id');

    console.log('\n🎉 TODOS LOS ENDPOINTS DE INTELIGENCIA COMPETITIVA PASARON EL 100% DE VALIDACIONES!');
  } finally {
    server.close();
    process.exit(0);
  }
}

testApi().catch(err => {
  console.error('❌ Error en testApi:', err.message);
  server.close();
  process.exit(1);
});
