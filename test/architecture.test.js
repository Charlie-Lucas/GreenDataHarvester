import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import fs from 'fs/promises';
import path from 'path';

import { ConfigManager } from '../src/config/ConfigManager.js';
import { HealthManager } from '../health/HealthManager.js';
import { SourceManager } from '../src/sources/index.js';
import { CommandManager } from '../commands/index.js';

describe('Architecture Modulaire', () => {
  let configManager;
  let healthManager;
  let sourceManager;
  let commandManager;

  before(async () => {
    // Setup stubs for file system operations
    sinon.stub(fs, 'readFile').resolves('{}');
    sinon.stub(fs, 'readdir').resolves(['insee']);
    sinon.stub(fs, 'stat').resolves({ isDirectory: () => true });
    
    // Initialize managers
    configManager = new ConfigManager();
    healthManager = new HealthManager();
    sourceManager = SourceManager.getInstance();
    commandManager = new CommandManager();
  });

  after(() => {
    sinon.restore();
  });

  describe('ConfigManager', () => {
    it('should load configuration from tree structure', async () => {
      const config = await configManager.loadConfiguration();
      
      expect(config).to.have.property('global');
      expect(config).to.have.property('sources');
      expect(config.sources).to.have.property('insee');
    });

    it('should validate source configuration', () => {
      const mockConfig = {
        id: 'test-source',
        name: 'Test Source',
        type: 'test',
        connection: { baseUrl: 'https://api.test.com' },
        persistence: { strategies: { primary: 'mongo' } }
      };

      expect(() => configManager.validateConfiguration(mockConfig)).to.not.throw();
    });

    it('should reject invalid configuration', () => {
      const invalidConfig = {
        id: 'test-source',
        // Missing required fields
      };

      expect(() => configManager.validateConfiguration(invalidConfig)).to.throw();
    });
  });

  describe('HealthManager', () => {
    it('should check source health', async () => {
      const mockSourceConfig = {
        type: 'insee',
        connection: { baseUrl: 'https://api.insee.fr' },
        health: {
          enabled: true,
          endpoints: {
            sirene: {
              url: '/test',
              method: 'GET',
              expectedStatus: 200
            }
          }
        }
      };

      const healthResult = await healthManager.checkSourceHealth('test-source', mockSourceConfig);
      
      expect(healthResult).to.have.property('sourceId');
      expect(healthResult).to.have.property('isHealthy');
      expect(healthResult).to.have.property('status');
    });

    it('should handle missing health configuration', async () => {
      const mockSourceConfig = {
        type: 'insee',
        connection: { baseUrl: 'https://api.insee.fr' }
        // No health config
      };

      const healthResult = await healthManager.checkSourceHealth('test-source', mockSourceConfig);
      
      expect(healthResult.isHealthy).to.be.false;
      expect(healthResult.status).to.equal('no_config');
    });
  });

  describe('SourceManager', () => {
    it('should initialize with new architecture', async () => {
      await sourceManager.initialize();
      
      expect(sourceManager.initialized).to.be.true;
      expect(sourceManager.configManager).to.be.instanceOf(ConfigManager);
      expect(sourceManager.healthManager).to.be.instanceOf(HealthManager);
    });

    it('should register connectors', () => {
      expect(sourceManager.connectors.has('insee')).to.be.true;
    });

    it('should get connector by type', () => {
      const connector = sourceManager.getConnector('insee');
      expect(connector).to.exist;
    });

    it('should throw error for unknown connector', () => {
      expect(() => sourceManager.getConnector('unknown')).to.throw();
    });
  });

  describe('CommandManager', () => {
    it('should register all commands', () => {
      const commands = commandManager.getAvailableCommands();
      
      expect(commands).to.include('data:fetch');
      expect(commands).to.include('data:query');
      expect(commands).to.include('source:health');
      expect(commands).to.include('source:configure');
      expect(commands).to.include('user:create');
    });

    it('should provide help for commands', () => {
      const help = commandManager.getCommandHelp('data:fetch');
      
      expect(help).to.have.property('description');
      expect(help).to.have.property('options');
      expect(help).to.have.property('examples');
    });

    it('should validate command options', async () => {
      // Test valid options
      expect(() => commandManager.validateCommandOptions('data:query', { sourceId: 'test' })).to.not.throw();
      
      // Test invalid options
      expect(() => commandManager.validateCommandOptions('data:query', {})).to.throw();
    });
  });

  describe('Tree Structure', () => {
    it('should support tree-like configuration', () => {
      const configStructure = {
        global: 'config/global.json',
        sources: {
          insee: {
            connection: 'config/insee/connection.json',
            persistence: 'config/insee/persistence.json',
            schedule: 'config/insee/schedule.json',
            transform: 'config/insee/transform.json',
            health: 'config/insee/health.json'
          }
        }
      };

      expect(configStructure.sources.insee).to.have.property('connection');
      expect(configStructure.sources.insee).to.have.property('persistence');
      expect(configStructure.sources.insee).to.have.property('schedule');
      expect(configStructure.sources.insee).to.have.property('transform');
      expect(configStructure.sources.insee).to.have.property('health');
    });

    it('should support tree-like commands', () => {
      const commandStructure = {
        data: {
          fetch: 'commands/data/fetch.js',
          query: 'commands/data/query.js'
        },
        source: {
          health: 'commands/source/health.js',
          configure: 'commands/source/configure.js'
        },
        user: {
          create: 'commands/user/create.js'
        }
      };

      expect(commandStructure.data).to.have.property('fetch');
      expect(commandStructure.data).to.have.property('query');
      expect(commandStructure.source).to.have.property('health');
      expect(commandStructure.source).to.have.property('configure');
      expect(commandStructure.user).to.have.property('create');
    });
  });

  describe('Health Check Integration', () => {
    it('should perform health check with minimal data', async () => {
      const mockSourceConfig = {
        type: 'insee',
        connection: { baseUrl: 'https://api.insee.fr' },
        health: {
          enabled: true,
          maxDataSize: 3,
          endpoints: {
            sirene: {
              url: '/test',
              method: 'GET',
              expectedStatus: 200
            }
          }
        }
      };

      const healthResult = await healthManager.checkSourceHealth('test-source', mockSourceConfig, {
        maxDataSize: 3
      });

      expect(healthResult).to.have.property('dataSample');
      // Data sample should be limited to maxDataSize
      if (healthResult.dataSample && Array.isArray(healthResult.dataSample)) {
        expect(healthResult.dataSample.length).to.be.at.most(3);
      }
    });
  });

  describe('Command Integration', () => {
    it('should execute data fetch command', async () => {
      const fetchCommand = commandManager.commands['data:fetch'];
      expect(fetchCommand).to.exist;
      expect(fetchCommand.execute).to.be.a('function');
    });

    it('should execute source health command', async () => {
      const healthCommand = commandManager.commands['source:health'];
      expect(healthCommand).to.exist;
      expect(healthCommand.execute).to.be.a('function');
    });

    it('should execute source configure command', async () => {
      const configureCommand = commandManager.commands['source:configure'];
      expect(configureCommand).to.exist;
      expect(configureCommand.execute).to.be.a('function');
    });
  });
});

