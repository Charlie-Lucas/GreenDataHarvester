import { logger } from '../utils/logger.js';
import { PersistenceManager } from '../persistence/index.js';

export class HealthManager {
  constructor() {
    this.persistenceManager = PersistenceManager.getInstance();
    this.healthCollection = 'source_health_checks';
  }

  async checkSourceHealth(sourceId, sourceConfig, options = {}) {
    const { detailed = false, maxDataSize = 10 } = options;
    
    try {
      logger.info('Starting source health check', { sourceId, detailed });
      
      if (!sourceConfig || !sourceConfig.health) {
        logger.warn('No health configuration found for source', { sourceId });
        return {
          sourceId,
          isHealthy: false,
          status: 'no_config',
          message: 'No health configuration found',
          timestamp: new Date()
        };
      }

      const healthConfig = sourceConfig.health;
      const startTime = Date.now();
      
      // Check if health checks are enabled
      if (!healthConfig.enabled) {
        logger.info('Health checks disabled for source', { sourceId });
        return {
          sourceId,
          isHealthy: true,
          status: 'disabled',
          message: 'Health checks disabled',
          timestamp: new Date()
        };
      }

      // Perform health check based on source type
      let healthResult;
      switch (sourceConfig.type) {
        case 'insee':
          healthResult = await this.checkInseeHealth(sourceId, sourceConfig, healthConfig, maxDataSize);
          break;
        default:
          healthResult = await this.checkGenericHealth(sourceId, sourceConfig, healthConfig, maxDataSize);
      }

      const responseTime = Date.now() - startTime;
      
      const healthStatus = {
        sourceId,
        isHealthy: healthResult.isHealthy,
        status: healthResult.status,
        message: healthResult.message,
        responseTime,
        timestamp: new Date(),
        lastCheck: new Date(),
        error: healthResult.error || null,
        dataSample: healthResult.dataSample || null
      };

      // Store health check result
      await this.storeHealthCheck(healthStatus);
      
      // Check for alerts
      if (healthConfig.alerts && healthConfig.alerts.enabled) {
        await this.checkAlerts(sourceId, healthStatus, healthConfig.alerts);
      }

      logger.info('Source health check completed', { 
        sourceId, 
        isHealthy: healthStatus.isHealthy, 
        responseTime 
      });

      return detailed ? healthStatus : {
        sourceId,
        isHealthy: healthStatus.isHealthy,
        status: healthStatus.status,
        responseTime: healthStatus.responseTime
      };
    } catch (error) {
      logger.error('Error during source health check', { sourceId, error: error.message });
      
      const errorStatus = {
        sourceId,
        isHealthy: false,
        status: 'error',
        message: 'Health check failed',
        error: error.message,
        timestamp: new Date()
      };
      
      await this.storeHealthCheck(errorStatus);
      return errorStatus;
    }
  }

  async checkInseeHealth(sourceId, sourceConfig, healthConfig, maxDataSize) {
    try {
      const { InseeClient } = await import('../sources/insee/client.js');
      const client = new InseeClient(sourceConfig.connection);
      
      // Get endpoint configuration for this source
      const endpointConfig = healthConfig.endpoints[sourceId.split('-')[1]]; // e.g., 'sirene' from 'insee-sirene'
      
      if (!endpointConfig) {
        return {
          isHealthy: false,
          status: 'no_endpoint_config',
          message: 'No endpoint configuration found for health check'
        };
      }

      // Perform health check request
      const response = await client.makeRequest(endpointConfig.url, {
        method: endpointConfig.method || 'GET',
        timeout: endpointConfig.timeout || 10000
      });

      // Check response status
      if (response.status !== endpointConfig.expectedStatus) {
        return {
          isHealthy: false,
          status: 'unexpected_status',
          message: `Expected status ${endpointConfig.expectedStatus}, got ${response.status}`,
          error: `HTTP ${response.status}`
        };
      }

      // Extract minimal data sample
      let dataSample = null;
      if (response.data && maxDataSize > 0) {
        dataSample = this.extractDataSample(response.data, maxDataSize);
      }

      return {
        isHealthy: true,
        status: 'healthy',
        message: 'Source is responding correctly',
        dataSample
      };
    } catch (error) {
      return {
        isHealthy: false,
        status: 'connection_error',
        message: 'Failed to connect to source',
        error: error.message
      };
    }
  }

