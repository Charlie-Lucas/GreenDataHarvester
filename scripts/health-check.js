#!/usr/bin/env node

import { SourceManager } from '../src/sources/index.js';
import { logger } from '../src/utils/logger.js';
import nock from 'nock';

// Mock INSEE API responses
const mockInseeResponses = {
  sirene: {
    etablissements: [
      {
        siret: "12345678901234",
        siren: "123456789",
        uniteLegale: {
          denominationUniteLegale: "ENTREPRISE TEST",
          activitePrincipaleUniteLegale: "62.01Z"
        },
        adresseEtablissement: {
          numeroVoieEtablissement: "1",
          typeVoieEtablissement: "RUE",
          libelleVoieEtablissement: "DE LA PAIX",
          codePostalEtablissement: "75001",
          libelleCommuneEtablissement: "PARIS"
        },
        dateCreationEtablissement: "2020-01-01"
      }
    ]
  },
  bdm: {
    data: [
      {
        idBank: "000001",
        date: "2024-01-01",
        valeur: 100.5,
        frequence: "M"
      }
    ]
  },
  donneesLocales: {
    data: [
      {
        codeGeo: "75056",
        date: "2024-01-01",
        indicateur: "POPULATION",
        valeur: 2161000
      }
    ]
  }
};

// Setup mocks
function setupMocks() {
  // Mock INSEE SIRENE API
  nock('https://api.insee.fr')
    .get('/entreprises/sirene/V3/siret')
    .query({ q: 'dateCreationEtablissement:2024-01-01', nombre: '1' })
    .reply(200, mockInseeResponses.sirene);

  // Mock INSEE BDM API
  nock('https://api.insee.fr')
    .get('/series/BDM/V1/data/SERIES_BDM/000001')
    .reply(200, mockInseeResponses.bdm);

  // Mock INSEE Données Locales API
  nock('https://api.insee.fr')
    .get('/donnees-locales/V0.1/geo/commune/75056')
    .reply(200, mockInseeResponses.donneesLocales);

  logger.info('Mocks setup completed');
}

// Cleanup mocks
function cleanupMocks() {
  nock.cleanAll();
  logger.info('Mocks cleaned up');
}

// Main health check function
async function performHealthCheck(options = {}) {
  const { 
    detailed = false, 
    useMocks = true, 
    sources = null,
    maxDataSize = 5 
  } = options;

  try {
    logger.info('Starting health check with mocks', { detailed, useMocks, sources });

    if (useMocks) {
      setupMocks();
    }

    // Initialize SourceManager
    const sourceManager = SourceManager.getInstance();
    await sourceManager.initialize();

    let healthResults;

    if (sources && Array.isArray(sources)) {
      // Check specific sources
      healthResults = {};
      for (const sourceId of sources) {
        try {
          healthResults[sourceId] = await sourceManager.checkSourceHealth(sourceId, { 
            detailed, 
            maxDataSize 
          });
        } catch (error) {
          logger.error(`Health check failed for ${sourceId}`, { error: error.message });
          healthResults[sourceId] = {
            sourceId,
            isHealthy: false,
            status: 'error',
            message: error.message
          };
        }
      }
    } else {
      // Check all sources
      healthResults = await sourceManager.checkAllSourcesHealth({ detailed, maxDataSize });
    }

    // Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      totalSources: Object.keys(healthResults).length,
      healthySources: Object.values(healthResults).filter(r => r.isHealthy).length,
      unhealthySources: Object.values(healthResults).filter(r => !r.isHealthy).length,
      results: healthResults
    };

    // Log results
    logger.info('Health check completed', {
      total: summary.totalSources,
      healthy: summary.healthySources,
      unhealthy: summary.unhealthySources
    });

    if (detailed) {
      console.log('\n=== HEALTH CHECK DETAILED RESULTS ===');
      for (const [sourceId, result] of Object.entries(healthResults)) {
        console.log(`\n${sourceId}:`);
        console.log(`  Status: ${result.isHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
        console.log(`  Message: ${result.message}`);
        console.log(`  Response Time: ${result.responseTime}ms`);
        if (result.dataSample) {
          console.log(`  Data Sample: ${JSON.stringify(result.dataSample, null, 2)}`);
        }
      }
    } else {
      console.log('\n=== HEALTH CHECK SUMMARY ===');
      console.log(`Total Sources: ${summary.totalSources}`);
      console.log(`Healthy: ${summary.healthySources}`);
      console.log(`Unhealthy: ${summary.unhealthySources}`);
      console.log(`Success Rate: ${((summary.healthySources / summary.totalSources) * 100).toFixed(1)}%`);
    }

    return summary;

  } catch (error) {
    logger.error('Health check failed', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    if (useMocks) {
      cleanupMocks();
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    detailed: args.includes('--detailed') || args.includes('-d'),
    useMocks: !args.includes('--no-mocks'),
    sources: null,
    maxDataSize: 5
  };

  // Parse source arguments
  const sourceIndex = args.indexOf('--sources');
  if (sourceIndex !== -1 && args[sourceIndex + 1]) {
    options.sources = args[sourceIndex + 1].split(',');
  }

  // Parse max data size
  const maxDataIndex = args.indexOf('--max-data-size');
  if (maxDataIndex !== -1 && args[maxDataIndex + 1]) {
    options.maxDataSize = parseInt(args[maxDataIndex + 1], 10);
  }

  try {
    const result = await performHealthCheck(options);
    
    // Exit with appropriate code
    const exitCode = result.unhealthySources > 0 ? 1 : 0;
    process.exit(exitCode);
  } catch (error) {
    console.error('Health check failed:', error.message);
    process.exit(1);
  }
}

// Export for use in other modules
export { performHealthCheck, setupMocks, cleanupMocks };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

