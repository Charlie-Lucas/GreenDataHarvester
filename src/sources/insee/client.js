import axios from 'axios';
import { RateLimiter } from '../utils/rateLimiter.js';
import { RetryHandler } from '../utils/retryHandler.js';
import logger from '../utils/logger.js';

class InseeClient {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.baseUrl;
    this.token = config.authentication.token;
    this.rateLimiter = new RateLimiter(config.rateLimit);
    this.retryHandler = new RetryHandler(config.retry || {});
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    // Intercepteur pour la gestion des erreurs
    this.client.interceptors.response.use(
      response => response,
      error => this.handleError(error)
    );
  }

  async handleError(error) {
    logger.error('INSEE API Error', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method
    });

    if (error.response?.status === 429) {
      // Rate limit atteint
      const retryAfter = error.response.headers['retry-after'] || 60;
      await this.rateLimiter.wait(retryAfter * 1000);
      return this.retryHandler.retry(() => this.client.request(error.config));
    }

    throw error;
  }

  async request(endpoint, params = {}) {
    await this.rateLimiter.checkLimit();
    
    return this.retryHandler.execute(async () => {
      const response = await this.client.get(endpoint, { params });
      return response.data;
    });
  }

  // Méthodes spécifiques pour les différentes APIs INSEE
  async getSiret(siret, params = {}) {
    return this.request('/siret', { q: `siret:${siret}`, ...params });
  }

  async getSiren(siren, params = {}) {
    return this.request('/siren', { q: `siren:${siren}`, ...params });
  }

  async getUnitesLegales(params = {}) {
    return this.request('/unitesLegales', params);
  }

  async getBdmData(seriesId, params = {}) {
    return this.request('/data', { seriesId, ...params });
  }

  async getBdmMetadata(seriesId) {
    return this.request('/metadata', { seriesId });
  }

  async getDonneesLocales(geoCode, indicatorId, params = {}) {
    return this.request('/geo', { 
      geoCode, 
      indicatorId, 
      ...params 
    });
  }

  async search(query, params = {}) {
    return this.request('/search', { q: query, ...params });
  }
}

export { InseeClient };
