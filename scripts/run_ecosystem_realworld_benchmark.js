/**
 * ====================================================================
 * RADAR SECOP - SUITE MAESTRA DE PRUEBAS INTEGRALES (REALWORLD GRADE)
 * Arquitectura de Validación Holística de Punta a Punta
 * Cubre: 
 *  1. Core Precontractual (APU, Monte Carlo, SECOP II Scraper, K_R)
 *  2. Inteligencia Competitiva & Analítica Predictiva (HHI, TRM, PAA 2026)
 *  3. Cockpit Post-Adjudicación (Anticipos, Reclamaciones, Liquidación, Interventoría, Sancionatorio, Facturación)
 *  4. Suite Especializada: Software, Consultoría & Servicios de IA (Factor Multiplicador CCE, SLAs, PI)
 *  5. Infraestructura SaaS, Multi-Tenancy, Telegram Bot & Smoke Test Producción
 * ====================================================================
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SUITES = [
  // --- BLOQUE 1: SUITE DE SOFTWARE, CONSULTORÍA & SERVICIOS DE IA (NUEVO) ---
  {
    name: 'Software, Consultoría & IA (FM CCE, Tokens, SLAs, Concurso de Méritos & PI)',
    file: 'test_software_ai.js',
    categoria: 'TECH_AI_PROCUREMENT',
    norma: 'Ley 1150 Art. 2 Num 3 / Dec. 1082 / Ley 23'
  },

  // --- BLOQUE 2: SUITE CONTRACTUAL Y POST-ADJUDICACIÓN (COCKPIT 360°) ---
  {
    name: 'Debido Proceso Sancionatorio & Multas Proporcionales (Art. 86 Ley 1474)',
    file: 'test_sancionatorio.js',
    categoria: 'POST_AWARD_LEGAL',
    norma: 'Art. 86 Ley 1474 / C.E. Rad. 41719'
  },
  {
    name: 'Facturación DIAN, Retenciones & Contribución 5% Obra Pública (Ley 1106)',
    file: 'test_tax_invoice.js',
    categoria: 'TAX_LIQUIDATION',
    norma: 'Ley 1106/2006 / Art. 462-1 y 476 E.T.'
  },
  {
    name: 'Supervisión e Interventoría Contractual (Bitácora Digital, Ensayos NSR-10 & SPI)',
    file: 'test_supervision_interventoria.js',
    categoria: 'SUPERVISION_INTERVENTORIA',
    norma: 'Ley 1474/2011 / NSR-10 / INVIAS 210'
  },
  {
    name: 'Liquidación Final de Contratos y Cierre de Balances (Art. 60 Ley 80)',
    file: 'test_contract_liquidation.js',
    categoria: 'CONTRACT_LIQUIDATION',
    norma: 'Art. 60 Ley 80 / Art. 217 Dec. 019'
  },
  {
    name: 'Reclamaciones Económicas & Restablecimiento de Equilibrio Contractual',
    file: 'test_equilibrio_economico.js',
    categoria: 'ECONOMIC_EQUILIBRIUM',
    norma: 'Art. 27 Ley 80 / Teoría de la Imprevisión'
  },
  {
    name: 'Anticipos, Plan de Inversión y Manejo de Cuenta Fiducia (Ley 1474/2011)',
    file: 'test_anticipos_fiducia.js',
    categoria: 'ANTICIPOS_FIDUCIA',
    norma: 'Art. 91 Ley 1474 / Art. 40 Ley 80'
  },
  {
    name: 'Garantías y Amparos de Pólizas Contractuales (Decreto 1082/2015)',
    file: 'test_garantias_cce.js',
    categoria: 'GARANTIAS_CCE',
    norma: 'Art. 2.2.1.2.3.1.1 Dec. 1082/2015'
  },
  {
    name: 'Capacidad Residual K_R Oficial para Obra Pública (Pliegos Tipo CCE)',
    file: 'test_residual_capacity.js',
    categoria: 'CAPACIDAD_RESIDUAL',
    norma: 'Guía CCE Capacidad Residual'
  },

  // --- BLOQUE 3: CORE PRECONTRACTUAL, LICITACIONES & APU ---
  {
    name: 'Análisis de Precios Unitarios (APU) y Presupuestación de Obra',
    file: 'test_apu_analysis.js',
    categoria: 'PRECONTRACTUAL_APU',
    norma: 'Pliegos Tipo Obra Pública'
  },
  {
    name: 'Pliegos de Condiciones y Generador de Documentos de Oferta',
    file: 'test_pliego_and_bid_docs.js',
    categoria: 'PRECONTRACTUAL_DOCS',
    norma: 'Ley 80/1993 / CCE Pliegos Tipo'
  },
  {
    name: 'Simulación Monte Carlo y Ponderación Económica (Concepto C-382/2020 CCE)',
    file: 'test_economic_proposal.js',
    categoria: 'ECONOMIC_PROPOSAL',
    norma: 'Concepto C-382/2020 Colombia Compra'
  },
  {
    name: 'Indexación por Volatilidad Cambiaria y TRM en Ofertas Económicas',
    file: 'test_economic_trm.js',
    categoria: 'ECONOMIC_TRM',
    norma: 'Superfinanciera TRM / DANE IPC'
  },
  {
    name: 'Acuerdos Plurales de Consorcios y Uniones Temporales (Art. 7 Ley 80)',
    file: 'test_plural_agreement.js',
    categoria: 'PLURAL_AGREEMENT',
    norma: 'Art. 7 Ley 80 / Estatuto Anticorrupción'
  },
  {
    name: 'Criterios Diferenciales Mipyme y Emprendimiento Femenino (Ley 2069/2020)',
    file: 'test_criterios_diferenciales.js',
    categoria: 'CRITERIOS_DIFERENCIALES',
    norma: 'Ley 2069/2020 / Decreto 1860/2021'
  },
  {
    name: 'Impugnación de Informes de Evaluación y Subsanabilidad (Ley 1882/2018)',
    file: 'test_evaluation_challenge.js',
    categoria: 'LEGAL_CHALLENGE',
    norma: 'Ley 1882/2018 / CCE C-057/2026'
  },
  {
    name: 'Auditoría Preflight y Matriz de Riesgos Contractuales',
    file: 'test_preflight_audit.js',
    categoria: 'PREFLIGHT_AUDIT',
    norma: 'Matriz Conpes 3714 / Dec. 1082'
  },

  // --- BLOQUE 4: INTELIGENCIA COMPETITIVA & ANALÍTICA PREDICTIVA ---
  {
    name: 'Motor de Inteligencia Competitiva e Índice Herfindahl-Hirschman (HHI)',
    file: 'test_competitive_engine.js',
    categoria: 'COMPETITIVE_INTELLIGENCE',
    norma: 'Cálculo HHI / MinComercio'
  },
  {
    name: 'Inteligencia de Planes Anuales de Adquisiciones (PAA 2026)',
    file: 'test_paa_intelligence.js',
    categoria: 'PAA_INTELLIGENCE',
    norma: 'Art. 2.2.1.1.1.4.1 Dec. 1082/2015'
  },
  {
    name: 'Analítica de Tasa de Éxito (Win-Rate) y Calificación de Oportunidades',
    file: 'test_win_rate_analytics.js',
    categoria: 'WIN_RATE_ANALYTICS',
    norma: 'Algoritmo Heurístico NIKADU IA'
  },
  {
    name: 'Motor Predictivo de Vencimientos, Renovaciones y Prórrogas',
    file: 'test_predictive_engine.js',
    categoria: 'PREDICTIVE_ENGINE',
    norma: 'SECOP II Pipeline Tracker'
  },

  // --- BLOQUE 5: INFRAESTRUCTURA SAAS, NOTIFICACIONES Y PRODUCCIÓN E2E ---
  {
    name: 'Autenticación SaaS, Tokens JWT y Aislamiento Multi-Tenant',
    file: 'test_auth_integration.js',
    categoria: 'SAAS_AUTH',
    norma: 'RFC 7519 / Multi-Tenancy'
  },
  {
    name: 'Telegram Bot Corporativo y Alertas Push en Tiempo Real (SECOP II Live)',
    file: 'test_telegram_bot_alerts.js',
    categoria: 'TELEGRAM_BOT',
    norma: 'Telegram Bot API / Event Driven'
  },
  {
    name: 'Smoke Test Integral de Producción E2E (13 Módulos en Cadena)',
    file: 'test_production_simulation.js',
    categoria: 'PRODUCTION_E2E_SMOKE',
    norma: 'Full Ecosystem Regression Test'
  }
];

async function runMasterEcosystemSuite() {
  const startTime = Date.now();
  console.log('========================================================================================');
  console.log('🌐 RADAR SECOP - SUITE MAESTRA INTEGRAL DE VALIDACIÓN DEL ECOSISTEMA (REALWORLD GRADE)');
  console.log('   Inspirado en los estándares de prueba exhaustiva y contratos OpenAPI de RealWorld');
  console.log('   Fecha y Hora de Ejecución: ' + new Date().toISOString());
  console.log('   Entorno: Node.js ' + process.version + ' | PostgreSQL 18 Local | Express 5.2.1');
  console.log('========================================================================================\n');

  let passedSuites = 0;
  let failedSuites = 0;
  const results = [];

  for (let i = 0; i < SUITES.length; i++) {
    const suite = SUITES[i];
    const index = `[${(i + 1).toString().padStart(2, '0')}/${SUITES.length.toString().padStart(2, '0')}]`;
    process.stdout.write(`${index} 🧪 Ejecutando: ${suite.name} ... `);

    const sStart = Date.now();
    try {
      const out = execSync(`node scripts/${suite.file}`, {
        timeout: 45000,
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test' }
      });
      const dur = ((Date.now() - sStart) / 1000).toFixed(2);
      process.stdout.write(`✅ APROBADO (${dur}s)\n`);
      passedSuites++;
      results.push({
        suite: suite.name,
        file: suite.file,
        status: 'PASSED',
        duration: dur,
        norma: suite.norma
      });
    } catch (err) {
      const dur = ((Date.now() - sStart) / 1000).toFixed(2);
      process.stdout.write(`❌ FALLÓ (${dur}s)\n`);
      failedSuites++;
      results.push({
        suite: suite.name,
        file: suite.file,
        status: 'FAILED',
        duration: dur,
        error: err.stderr ? err.stderr.toString().split('\n')[0] : err.message.split('\n')[0]
      });
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalSuites = SUITES.length;
  const pct = ((passedSuites / totalSuites) * 100).toFixed(1);

  console.log('\n========================================================================================');
  console.log('📊 RESUMEN EJECUTIVO DE LA EVALUACIÓN INTEGRAL DEL ECOSISTEMA:');
  console.log('========================================================================================');
  console.log(`• Total de Suites de Validación Ejecutadas: ${totalSuites}`);
  console.log(`• Suites Aprobadas con Éxito:               ${passedSuites} ✅`);
  console.log(`• Suites con Fallas Detectadas:             ${failedSuites} ${failedSuites === 0 ? '✨' : '❌'}`);
  console.log(`• Tasa de Aprobación Global del Sistema:     ${pct}%`);
  console.log(`• Tiempo Total de Ejecución de la Batería:   ${totalTime} segundos`);
  console.log('========================================================================================\n');

  if (failedSuites === 0) {
    console.log('🎉 EL ECOSISTEMA RADAR SECOP HA SUPERADO EL 100% DE LAS PRUEBAS INTEGRALES.');
    console.log('   La arquitectura cumple rigurosamente con los estándares de robustez, legalidad y rendimiento.');
  } else {
    console.log(`⚠️ Se identificaron ${failedSuites} fallas que requieren atención pericial.`);
  }

  return {
    passedSuites,
    failedSuites,
    totalSuites,
    pct,
    totalTime,
    results
  };
}

if (require.main === module) {
  runMasterEcosystemSuite().then(res => {
    process.exit(res.failedSuites === 0 ? 0 : 1);
  }).catch(err => {
    console.error('Error catastrófico en suite maestra:', err);
    process.exit(1);
  });
}

module.exports = { runMasterEcosystemSuite };
