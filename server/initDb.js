const fs = require('fs');
const path = require('path');
const dbPostgres = require('./dbPostgres');

const SCHEMAS = [
  'schema.sql',
  'schema_paa.sql',
  'schema_post_adjudicacion.sql',
  'schema_compliance.sql',
  'schema_economico.sql',
  'schema_pipeline.sql',
  'schema_auth.sql',
  'schema_competencia.sql',
  'schema_predictivo.sql',
  'schema_observaciones_puntaje.sql'
];

async function runAllMigrations() {
  console.log('🚀 Iniciando secuencia de migraciones para Radar SECOP...');
  
  for (const schemaFile of SCHEMAS) {
    const filePath = path.join(__dirname, schemaFile);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Archivo de schema no encontrado: ${schemaFile}`);
      continue;
    }

    try {
      const sql = fs.readFileSync(filePath, 'utf8');
      await dbPostgres.query(sql);
      console.log(`  ✓ Aplicado exitosamente: ${schemaFile}`);
    } catch (err) {
      console.error(`  ❌ Error aplicando ${schemaFile}:`, err.message);
      throw err;
    }
  }

  const resTables = await dbPostgres.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log('\n📊 Estructura activa consolidada en PostgreSQL:');
  resTables.rows.forEach(t => console.log(`    • ${t.table_name}`));
  console.log('✅ Migraciones completadas al 100%.\n');
}

if (require.main === module) {
  runAllMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runAllMigrations };
