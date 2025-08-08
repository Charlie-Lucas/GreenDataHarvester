import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

export class ConfigManager {
  constructor() {
    this.configPath = 'config';
    this.globalConfig = null;
    this.sourceConfigs = new Map();
  }

  async loadConfiguration() {
    try {
      logger.info('Loading configuration from tree structure...');
      
      // Load global configuration
      await this.loadGlobalConfig();
      
      // Load source configurations
      await this.loadSourceConfigs();
      
      logger.info('Configuration loaded successfully', {
        globalConfig: !!this.globalConfig,
        sourceCount: this.sourceConfigs.size
      });
      
      return {
        global: this.globalConfig,
        sources: Object.fromEntries(this.sourceConfigs)
      };
    } catch (error) {
      logger.error('Error loading configuration', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  async loadGlobalConfig() {
    try {
      const globalConfigPath = path.join(this.configPath, 'global.json');
      const globalConfigData = await fs.readFile(globalConfigPath, 'utf8');
      this.globalConfig = JSON.parse(globalConfigData);
      
      // Replace environment variables
      this.globalConfig = this.replaceEnvVars(this.globalConfig);
      
      logger.info('Global configuration loaded');
    } catch (error) {
      logger.error('Error loading global configuration', { error: error.message });
      throw error;
    }
  }

  async loadSourceConfigs() {
    try {
      const configDir = await fs.readdir(this.configPath);
      
      for (const item of configDir) {
        const itemPath = path.join(this.configPath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory() && item !== 'passport-strategies') {
          await this.loadSourceConfig(item);
        }
      }
      
      logger.info('Source configurations loaded', { sources: Array.from(this.sourceConfigs.keys()) });
    } catch (error) {
      logger.error('Error loading source configurations', { error: error.message });
      throw error;
    }
  }

  async loadSourceConfig(sourceName) {
    try {
      const sourceConfigPath = path.join(this.configPath, sourceName);
      const sourceConfig = {
        id: sourceName,
        name: sourceName,
        type: sourceName,
        connection: null,
        persistence: null,
        schedule: null,
        transform: null,
        health: null
      };

      // Load connection configuration
      try {
        const connectionPath = path.join(sourceConfigPath, 'connection.json');
        const connectionData = await fs.readFile(connectionPath, 'utf8');
        sourceConfig.connection = JSON.parse(connectionData);
        sourceConfig.connection = this.replaceEnvVars(sourceConfig.connection);
      } catch (error) {
        logger.warn(`No connection configuration found for ${sourceName}`, { error: error.message });
      }

      // Load persistence configuration
      try {
        const persistencePath = path.join(sourceConfigPath, 'persistence.json');
        const persistenceData = await fs.readFile(persistencePath, 'utf8');
        sourceConfig.persistence = JSON.parse(persistenceData);
      } catch (error) {
        logger.warn(`No persistence configuration found for ${sourceName}`, { error: error.message });
      }

      // Load schedule configuration
      try {
        const schedulePath = path.join(sourceConfigPath, 'schedule.json');
        const scheduleData = await fs.readFile(schedulePath, 'utf8');
        sourceConfig.schedule = JSON.parse(scheduleData);
      } catch (error) {
        logger.warn(`No schedule configuration found for ${sourceName}`, { error: error.message });
      }

      // Load transform configuration
      try {
        const transformPath = path.join(sourceConfigPath, 'transform.json');
        const transformData = await fs.readFile(transformPath, 'utf8');
        sourceConfig.transform = JSON.parse(transformData);
      } catch (error) {
        logger.warn(`No transform configuration found for ${sourceName}`, { error: error.message });
      }

      // Load health configuration
      try {
        const healthPath = path.join(sourceConfigPath, 'health.json');
        const healthData = await fs.readFile(healthPath, 'utf8');
        sourceConfig.health = JSON.parse(healthData);
      } catch (error) {
        logger.warn(`No health configuration found for ${sourceName}`, { error: error.message });
      }

      this.sourceConfigs.set(sourceName, sourceConfig);
      logger.info(`Source configuration loaded for ${sourceName}`);
    } catch (error) {
      logger.error(`Error loading source configuration for ${sourceName}`, { error: error.message });
      throw error;
    }
  }

  replaceEnvVars(obj) {
    if (typeof obj === 'string') {
      return obj.replace(/\$\{([^}]+)\}/g, (match, envVar) => {
        return process.env[envVar] || match;
      });
    } else if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        return obj.map(item => this.replaceEnvVars(item));
      } else {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = this.replaceEnvVars(value);
        }
        return result;
      }
    }
    return obj;
  }

  getGlobalConfig() {
    return this.globalConfig;
  }

  getSourceConfig(sourceId) {
    return this.sourceConfigs.get(sourceId);
  }

  getAllSourceConfigs() {
    return Object.fromEntries(this.sourceConfigs);
  }

  async addSourceConfig(sourceId, config) {
    try {
      const sourceConfigPath = path.join(this.configPath, sourceId);
      await fs.mkdir(sourceConfigPath, { recursive: true });

      // Save connection configuration
      if (config.connection) {
        await fs.writeFile(
          path.join(sourceConfigPath, 'connection.json'),
          JSON.stringify(config.connection, null, 2)
        );
      }

      // Save persistence configuration
      if (config.persistence) {
        await fs.writeFile(
          path.join(sourceConfigPath, 'persistence.json'),
          JSON.stringify(config.persistence, null, 2)
        );
      }

      // Save schedule configuration
      if (config.schedule) {
        await fs.writeFile(
          path.join(sourceConfigPath, 'schedule.json'),
          JSON.stringify(config.schedule, null, 2)
        );
      }

      // Save transform configuration
      if (config.transform) {
        await fs.writeFile(
          path.join(sourceConfigPath, 'transform.json'),
          JSON.stringify(config.transform, null, 2)
        );
      }

      // Save health configuration
      if (config.health) {
        await fs.writeFile(
          path.join(sourceConfigPath, 'health.json'),
          JSON.stringify(config.health, null, 2)
        );
      }

      // Reload the source configuration
      await this.loadSourceConfig(sourceId);
      
      logger.info(`Source configuration added for ${sourceId}`);
      return this.getSourceConfig(sourceId);
    } catch (error) {
      logger.error(`Error adding source configuration for ${sourceId}`, { error: error.message });
      throw error;
    }
  }

  async updateSourceConfig(sourceId, config) {
    try {
      await this.addSourceConfig(sourceId, config);
      logger.info(`Source configuration updated for ${sourceId}`);
      return this.getSourceConfig(sourceId);
    } catch (error) {
      logger.error(`Error updating source configuration for ${sourceId}`, { error: error.message });
      throw error;
    }
  }

  async removeSourceConfig(sourceId) {
    try {
      const sourceConfigPath = path.join(this.configPath, sourceId);
      await fs.rm(sourceConfigPath, { recursive: true, force: true });
      
      this.sourceConfigs.delete(sourceId);
      
      logger.info(`Source configuration removed for ${sourceId}`);
      return true;
    } catch (error) {
      logger.error(`Error removing source configuration for ${sourceId}`, { error: error.message });
      throw error;
    }
  }

  validateSourceConfig(sourceId) {
    const config = this.getSourceConfig(sourceId);
    if (!config) {
      throw new Error(`Source configuration not found: ${sourceId}`);
    }

    const errors = [];

    // Validate required fields
    if (!config.connection) {
      errors.push('Connection configuration is required');
    } else if (!config.connection.baseUrl) {
      errors.push('Connection baseUrl is required');
    }

    if (!config.persistence) {
      errors.push('Persistence configuration is required');
    } else if (!config.persistence.strategies) {
      errors.push('Persistence strategies are required');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed for ${sourceId}: ${errors.join(', ')}`);
    }

    return true;
  }
}

