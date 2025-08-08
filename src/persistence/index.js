import mongoose from 'mongoose';
import { MongoPersistence } from './mongoPersistence.js';
import { RedisPersistence } from './redisPersistence.js';
import logger from '../utils/logger.js';

class PersistenceManager {
  constructor() {
    this.strategies = new Map();
    this.connections = new Map();
  }

  async initialize(config) {
    // Initialiser MongoDB
    if (config.mongodb) {
      await this.initializeMongoDB(config.mongodb);
    }

    // Initialiser Redis
    if (config.redis) {
      await this.initializeRedis(config.redis);
    }

    // Enregistrer les stratégies
    this.registerStrategy('mongodb', new MongoPersistence());
    this.registerStrategy('redis', new RedisPersistence());
  }

  async initializeMongoDB(config) {
    try {
      await mongoose.connect(config.uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        ...config.options
      });
      
      this.connections.set('mongodb', mongoose.connection);
      logger.info('MongoDB connecté avec succès');
    } catch (error) {
      logger.error('Erreur de connexion MongoDB', error);
      throw error;
    }
  }

  async initializeRedis(config) {
    try {
      const Redis = (await import('redis')).default;
      const client = Redis.createClient(config);
      
      await client.connect();
      this.connections.set('redis', client);
      logger.info('Redis connecté avec succès');
    } catch (error) {
      logger.error('Erreur de connexion Redis', error);
      throw error;
    }
  }

  registerStrategy(name, strategy) {
    this.strategies.set(name, strategy);
  }

  getStrategy(name) {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      throw new Error(`Stratégie de persistance inconnue: ${name}`);
    }
    return strategy;
  }

  async save(sourceConfig, data) {
    const strategy = this.getStrategy(sourceConfig.persistence.strategy);
    return strategy.save(sourceConfig, data);
  }

  async find(sourceConfig, query = {}) {
    const strategy = this.getStrategy(sourceConfig.persistence.strategy);
    return strategy.find(sourceConfig, query);
  }

  async findOne(sourceConfig, query = {}) {
    const strategy = this.getStrategy(sourceConfig.persistence.strategy);
    return strategy.findOne(sourceConfig, query);
  }

  async update(sourceConfig, query, update) {
    const strategy = this.getStrategy(sourceConfig.persistence.strategy);
    return strategy.update(sourceConfig, query, update);
  }

  async delete(sourceConfig, query) {
    const strategy = this.getStrategy(sourceConfig.persistence.strategy);
    return strategy.delete(sourceConfig, query);
  }

  async close() {
    for (const [name, connection] of this.connections) {
      try {
        if (name === 'mongodb') {
          await connection.close();
        } else if (name === 'redis') {
          await connection.quit();
        }
        logger.info(`${name} déconnecté`);
      } catch (error) {
        logger.error(`Erreur lors de la déconnexion de ${name}`, error);
      }
    }
  }
}

export { PersistenceManager };

