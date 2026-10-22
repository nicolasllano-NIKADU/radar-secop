const { app, server } = require('../server/app');
const http = require('http');

async function testKResidual() {
  console.log('🧪 Probando Calculadora de Capacidad Residual (K_R) para Obra Pública...');
  await new Promise(r => setTimeout(r, 1200));

  try {
    // 1. Obtener lista de empresas
    const compRes = await fetch('http://127.0.0.1:3000/api/empresas');
    const compJson = await compRes.json();
    const emp = compJson.data?.[0];
    if (!emp) throw new Error('No hay empresas registradas');

    console.log(`\n[1/2] Probando K Residual individual para: ${emp.razon_social} (ID: ${emp.id})...`);
    const res1 = await fetch(`http://127.0.0.1:3000/api/empresas/${emp.id}/k-residual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personal_tecnico_score: 90,
        k_requerido_cop: 500000000
      })
    });
    const json1 = await res1.json();
    console.log('  Status:', res1.status, '| Ok:', json1.ok);
    console.log('  K Residual Calculado (COP):', json1.data.capacidad_residual_cop.toLocaleString('es-CO'));
    console.log('  K Residual en SMMLV:', json1.data.capacidad_residual_smmlv);
    console.log('  ¿Cumple K Requerido ($500M)?:', json1.data.cumple);
    console.log('  Desglose:', json1.data.desglose);
    if (!json1.ok || !json1.data.capacidad_residual_cop) throw new Error('Fallo en cálculo individual de K');

    // 2. Probando K Residual Plural
    console.log('\n[2/2] Probando K Residual Plural (Consorcio)...');
    const res2 = await fetch('http://127.0.0.1:3000/api/empresas/k-residual-plural', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        miembros: [
          { empresa_id: emp.id, porcentaje: 60, personal_tecnico_score: 90 },
          { empresa_id: emp.id, porcentaje: 40, personal_tecnico_score: 80 }
        ],
        k_requerido_cop: 1000000000
      })
    });
    const json2 = await res2.json();
    console.log('  Status:', res2.status, '| Ok:', json2.ok);
    console.log('  K Plural Combinado (COP):', json2.data.capacidad_residual_plural_cop.toLocaleString('es-CO'));
    console.log('  ¿Consorcio Cumple?:', json2.data.cumple);
    if (!json2.ok || !json2.data.capacidad_residual_plural_cop) throw new Error('Fallo en cálculo plural de K');

    console.log('\n🎉 CALCULADORA OFICIAL DE CAPACIDAD RESIDUAL FUNCIONANDO AL 100%!');
  } finally {
    server.close();
    process.exit(0);
  }
}

testKResidual().catch(err => {
  console.error('❌ Error en testKResidual:', err);
  if (server) server.close();
  process.exit(1);
});
