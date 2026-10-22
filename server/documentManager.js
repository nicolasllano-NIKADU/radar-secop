const config = require('./config');

class DocumentManager {
  constructor() {
    this.socrataBase = 'https://www.datos.gov.co/resource';
    // Dataset SECOP II - Archivos Descarga Desde 2025
    this.dataset2025 = 'dmgg-8hin';
    // Dataset SECOP II - Archivos Descarga Histórico 2024
    this.dataset2024 = 'nbae-kzan';
  }

  /**
   * Obtiene la lista completa de documentos asociados a un proceso a partir de su id_del_portafolio (CO1.BDOS.xxxx)
   * o número de contrato/proceso.
   * @param {string} portafolioId - Ej: "CO1.BDOS.9677536"
   */
  async getDocumentsByPortafolio(portafolioId) {
    if (!portafolioId) {
      throw new Error('Debe proporcionar un ID de portafolio (CO1.BDOS.xxxx).');
    }

    const cleanPortafolio = portafolioId.trim();

    // 1. Consultar primero en el dataset 2025 en adelante
    let docs = await this.querySocrataDocs(this.dataset2025, cleanPortafolio);

    // 2. Si no hay resultados y puede ser histórico, consultar 2024
    if (docs.length === 0) {
      docs = await this.querySocrataDocs(this.dataset2024, cleanPortafolio);
    }

    return docs.map(d => ({
      id_documento: d.id_documento,
      nombre_archivo: d.nombre_archivo,
      extension: d.extensi_n ? d.extensi_n.toLowerCase() : 'pdf',
      tamano_bytes: parseInt(d.tamanno_archivo, 10) || 0,
      tamano_legible: this.formatBytes(d.tamanno_archivo),
      descripcion: d.descripci_n || d.nombre_archivo,
      fecha_carga: d.fecha_carga ? d.fecha_carga.slice(0, 10) : null,
      entidad: d.entidad,
      url_descarga: d.url_descarga_documento?.url || `https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=${d.id_documento}&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=`
    }));
  }

  async querySocrataDocs(datasetId, portafolioId) {
    const params = new URLSearchParams({
      $where: `proceso = '${portafolioId}'`,
      $limit: '50',
      $order: 'fecha_carga DESC'
    });

    const url = `${this.socrataBase}/${datasetId}.json?${params.toString()}`;
    const headers = { 'Accept': 'application/json' };
    if (config.socrata && config.socrata.appToken) {
      headers['X-App-Token'] = config.socrata.appToken;
    }

    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.warn(`Aviso: Socrata docs respondió ${res.status} para dataset ${datasetId}`);
        return [];
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error(`Error consultando Socrata docs (${datasetId}):`, err.message);
      return [];
    }
  }

  formatBytes(bytes) {
    const b = parseInt(bytes, 10);
    if (!b || isNaN(b) || b <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

module.exports = new DocumentManager();
