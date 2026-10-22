process.env.NODE_ENV = 'test';
process.env.PORT = '3007';

const { app, server } = require('../server/app');
const BASE_URL = 'http://127.0.0.1:3007';

async function testPredictiveApi() {
  console.log('🧪 Iniciando verificación de endpoints de Alertas Predictivas de Vencimientos...');
  await new Promise(r => setTimeout(r, 1200));

  try {
    // 1. GET /api/predictivo/vencimientos
    console.log('\n[1/5] Probando GET /api/predictivo/vencimientos...');
    const res1 = await fetch(`${BASE_URL}/api/predictivo/vencimientos?perfil=NIKADU_IA&dias=90&min_valor=30000000&limit=10`);
    const json1 = await res1.json();
    console.log(`  Status: ${res1.status} | Success: ${json1.success}`);
    console.log(`  Source: ${json1.data?.source} | Contratos: ${json1.data?.totalContratos}`);
    console.log(`  Monto en juego: $${Number(json1.data?.montoTotal).toLocaleString('es-CO')} COP`);
    if (!json1.success || json1.data?.totalContratos === 0) throw new Error('Fallo en /api/predictivo/vencimientos');

    const firstContract = json1.data.contratos[0];

    // 2. POST /api/predictivo/incorporar-pipeline
    console.log('\n[2/5] Probando POST /api/predictivo/incorporar-pipeline...');
    const res2 = await fetch(`${BASE_URL}/api/predictivo/incorporar-pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idContrato: firstContract.idContrato,
        entidad: firstContract.entidad,
        objeto: firstContract.objeto,
        valor: firstContract.valor,
        fechaFin: firstContract.fechaFin,
        proveedorActual: firstContract.proveedorActual,
        nitProveedor: firstContract.nitProveedor
      })
    });
    const json2 = await res2.json();
    console.log(`  Status: ${res2.status} | Success: ${json2.success} | Pipeline ID: ${json2.data?.id}`);
    if (!json2.success || !json2.data?.id) throw new Error('Fallo en POST /api/predictivo/incorporar-pipeline');

    // 3. POST /api/predictivo/seguimiento
    console.log('\n[3/5] Probando POST /api/predictivo/seguimiento...');
    const res3 = await fetch(`${BASE_URL}/api/predictivo/seguimiento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idContrato: firstContract.idContrato,
        entidad: firstContract.entidad,
        objeto: firstContract.objeto,
        valorContrato: firstContract.valor,
        fechaFin: firstContract.fechaFin,
        proveedorActual: firstContract.proveedorActual,
        nitProveedor: firstContract.nitProveedor,
        esProrrogable: firstContract.esProrrogable,
        diasAdicionados: firstContract.diasAdicionados,
        notas: 'Vencimiento prioritario para licitar'
      })
    });
    const json3 = await res3.json();
    console.log(`  Status: ${res3.status} | Success: ${json3.success} | Item ID: ${json3.data?.id}`);
    if (!json3.success || !json3.data?.id) throw new Error('Fallo en POST /api/predictivo/seguimiento');
    const trackingId = json3.data.id;

    // 4. GET /api/predictivo/seguimiento
    console.log('\n[4/5] Probando GET /api/predictivo/seguimiento...');
    const res4 = await fetch(`${BASE_URL}/api/predictivo/seguimiento`);
    const json4 = await res4.json();
    console.log(`  Status: ${res4.status} | Success: ${json4.success} | Total en seguimiento: ${json4.data?.length}`);
    const found = json4.data.some(c => c.id === trackingId);
    if (!found) throw new Error('No se encontró el contrato agregado en la lista de seguimiento');

    // 5. DELETE /api/predictivo/seguimiento/:id
    console.log(`\n[5/5] Probando DELETE /api/predictivo/seguimiento/${trackingId}...`);
    const res5 = await fetch(`${BASE_URL}/api/predictivo/seguimiento/${trackingId}`, {
      method: 'DELETE'
    });
    const json5 = await res5.json();
    console.log(`  Status: ${res5.status} | Deleted: ${json5.deleted}`);
    if (!json5.success || !json5.deleted) throw new Error('Fallo en DELETE /api/predictivo/seguimiento/:id');

    console.log('\n🎉 TODOS LOS ENDPOINTS PREDICTIVOS DE VENCIMIENTOS PASARON AL 100%!');
  } finally {
    server.close();
    process.exit(0);
  }
}

testPredictiveApi().catch(err => {
  console.error('❌ Error en testPredictiveApi:', err.message);
  server.close();
  process.exit(1);
});
