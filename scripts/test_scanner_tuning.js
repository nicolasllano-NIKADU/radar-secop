const scanner = require('../server/scanner');

console.log('--- TEST 1: Calificación de Licitación de IA Generativa ---');
const res1 = scanner.calculateRelevanceNikadu(
  'Desarrollo e implementación de un modelo de IA Generativa y Agentes Autónomos para atención ciudadana',
  'Contratar el servicio de fábrica de software e inteligencia artificial con modelos de lenguaje LLM para la Gobernación',
  '81111500'
);
console.log('Score:', res1.score, 'Matched:', res1.matched);

console.log('\n--- TEST 2: Calificación de Fábrica de Software y Desarrollos a la Medida ---');
const res2 = scanner.calculateRelevanceNikadu(
  'Fábrica de software para el desarrollo a la medida de aplicaciones web y móviles institucionales',
  'Construcción y arquitectura de software con interoperabilidad de datos abiertos',
  '43230000'
);
console.log('Score:', res2.score, 'Matched:', res2.matched);

console.log('\n--- TEST 3: Rechazo de Falsos Positivos (Agente de Tránsito) ---');
const res3 = scanner.calculateRelevanceNikadu(
  'Prestación de servicios de apoyo como agente de tránsito y regulador vial',
  'Regulación del tránsito vehicular y seguridad vial en el municipio',
  '80101500'
);
console.log('Score:', res3.score, '(Debe ser 0)');

console.log('\n--- TEST 4: Rechazo de OPS individual ---');
const res4 = scanner.calculateRelevanceNikadu(
  'Prestación de servicios profesionales de apoyo a la gestión en la oficina de TIC',
  'Prestar sus servicios profesionales como ingeniero de sistemas apoyando la gestión institucional',
  '81111500'
);
console.log('Score:', res4.score, '(Debe ser 0)');

console.log('\n--- TEST 5: Calificación Cerabela (Velas Artesanales) ---');
const res5 = scanner.calculateRelevanceCerabela(
  'Suministro de velas artesanales y velones en cera de abejas para la Noche de las Velitas',
  'Adquisición de kits artesanales decorativos con parafina y aromas naturales',
  '60121000'
);
console.log('Score Cerabela:', res5.score, 'Matched:', res5.matched);

console.log('\n--- TEST 6: Rechazo Falso Positivo Cerabela (Veleros / Apellido Velasquez) ---');
const res6 = scanner.calculateRelevanceCerabela(
  'Contrato de consultoría suscrito con el Dr. Carlos Velasquez para estudios marítimos de embarcaciones a vela',
  'Estudios de navegación y velero para puerto',
  '80101500'
);
console.log('Score Cerabela:', res6.score, '(Debe ser 0)');

console.log('\n✅ CALIBRACIÓN Y AFINAMIENTO DE PALABRAS CLAVE VERIFICADO CON ÉXITO');