  async checkGenericHealth(sourceId, sourceConfig, healthConfig, maxDataSize) {
    try {
      // Generic health check using axios
      const axios = (await import('axios')).default;
      
      const endpointConfig = healthConfig.endpoints[sourceId];
      
      if (!endpointConfig) {
        return {
          isHealthy: false,
          status: 'no_endpoint_config',
          message: 'No endpoint configuration found for health check'
        };
      }

      const url = `${sourceConfig.connection.baseUrl}${endpointConfig.url}`;
      
      const response = await axios({
        method: endpointConfig.method || 'GET',
        url,
        timeout: endpointConfig.timeout || 10000,
        headers: sourceConfig.connection.headers || {}
      });

      if (response.status !== endpointConfig.expectedStatus) {
        return {
          isHealthy: false,
          status: 'unexpected_status',
          message: `Expected status ${endpointConfig.expectedStatus}, got ${response.status}`,
          error: `HTTP ${response.status}`
        };
      }

      let dataSample = null;
      if (response.data && maxDataSize > 0) {
        dataSample = this.extractDataSample(response.data, maxDataSize);
      }

      return {
        isHealthy: true,
        status: 'healthy',
        message: 'Source is responding correctly',
        dataSample
      };
    } catch (error) {
      return {
        isHealthy: false,
        status: 'connection_error',
        message: 'Failed to connect to source',
        error: error.message
      };
    }
  }

  extractDataSample(data, maxSize) {
    try {
      if (Array.isArray(data)) {
        return data.slice(0, maxSize);
      } else if (data && typeof data === 'object') {
        const keys = Object.keys(data);
        const sample = {};
        keys.slice(0, maxSize).forEach(key => {
          sample[key] = data[key];
        });
        return sample;
      }
      return data;
    } catch (error) {
      logger.warn('Error extracting data sample', { error: error.message });
      return null;
    }
  }

  async storeHealthCheck(healthStatus) {
    try {
      await this.persistenceManager.save(this.healthCollection, healthStatus);
      logger.debug('Health check result stored', { sourceId: healthStatus.sourceId });
    } catch (error) {
      logger.error('Error storing health check result', { error: error.message });
    }
  }

  async checkAlerts(sourceId, healthStatus, alertConfig) {
    try {
      const thresholds = alertConfig.thresholds;
      
      // Check response time threshold
      if (thresholds.responseTime && healthStatus.responseTime > thresholds.responseTime) {
        await this.triggerAlert(sourceId, 'response_time_exceeded', {
          responseTime: healthStatus.responseTime,
          threshold: thresholds.responseTime
        });
      }

      // Check consecutive failures
      if (!healthStatus.isHealthy) {
        const recentFailures = await this.getRecentFailures(sourceId, 10);
        if (recentFailures.length >= thresholds.consecutiveFailures) {
          await this.triggerAlert(sourceId, 'consecutive_failures', {
            failureCount: recentFailures.length,
            threshold: thresholds.consecutiveFailures
          });
        }
      }
    } catch (error) {
      logger.error('Error checking alerts', { sourceId, error: error.message });
    }
  }

  async getRecentFailures(sourceId, limit = 10) {
    try {
      const failures = await this.persistenceManager.find(this.healthCollection, {
        sourceId,
        isHealthy: false
      }, { limit, sort: { timestamp: -1 } });
      
      return failures;
    } catch (error) {
      logger.error('Error getting recent failures', { sourceId, error: error.message });
      return [];
    }
  }

  async triggerAlert(sourceId, alertType, details) {
    try {
      logger.warn('Health alert triggered', { sourceId, alertType, details });
      
      // Store alert
      const alert = {
        sourceId,
        type: alertType,
        details,
        timestamp: new Date(),
        acknowledged: false
      };
      
      await this.persistenceManager.save('health_alerts', alert);
      
      // TODO: Send notifications (email, webhook, etc.)
      
    } catch (error) {
      logger.error('Error triggering alert', { sourceId, alertType, error: error.message });
    }
  }

  async getHealthHistory(sourceId, days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const history = await this.persistenceManager.find(this.healthCollection, {
        sourceId,
        timestamp: { $gte: cutoffDate }
      }, { sort: { timestamp: -1 } });
      
      return history;
    } catch (error) {
      logger.error('Error getting health history', { sourceId, error: error.message });
      return [];
    }
  }

  async getHealthSummary() {
    try {
      const sources = await this.persistenceManager.find(this.healthCollection, {}, {
        sort: { timestamp: -1 },
        group: 'sourceId'
      });
      
      const summary = {};
      
      for (const source of sources) {
        const recentChecks = await this.getRecentFailures(source.sourceId, 1);
        const latestCheck = recentChecks[0];
        
        summary[source.sourceId] = {
          isHealthy: latestCheck ? latestCheck.isHealthy : false,
          lastCheck: latestCheck ? latestCheck.timestamp : null,
          responseTime: latestCheck ? latestCheck.responseTime : null,
          status: latestCheck ? latestCheck.status : 'unknown'
        };
      }
      
      return summary;
    } catch (error) {
      logger.error('Error getting health summary', { error: error.message });
      return {};
    }
  }
}

