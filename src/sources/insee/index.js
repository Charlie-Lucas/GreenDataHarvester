import { InseeClient } from './client.js';
import { DataTransformer, transformInseeSirene, transformInseeBdm } from './transform.js';
import logger from '../../utils/logger.js';

class InseeConnector {
  constructor(sourceConfig, persistenceManager) {
    this.sourceConfig = sourceConfig;
    this.persistenceManager = persistenceManager;
    this.client = new InseeClient(sourceConfig.config);
    this.transformer = new DataTransformer(sourceConfig.transform?.rules || []);
  }

  async harvest(params = {}) {
    try {
      logger.info(`Début de la récolte pour ${this.sourceConfig.name}`, { params });

      let data;
      
      // Récupérer les données selon le type de source
      switch (this.sourceConfig.id) {
        case 'insee-sirene':
          data = await this.harvestSirene(params);
          break;
        case 'insee-bdm':
          data = await this.harvestBdm(params);
          break;
        case 'insee-donnees-locales':
          data = await this.harvestDonneesLocales(params);
          break;
        default:
          throw new Error(`Type de source INSEE non supporté: ${this.sourceConfig.id}`);
      }

      // Transformer les données si configuré
      if (this.sourceConfig.transform?.enabled) {
        data = this.transformer.transform(data);
      }

      // Sauvegarder les données
      if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
        await this.persistenceManager.save(this.sourceConfig, data);
        logger.info(`Données sauvegardées pour ${this.sourceConfig.name}`, {
          count: Array.isArray(data) ? data.length : 1
        });
      }

      return {
        source: this.sourceConfig.name,
        timestamp: new Date().toISOString(),
        dataCount: Array.isArray(data) ? data.length : 1,
        success: true
      };

    } catch (error) {
      logger.error(`Erreur lors de la récolte pour ${this.sourceConfig.name}`, error);
      throw error;
    }
  }

  async harvestSirene(params = {}) {
    const { siret, siren, query, limit = 100 } = params;
    
    if (siret) {
      return await this.client.getSiret(siret);
    }
    
    if (siren) {
      return await this.client.getSiren(siren);
    }
    
    if (query) {
      return await this.client.search(query, { nombre: limit });
    }
    
    // Par défaut, récupérer les unités légales récentes
    return await this.client.getUnitesLegales({ 
      nombre: limit,
      dateCreationUniteLegale: 'gte:2023-01-01'
    });
  }

  async harvestBdm(params = {}) {
    const { seriesId, startDate, endDate } = params;
    
    if (!seriesId) {
      throw new Error('seriesId requis pour la récolte BDM');
    }

    const queryParams = {};
    if (startDate) queryParams.startDate = startDate;
    if (endDate) queryParams.endDate = endDate;

    const data = await this.client.getBdmData(seriesId, queryParams);
    const metadata = await this.client.getBdmMetadata(seriesId);

    return {
      seriesId,
      metadata,
      data: data.values || []
    };
  }

  async harvestDonneesLocales(params = {}) {
    const { geoCode, indicatorId, year } = params;
    
    if (!geoCode || !indicatorId) {
      throw new Error('geoCode et indicatorId requis pour les données locales');
    }

    const queryParams = {};
    if (year) queryParams.year = year;

    return await this.client.getDonneesLocales(geoCode, indicatorId, queryParams);
  }

  async getData(query = {}) {
    return await this.persistenceManager.find(this.sourceConfig, query);
  }

  async getDataById(id) {
    return await this.persistenceManager.findOne(this.sourceConfig, { _id: id });
  }

  async updateData(query, update) {
    return await this.persistenceManager.update(this.sourceConfig, query, update);
  }

  async deleteData(query) {
    return await this.persistenceManager.delete(this.sourceConfig, query);
  }
}

// Fonction de compatibilité avec l'ancienne API
async function harvestInsee(sourceConfig, persistenceManager, params = {}) {
  const connector = new InseeConnector(sourceConfig, persistenceManager);
  return await connector.harvest(params);
}

export { InseeConnector, harvestInsee };
