const fs = require('fs');
const path = require('path');
const dbPostgres = require('../server/dbPostgres');

async function main() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'server', 'schema_economico.sql'), 'utf8');
    await dbPostgres.query(sql);
    console.log('✅ schema_economico.sql aplicado con éxito');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error aplicando schema:', err.message);
    process.exit(1);
  }
}

main();
