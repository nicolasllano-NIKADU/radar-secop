const fs = require('fs');
const path = require('path');
const dbPostgres = require('../server/dbPostgres');

async function main() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'server', 'schema_auth.sql'), 'utf8');
    await dbPostgres.query(sql);
    console.log('✅ schema_auth.sql aplicado con éxito en PostgreSQL');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error aplicando schema auth:', err.message);
    process.exit(1);
  }
}

main();
