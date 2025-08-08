import { expect } from 'chai';
import sinon from 'sinon';
import nock from 'nock';
import { InseeClient } from '../src/sources/insee/client.js';
import { InseeConnector } from '../src/sources/insee/index.js';
import { DataTransformer } from '../src/sources/insee/transform.js';

describe('INSEE Connector', () => {
  let client;
  let connector;
  let mockPersistenceManager;

  const mockSourceConfig = {
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

  beforeEach(() => {
    // Mock du gestionnaire de persistance
    mockPersistenceManager = {
      save: sinon.stub().resolves({ insertedCount: 1 }),
      find: sinon.stub().resolves([]),
      findOne: sinon.stub().resolves(null),
      update: sinon.stub().resolves({ modifiedCount: 1 }),
      delete: sinon.stub().resolves({ deletedCount: 1 })
    };

    // Mock du client INSEE
    client = new InseeClient(mockSourceConfig.config);
    connector = new InseeConnector(mockSourceConfig, mockPersistenceManager);
  });

  afterEach(() => {
    nock.cleanAll();
    sinon.restore();
  });

  describe('InseeClient', () => {
    it('devrait créer un client avec la configuration correcte', () => {
      expect(client.baseUrl).to.equal('https://api.insee.fr/entreprises/sirene/V3');
      expect(client.token).to.equal('test-token');
    });

    it('devrait faire une requête SIRET avec les bons paramètres', async () => {
      const mockResponse = {
        header: { total: 1 },
        etablissements: [
          {
            siret: '12345678901234',
            uniteLegale: {
              siren: '123456789',
              denominationUniteLegale: 'Test Company'
            }
          }
        ]
      };

      nock('https://api.insee.fr')
        .get('/entreprises/sirene/V3/siret')
        .query({ q: 'siret:12345678901234' })
        .reply(200, mockResponse);

      const result = await client.getSiret('12345678901234');
      expect(result).to.deep.equal(mockResponse);
    });

    it('devrait gérer les erreurs de rate limiting', async () => {
      nock('https://api.insee.fr')
        .get('/entreprises/sirene/V3/siret')
        .query({ q: 'siret:12345678901234' })
        .reply(429, 'Rate limit exceeded', {
          'retry-after': '60'
        });

      try {
        await client.getSiret('12345678901234');
        expect.fail('Devrait avoir levé une erreur');
      } catch (error) {
        expect(error.response.status).to.equal(429);
      }
    });
  });

  describe('InseeConnector', () => {
    it('devrait récolter des données SIRENE avec succès', async () => {
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

      nock('https://api.insee.fr')
        .get('/entreprises/sirene/V3/siret')
        .query({ q: 'siret:12345678901234' })
        .reply(200, mockSireneData);

      const result = await connector.harvest({ siret: '12345678901234' });

      expect(result.success).to.be.true;
      expect(result.source).to.equal('INSEE Sirene');
      expect(result.dataCount).to.equal(1);
      expect(mockPersistenceManager.save.calledOnce).to.be.true;
    });

    it('devrait transformer les données selon les règles configurées', async () => {
      const mockData = {
        dateCreationUniteLegale: '2023-01-15T00:00:00Z'
      };

      const transformer = new DataTransformer([
        {
          field: 'dateCreationUniteLegale',
          type: 'date',
          format: 'YYYY-MM-DD'
        }
      ]);

      const transformed = transformer.transform(mockData);
      expect(transformed.dateCreationUniteLegale).to.equal('2023-01-15');
    });

    it('devrait gérer les erreurs de récolte', async () => {
      nock('https://api.insee.fr')
        .get('/entreprises/sirene/V3/siret')
        .query({ q: 'siret:invalid' })
        .reply(400, 'Bad Request');

      try {
        await connector.harvest({ siret: 'invalid' });
        expect.fail('Devrait avoir levé une erreur');
      } catch (error) {
        expect(error.response.status).to.equal(400);
      }
    });

    it('devrait récupérer des données depuis la persistance', async () => {
      const mockData = [{ id: 1, name: 'Test' }];
      mockPersistenceManager.find.resolves(mockData);

      const result = await connector.getData({ name: 'Test' });
      expect(result).to.deep.equal(mockData);
      expect(mockPersistenceManager.find.calledWith(mockSourceConfig, { name: 'Test' })).to.be.true;
    });
  });

  describe('DataTransformer', () => {
    it('devrait transformer les dates correctement', () => {
      const transformer = new DataTransformer([
        {
          field: 'date',
          type: 'date',
          format: 'YYYY-MM-DD'
        }
      ]);

      const data = { date: '2023-01-15T10:30:00Z' };
      const result = transformer.transform(data);
      expect(result.date).to.equal('2023-01-15');
    });

    it('devrait transformer les enums correctement', () => {
      const transformer = new DataTransformer([
        {
          field: 'effectifs',
          type: 'enum',
          mapping: {
            '01': '1 ou 2 salariés',
            '02': '3 à 5 salariés'
          }
        }
      ]);

      const data = { effectifs: '01' };
      const result = transformer.transform(data);
      expect(result.effectifs).to.equal('1 ou 2 salariés');
    });

    it('devrait transformer les nombres correctement', () => {
      const transformer = new DataTransformer([
        {
          field: 'value',
          type: 'number'
        }
      ]);

      const data = { value: '123.45' };
      const result = transformer.transform(data);
      expect(result.value).to.equal(123.45);
    });

    it('devrait gérer les transformations d\'arrays', () => {
      const transformer = new DataTransformer([
        {
          field: 'tags',
          type: 'array'
        }
      ]);

      const data = { tags: 'tag1,tag2,tag3' };
      const result = transformer.transform(data);
      expect(result.tags).to.deep.equal(['tag1', 'tag2', 'tag3']);
    });
  });

  describe('Intégration', () => {
    it('devrait récolter et transformer des données SIRENE complètes', async () => {
      const mockSireneData = {
        header: { total: 1 },
        etablissements: [
          {
            siret: '12345678901234',
            uniteLegale: {
              siren: '123456789',
              denominationUniteLegale: 'Test Company',
              dateCreationUniteLegale: '2023-01-15T00:00:00Z',
              trancheEffectifsUniteLegale: '01'
            }
          }
        ]
      };

      nock('https://api.insee.fr')
        .get('/entreprises/sirene/V3/siret')
        .query({ q: 'siret:12345678901234' })
        .reply(200, mockSireneData);

      const result = await connector.harvest({ siret: '12345678901234' });

      expect(result.success).to.be.true;
      expect(mockPersistenceManager.save.calledOnce).to.be.true;
      
      // Vérifier que les données transformées ont été sauvegardées
      const savedData = mockPersistenceManager.save.firstCall.args[1];
      expect(savedData.etablissements[0].uniteLegale.dateCreationUniteLegale).to.equal('2023-01-15');
    });
  });
});

