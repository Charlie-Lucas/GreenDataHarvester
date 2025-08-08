import { sourceManager } from '../src/sources/index.js';
import logger from '../src/utils/logger.js';

const resolvers = {
  Query: {
    ping: () => 'pong',
    
    // Sources de données
    sources: async () => {
      try {
        return sourceManager.getSources();
      } catch (error) {
        logger.error('Erreur lors de la récupération des sources', error);
        throw error;
      }
    },
    
    source: async (_, { id }) => {
      try {
        return sourceManager.getSourceConfig(id);
      } catch (error) {
        logger.error(`Erreur lors de la récupération de la source ${id}`, error);
        throw error;
      }
    },
    
    // Données SIRENE
    sireneData: async (_, { query = {} }) => {
      try {
        const data = await sourceManager.getData('insee-sirene', query);
        
        return {
          header: {
            total: data.length,
            debut: 0,
            nombre: data.length
          },
          etablissements: data,
          total: data.length
        };
      } catch (error) {
        logger.error('Erreur lors de la récupération des données SIRENE', error);
        throw error;
      }
    },
    
    sireneById: async (_, { siret }) => {
      try {
        const data = await sourceManager.getData('insee-sirene', { siret });
        return data.length > 0 ? data[0] : null;
      } catch (error) {
        logger.error(`Erreur lors de la récupération du SIRET ${siret}`, error);
        throw error;
      }
    },
    
    // Données BDM
    bdmData: async (_, { seriesId, startDate, endDate }) => {
      try {
        const data = await sourceManager.getData('insee-bdm', { 
          seriesId,
          ...(startDate && { startDate }),
          ...(endDate && { endDate })
        });
        
        if (data.length === 0) {
          return {
            seriesId,
            metadata: null,
            data: []
          };
        }
        
        return {
          seriesId,
          metadata: data[0].metadata || {},
          data: data[0].data || []
        };
      } catch (error) {
        logger.error(`Erreur lors de la récupération des données BDM pour ${seriesId}`, error);
        throw error;
      }
    },
    
    bdmSeries: async () => {
      try {
        const data = await sourceManager.getData('insee-bdm', {});
        const series = new Map();
        
        data.forEach(item => {
          if (item.metadata && !series.has(item.seriesId)) {
            series.set(item.seriesId, {
              id: item.seriesId,
              title: item.metadata.title || item.seriesId,
              description: item.metadata.description,
              unit: item.metadata.unit,
              frequency: item.metadata.frequency,
              lastUpdate: item.metadata.lastUpdate
            });
          }
        });
        
        return Array.from(series.values());
      } catch (error) {
        logger.error('Erreur lors de la récupération des séries BDM', error);
        throw error;
      }
    },
    
    // Données locales
    donneesLocales: async (_, { geoCode, indicatorId, year }) => {
      try {
        const data = await sourceManager.getData('insee-donnees-locales', {
          geoCode,
          indicatorId,
          ...(year && { year })
        });
        
        return {
          geoCode,
          indicatorId,
          year: year || new Date().getFullYear(),
          data: data.length > 0 ? data[0].data || [] : []
        };
      } catch (error) {
        logger.error(`Erreur lors de la récupération des données locales pour ${geoCode}/${indicatorId}`, error);
        throw error;
      }
    },
    
    // Statistiques
    stats: async () => {
      try {
        const sources = sourceManager.getSources();
        const sourcesStatus = [];
        let totalRecords = 0;
        
        for (const source of sources) {
          try {
            const data = await sourceManager.getData(source.id, {});
            const recordCount = Array.isArray(data) ? data.length : 0;
            totalRecords += recordCount;
            
            sourcesStatus.push({
              sourceId: source.id,
              sourceName: source.name,
              lastHarvest: null, // À implémenter avec un système de tracking
              recordCount,
              status: 'active'
            });
          } catch (error) {
            sourcesStatus.push({
              sourceId: source.id,
              sourceName: source.name,
              lastHarvest: null,
              recordCount: 0,
              status: 'error'
            });
          }
        }
        
        return {
          totalSources: sources.length,
          totalRecords,
          lastHarvest: null, // À implémenter
          sourcesStatus
        };
      } catch (error) {
        logger.error('Erreur lors de la récupération des statistiques', error);
        throw error;
      }
    }
  },
  
  Mutation: {
    // Récolte de données
    harvestSource: async (_, { sourceId, params = {} }) => {
      try {
        const result = await sourceManager.harvestSourceById(sourceId, params);
        return result;
      } catch (error) {
        logger.error(`Erreur lors de la récolte de la source ${sourceId}`, error);
        return {
          source: sourceId,
          timestamp: new Date().toISOString(),
          dataCount: 0,
          success: false,
          error: error.message
        };
      }
    },
    
    harvestAll: async () => {
      try {
        return await sourceManager.harvestAll();
      } catch (error) {
        logger.error('Erreur lors de la récolte de toutes les sources', error);
        throw error;
      }
    },
    
    // Gestion des données
    updateData: async (_, { sourceId, query, update }) => {
      try {
        const result = await sourceManager.updateData(sourceId, query, update);
        return {
          modifiedCount: result.modifiedCount || 0,
          success: true,
          error: null
        };
      } catch (error) {
        logger.error(`Erreur lors de la mise à jour des données pour ${sourceId}`, error);
        return {
          modifiedCount: 0,
          success: false,
          error: error.message
        };
      }
    },
    
    deleteData: async (_, { sourceId, query }) => {
      try {
        const result = await sourceManager.deleteData(sourceId, query);
        return {
          deletedCount: result.deletedCount || 0,
          success: true,
          error: null
        };
      } catch (error) {
        logger.error(`Erreur lors de la suppression des données pour ${sourceId}`, error);
        return {
          deletedCount: 0,
          success: false,
          error: error.message
        };
      }
    }
  },
  
  // Resolvers pour les types complexes
  Etablissement: {
    siret: (parent) => parent.siret,
    siren: (parent) => parent.siren,
    uniteLegale: (parent) => parent.uniteLegale || parent.etablissement?.uniteLegale,
    adresseEtablissement: (parent) => parent.adresseEtablissement || parent.etablissement?.adresseEtablissement,
    periodesEtablissement: (parent) => parent.periodesEtablissement || parent.etablissement?.periodesEtablissement || []
  },
  
  UniteLegale: {
    siren: (parent) => parent.siren,
    denominationUniteLegale: (parent) => parent.denominationUniteLegale,
    dateCreationUniteLegale: (parent) => parent.dateCreationUniteLegale,
    trancheEffectifsUniteLegale: (parent) => parent.trancheEffectifsUniteLegale,
    effectifsUniteLegale: (parent) => parent.effectifsUniteLegale ? parseInt(parent.effectifsUniteLegale) : null
  },
  
  // Resolver pour le type JSON
  JSON: {
    __serialize(value) {
      return value;
    },
    __parseValue(value) {
      return value;
    },
    __parseLiteral(ast) {
      switch (ast.kind) {
        case 'StringValue':
          return ast.value;
        case 'IntValue':
          return parseInt(ast.value);
        case 'FloatValue':
          return parseFloat(ast.value);
        case 'BooleanValue':
          return ast.value;
        case 'ListValue':
          return ast.values.map(v => this.__parseLiteral(v));
        case 'ObjectValue':
          const obj = {};
          ast.fields.forEach(field => {
            obj[field.name.value] = this.__parseLiteral(field.value);
          });
          return obj;
        default:
          return null;
      }
    }
  }
};

export default resolvers;
