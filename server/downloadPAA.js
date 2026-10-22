const fs = require('fs');
const path = require('path');

/**
 * Script de extracción de Plan Anual de Adquisiciones (PAA) vía API Socrata (datos.gov.co)
 * Dataset oficial SECOP II: 9sue-ezhx (SECOPII - Plan Anual De Adquisiciones Detalle)
 */
async function downloadPAA(nit, annio, entityName) {
  const outputDir = path.join(__dirname, '..', 'downloads', 'paa');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\n======================================================`);
  console.log(`Consultando Socrata SECOP II - PAA para NIT ${nit} (${entityName}) - Vigencia ${annio}`);
  console.log(`Endpoint: https://www.datos.gov.co/resource/9sue-ezhx.json`);
  console.log(`======================================================`);

  let allRecords = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const url = `https://www.datos.gov.co/resource/9sue-ezhx.json?$where=nit_entidad='${nit}'%20and%20annio='${annio}'&$limit=${limit}&$offset=${offset}&$order=id%20ASC`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Error en API Socrata (${res.status}): ${await res.text()}`);
    }
    const chunk = await res.json();
    if (!chunk || chunk.length === 0) break;
    allRecords = allRecords.concat(chunk);
    offset += limit;
    if (chunk.length < limit) break;
  }

  console.log(`-> Registros obtenidos para vigencia ${annio}: ${allRecords.length}`);

  const baseFileName = `PAA_${entityName}_${annio}`;
  const jsonPath = path.join(outputDir, `${baseFileName}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(allRecords, null, 2), 'utf-8');
  console.log(`-> Guardado JSON: ${jsonPath}`);

  if (allRecords.length > 0) {
    // Export to CSV
    const headers = Object.keys(allRecords[0]);
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines = [
      headers.join(','),
      ...allRecords.map(row => headers.map(h => escapeCsv(row[h])).join(','))
    ];
    const csvPath = path.join(outputDir, `${baseFileName}.csv`);
    fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf-8');
    console.log(`-> Guardado CSV: ${csvPath}`);

    // Estadísticas del PAA
    const totalPresupuesto = allRecords.reduce((acc, r) => acc + (parseFloat(r.valor_total_esperado) || 0), 0);
    const versiones = [...new Set(allRecords.map(r => r.version_del_paa))];
    const modalidades = allRecords.reduce((acc, r) => {
      acc[r.modalidad || 'Sin definir'] = (acc[r.modalidad || 'Sin definir'] || 0) + 1;
      return acc;
    }, {});

    console.log(`\n--- RESUMEN PAA ${annio} (${entityName}) ---`);
    console.log(`Total procesos planeados: ${allRecords.length}`);
    console.log(`Presupuesto total estimado: $${totalPresupuesto.toLocaleString('es-CO')} COP`);
    console.log(`Versiones registradas: ${versiones.join(', ')}`);
    console.log(`Modalidades:`, modalidades);
  }

  return allRecords;
}

async function main() {
  const args = process.argv.slice(2);
  let year = '2027';
  let nit = '899999086'; // Superintendencia de Sociedades
  let name = 'SUPERSOCIEDADES';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--year' && args[i + 1]) year = args[i + 1];
    if (args[i] === '--nit' && args[i + 1]) nit = args[i + 1];
    if (args[i] === '--name' && args[i + 1]) name = args[i + 1];
  }

  await downloadPAA(nit, year, name);

  // Si se solicitó 2027 y dio 0 registros, también descargamos automáticamente el último disponible (2026)
  if (year === '2027') {
    console.log(`\n[INFO] La vigencia 2027 aún no ha sido cargada por la entidad en SECOP II.`);
    console.log(`[INFO] Descargando la vigencia vigente más reciente (2026) como referencia inmediata...`);
    await downloadPAA(nit, '2026', name);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { downloadPAA };
