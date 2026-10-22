const engine = require('../server/economicEngine');
const dbPostgres = require('../server/dbPostgres');

async function testFull() {
  console.log('--- TEST 1: Motor Económico Monte Carlo ---');
  const res = engine.simularMontecarlo(2000000000, {
    competidoresEstimados: 8,
    puntajeMax: 60,
    iteraciones: 5000,
    perfilCompetencia: 'MODERADO'
  });
  console.log('PO:', res.presupuesto_oficial);
  console.log('Optimo:', res.recomendacion_estrategica.precio_optimo_cop, 'COP (' + res.recomendacion_estrategica.porcentaje_optimo + '%)');
  console.log('Esperanza:', res.recomendacion_estrategica.esperanza_puntaje_max, 'pts');

  console.log('--- TEST 2: Inserción en PostgreSQL ---');
  const insert = await dbPostgres.query(`
    INSERT INTO simulaciones_economicas (
      proceso_referencia, entidad, presupuesto_oficial, puntaje_maximo,
      competidores_estimados, precio_optimo_sugerido, porcentaje_optimo_po, esperanza_puntaje
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;
  `, [
    'TEST-INTEGRACION-01',
    'INVIAS',
    2000000000,
    60,
    8,
    res.recomendacion_estrategica.precio_optimo_cop,
    res.recomendacion_estrategica.porcentaje_optimo,
    res.recomendacion_estrategica.esperanza_puntaje_max
  ]);
  console.log('Simulación guardada en DB con ID:', insert.rows[0].id);

  const query = await dbPostgres.query('SELECT * FROM simulaciones_economicas WHERE id = $1', [insert.rows[0].id]);
  console.log('Registro recuperado:', query.rows[0].proceso_referencia, query.rows[0].precio_optimo_sugerido);

  console.log('--- INTEGRACIÓN 100% EXITOSA ---');
  process.exit(0);
}

testFull().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
