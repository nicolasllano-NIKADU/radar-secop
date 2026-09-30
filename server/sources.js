// Catálogo estructurado de fuentes adicionales estatales, no reembolsables y privadas
module.exports = [
  // ================= FUENTES PARA NIKADU IA =================
  {
    id: 'mintic_potencia',
    perfil: 'NIKADU_IA',
    categoria: 'Estatales - Recursos No Reembolsables',
    entidad: 'MinTIC (Ministerio de las TIC)',
    programa: 'Colombia PotencIA Digital & Centros de IA',
    descripcion: 'Convocatorias públicas y capital semilla no reembolsable para empresas que desarrollan agentes de IA, analítica predictiva y soluciones deep tech aplicadas.',
    tipo_recurso: 'No Reembolsable / Subvención',
    frecuencia: 'Trimestral / Semestral',
    url: 'https://potencia.mintic.gov.co/',
    requisitos: 'Empresa constituida en Colombia, producto de software o prototipo funcional de IA, equipo técnico.'
  },
  {
    id: 'minciencias_idi',
    perfil: 'NIKADU_IA',
    categoria: 'Estatales - Recursos No Reembolsables',
    entidad: 'MinCiencias',
    programa: 'Convocatorias de I+D+i y Beneficios Tributarios',
    descripcion: 'Financiación de proyectos de Investigación, Desarrollo Tecnológico e Innovación en Inteligencia Artificial y deducción del 100% en renta + 50% de crédito fiscal.',
    tipo_recurso: 'Cofinanciación no reembolsable y deducción tributaria',
    frecuencia: 'Anual y ventanilla continua',
    url: 'https://minciencias.gov.co/convocatorias/todas',
    requisitos: 'Alianza empresa-universidad o postulación directa con investigadores categorizados.'
  },
  {
    id: 'innpulsa_aldea',
    perfil: 'AMBOS',
    categoria: 'Estatales - Innovación & Aceleración',
    entidad: 'iNNpulsa Colombia',
    programa: 'ALDEA & Retos de Innovación Abierta',
    descripcion: 'Vouchers no reembolsables desde $50M hasta $150M COP para escalamiento, integración productiva y asesoría especializada.',
    tipo_recurso: 'Vouchers no reembolsables',
    frecuencia: 'Convocatorias bimestrales',
    url: 'https://innpulsacolombia.com/convocatorias',
    requisitos: 'Ventas demostrables, producto con potencial de crecimiento.'
  },
  {
    id: 'sena_sennova',
    perfil: 'NIKADU_IA',
    categoria: 'Estatales - Fomento Tecnológico',
    entidad: 'SENA',
    programa: 'SENNOVA - Innovación en Empresas',
    descripcion: 'Cofinanciación no reembolsable de hasta el 80% para proyectos de desarrollo e innovación en el sector productivo.',
    tipo_recurso: 'Cofinanciación No Reembolsable',
    frecuencia: 'Anual',
    url: 'https://www.sena.edu.co/es-co/trabajo/Paginas/sennova.aspx',
    requisitos: 'Empresas legalmente constituidas aportantes al SENA.'
  },

  // ================= FUENTES PARA CERABELA (VELAS ARTESANALES) =================
  {
    id: 'artesanias_colombia_ferias',
    perfil: 'CERABELA',
    categoria: 'Artesanías & Ferias Comerciales',
    entidad: 'Artesanías de Colombia S.A.',
    programa: 'Expoartesanías, Expoartesano y Laboratorios LID',
    descripcion: 'Convocatorias para participar en las principales ferias del país con subsidio de stands, además de asistencia técnica en empaques, aromas e innovación en diseño.',
    tipo_recurso: 'Subsidio comercial y asistencia técnica',
    frecuencia: 'Semestral y Anual',
    url: 'https://artesaniasdecolombia.com.co/',
    requisitos: 'Artesanos o talleres con producción hecha a mano, identidad de diseño y calidad comprobada.'
  },
  {
    id: 'mincomercio_zasca',
    perfil: 'CERABELA',
    categoria: 'Estatales - Manufactura & Productividad',
    entidad: 'MinComercio / iNNpulsa',
    programa: 'Centros de Reindustrialización ZASCA & Economía Popular',
    descripcion: 'Acompañamiento integral, maquinaria compartida y recursos para unidades productivas artesanales y talleres manufactureros.',
    tipo_recurso: 'Asistencia técnica, equipamiento y capital',
    frecuencia: 'Convocatorias continuas',
    url: 'https://www.mincit.gov.co/',
    requisitos: 'Talleres de manufactura, emprendimientos familiares y colectivos artesanales.'
  },
  {
    id: 'sena_fe_artesanias',
    perfil: 'AMBOS',
    categoria: 'Capital Semilla No Reembolsable',
    entidad: 'SENA - Fondo Emprender',
    programa: 'Convocatorias de Industrias Culturales, Mujeres y Economía Popular',
    descripcion: 'Hasta $100.000.000 COP no reembolsables para constitución o ampliación de talleres de velas artesanales, compra de ceras, parafinas, maquinaria y moldes.',
    tipo_recurso: 'Capital Semilla No Reembolsable',
    frecuencia: 'Mensual / Bimestral',
    url: 'https://www.fondoemprender.com/SitePages/FondoEmprenderConvocatoriasVigentes.aspx',
    requisitos: 'Plan de negocio validado con un gestor del SENA.'
  },
  {
    id: 'fontur_turismo',
    perfil: 'CERABELA',
    categoria: 'Turismo, Souvenirs & Cultura',
    entidad: 'FONTUR (Fondo Nacional del Turismo)',
    programa: 'Convocatorias de Encadenamiento Turístico y Souvenirs',
    descripcion: 'Convocatorias para abastecer ferias, hoteles, eventos turísticos y festivales con productos identitarios y velas aromáticas decorativas.',
    tipo_recurso: 'Contratación comercial y subvenciones turísticas',
    frecuencia: 'Trimestral',
    url: 'https://fontur.com.co/',
    requisitos: 'Registro Nacional de Turismo o vinculación con prestadores de servicios turísticos.'
  },
  {
    id: 'cajas_compensacion',
    perfil: 'CERABELA',
    categoria: 'Bienestar Social & Regalos Corporativos',
    entidad: 'Cajas de Compensación (Compensar, Colsubsidio, Cafam, Comfama)',
    programa: 'Compras Institucionales de Bienestar y Fin de Año',
    descripcion: 'Procesos de adquisición de kits de relajación, velas aromáticas, recordatorios y anchetas corporativas para programas de bienestar de afiliados y empleados.',
    tipo_recurso: 'Contratos comerciales de compras corporativas',
    frecuencia: 'Temporada (Madres, Amor y Amistad, Diciembre)',
    url: 'https://www.colsubsidio.com/proveedores',
    requisitos: 'Capacidad de producción al por mayor, facturación electrónica y registro de proveedor.'
  },

  // ================= FUENTES MULTILATERALES Y PRIVADAS =================
  {
    id: 'pnud_colombia',
    perfil: 'NIKADU_IA',
    categoria: 'Multilaterales & Cooperación',
    entidad: 'PNUD Colombia (Naciones Unidas)',
    programa: 'Licitaciones de Transformación Digital y Analítica',
    descripcion: 'Procesos de contratación directa para desarrollo de agentes conversacionales para comunidades y tableros de analítica territorial.',
    tipo_recurso: 'Contrato de Servicios en USD',
    frecuencia: 'Continua',
    url: 'https://www.undp.org/es/colombia/procurement',
    requisitos: 'Registro previo en UNGM (United Nations Global Marketplace).'
  },
  {
    id: 'ecopetrol_ariba',
    perfil: 'NIKADU_IA',
    categoria: 'Sector Privado & Régimen Especial',
    entidad: 'Ecopetrol / Cenit',
    programa: 'Portal de Proveedores SAP Ariba',
    descripcion: 'Licitaciones privadas de alta cuantía para automatización robótica de procesos (RPA), gemelos digitales y modelos predictivos.',
    tipo_recurso: 'Contratos en pesos y USD',
    frecuencia: 'Continua',
    url: 'https://www.ecopetrol.com.co/wps/portal/es/ecopetrol-web/nuestra-empresa/proveedores',
    requisitos: 'Calificación RUC y registro en SAP Ariba Discovery.'
  }
];
