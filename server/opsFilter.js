// Filtro centralizado para detectar y excluir contratos de prestación de servicios individuales (OPS / personas naturales)
// Garantiza que el radar únicamente presente procesos de personas jurídicas (empresas proveedoras) y convocatorias corporativas

function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Cláusulas para excluir OPS a nivel de consulta SoQL en la API de SECOP II (datos.gov.co)
const OPS_SOQL_EXCLUSIONS = [
  "not (lower(justificaci_n_modalidad_de) like '%apoyo a la gesti%')",
  "not (lower(justificaci_n_modalidad_de) like '%servicios profesionales%')",
  "not (lower(justificaci_n_modalidad_de) like '%personal de planta%')",
  "not (lower(descripci_n_del_procedimiento) like '%apoyo a la gesti%')",
  "not (lower(descripci_n_del_procedimiento) like '%servicios profesionales%')",
  "not (lower(descripci_n_del_procedimiento) like '%prestar servicios profesionales%')",
  "not (lower(descripci_n_del_procedimiento) like '%prestar los servicios profesionales%')",
  "not (lower(descripci_n_del_procedimiento) like '%orden de prestaci%')",
  "not (lower(descripci_n_del_procedimiento) like '%prestar como contratista%')",
  "not (lower(descripci_n_del_procedimiento) like '%prestar sus servicios como%')",
  "not (lower(descripci_n_del_procedimiento) like '%prestar servicios como%')",
  "not (lower(descripci_n_del_procedimiento) like '%prestar los servicios como%')",
  "not (lower(descripci_n_del_procedimiento) like '%servicios como tecnico%')",
  "not (lower(descripci_n_del_procedimiento) like '%servicios como profesional%')",
  "not (lower(nombre_del_procedimiento) like '%prestacion de servicios profesionales%')",
  "not (lower(nombre_del_procedimiento) like '%prestación de servicios profesionales%')",
  "not (lower(nombre_del_procedimiento) like '%apoyo a la gesti%')",
  "not (lower(nombre_del_procedimiento) like '%orden de prestaci%')",
  "not (lower(nombre_del_procedimiento) like '%prestar como contratista%')",
  "not (lower(referencia_del_proceso) like 'ops%')",
  "not (lower(referencia_del_proceso) like 'opsp%')"
].join(' and ');

// Cláusula SQL para SQLite para excluir registros OPS ya existentes
const OPS_SQL_WHERE_EXCLUSION = `
  AND NOT (
    lower(nombre) LIKE '%prestacion de servicios profesionales%' OR
    lower(nombre) LIKE '%prestación de servicios profesionales%' OR
    lower(nombre) LIKE '%apoyo a la gestion%' OR
    lower(nombre) LIKE '%apoyo a la gestión%' OR
    lower(nombre) LIKE '%orden de prestaci%' OR
    lower(nombre) LIKE '%prestar como contratista%' OR
    lower(descripcion) LIKE '%prestacion de servicios profesionales%' OR
    lower(descripcion) LIKE '%prestación de servicios profesionales%' OR
    lower(descripcion) LIKE '%prestar servicios profesionales%' OR
    lower(descripcion) LIKE '%prestar los servicios profesionales%' OR
    lower(descripcion) LIKE '%apoyo a la gestion%' OR
    lower(descripcion) LIKE '%apoyo a la gestión%' OR
    lower(descripcion) LIKE '%apoyo a la gestion institucional%' OR
    lower(descripcion) LIKE '%apoyo a la gestión institucional%' OR
    lower(descripcion) LIKE '%orden de prestacion de servicios%' OR
    lower(descripcion) LIKE '%orden de prestación de servicios%' OR
    lower(descripcion) LIKE '%prestar como contratista sus servicios%' OR
    lower(descripcion) LIKE '%prestar sus servicios como contratista%' OR
    lower(referencia) LIKE 'ops%' OR
    lower(referencia) LIKE 'opsp%' OR
    lower(referencia) LIKE 'ods %' OR
    id LIKE 'OPS%' OR
    id LIKE 'OPSP%'
  )
`;

