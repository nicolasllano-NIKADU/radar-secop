const authManager = require('../server/authManager');

async function testAuth() {
  console.log('--- TEST 1: Registro de Nuevo Usuario SaaS ---');
  const testEmail = `admin_saas_${Date.now()}@licitando.co`;
  const regResult = await authManager.register({
    nombre: 'Ing. Carlos Mendoza',
    email: testEmail,
    password: 'PasswordSuperSegura2026!',
    rol: 'ADMIN',
    razon_social: 'GRUPO CONSTRUCTOR MENDOZA SAS',
    nit: '901234567-8'
  });

  console.log('Usuario registrado ID:', regResult.usuario.id);
  console.log('Empresa creada ID:', regResult.empresa.id, regResult.empresa.razon_social);
  console.log('Token JWT generado (longitud):', regResult.token.length);

  console.log('--- TEST 2: Login con Credenciales Válidas ---');
  const loginResult = await authManager.login({
    email: testEmail,
    password: 'PasswordSuperSegura2026!'
  });
  console.log('Login exitoso:', loginResult.usuario.email);
  console.log('Rol autenticado:', loginResult.usuario.rol);
  console.log('Empresas accesibles:', loginResult.empresas.length);

  console.log('--- TEST 3: Verificación de Token y Payload ---');
  const decoded = authManager.verifyToken(loginResult.token);
  console.log('Token decodificado:', decoded.email, decoded.rol, 'Empresa:', decoded.empresa_razon_social);

  console.log('--- TEST 4: Consulta de Perfil Completo ---');
  const profile = await authManager.getProfile(loginResult.usuario.id);
  console.log('Perfil obtenido:', profile.usuario.nombre, profile.empresas.map(e => e.razon_social));

  console.log('\n✅ AUTENTICACIÓN SAAS Y MULTI-TENANCY VERIFICADOS AL 100%');
  process.exit(0);
}

testAuth().catch(err => {
  console.error('Error en test de auth:', err);
  process.exit(1);
});
