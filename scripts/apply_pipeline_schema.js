const fs = require('fs');
const path = require('path');
const dbPostgres = require('../server/dbPostgres');

async function main() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'server', 'schema_pipeline.sql'), 'utf8');
    await dbPostgres.query(sql);
    console.log('✅ schema_pipeline.sql aplicado con éxito en PostgreSQL');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error aplicando schema pipeline:', err.message);
    process.exit(1);
  }
}

main();
