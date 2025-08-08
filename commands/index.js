import { FetchDataCommand } from './data/fetch.js';
import { QueryDataCommand } from './data/query.js';
import { HealthCheckCommand } from './source/health.js';
import { ConfigureSourceCommand } from './source/configure.js';
import { CreateUserCommand } from './user/create.js';
import { logger } from '../src/utils/logger.js';

export class CommandManager {
  constructor() {
    this.commands = {
      'data:fetch': new FetchDataCommand(),
      'data:query': new QueryDataCommand(),
      'source:health': new HealthCheckCommand(),
      'source:configure': new ConfigureSourceCommand(),
      'user:create': new CreateUserCommand()
    };
  }

  async execute(commandName, options = {}) {
    try {
      logger.info('Executing command', { commandName, options });
      
      if (!this.commands[commandName]) {
        throw new Error(`Unknown command: ${commandName}`);
      }
      
      const result = await this.commands[commandName].execute(options);
      
      logger.info('Command executed successfully', { commandName, result });
      return result;
    } catch (error) {
      logger.error('Error executing command', { commandName, error: error.message, stack: error.stack });
      throw error;
    }
  }

  getAvailableCommands() {
    return Object.keys(this.commands);
  }

  getCommandHelp(commandName) {
    const help = {
      'data:fetch': {
        description: 'Fetch data from configured sources',
        options: {
          sourceId: 'Specific source ID to fetch from (optional)',
          limit: 'Maximum number of records to fetch (optional)',
          force: 'Force fetch even if data is recent (optional, boolean)'
        },
        examples: [
          'data:fetch --sourceId insee-sirene --limit 100',
          'data:fetch --force'
        ]
      },
      'data:query': {
        description: 'Query data from storage',
        options: {
          sourceId: 'Source ID to query from (required)',
          query: 'Query string (optional)',
          limit: 'Maximum number of records to return (default: 100)',
          offset: 'Number of records to skip (default: 0)',
          sort: 'Sort criteria (optional)',
          filter: 'Filter criteria (optional)'
        },
        examples: [
          'data:query --sourceId insee-sirene --limit 50',
          'data:query --sourceId insee-bdm --query "date:2024-01-01"'
        ]
      },
      'source:health': {
        description: 'Check health status of data sources',
        options: {
          sourceId: 'Specific source ID to check (optional)',
          detailed: 'Include detailed health information (optional, boolean)'
        },
        examples: [
          'source:health --sourceId insee-sirene',
          'source:health --detailed'
        ]
      },
      'source:configure': {
        description: 'Configure data sources',
        options: {
          action: 'Action to perform: add, update, remove, list, validate (required)',
          sourceId: 'Source ID for update/remove/validate actions (required for some actions)',
          configPath: 'Path to configuration file (required for add/update actions)',
          validate: 'Validate configuration before applying (optional, boolean, default: true)'
        },
        examples: [
          'source:configure --action list',
          'source:configure --action add --configPath config/new-source.json',
          'source:configure --action validate --sourceId insee-sirene'
        ]
      },
      'user:create': {
        description: 'Create a new user',
        options: {
          username: 'Username (required)',
          email: 'Email address (required)',
          password: 'Password (required)',
          role: 'User role: user, admin, moderator (optional, default: user)',
          profile: 'User profile object (optional)'
        },
        examples: [
          'user:create --username john --email john@example.com --password secret123',
          'user:create --username admin --email admin@example.com --password secret123 --role admin'
        ]
      }
    };
    
    return help[commandName] || { description: 'No help available for this command' };
  }

  async executeWithValidation(commandName, options = {}) {
    try {
      logger.info('Executing command with validation', { commandName, options });
      
      // Validate command exists
      if (!this.commands[commandName]) {
        throw new Error(`Unknown command: ${commandName}`);
      }
      
      // Validate required options based on command
      await this.validateCommandOptions(commandName, options);
      
      // Execute command
      const result = await this.execute(commandName, options);
      
      logger.info('Command executed with validation successfully', { commandName, result });
      return result;
    } catch (error) {
      logger.error('Error executing command with validation', { commandName, error: error.message });
      throw error;
    }
  }

  async validateCommandOptions(commandName, options) {
    const validations = {
      'data:query': (options) => {
        if (!options.sourceId) {
          throw new Error('sourceId is required for data:query command');
        }
      },
      'source:configure': (options) => {
        if (!options.action) {
          throw new Error('action is required for source:configure command');
        }
        
        if (['add', 'update'].includes(options.action) && !options.configPath) {
          throw new Error('configPath is required for add/update actions');
        }
        
        if (['update', 'remove', 'validate'].includes(options.action) && !options.sourceId) {
          throw new Error('sourceId is required for update/remove/validate actions');
        }
      },
      'user:create': (options) => {
        if (!options.username || !options.email || !options.password) {
          throw new Error('username, email, and password are required for user:create command');
        }
      }
    };
    
    if (validations[commandName]) {
      validations[commandName](options);
    }
  }
}

