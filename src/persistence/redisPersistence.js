import logger from '../utils/logger.js';

class RedisPersistence {
  constructor() {
    this.client = null;
  }

  setClient(client) {
    this.client = client;
  }

  async save(sourceConfig, data) {
    if (!this.client) {
      throw new Error('Client Redis non initialisé');
    }

    const key = this.generateKey(sourceConfig, data);
    const ttl = sourceConfig.persistence.ttl || 3600;

    try {
      const serializedData = JSON.stringify(data);
      await this.client.setEx(key, ttl, serializedData);
      logger.info(`Données sauvegardées dans Redis avec la clé ${key}`);
      return { key, ttl };
    } catch (error) {
      logger.error(`Erreur lors de la sauvegarde Redis pour la clé ${key}`, error);
      throw error;
    }
  }

  async find(sourceConfig, query = {}) {
    if (!this.client) {
      throw new Error('Client Redis non initialisé');
    }

    try {
      const pattern = this.generatePattern(sourceConfig, query);
      const keys = await this.client.keys(pattern);
      
      if (keys.length === 0) {
        return [];
      }

      const results = [];
      for (const key of keys) {
        const data = await this.client.get(key);
        if (data) {
          results.push(JSON.parse(data));
        }
      }

      logger.info(`${results.length} documents trouvés dans Redis`);
      return results;
    } catch (error) {
      logger.error('Erreur lors de la recherche Redis', error);
      throw error;
    }
  }

  async findOne(sourceConfig, query = {}) {
    const results = await this.find(sourceConfig, query);
    return results.length > 0 ? results[0] : null;
  }

  async update(sourceConfig, query, update) {
    if (!this.client) {
      throw new Error('Client Redis non initialisé');
    }

    try {
      const existingData = await this.findOne(sourceConfig, query);
      if (!existingData) {
        return await this.save(sourceConfig, update);
      }

      const updatedData = { ...existingData, ...update };
      return await this.save(sourceConfig, updatedData);
    } catch (error) {
      logger.error('Erreur lors de la mise à jour Redis', error);
      throw error;
    }
  }

  async delete(sourceConfig, query) {
    if (!this.client) {
      throw new Error('Client Redis non initialisé');
    }

    try {
      const pattern = this.generatePattern(sourceConfig, query);
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info(`${keys.length} clés supprimées de Redis`);
      }
      
      return { deletedCount: keys.length };
    } catch (error) {
      logger.error('Erreur lors de la suppression Redis', error);
      throw error;
    }
  }

  generateKey(sourceConfig, data) {
    const prefix = sourceConfig.persistence.collection || 'data';
    const id = data.id || data._id || Date.now();
    return `${prefix}:${id}`;
  }

  generatePattern(sourceConfig, query) {
    const prefix = sourceConfig.persistence.collection || 'data';
    
    if (Object.keys(query).length === 0) {
      return `${prefix}:*`;
    }

    // Générer un pattern basé sur les critères de recherche
    const conditions = Object.entries(query).map(([key, value]) => `${key}:${value}`);
    return `${prefix}:*:${conditions.join(':')}`;
  }

  async get(key) {
    if (!this.client) {
      throw new Error('Client Redis non initialisé');
    }

    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`Erreur lors de la récupération Redis pour la clé ${key}`, error);
      throw error;
    }
  }

  async set(key, data, ttl = 3600) {
    if (!this.client) {
      throw new Error('Client Redis non initialisé');
    }

    try {
      const serializedData = JSON.stringify(data);
      await this.client.setEx(key, ttl, serializedData);
      return { key, ttl };
    } catch (error) {
      logger.error(`Erreur lors de la sauvegarde Redis pour la clé ${key}`, error);
      throw error;
    }
  }

  async exists(key) {
    if (!this.client) {
      throw new Error('Client Redis non initialisé');
    }

    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error(`Erreur lors de la vérification d'existence Redis pour la clé ${key}`, error);
      throw error;
    }
  }
}

export { RedisPersistence };

