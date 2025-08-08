import { logger } from '../utils/logger.js';
import { PersistenceManager } from '../persistence/index.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { HealthManager } from '../health/HealthManager.js';
import { InseeConnector } from './insee/index.js';

export class SourceManager {
  static instance = null;

  constructor() {
    this.configManager = new ConfigManager();
    this.healthManager = new HealthManager();
    this.persistenceManager = null;
    this.connectors = new Map();
    this.initialized = false;
  }

  static getInstance() {
    if (!SourceManager.instance) {
      SourceManager.instance = new SourceManager();
    }
    return SourceManager.instance;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing SourceManager...');

      // Load configuration from tree structure
      await this.configManager.loadConfiguration();

      // Initialize persistence manager
      this.persistenceManager = PersistenceManager.getInstance();
      await this.persistenceManager.initialize();

      // Register connectors
      await this.registerConnectors();

      this.initialized = true;
      logger.info('SourceManager initialized successfully');
    } catch (error) {
      logger.error('Error initializing SourceManager', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  async registerConnectors() {
    try {
      // Register INSEE connector
      this.connectors.set('insee', InseeConnector);
      
      // Add other connectors here as needed
      // this.connectors.set('assemblee', AssembleeConnector);
      
      logger.info('Connectors registered successfully', { 
        connectors: Array.from(this.connectors.keys()) 
      });
    } catch (error) {
      logger.error('Error registering connectors', { error: error.message });
      throw error;
    }
  }

  getConnector(sourceType) {
    const ConnectorClass = this.connectors.get(sourceType);
    if (!ConnectorClass) {
      throw new Error(`Connector not found for type: ${sourceType}`);
    }
    return ConnectorClass;
  }

  async harvestAll(options = {}) {
    await this.ensureInitialized();
    
    const results = [];
    const sourceConfigs = this.configManager.getAllSourceConfigs();
    
    for (const [sourceId, sourceConfig] of Object.entries(sourceConfigs)) {
      try {
        const result = await this.harvestSource(sourceId, sourceConfig, options);
        results.push(result);
      } catch (error) {
        logger.error(`Error harvesting ${sourceId}`, { error: error.message });
        results.push({
          sourceId,
          timestamp: new Date().toISOString(),
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async harvestSource(sourceId, sourceConfig, options = {}) {
    await this.ensureInitialized();
    
    try {
      const ConnectorClass = this.getConnector(sourceConfig.type);
      const connector = new ConnectorClass(sourceConfig, this.persistenceManager);
      
      const result = await connector.harvest(options);
      
      logger.info('Source harvested successfully', { sourceId, result });
      return {
        sourceId,
        timestamp: new Date().toISOString(),
        success: true,
        result
      };
    } catch (error) {
      logger.error(`Error harvesting source ${sourceId}`, { error: error.message });
      throw error;
    }
  }

  async harvestSourceById(sourceId, options = {}) {
    await this.ensureInitialized();
    
    const sourceConfig = this.configManager.getSourceConfig(sourceId);
    if (!sourceConfig) {
      throw new Error(`Source not found: ${sourceId}`);
    }
    
    return await this.harvestSource(sourceId, sourceConfig, options);
  }

  async getData(sourceId, query = {}) {
    await this.ensureInitialized();
    
    const sourceConfig = this.configManager.getSourceConfig(sourceId);
    if (!sourceConfig) {
      throw new Error(`Source not found: ${sourceId}`);
    }
    
    const ConnectorClass = this.getConnector(sourceConfig.type);
    const connector = new ConnectorClass(sourceConfig, this.persistenceManager);
    
    return await connector.getData(query);
  }

  async getDataById(sourceId, documentId) {
    await this.ensureInitialized();
    
    const sourceConfig = this.configManager.getSourceConfig(sourceId);
    if (!sourceConfig) {
      throw new Error(`Source not found: ${sourceId}`);
    }
    
    const ConnectorClass = this.getConnector(sourceConfig.type);
    const connector = new ConnectorClass(sourceConfig, this.persistenceManager);
    
    return await connector.getDataById(documentId);
  }

  async updateData(sourceId, query, update) {
    await this.ensureInitialized();
    
    const sourceConfig = this.configManager.getSourceConfig(sourceId);
    if (!sourceConfig) {
      throw new Error(`Source not found: ${sourceId}`);
    }
    
    const ConnectorClass = this.getConnector(sourceConfig.type);
    const connector = new ConnectorClass(sourceConfig, this.persistenceManager);
    
    return await connector.updateData(query, update);
  }

  async deleteData(sourceId, query) {
    await this.ensureInitialized();
    
    const sourceConfig = this.configManager.getSourceConfig(sourceId);
    if (!sourceConfig) {
      throw new Error(`Source not found: ${sourceId}`);
    }
    
    const ConnectorClass = this.getConnector(sourceConfig.type);
    const connector = new ConnectorClass(sourceConfig, this.persistenceManager);
    
    return await connector.deleteData(query);
  }

  async checkSourceHealth(sourceId, options = {}) {
    await this.ensureInitialized();
    
    const sourceConfig = this.configManager.getSourceConfig(sourceId);
    if (!sourceConfig) {
      throw new Error(`Source not found: ${sourceId}`);
    }
    
    return await this.healthManager.checkSourceHealth(sourceId, sourceConfig, options);
  }

  async checkAllSourcesHealth(options = {}) {
    await this.ensureInitialized();
    
    const results = {};
    const sourceConfigs = this.configManager.getAllSourceConfigs();
    
    for (const [sourceId, sourceConfig] of Object.entries(sourceConfigs)) {
      try {
        results[sourceId] = await this.healthManager.checkSourceHealth(sourceId, sourceConfig, options);
      } catch (error) {
        logger.error(`Error checking health for ${sourceId}`, { error: error.message });
        results[sourceId] = {
          sourceId,
          isHealthy: false,
          status: 'error',
          message: error.message
        };
      }
    }
    
    return results;
  }

  async getHealthHistory(sourceId, days = 7) {
    await this.ensureInitialized();
    return await this.healthManager.getHealthHistory(sourceId, days);
  }

  async getHealthSummary() {
    await this.ensureInitialized();
    return await this.healthManager.getHealthSummary();
  }

  async getSourceStats(sourceId) {
    await this.ensureInitialized();
    
    const sourceConfig = this.configManager.getSourceConfig(sourceId);
    if (!sourceConfig) {
      throw new Error(`Source not found: ${sourceId}`);
    }
    
    // Get collection name from persistence config
    const collectionName = sourceConfig.persistence?.collections?.[sourceId]?.name || sourceId;
    
    try {
      const stats = await this.persistenceManager.getStats(collectionName);
      return {
        sourceId,
        collection: collectionName,
        stats
      };
    } catch (error) {
      logger.error(`Error getting stats for ${sourceId}`, { error: error.message });
      throw error;
    }
  }

  getSources() {
    const sourceConfigs = this.configManager.getAllSourceConfigs();
    return Object.entries(sourceConfigs).map(([id, config]) => ({
      id,
      name: config.name,
      type: config.type,
      description: config.description || `${config.type} data source`
    }));
  }

  getSourceConfig(sourceId) {
    return this.configManager.getSourceConfig(sourceId);
  }

  async addSource(sourceId, config) {
    await this.ensureInitialized();
    return await this.configManager.addSourceConfig(sourceId, config);
  }

  async updateSource(sourceId, config) {
    await this.ensureInitialized();
    return await this.configManager.updateSourceConfig(sourceId, config);
  }

  async removeSource(sourceId) {
    await this.ensureInitialized();
    return await this.configManager.removeSourceConfig(sourceId);
  }

  async validateSource(sourceId) {
    await this.ensureInitialized();
    return this.configManager.validateSourceConfig(sourceId);
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async close() {
    if (this.persistenceManager) {
      await this.persistenceManager.close();
    }
    logger.info('SourceManager closed');
  }
}

// Singleton instance
const sourceManager = new SourceManager();

// Compatibility functions with old API
async function harvestAll() {
  if (!sourceManager.initialized) {
    await sourceManager.initialize();
  }
  return await sourceManager.harvestAll();
}

export { SourceManager, sourceManager, harvestAll };
