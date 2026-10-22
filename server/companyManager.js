const db = require('./dbPostgres');
const financialEngine = require('./financialEngine');

class CompanyManager {
  /**
   * Obtiene o inicializa el usuario principal administrador (para la fase actual)
   */
  async getOrCreateDefaultUser(email = 'admin@radarsecop.com', nombre = 'Administrador General') {
    const check = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (check.rows.length > 0) {
      return check.rows[0];
    }
    const insert = await db.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, plan_saas)
       VALUES ($1, $2, $3, 'ADMIN', 'EMPRESARIAL')
       RETURNING *`,
      [nombre, email, 'hash_placeholder']
    );
    return insert.rows[0];
  }

  /**
   * Registra una nueva empresa (propia o aliada)
   */
  async createCompany(usuarioId, data) {
    const {
      nit,
      digito_verificacion = '',
      razon_social,
      sigla = '',
      es_propia = true,
      tipo_organizacion = 'SOCIEDAD_COMERCIAL',
      tamano_empresa = 'MIPYME',
      camara_comercio = '',
      numero_matricula = '',
      numero_rup = '',
      fecha_renovacion_rup = null,
      rup_en_firme = true
    } = data;

    const res = await db.query(
      `INSERT INTO empresas 
       (usuario_id, nit, digito_verificacion, razon_social, sigla, es_propia, tipo_organizacion, 
        tamano_empresa, camara_comercio, numero_matricula, numero_rup, fecha_renovacion_rup, rup_en_firme)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (usuario_id, nit) DO UPDATE SET
        razon_social = EXCLUDED.razon_social,
        sigla = EXCLUDED.sigla,
        es_propia = EXCLUDED.es_propia,
        tipo_organizacion = EXCLUDED.tipo_organizacion,
        tamano_empresa = EXCLUDED.tamano_empresa,
        camara_comercio = EXCLUDED.camara_comercio,
        numero_matricula = EXCLUDED.numero_matricula,
        numero_rup = EXCLUDED.numero_rup,
        fecha_renovacion_rup = EXCLUDED.fecha_renovacion_rup,
        rup_en_firme = EXCLUDED.rup_en_firme,
        actualizado_en = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        usuarioId, nit, digito_verificacion, razon_social, sigla, es_propia,
        tipo_organizacion, tamano_empresa, camara_comercio, numero_matricula,
        numero_rup, fecha_renovacion_rup, rup_en_firme
      ]
    );

    const empresa = res.rows[0];

    // Si no tiene perfil de búsqueda, crear uno por defecto
    const perfilCheck = await db.query('SELECT id FROM perfil_busqueda WHERE empresa_id = $1', [empresa.id]);
    if (perfilCheck.rows.length === 0) {
      await db.query(
        `INSERT INTO perfil_busqueda (empresa_id, nombre_perfil, palabras_clave_incluir, palabras_clave_excluir)
         VALUES ($1, 'Búsqueda Inicial', $2, $3)`,
        [empresa.id, [razon_social.toLowerCase()], ['ops', 'apoyo a la gestion']]
      );
    }

    return empresa;
  }

  /**
   * Obtiene todas las empresas de un usuario con sus indicadores financieros del último año
   */
  async getCompaniesByUser(usuarioId) {
    const query = `
      SELECT 
        e.*,
        ef.anio_fiscal,
        ef.activo_corriente,
        ef.pasivo_corriente,
        ef.activo_total,
        ef.pasivo_total,
        ef.patrimonio,
        ef.utilidad_operacional,
        ef.gastos_intereses,
        ef.capital_trabajo,
        ef.indice_liquidez,
        ef.indice_endeudamiento,
        ef.cobertura_intereses,
        ef.rentabilidad_patrimonio_roe,
        ef.rentabilidad_activo_roa,
        pb.palabras_clave_incluir,
        pb.palabras_clave_excluir,
        pb.codigos_unspsc,
        pb.departamentos,
        pb.presupuesto_min,
        pb.presupuesto_max
      FROM empresas e
      LEFT JOIN LATERAL (
        SELECT * FROM empresa_financiero ef2
        WHERE ef2.empresa_id = e.id
        ORDER BY ef2.anio_fiscal DESC
        LIMIT 1
      ) ef ON true
      LEFT JOIN perfil_busqueda pb ON pb.empresa_id = e.id AND pb.activo = true
      WHERE e.usuario_id = $1
      ORDER BY e.es_propia DESC, e.razon_social ASC;
    `;
    const res = await db.query(query, [usuarioId]);
    return res.rows;
  }

  /**
   * Registra o actualiza la información contable y RUP de una empresa
   */
  async saveFinancialData(empresaId, rawFinancial) {
    const anioFiscal = parseInt(rawFinancial.anio_fiscal || new Date().getFullYear() - 1, 10);
    const fechaCorte = rawFinancial.fecha_corte || `${anioFiscal}-12-31`;

    // Calcular con el motor financiero determinista
    const ind = financialEngine.calculateIndicators(rawFinancial);

    const query = `
      INSERT INTO empresa_financiero (
        empresa_id, anio_fiscal, fecha_corte,
        activo_corriente, pasivo_corriente, activo_total, pasivo_total, patrimonio,
        utilidad_operacional, gastos_intereses,
        indice_liquidez, indice_endeudamiento, cobertura_intereses,
        rentabilidad_patrimonio_roe, rentabilidad_activo_roa, capacidad_residual_k
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (empresa_id, anio_fiscal) DO UPDATE SET
        fecha_corte = EXCLUDED.fecha_corte,
        activo_corriente = EXCLUDED.activo_corriente,
        pasivo_corriente = EXCLUDED.pasivo_corriente,
        activo_total = EXCLUDED.activo_total,
        pasivo_total = EXCLUDED.pasivo_total,
        patrimonio = EXCLUDED.patrimonio,
        utilidad_operacional = EXCLUDED.utilidad_operacional,
        gastos_intereses = EXCLUDED.gastos_intereses,
        indice_liquidez = EXCLUDED.indice_liquidez,
        indice_endeudamiento = EXCLUDED.indice_endeudamiento,
        cobertura_intereses = EXCLUDED.cobertura_intereses,
        rentabilidad_patrimonio_roe = EXCLUDED.rentabilidad_patrimonio_roe,
        rentabilidad_activo_roa = EXCLUDED.rentabilidad_activo_roa,
        capacidad_residual_k = EXCLUDED.capacidad_residual_k
      RETURNING *;
    `;

    const res = await db.query(query, [
      empresaId,
      anioFiscal,
      fechaCorte,
      ind.activo_corriente,
      ind.pasivo_corriente,
      ind.activo_total,
      ind.pasivo_total,
      ind.patrimonio,
      ind.utilidad_operacional,
      ind.gastos_intereses,
      ind.indice_liquidez,
      ind.indice_endeudamiento,
      ind.cobertura_intereses,
      ind.rentabilidad_patrimonio_roe,
      ind.rentabilidad_activo_roa,
      parseFloat(rawFinancial.capacidad_residual_k) || 0
    ]);

    return res.rows[0];
  }

  /**
   * Guarda o actualiza los criterios de búsqueda de una empresa
   */
  async updateSearchProfile(empresaId, data) {
    const {
      palabras_clave_incluir = [],
      palabras_clave_excluir = [],
      codigos_unspsc = [],
      departamentos = [],
      presupuesto_min = 0,
      presupuesto_max = null,
      notificar_telegram = true,
      umbral_score_minimo = 40
    } = data;

    const query = `
      INSERT INTO perfil_busqueda (
        empresa_id, palabras_clave_incluir, palabras_clave_excluir, codigos_unspsc,
        departamentos, presupuesto_min, presupuesto_max, notificar_telegram, umbral_score_minimo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING
      RETURNING *;
    `;

    // Si ya existe registro de perfil para esa empresa, actualizarlo
    const check = await db.query('SELECT id FROM perfil_busqueda WHERE empresa_id = $1', [empresaId]);
    if (check.rows.length > 0) {
      const updateRes = await db.query(
        `UPDATE perfil_busqueda SET
          palabras_clave_incluir = $2,
          palabras_clave_excluir = $3,
          codigos_unspsc = $4,
          departamentos = $5,
          presupuesto_min = $6,
          presupuesto_max = $7,
          notificar_telegram = $8,
          umbral_score_minimo = $9,
          actualizado_en = CURRENT_TIMESTAMP
         WHERE empresa_id = $1
         RETURNING *`,
        [
          empresaId, palabras_clave_incluir, palabras_clave_excluir, codigos_unspsc,
          departamentos, presupuesto_min, presupuesto_max, notificar_telegram, umbral_score_minimo
        ]
      );
      return updateRes.rows[0];
    } else {
      const insertRes = await db.query(query, [
        empresaId, palabras_clave_incluir, palabras_clave_excluir, codigos_unspsc,
        departamentos, presupuesto_min, presupuesto_max, notificar_telegram, umbral_score_minimo
      ]);
      return insertRes.rows[0];
    }
  }
}

module.exports = new CompanyManager();
