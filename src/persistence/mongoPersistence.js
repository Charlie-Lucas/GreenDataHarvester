import mongoose from 'mongoose';
import logger from '../utils/logger.js';

class MongoPersistence {
  constructor() {
    this.models = new Map();
  }

  getModel(collectionName, schema = {}) {
    if (this.models.has(collectionName)) {
      return this.models.get(collectionName);
    }

    // Créer un schéma dynamique basé sur les données
    const dynamicSchema = new mongoose.Schema(schema, {
      strict: false,
      timestamps: true
    });

    const model = mongoose.model(collectionName, dynamicSchema);
    this.models.set(collectionName, model);
    return model;
  }

  async createIndexes(model, indexes = []) {
    try {
      for (const indexConfig of indexes) {
        await model.createIndex(indexConfig.fields, {
          unique: indexConfig.unique || false,
          sparse: indexConfig.sparse || false,
          background: true
        });
      }
      logger.info(`Index créés pour la collection ${model.collection.name}`);
    } catch (error) {
      logger.error(`Erreur lors de la création des index pour ${model.collection.name}`, error);
    }
  }

  async setupTTL(model, ttlConfig) {
    if (!ttlConfig.enabled) return;

    try {
      await model.createIndex(
        { createdAt: 1 },
        { 
          expireAfterSeconds: ttlConfig.days * 24 * 60 * 60,
          background: true 
        }
      );
      logger.info(`TTL configuré pour la collection ${model.collection.name}`);
    } catch (error) {
      logger.error(`Erreur lors de la configuration TTL pour ${model.collection.name}`, error);
    }
  }

  async save(sourceConfig, data) {
    const collectionName = sourceConfig.persistence.collection;
    const model = this.getModel(collectionName);

    // Configurer les index et TTL si pas encore fait
    if (sourceConfig.persistence.indexes) {
      await this.createIndexes(model, sourceConfig.persistence.indexes);
    }
    if (sourceConfig.persistence.ttl) {
      await this.setupTTL(model, sourceConfig.persistence.ttl);
    }

    try {
      if (Array.isArray(data)) {
        // Insertion en lot
        const result = await model.insertMany(data, { 
          ordered: false,
          rawResult: true 
        });
        logger.info(`${result.insertedCount} documents insérés dans ${collectionName}`);
        return result;
      } else {
        // Insertion unique
        const document = new model(data);
        const result = await document.save();
        logger.info(`Document inséré dans ${collectionName} avec l'ID ${result._id}`);
        return result;
      }
    } catch (error) {
      logger.error(`Erreur lors de la sauvegarde dans ${collectionName}`, error);
      throw error;
    }
  }

  async find(sourceConfig, query = {}) {
    const collectionName = sourceConfig.persistence.collection;
    const model = this.getModel(collectionName);

    try {
      const results = await model.find(query);
      logger.info(`${results.length} documents trouvés dans ${collectionName}`);
      return results;
    } catch (error) {
      logger.error(`Erreur lors de la recherche dans ${collectionName}`, error);
      throw error;
    }
  }

  async findOne(sourceConfig, query = {}) {
    const collectionName = sourceConfig.persistence.collection;
    const model = this.getModel(collectionName);

    try {
      const result = await model.findOne(query);
      return result;
    } catch (error) {
      logger.error(`Erreur lors de la recherche dans ${collectionName}`, error);
      throw error;
    }
  }

  async update(sourceConfig, query, update) {
    const collectionName = sourceConfig.persistence.collection;
    const model = this.getModel(collectionName);

    try {
      const result = await model.updateMany(query, update, { 
        upsert: true,
        new: true 
      });
      logger.info(`${result.modifiedCount} documents mis à jour dans ${collectionName}`);
      return result;
    } catch (error) {
      logger.error(`Erreur lors de la mise à jour dans ${collectionName}`, error);
      throw error;
    }
  }

  async delete(sourceConfig, query) {
    const collectionName = sourceConfig.persistence.collection;
    const model = this.getModel(collectionName);

    try {
      const result = await model.deleteMany(query);
      logger.info(`${result.deletedCount} documents supprimés de ${collectionName}`);
      return result;
    } catch (error) {
      logger.error(`Erreur lors de la suppression dans ${collectionName}`, error);
      throw error;
    }
  }

  async aggregate(sourceConfig, pipeline) {
    const collectionName = sourceConfig.persistence.collection;
    const model = this.getModel(collectionName);

    try {
      const results = await model.aggregate(pipeline);
      return results;
    } catch (error) {
      logger.error(`Erreur lors de l'agrégation dans ${collectionName}`, error);
      throw error;
    }
  }
}

export { MongoPersistence };

