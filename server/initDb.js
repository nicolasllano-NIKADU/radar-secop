const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function migrate() {
  const client = process.env.DATABASE_URL 
    ? new Client({ connectionString: process.env.DATABASE_URL })
    : new Client({
        host: '127.0.0.1',
        port: 5432,
        user: 'postgres',
        password: 'postgres',
        database: 'radar_secop'
      });
  
  try {
    await client.connect();
    console.log('🔌 Conectado exitosamente a PostgreSQL (127.0.0.1:5432/radar_secop)');
    
    const sqlPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    console.log('✅ Tablas y relaciones creadas exitosamente.');
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📊 Estructura activa en base de datos:');
    tables.rows.forEach(t => console.log(`  ✓ ${t.table_name}`));
    
    await client.end();
  } catch (err) {
    console.error('❌ Error en migración:', err);
    await client.end();
    process.exit(1);
  }
}

migrate();
