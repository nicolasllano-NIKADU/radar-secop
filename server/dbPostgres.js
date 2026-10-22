const { Pool } = require('pg');
const { execSync } = require('child_process');

function getPostgresHost() {
  if (process.env.PGHOST) return process.env.PGHOST;
  if (process.env.DATABASE_URL) return null; // El pool usa connectionString directamente
  try {
    const wslIp = execSync('wsl -d Ubuntu hostname -I', { encoding: 'utf8' }).trim().split(' ')[0];
    if (wslIp) return wslIp;
  } catch (e) {
    // Fallback estándar
  }
  return '127.0.0.1';
}

const host = getPostgresHost();
const poolConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: host,
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'radar_secop',
      max: 10,
      idleTimeoutMillis: 30000
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el cliente de PostgreSQL:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
