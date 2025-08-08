import { SourceManager } from '../../src/sources/index.js';
import { logger } from '../../src/utils/logger.js';

export class QueryDataCommand {
  constructor() {
    this.sourceManager = SourceManager.getInstance();
  }

  async execute(options = {}) {
    const { sourceId, query, limit = 100, offset = 0, sort, filter } = options;
    
    try {
      logger.info('Starting data query command', { sourceId, query, limit, offset });
      
      if (!sourceId) {
        throw new Error('Source ID is required for data query');
      }
      
      const result = await this.sourceManager.getData(sourceId, {
        query,
        limit,
        offset,
        sort,
        filter
      });
      
      logger.info('Data query completed', { sourceId, resultCount: result.length });
      return result;
    } catch (error) {
      logger.error('Error during data query', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  async getById(sourceId, id) {
    try {
      logger.info('Starting data query by ID', { sourceId, id });
      
      const result = await this.sourceManager.getDataById(sourceId, id);
      
      logger.info('Data query by ID completed', { sourceId, id, found: !!result });
      return result;
    } catch (error) {
      logger.error('Error during data query by ID', { sourceId, id, error: error.message });
      throw error;
    }
  }

  async getStats(sourceId) {
    try {
      logger.info('Starting data stats query', { sourceId });
      
      const stats = await this.sourceManager.getSourceStats(sourceId);
      
      logger.info('Data stats query completed', { sourceId, stats });
      return stats;
    } catch (error) {
      logger.error('Error during data stats query', { sourceId, error: error.message });
      throw error;
    }
  }
}

