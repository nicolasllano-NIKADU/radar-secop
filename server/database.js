const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const opsFilter = require('./opsFilter');

const dbPath = path.join(__dirname, '..', 'radar_secop.db');
const db = new DatabaseSync(dbPath);

// Inicializar tablas y migraciones
function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS oportunidades (
      id TEXT PRIMARY KEY,
      fuente TEXT NOT NULL,
      perfil TEXT DEFAULT 'NIKADU_IA',
      tipo_proceso TEXT DEFAULT 'CONTRATACION',
      entidad TEXT,
      nit_entidad TEXT,
      departamento TEXT,
      ciudad TEXT,
      referencia TEXT,
      nombre TEXT,
      descripcion TEXT,
      fase TEXT,
      estado TEXT,
      modalidad TEXT,
      tipo_contrato TEXT,
      precio_base REAL DEFAULT 0,
      fecha_publicacion TEXT,
      fecha_cierre TEXT,
      url TEXT,
      score_relevancia INTEGER DEFAULT 0,
      palabras_clave_match TEXT,
      notificado INTEGER DEFAULT 0,
      favorito INTEGER DEFAULT 0,
      creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS escaneo_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT DEFAULT CURRENT_TIMESTAMP,
      nuevos_encontrados INTEGER DEFAULT 0,
      total_revisados INTEGER DEFAULT 0,
      duracion_ms INTEGER DEFAULT 0,
      estado TEXT,
      mensaje TEXT
    );

    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT,
      actualizado_en TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_oportunidades_fecha ON oportunidades(fecha_publicacion DESC);
    CREATE INDEX IF NOT EXISTS idx_oportunidades_score ON oportunidades(score_relevancia DESC);
  `);

  // Migraciones seguras para columnas añadidas
  try {
    db.exec("ALTER TABLE oportunidades ADD COLUMN perfil TEXT DEFAULT 'NIKADU_IA'");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE oportunidades ADD COLUMN tipo_proceso TEXT DEFAULT 'CONTRATACION'");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE oportunidades ADD COLUMN fecha_cierre TEXT");
  } catch (e) {}
}

initDB();

module.exports = {
  db,

  saveOportunidad(item) {
    if (opsFilter.isIndividualOps(item)) {
      return { isNew: false, id: item.id, ignored: true };
    }

    const existing = db.prepare('SELECT id, notificado, favorito, perfil, tipo_proceso FROM oportunidades WHERE id = ?').get(item.id);
    if (existing) {
      // Actualizar datos conservando favorito y notificado
      const stmt = db.prepare(`
        UPDATE oportunidades SET
          entidad = ?, departamento = ?, ciudad = ?, nombre = ?, descripcion = ?,
          fase = ?, estado = ?, precio_base = ?, fecha_publicacion = ?, fecha_cierre = ?, url = ?,
          score_relevancia = ?, palabras_clave_match = ?, perfil = ?, tipo_proceso = ?, actualizado_en = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        item.entidad || '', item.departamento || '', item.ciudad || '', item.nombre || '', item.descripcion || '',
        item.fase || '', item.estado || '', item.precio_base || 0, item.fecha_publicacion || '', item.fecha_cierre || null, item.url || '',
        item.score_relevancia || 0, JSON.stringify(item.palabras_clave_match || []),
        item.perfil || existing.perfil || 'NIKADU_IA',
        item.tipo_proceso || existing.tipo_proceso || 'CONTRATACION',
        item.id
      );
      return { isNew: false, id: item.id };
    }

    const stmt = db.prepare(`
      INSERT INTO oportunidades (
        id, fuente, perfil, tipo_proceso, entidad, nit_entidad, departamento, ciudad, referencia, nombre,
        descripcion, fase, estado, modalidad, tipo_contrato, precio_base,
        fecha_publicacion, fecha_cierre, url, score_relevancia, palabras_clave_match, notificado, favorito
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    `);

    stmt.run(
      item.id,
      item.fuente || 'SECOP_II',
      item.perfil || 'NIKADU_IA',
      item.tipo_proceso || 'CONTRATACION',
      item.entidad || '',
      item.nit_entidad || '',
      item.departamento || '',
      item.ciudad || '',
      item.referencia || item.id,
      item.nombre || '',
      item.descripcion || '',
      item.fase || '',
      item.estado || '',
      item.modalidad || '',
      item.tipo_contrato || '',
      item.precio_base || 0,
      item.fecha_publicacion || '',
      item.fecha_cierre || null,
      item.url || '',
      item.score_relevancia || 0,
      JSON.stringify(item.palabras_clave_match || [])
    );

    return { isNew: true, id: item.id };
  },

  getOportunidades({ search, keyword, fuente, perfil, tipoProceso, minPrice, maxPrice, onlyFavorites, minScore, limit = 50, offset = 0 } = {}) {
    let sql = 'SELECT * FROM oportunidades WHERE 1=1';
    const params = [];

    // Filtro por perfil (NIKADU_IA, CERABELA, o ALL)
    if (perfil && perfil !== 'ALL' && perfil !== 'TODOS') {
      sql += " AND (perfil = ? OR perfil = 'AMBOS')";
      params.push(perfil);
    }

    // Filtro por Tipo de Proceso (CONVOCATORIA vs CONTRATACION)
    if (tipoProceso && tipoProceso !== 'ALL') {
      sql += ' AND tipo_proceso = ?';
      params.push(tipoProceso);
    }

    // Excluir procesos cerrados, cancelados, adjudicados, con fecha de cierre en el pasado, enlaces inválidos o contratos OPS
    sql += " AND (estado NOT IN ('Cerrado', 'Cancelado', 'Terminado', 'Desierto', 'Liquidado', 'Seleccionado', 'Adjudicado') OR estado IS NULL)";
    sql += " AND (fecha_cierre IS NULL OR fecha_cierre = '' OR fecha_cierre >= date('now'))";
    sql += " AND url NOT LIKE '%/STS/Users/Login%'";
    sql += " AND url NOT IN ('https://artesaniasdecolombia.com.co', 'https://colombiacrea.org', 'https://minciencias.gov.co/convocatorias')";
    sql += opsFilter.OPS_SQL_WHERE_EXCLUSION;

    if (fuente) {
      sql += ' AND fuente = ?';
      params.push(fuente);
    }

    if (search) {
      sql += ' AND (nombre LIKE ? OR descripcion LIKE ? OR entidad LIKE ? OR referencia LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (keyword) {
      sql += ' AND palabras_clave_match LIKE ?';
      params.push(`%${keyword}%`);
    }

    if (onlyFavorites) {
      sql += ' AND favorito = 1';
    }

    if (minScore) {
      sql += ' AND score_relevancia >= ?';
      params.push(minScore);
    }

    if (minPrice) {
      sql += ' AND precio_base >= ?';
      params.push(minPrice);
    }

    if (maxPrice) {
      sql += ' AND precio_base <= ?';
      params.push(maxPrice);
    }

    sql += ' ORDER BY COALESCE(NULLIF(fecha_publicacion, \'\'), creado_en) DESC, score_relevancia DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = db.prepare(sql).all(...params);
    return rows.map(r => ({
      ...r,
      palabras_clave_match: JSON.parse(r.palabras_clave_match || '[]')
    }));
  },

  getOportunidadById(id) {
    const row = db.prepare('SELECT * FROM oportunidades WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...row,
      palabras_clave_match: JSON.parse(row.palabras_clave_match || '[]')
    };
  },

  toggleFavorito(id) {
    const item = db.prepare('SELECT favorito FROM oportunidades WHERE id = ?').get(id);
    if (!item) return null;
    const nuevo = item.favorito ? 0 : 1;
    db.prepare('UPDATE oportunidades SET favorito = ? WHERE id = ?').run(nuevo, id);
    return nuevo;
  },

  markNotificado(id) {
    db.prepare('UPDATE oportunidades SET notificado = 1 WHERE id = ?').run(id);
  },

  logScan(data) {
    const stmt = db.prepare(`
      INSERT INTO escaneo_logs (nuevos_encontrados, total_revisados, duracion_ms, estado, mensaje)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(data.nuevos || 0, data.total || 0, data.duracion || 0, data.estado || 'OK', data.mensaje || '');
  },

  getStats(perfil = null) {
    let whereClause = " WHERE (estado NOT IN ('Cerrado', 'Cancelado', 'Terminado', 'Desierto', 'Liquidado', 'Seleccionado', 'Adjudicado') OR estado IS NULL) AND (fecha_cierre IS NULL OR fecha_cierre = '' OR fecha_cierre >= date('now')) AND url NOT LIKE '%/STS/Users/Login%' AND url NOT IN ('https://artesaniasdecolombia.com.co', 'https://colombiacrea.org', 'https://minciencias.gov.co/convocatorias')" + opsFilter.OPS_SQL_WHERE_EXCLUSION;
    const params = [];

    if (perfil && perfil !== 'ALL' && perfil !== 'TODOS') {
      whereClause += " AND (perfil = ? OR perfil = 'AMBOS')";
      params.push(perfil);
    }

    const total = db.prepare(`SELECT COUNT(*) as c FROM oportunidades${whereClause}`).get(...params).c;
    const contrataciones = db.prepare(`SELECT COUNT(*) as c FROM oportunidades${whereClause} AND tipo_proceso = 'CONTRATACION'`).get(...params).c;
    const convocatorias = db.prepare(`SELECT COUNT(*) as c FROM oportunidades${whereClause} AND tipo_proceso = 'CONVOCATORIA'`).get(...params).c;

    const favClause = `${whereClause} AND favorito = 1`;
    const favoritos = db.prepare(`SELECT COUNT(*) as c FROM oportunidades${favClause}`).get(...params).c;

    const relClause = `${whereClause} AND score_relevancia >= 70`;
    const altaRelevancia = db.prepare(`SELECT COUNT(*) as c FROM oportunidades${relClause}`).get(...params).c;

    const ultimoScan = db.prepare('SELECT * FROM escaneo_logs ORDER BY id DESC LIMIT 1').get();
    const sumaPresupuesto = db.prepare(`SELECT SUM(precio_base) as s FROM oportunidades${whereClause}`).get(...params).s || 0;

    return {
      totalOportunidades: total,
      contrataciones: contrataciones,
      convocatorias: convocatorias,
      favoritos,
      altaRelevancia,
      sumaPresupuesto,
      ultimoEscaneo: ultimoScan || null
    };
  },

  getConfig(clave, defaultValue = null) {
    const row = db.prepare('SELECT valor FROM configuracion WHERE clave = ?').get(clave);
    return row ? row.valor : defaultValue;
  },

  setConfig(clave, valor) {
    db.prepare(`
      INSERT INTO configuracion (clave, valor, actualizado_en)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, actualizado_en = CURRENT_TIMESTAMP
    `).run(clave, typeof valor === 'object' ? JSON.stringify(valor) : String(valor));
  },

  purgeOldClosed() {
    // 1. Elimina de la base de datos registros cancelados, terminados, cerrados, adjudicados, enlaces inválidos y patrones OPS por SQL
    db.exec(`
      DELETE FROM oportunidades 
      WHERE estado IN ('Cancelado', 'Borrador', 'Terminado', 'Liquidado', 'Desierto', 'Seleccionado', 'Adjudicado')
         OR (fecha_cierre IS NOT NULL AND fecha_cierre != '' AND fecha_cierre < date('now'))
         OR url LIKE '%/STS/Users/Login%'
         OR url = 'https://artesaniasdecolombia.com.co'
         OR url = 'https://colombiacrea.org'
         OR url LIKE '%/zasca'
         OR url LIKE '%/aldea'
         OR url LIKE '%/convocatorias'
         OR id IN ('MINCIENCIAS-CONV-2026-IA', 'MINTIC-SOFISTICA-2026', 'INNPULSA-ALDEA-2026-IA', 'ARTESANIAS-NACIONAL-2026', 'ZASCA-ARTESANAL-2026', 'COCREA-ESTIMULOS-2026')
         OR (fecha_publicacion < '2025-01-01' AND (fecha_cierre IS NULL OR fecha_cierre < date('now')))
         OR lower(nombre) LIKE '%prestacion de servicios profesionales%'
         OR lower(nombre) LIKE '%prestación de servicios profesionales%'
         OR lower(nombre) LIKE '%apoyo a la gestion%'
         OR lower(nombre) LIKE '%apoyo a la gestión%'
         OR lower(nombre) LIKE '%orden de prestaci%'
         OR lower(nombre) LIKE '%prestar como contratista%'
         OR lower(descripcion) LIKE '%prestacion de servicios profesionales%'
         OR lower(descripcion) LIKE '%prestación de servicios profesionales%'
         OR lower(descripcion) LIKE '%prestar servicios profesionales%'
         OR lower(descripcion) LIKE '%prestar los servicios profesionales%'
         OR lower(descripcion) LIKE '%apoyo a la gestion%'
         OR lower(descripcion) LIKE '%apoyo a la gestión%'
         OR lower(descripcion) LIKE '%apoyo a la gestion institucional%'
         OR lower(descripcion) LIKE '%apoyo a la gestión institucional%'
         OR lower(descripcion) LIKE '%orden de prestacion de servicios%'
         OR lower(descripcion) LIKE '%orden de prestación de servicios%'
         OR lower(descripcion) LIKE '%prestar como contratista sus servicios%'
         OR lower(descripcion) LIKE '%prestar sus servicios como contratista%'
         OR lower(referencia) LIKE 'ops%'
         OR lower(referencia) LIKE 'opsp%'
         OR lower(referencia) LIKE 'ods %'
         OR id LIKE 'OPS%'
         OR id LIKE 'OPSP%'
         OR score_relevancia <= 0
         OR palabras_clave_match = '[]'
         OR palabras_clave_match IS NULL;
    `);

    // 2. Segunda pasada exhaustiva con isIndividualOps para eliminar contrataciones de personas naturales por nombre propio en título
    try {
      const rows = db.prepare('SELECT id, referencia, nombre, descripcion FROM oportunidades').all();
      const deleteStmt = db.prepare('DELETE FROM oportunidades WHERE id = ?');
      for (const row of rows) {
        if (opsFilter.isIndividualOps(row)) {
          deleteStmt.run(row.id);
        }
      }
    } catch (e) {
      console.warn('⚠️ Error en pasada secundaria de depuración OPS:', e.message);
    }
  }
};

// Ejecutar depuración al inicio para garantizar que la base de datos esté libre de OPS
module.exports.purgeOldClosed();
