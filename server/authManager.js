/**
 * ====================================================================
 * RADAR SECOP - GESTOR DE AUTENTICACIÓN SAAS Y MULTI-TENANCY (JWT + RBAC)
 * Normativa: Seguridad ISO/IEC 27001, OWASP Top 10, Cifrado Bcrypt
 * Roles Soportados: ADMIN, LICITADOR, JURIDICO, FINANCIERO
 * ====================================================================
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dbPostgres = require('./dbPostgres');

const JWT_SECRET = process.env.JWT_SECRET || 'radar_secop_jwt_secret_2026_super_secure_b2b_saas';
const JWT_EXPIRES_IN = '7d';

class AuthManager {
  constructor() {
    this.ROLES = {
      ADMIN: 'Administrador SaaS / Director General',
      LICITADOR: 'Licitador Senior / Director Comercial',
      JURIDICO: 'Abogado Especialista en Contratación Estatal',
      FINANCIERO: 'Analista Financiero / Revisor Contable'
    };
  }

  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  generateToken(user, activeCompany = null) {
    const payload = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      empresa_activa_id: activeCompany ? activeCompany.id : user.empresa_activa_id,
      empresa_razon_social: activeCompany ? activeCompany.razon_social : null,
      empresa_nit: activeCompany ? activeCompany.nit : null
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
  }

  /**
   * Registro de nuevo usuario SaaS con empresa inicial
   */
  async register({ nombre, email, password, rol = 'LICITADOR', razon_social = null, nit = null }) {
    if (!email || !password || !nombre) {
      throw new Error('Nombre, correo electrónico y contraseña son obligatorios');
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    const emailNorm = email.trim().toLowerCase();

    // Validar si el email ya existe
    const existUser = await dbPostgres.query(`SELECT id FROM usuarios WHERE email = $1`, [emailNorm]);
    if (existUser.rows.length > 0) {
      throw new Error('El correo electrónico ya se encuentra registrado en la plataforma');
    }

    const passwordHash = await this.hashPassword(password);
    const rolValido = Object.keys(this.ROLES).includes(rol) ? rol : 'LICITADOR';

    // Insertar usuario
    const resUser = await dbPostgres.query(`
      INSERT INTO usuarios (nombre, email, password_hash, rol)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nombre, email, rol, creado_en;
    `, [nombre.trim(), emailNorm, passwordHash, rolValido]);

    const newUser = resUser.rows[0];
    let createdCompany = null;

    // Si proporcionó empresa inicial, registrarla y vincularla
    if (razon_social && nit) {
      const nitLimpio = nit.trim();
      const resComp = await dbPostgres.query(`
        INSERT INTO empresas (usuario_id, razon_social, nit, es_propia)
        VALUES ($1, $2, $3, TRUE)
        RETURNING id, razon_social, nit;
      `, [newUser.id, razon_social.trim().toUpperCase(), nitLimpio]);

      createdCompany = resComp.rows[0];

      // Vincular en usuario_empresas
      await dbPostgres.query(`
        INSERT INTO usuario_empresas (usuario_id, empresa_id, rol_en_empresa, es_principal)
        VALUES ($1, $2, 'ADMIN_EMPRESA', TRUE);
      `, [newUser.id, createdCompany.id]);

      // Asignar como empresa activa en el usuario
      await dbPostgres.query(`
        UPDATE usuarios SET empresa_activa_id = $1 WHERE id = $2;
      `, [createdCompany.id, newUser.id]);

      newUser.empresa_activa_id = createdCompany.id;
    }

    const token = this.generateToken(newUser, createdCompany);

    return {
      token,
      usuario: newUser,
      empresa: createdCompany
    };
  }

  /**
   * Inicio de sesión con validación de credenciales
   */
  async login({ email, password }) {
    if (!email || !password) {
      throw new Error('Ingresa correo electrónico y contraseña');
    }

    const emailNorm = email.trim().toLowerCase();
    const resUser = await dbPostgres.query(`SELECT * FROM usuarios WHERE email = $1`, [emailNorm]);

    if (resUser.rows.length === 0) {
      throw new Error('Credenciales incorrectas');
    }

    const user = resUser.rows[0];
    if (!user.activo) {
      throw new Error('Esta cuenta ha sido desactivada. Contacta al soporte.');
    }

    const match = await this.comparePassword(password, user.password_hash);
    if (!match) {
      throw new Error('Credenciales incorrectas');
    }

    // Actualizar último login
    await dbPostgres.query(`UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);

    // Consultar empresas asociadas
    const resComps = await dbPostgres.query(`
      SELECT e.id, e.razon_social, e.nit, e.es_propia, ue.es_principal, ue.rol_en_empresa
      FROM empresas e
      JOIN usuario_empresas ue ON ue.empresa_id = e.id
      WHERE ue.usuario_id = $1
      ORDER BY ue.es_principal DESC, e.id ASC;
    `, [user.id]);

    const empresas = resComps.rows;
    let activeCompany = null;

    if (user.empresa_activa_id) {
      activeCompany = empresas.find(e => e.id === user.empresa_activa_id) || empresas[0];
    } else if (empresas.length > 0) {
      activeCompany = empresas[0];
    }

    const token = this.generateToken(user, activeCompany);

    return {
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        empresa_activa_id: activeCompany ? activeCompany.id : null
      },
      empresa_activa: activeCompany,
      empresas: empresas
    };
  }

  /**
   * Consulta el perfil del usuario autenticado
   */
  async getProfile(userId) {
    const resUser = await dbPostgres.query(`
      SELECT id, nombre, email, rol, empresa_activa_id, creado_en, ultimo_login 
      FROM usuarios WHERE id = $1;
    `, [userId]);

    if (resUser.rows.length === 0) return null;
    const user = resUser.rows[0];

    const resComps = await dbPostgres.query(`
      SELECT e.id, e.razon_social, e.nit, e.es_propia, ue.es_principal, ue.rol_en_empresa
      FROM empresas e
      JOIN usuario_empresas ue ON ue.empresa_id = e.id
      WHERE ue.usuario_id = $1
      ORDER BY ue.es_principal DESC, e.id ASC;
    `, [userId]);

    return {
      usuario: user,
      empresas: resComps.rows
    };
  }

  /**
   * Cambia la empresa activa en el contexto de sesión
   */
  async switchCompany(userId, empresaId) {
    const resCheck = await dbPostgres.query(`
      SELECT e.id, e.razon_social, e.nit
      FROM empresas e
      JOIN usuario_empresas ue ON ue.empresa_id = e.id
      WHERE ue.usuario_id = $1 AND e.id = $2;
    `, [userId, parseInt(empresaId, 10)]);

    if (resCheck.rows.length === 0) {
      throw new Error('No tienes acceso a esta empresa o no existe');
    }

    const targetCompany = resCheck.rows[0];

    await dbPostgres.query(`
      UPDATE usuarios SET empresa_activa_id = $1 WHERE id = $2;
    `, [targetCompany.id, userId]);

    const resUser = await dbPostgres.query(`SELECT * FROM usuarios WHERE id = $1`, [userId]);
    const token = this.generateToken(resUser.rows[0], targetCompany);

    return {
      token,
      empresa_activa: targetCompany
    };
  }

  /**
   * Middleware de autenticación opcional / permisivo:
   * Si viene el header Authorization, lo valida e inyecta en req.user;
   * Si no viene, permite continuar para consulta pública del Radar.
   */
  authMiddleware() {
    return (req, res, next) => {
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        req.user = null;
        return next();
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      try {
        const decoded = this.verifyToken(token);
        req.user = decoded;
      } catch (err) {
        req.user = null;
      }
      next();
    };
  }

  /**
   * Middleware estricto: exige token válido
   */
  requireAuth() {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Acceso no autorizado. Inicia sesión para continuar.'
        });
      }
      next();
    };
  }

  /**
   * Middleware RBAC por roles
   */
  requireRole(...rolesPermitidos) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Inicia sesión para continuar' });
      }

      if (req.user.rol === 'ADMIN' || rolesPermitidos.includes(req.user.rol)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: `Acceso restringido. Se requiere rol: ${rolesPermitidos.join(' o ')}`
      });
    };
  }
}

module.exports = new AuthManager();
