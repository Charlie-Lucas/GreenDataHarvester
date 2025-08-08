import { SourceManager } from '../../src/sources/index.js';
import { logger } from '../../src/utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

export class ConfigureSourceCommand {
  constructor() {
    this.sourceManager = SourceManager.getInstance();
  }

  async execute(options = {}) {
    const { action, sourceId, configPath, validate = true } = options;
    
    try {
      logger.info('Starting source configuration command', { action, sourceId, configPath });
      
      switch (action) {
        case 'add':
          return await this.addSource(configPath, validate);
        case 'update':
          return await this.updateSource(sourceId, configPath, validate);
        case 'remove':
          return await this.removeSource(sourceId);
        case 'list':
          return await this.listSources();
        case 'validate':
          return await this.validateSource(sourceId);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      logger.error('Error during source configuration', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  async addSource(configPath, validate = true) {
    try {
      logger.info('Adding new source', { configPath });
      
      // Read configuration file
      const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
      
      if (validate) {
        await this.validateConfiguration(config);
      }
      
      // Add source to manager
      const result = await this.sourceManager.addSource(config);
      
      logger.info('Source added successfully', { sourceId: result.id });
      return result;
    } catch (error) {
      logger.error('Error adding source', { configPath, error: error.message });
      throw error;
    }
  }

  async updateSource(sourceId, configPath, validate = true) {
    try {
      logger.info('Updating source', { sourceId, configPath });
      
      // Read configuration file
      const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
      
      if (validate) {
        await this.validateConfiguration(config);
      }
      
      // Update source in manager
      const result = await this.sourceManager.updateSource(sourceId, config);
      
      logger.info('Source updated successfully', { sourceId });
      return result;
    } catch (error) {
      logger.error('Error updating source', { sourceId, configPath, error: error.message });
      throw error;
    }
  }

  async removeSource(sourceId) {
    try {
      logger.info('Removing source', { sourceId });
      
      const result = await this.sourceManager.removeSource(sourceId);
      
      logger.info('Source removed successfully', { sourceId });
      return result;
    } catch (error) {
      logger.error('Error removing source', { sourceId, error: error.message });
      throw error;
    }
  }

  async listSources() {
    try {
      logger.info('Listing sources');
      
      const sources = await this.sourceManager.getSources();
      
      logger.info('Sources listed successfully', { count: sources.length });
      return sources;
    } catch (error) {
      logger.error('Error listing sources', { error: error.message });
      throw error;
    }
  }

  async validateSource(sourceId) {
    try {
      logger.info('Validating source', { sourceId });
      
      const validation = await this.sourceManager.validateSource(sourceId);
      
      logger.info('Source validation completed', { sourceId, validation });
      return validation;
    } catch (error) {
      logger.error('Error validating source', { sourceId, error: error.message });
      throw error;
    }
  }

  async validateConfiguration(config) {
    // Basic configuration validation
    const requiredFields = ['id', 'name', 'type', 'connection', 'persistence'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate connection configuration
    if (!config.connection.baseUrl) {
      throw new Error('Missing baseUrl in connection configuration');
    }
    
    // Validate persistence configuration
    if (!config.persistence.strategies) {
      throw new Error('Missing strategies in persistence configuration');
    }
    
    logger.info('Configuration validation passed');
    return true;
  }
}

