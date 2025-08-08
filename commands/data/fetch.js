import { SourceManager } from '../../src/sources/index.js';
import { logger } from '../../src/utils/logger.js';

export class FetchDataCommand {
  constructor() {
    this.sourceManager = SourceManager.getInstance();
  }

  async execute(options = {}) {
    const { sourceId, limit, force = false } = options;
    
    try {
      logger.info('Starting data fetch command', { sourceId, limit, force });
      
      if (sourceId) {
        // Fetch from specific source
        const result = await this.sourceManager.harvestSourceById(sourceId, { limit, force });
        logger.info('Data fetch completed for specific source', { sourceId, result });
        return result;
      } else {
        // Fetch from all sources
        const results = await this.sourceManager.harvestAll({ limit, force });
        logger.info('Data fetch completed for all sources', { results });
        return results;
      }
    } catch (error) {
      logger.error('Error during data fetch', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  async fetchWithHealthCheck(sourceId) {
    try {
      logger.info('Starting data fetch with health check', { sourceId });
      
      // First check source health
      const healthStatus = await this.sourceManager.checkSourceHealth(sourceId);
      
      if (!healthStatus.isHealthy) {
        logger.warn('Source is not healthy, skipping fetch', { sourceId, healthStatus });
        return { skipped: true, reason: 'source_unhealthy', healthStatus };
      }
      
      // Proceed with fetch
      const result = await this.execute({ sourceId, limit: 100 });
      
      logger.info('Data fetch with health check completed', { sourceId, result });
      return { ...result, healthStatus };
    } catch (error) {
      logger.error('Error during data fetch with health check', { sourceId, error: error.message });
      throw error;
    }
  }
}

