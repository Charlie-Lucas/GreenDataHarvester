import { expect } from 'chai';
import sinon from 'sinon';
import nock from 'nock';
import { sourceManager } from '../src/sources/index.js';
import { InseeConnector } from '../src/sources/insee/index.js';
import { PersistenceManager } from '../src/persistence/index.js';

describe('Intégration - Système complet', () => {
  let mockPersistenceManager;

  beforeEach(() => {
    // Mock du gestionnaire de persistance
    mockPersistenceManager = {
      save: sinon.stub().resolves({ insertedCount: 1 }),
      find: sinon.stub().resolves([]),
      findOne: sinon.stub().resolves(null),
      update: sinon.stub().resolves({ modifiedCount: 1 }),
      delete: sinon.stub().resolves({ deletedCount: 1 }),
      initialize: sinon.stub().resolves(),
      close: sinon.stub().resolves()
    };

    // Mock du système de fichiers pour la configuration
    const fsStub = sinon.stub();
    fsStub.resolves(JSON.stringify({
      version: "2.0.0",
      sources: [
        {
          id: 'insee-sirene',
          name: 'INSEE Sirene',
          connector: 'insee',
          config: {
            baseUrl: 'https://api.insee.fr/entreprises/sirene/V3',
            authentication: {
              type: 'bearer',
              token: 'test-token'
            }
          },
          persistence: {
            strategy: 'mongodb',
            collection: 'insee_sirene'
          }
        }
      ]
    }));

    // Mock de fs.readFile
    const fs = await import('fs/promises');
    sinon.stub(fs, 'readFile').callsFake(fsStub);
  });

  afterEach(() => {
    nock.cleanAll();
    sinon.restore();
  });

  describe('SourceManager', () => {
    it('devrait initialiser correctement avec la configuration', async () => {
      const manager = new sourceManager.constructor();
      
      // Mock de l'initialisation de la persistance
      manager.persistenceManager = mockPersistenceManager;
      
      await manager.initialize();
      
      expect(manager.config).to.not.be.null;
      expect(manager.config.sources).to.have.length(1);
      expect(manager.config.sources[0].id).to.equal('insee-sirene');
    });

    it('devrait récupérer la liste des sources', async () => {
      const manager = new sourceManager.constructor();
      manager.config = {
        sources: [
          {
            id: 'insee-sirene',
            name: 'INSEE Sirene',
            description: 'Test description',
            type: 'api',
            connector: 'insee'
          }
        ]
      };

      const sources = manager.getSources();
      expect(sources).to.have.length(1);
      expect(sources[0].id).to.equal('insee-sirene');
    });
  });

  describe('InseeConnector - Intégration complète', () => {
    it('devrait récolter et sauvegarder des données SIRENE', async () => {
      const sourceConfig = {
        id: 'insee-sirene',
        name: 'INSEE Sirene',
        connector: 'insee',
        config: {
          baseUrl: 'https://api.insee.fr/entreprises/sirene/V3',
          authentication: {
            type: 'bearer',
            token: 'test-token'
          },
          rateLimit: {
            requestsPerMinute: 30,
            requestsPerHour: 1000
          }
        },
        persistence: {
          strategy: 'mongodb',
          collection: 'insee_sirene'
        }
      };

      const mockSireneData = {
        header: { total: 1 },
        etablissements: [
          {
            siret: '12345678901234',
            uniteLegale: {
              siren: '123456789',
              denominationUniteLegale: 'Test Company',
              dateCreationUniteLegale: '2023-01-15'
            }
          }
        ]
      };

      // Mock de l'API INSEE
      nock('https://api.insee.fr')
        .get('/entreprises/sirene/V3/siret')
        .query({ q: 'siret:12345678901234' })
        .reply(200, mockSireneData);

      const connector = new InseeConnector(sourceConfig, mockPersistenceManager);
      const result = await connector.harvest({ siret: '12345678901234' });

      expect(result.success).to.be.true;
      expect(result.source).to.equal('INSEE Sirene');
      expect(result.dataCount).to.equal(1);
      expect(mockPersistenceManager.save.calledOnce).to.be.true;
    });

    it('devrait gérer les erreurs de récolte', async () => {
      const sourceConfig = {
        id: 'insee-sirene',
        name: 'INSEE Sirene',
        connector: 'insee',
        config: {
          baseUrl: 'https://api.insee.fr/entreprises/sirene/V3',
          authentication: {
            type: 'bearer',
            token: 'test-token'
          }
        },
        persistence: {
          strategy: 'mongodb',
          collection: 'insee_sirene'
        }
      };

      // Mock d'une erreur API
      nock('https://api.insee.fr')
        .get('/entreprises/sirene/V3/siret')
        .query({ q: 'siret:invalid' })
        .reply(400, 'Bad Request');

      const connector = new InseeConnector(sourceConfig, mockPersistenceManager);
      
      try {
        await connector.harvest({ siret: 'invalid' });
        expect.fail('Devrait avoir levé une erreur');
      } catch (error) {
        expect(error.response.status).to.equal(400);
      }
    });
  });

  describe('PersistenceManager', () => {
    it('devrait sauvegarder des données avec la stratégie MongoDB', async () => {
      const manager = new PersistenceManager();
      
      // Mock de la stratégie MongoDB
      const mockMongoStrategy = {
        save: sinon.stub().resolves({ insertedCount: 1 }),
        find: sinon.stub().resolves([]),
        findOne: sinon.stub().resolves(null),
        update: sinon.stub().resolves({ modifiedCount: 1 }),
        delete: sinon.stub().resolves({ deletedCount: 1 })
      };

      manager.registerStrategy('mongodb', mockMongoStrategy);

      const sourceConfig = {
        persistence: {
          strategy: 'mongodb',
          collection: 'test_collection'
        }
      };

      const testData = { id: 1, name: 'Test' };
      const result = await manager.save(sourceConfig, testData);

      expect(mockMongoStrategy.save.calledOnce).to.be.true;
      expect(mockMongoStrategy.save.firstCall.args[0]).to.equal(sourceConfig);
      expect(mockMongoStrategy.save.firstCall.args[1]).to.deep.equal(testData);
    });

    it('devrait gérer les stratégies de persistance inconnues', () => {
      const manager = new PersistenceManager();
      
      expect(() => {
        manager.getStrategy('unknown');
      }).to.throw('Stratégie de persistance inconnue: unknown');
    });
  });

  describe('Workflow complet', () => {
    it('devrait exécuter un workflow complet de récolte', async () => {
      // 1. Configuration de la source
      const sourceConfig = {
        id: 'insee-sirene',
        name: 'INSEE Sirene',
        connector: 'insee',
        config: {
          baseUrl: 'https://api.insee.fr/entreprises/sirene/V3',
          authentication: {
            type: 'bearer',
            token: 'test-token'
          }
        },
        persistence: {
          strategy: 'mongodb',
          collection: 'insee_sirene'
        },
        transform: {
          enabled: true,
          rules: [
            {
              field: 'dateCreationUniteLegale',
              type: 'date',
              format: 'YYYY-MM-DD'
            }
          ]
        }
      };

      // 2. Mock des données INSEE
      const mockSireneData = {
        header: { total: 1 },
        etablissements: [
          {
            siret: '12345678901234',
            uniteLegale: {
              siren: '123456789',
              denominationUniteLegale: 'Test Company',
              dateCreationUniteLegale: '2023-01-15T00:00:00Z'
            }
          }
        ]
      };

      nock('https://api.insee.fr')
        .get('/entreprises/sirene/V3/siret')
        .query({ q: 'siret:12345678901234' })
        .reply(200, mockSireneData);

      // 3. Création du connecteur
      const connector = new InseeConnector(sourceConfig, mockPersistenceManager);

      // 4. Récolte des données
      const harvestResult = await connector.harvest({ siret: '12345678901234' });

      // 5. Vérifications
      expect(harvestResult.success).to.be.true;
      expect(harvestResult.dataCount).to.equal(1);

      // 6. Vérification de la sauvegarde
      expect(mockPersistenceManager.save.calledOnce).to.be.true;
      const savedData = mockPersistenceManager.save.firstCall.args[1];
      
      // 7. Vérification de la transformation
      expect(savedData.etablissements[0].uniteLegale.dateCreationUniteLegale).to.equal('2023-01-15');

      // 8. Récupération des données
      mockPersistenceManager.find.resolves([savedData]);
      const retrievedData = await connector.getData({ siret: '12345678901234' });

      expect(retrievedData).to.have.length(1);
      expect(retrievedData[0].etablissements[0].siret).to.equal('12345678901234');
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs de configuration', async () => {
      const manager = new sourceManager.constructor();
      
      // Mock d'une erreur de lecture de fichier
      const fs = await import('fs/promises');
      sinon.stub(fs, 'readFile').rejects(new Error('File not found'));

      try {
        await manager.initialize();
        expect.fail('Devrait avoir levé une erreur');
      } catch (error) {
        expect(error.message).to.include('File not found');
      }
    });

    it('devrait gérer les erreurs de persistance', async () => {
      const sourceConfig = {
        id: 'insee-sirene',
        name: 'INSEE Sirene',
        connector: 'insee',
        config: {
          baseUrl: 'https://api.insee.fr/entreprises/sirene/V3',
          authentication: {
            type: 'bearer',
            token: 'test-token'
          }
        },
        persistence: {
          strategy: 'mongodb',
          collection: 'insee_sirene'
        }
      };

      // Mock d'une erreur de sauvegarde
      mockPersistenceManager.save.rejects(new Error('Database error'));

      const connector = new InseeConnector(sourceConfig, mockPersistenceManager);

      nock('https://api.insee.fr')
        .get('/entreprises/sirene/V3/siret')
        .query({ q: 'siret:12345678901234' })
        .reply(200, { header: { total: 1 }, etablissements: [] });

      try {
        await connector.harvest({ siret: '12345678901234' });
        expect.fail('Devrait avoir levé une erreur');
      } catch (error) {
        expect(error.message).to.include('Database error');
      }
    });
  });
});

