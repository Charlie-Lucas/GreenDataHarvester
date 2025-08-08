import { SourceManager } from '../../src/sources/index.js';
import { logger } from '../../src/utils/logger.js';

export class HealthCheckCommand {
  constructor() {
    this.sourceManager = SourceManager.getInstance();
  }

  async execute(options = {}) {
    const { sourceId, detailed = false } = options;
    
    try {
      logger.info('Starting health check command', { sourceId, detailed });
      
      if (sourceId) {
        // Check specific source health
        const healthStatus = await this.sourceManager.checkSourceHealth(sourceId, { detailed });
        logger.info('Health check completed for specific source', { sourceId, healthStatus });
        return healthStatus;
      } else {
        // Check all sources health
        const healthStatuses = await this.sourceManager.checkAllSourcesHealth({ detailed });
        logger.info('Health check completed for all sources', { healthStatuses });
        return healthStatuses;
      }
    } catch (error) {
      logger.error('Error during health check', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  async getHealthHistory(sourceId, days = 7) {
    try {
      logger.info('Starting health history query', { sourceId, days });
      
      const history = await this.sourceManager.getHealthHistory(sourceId, days);
      
      logger.info('Health history query completed', { sourceId, historyCount: history.length });
      return history;
    } catch (error) {
      logger.error('Error during health history query', { sourceId, error: error.message });
      throw error;
    }
  }

  async getHealthSummary() {
    try {
      logger.info('Starting health summary query');
      
      const summary = await this.sourceManager.getHealthSummary();
      
      logger.info('Health summary query completed', { summary });
      return summary;
    } catch (error) {
      logger.error('Error during health summary query', { error: error.message });
      throw error;
    }
  }
}

