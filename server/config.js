require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  
  // Expresión Cron para escaneo automático (por defecto cada hora)
  cronSchedule: process.env.CRON_SCHEDULE || '0 * * * *',
  
  // Endpoints oficiales en datos.gov.co
  socrata: {
    secopIIProcesos: 'https://www.datos.gov.co/resource/p6dx-8zbt.json',
    secopIIContratos: 'https://www.datos.gov.co/resource/jbjy-vk9h.json',
    secopIProcesos: 'https://www.datos.gov.co/resource/f789-7hwg.json',
    tiendaVirtual: 'https://www.datos.gov.co/resource/rgxm-mmea.json',
    appToken: process.env.SOCRATA_APP_TOKEN || null
  },

  // Telegram Bot para alertas instantáneas al celular
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
  },

  // Perfiles de Empresa para el Radar
  profiles: {
    NIKADU_IA: {
      id: 'NIKADU_IA',
      name: 'NIKADU IA',
      tag: '🤖 NIKADU IA',
      icon: '🤖',
      description: 'Inteligencia Artificial, Agentes y Automatizaciones',
      color: '#10b981',
      keywords: {
        high: [
          'inteligencia artificial', 'agente de ia', 'agentes de ia', 'agente inteligente',
          'agentes inteligentes', 'ia generativa', 'machine learning', 'aprendizaje automatico',
          'rpa', 'automatizacion de procesos', 'automatizaciones', 'modelo de lenguaje',
          'llm', 'chatbot', 'bot conversacional', 'asistente virtual'
        ],
        medium: [
          'vision artificial', 'procesamiento de lenguaje natural', 'nlp',
          'analitica avanzada', 'ciencia de datos', 'automatizacion',
          'mineria de datos', 'transformacion digital', 'fabrica de software',
          'desarrollo de software'
        ]
      },
      unspscCodes: ['43230000', '81110000', '81111500', '80101500', '43211500'],
      soqlTerms: ['inteligencia artificial', 'machine learning', 'automatiz', 'agente', 'chatbot', 'rpa'],
      negativeTerms: [
        'agente de transito', 'agentes de transito', 'agente vial', 'agentes viales',
        'regulacion del transito', 'regulador de transito', 'seguridad vial',
        'tienda escolar', 'servicios funerarios', 'vigilancia privada'
      ]
    },

    CERABELA: {
      id: 'CERABELA',
      name: 'CERABELA',
      tag: '🕯️ CERABELA',
      icon: '🕯️',
      description: 'Fabricación de Velas Hechas a Mano de Forma Artesanal',
      color: '#f59e0b',
      keywords: {
        high: [
          'velas', 'vela', 'velones', 'velon', 'velas aromaticas', 'velas decorativas',
          'velas artesanales', 'fabricacion de velas', 'elaboracion de velas',
          'cera de soya', 'cera de abejas', 'parafina', 'cerabella', 'cerabela',
          'cirios', 'hecho a mano', 'artesanias de colombia', 'sector artesanal'
        ],
        medium: [
          'artesanias', 'artesanal', 'recordatorios', 'obsequios', 'detalles navideños',
          'noche de las velitas', 'dia de las velitas', 'alumbrado navideño',
          'kits de bienestar', 'kit de bienestar', 'regalos corporativos',
          'souvenirs', 'articulos de decoracion', 'feria artesanal',
          'expoartesanias', 'expoartesano', 'taller artesanal', 'manualidades'
        ]
      },
      unspscCodes: [
        '47131800', // Ceras y abrillantadores
        '39112600', // Iluminación / velas
        '53131600', // Fragancias y aromatizantes
        '60121000', // Artesanías y manualidades
        '60120000', // Equipos de arte y manualidades
        '50202300', // Souvenirs, regalos y canastas
        '80141600'  // Ferias y exposiciones comerciales
      ],
      soqlTerms: [
        'velas', 'velones', 'artesanias', 'hecho a mano', 'parafina',
        'cera de abejas', 'cera de soya', 'artesanal', 'obsequios'
      ],
      negativeTerms: [
        'pesca artesanal', 'deportes a vela', 'embarcacion a vela', 'velero',
        'velasquez', 'velasco', 'velandia', 'alumbrado publico de luminarias',
        'redes electricas', 'postes de alumbrado', 'luminarias viales'
      ]
    }
  }
};