function isIndividualOps(item) {
  if (!item) return false;

  const title = normalizeText(item.nombre || item.nombre_del_procedimiento || '');
  const desc = normalizeText(item.descripcion || item.descripci_n_del_procedimiento || '');
  const just = normalizeText(item.justificacion || item.justificaci_n_modalidad_de || '');
  const ref = normalizeText(item.referencia || item.referencia_del_proceso || item.id || '');
  const fullText = `${title} ${desc} ${just} ${ref}`;

  // Si el título o contratista claramente es una Persona Jurídica (empresa comercial), NO es un OPS de persona natural
  const isCorporateEntity = /\b(sas|s\.a\.s|ltda|s\.a|s\.a\.|inc|corp|consorcio|union temporal|sociedad anonima)\b/i.test(title);
  if (isCorporateEntity && !ref.startsWith('ops') && !ref.startsWith('opsp')) {
    return false;
  }

  // 1. Identificador / Referencia de proceso típico de OPS (Orden de Prestación de Servicios)
  if (
    /\b(ops|opsp|cd-ops|cps-ops)\b/i.test(ref) ||
    ref.startsWith('ops') ||
    ref.startsWith('opsp') ||
    ref.includes('-ops-') ||
    ref.includes('-opsp-') ||
    ref.startsWith('ods ') ||
    ref.startsWith('ods-')
  ) {
    return true;
  }

  // 2. Justificación de modalidad de contratación pública (Ley 80 / Dec 1082) para persona natural
  if (
    just.includes('apoyo a la gestion') ||
    just.includes('servicios profesionales') ||
    just.includes('personal de planta') ||
    just.includes('insuficiencia de personal')
  ) {
    return true;
  }

  // 3. Frases y patrones inequívocos de contratos OPS / nómina paralela / prestación de servicios personales
  const opsPhrases = [
    'orden de prestacion de servicios',
    'orden de prestacion de servicio',
    'orden de prestacion',
    'prestacion de servicios profesionales',
    'prestaciones de servicios profesionales',
    'prestar servicios profesionales',
    'prestar los servicios profesionales',
    'prestar sus servicios profesionales',
    'apoyo a la gestion',
    'apoyo a la gestion institucional',
    'apoyo a la gestion administrativa',
    'apoyar a la gestion',
    'apoyar en la gestion',
    'apoyar la gestion',
    'apoyar las actividades',
    'apoyar en las actividades',
    'apoyo a las actividades',
    'apoyo en las actividades',
    'actividades de apoyo a',
    'servicios de apoyo a la gestion',
    'prestar servicios de apoyo',
    'prestar los servicios de apoyo',
    'prestar sus servicios de apoyo',
    'prestar apoyo a la gestion',
    'prestar apoyo en la gestion',
    'apoyo tecnico a la gestion',
    'apoyo tecnico y operativo',
    'apoyo operativo a la gestion',
    'prestar como contratista sus servicios',
    'prestar sus servicios como contratista',
    'prestar los servicios como contratista',
    'de manera autonoma e independiente',
    'de manera autonoma, independiente',
    'de manera autonoma y coordinada',
    'servicios personales',
    'prestacion de servicios personales',
    'persona natural',
    'personas naturales',
    'a titulo de honorarios',
    'pago de honorarios',
    'personal de planta',
    'insuficiencia de personal',
    'no contar con personal',
    'prestar los servicios como profesional',
    'prestar servicios como profesional',
    'prestar sus servicios como profesional',
    'prestar los servicios como tecnologo',
    'prestar servicios como tecnologo',
    'prestar los servicios como tecnico',
    'prestar servicios como tecnico',
    'prestar los servicios como auxiliar',
    'prestar servicios como auxiliar',
    'prestar los servicios como ingeniero',
    'prestar servicios como ingeniero',
    'prestar los servicios como asesor',
    'prestar servicios como asesor',
    'prestar los servicios de un profesional',
    'prestar servicios de un profesional',
    'profesion de contador',
    'profesion de abogado',
    'profesion de ingeniero',
    'como tecnico para el apoyo',
    'como profesional para el apoyo',
    'como tecnologo para el apoyo'
  ];

  if (opsPhrases.some(phrase => fullText.includes(phrase))) {
    return true;
  }

  // 4. Detección de títulos consistentes en nombres de personas naturales
  const rawTitle = (item.nombre || item.nombre_del_procedimiento || '').trim();
  const corporateKeywords = [
    'sas', 's.a.s', 'ltda', 's.a', 's.a.', 'sa', 'inc', 'corp', 'e.s.p.', 'esp', 'ese', 'i.e.d',
    'ied', 'colegio', 'alcaldia', 'gobernacion', 'hospital', 'empresa', 'consorcio',
    'union temporal', 'universidad', 'fundacion', 'asociacion', 'instituto', 'servicio',
    'servicios', 'suministro', 'suministros', 'adquisicion', 'mantenimiento', 'licencia',
    'licenciamiento', 'software', 'desarrollo', 'contratacion', 'compra', 'sistema',
    'renovacion', 'arrendamiento', 'solucion', 'plataforma', 'implementacion', 'diseno',
    'elaboracion', 'construccion', 'talleres', 'concurso', 'convocatoria', 'feria', 'banco',
    'programa', 'convenio', 'proyecto', 'modulo', 'impresion', 'equipos', 'suministros',
    'souvenir', 'souvenirs', 'artesanias', 'velas', 'velones', 'materiales', 'herramienta',
    'pagina', 'web', 'aplicativo', 'herramientas'
  ];

  const words = rawTitle.split(/\s+/);
  if (words.length >= 2 && words.length <= 4) {
    const hasCorpKw = corporateKeywords.some(kw => 
      title === kw || title.startsWith(`${kw} `) || title.endsWith(` ${kw}`) || title.includes(` ${kw} `)
    );
    if (!hasCorpKw && /^[A-ZÁÉÍÓÚÑa-záéíóúñ\s.]+$/.test(rawTitle)) {
      return true;
    }
  }

  return false;
}

module.exports = {
  normalizeText,
  isIndividualOps,
  OPS_SOQL_EXCLUSIONS,
  OPS_SQL_WHERE_EXCLUSION
};
