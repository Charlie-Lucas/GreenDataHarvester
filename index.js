import express from 'express';
import mongoose from 'mongoose';
import passport from 'passport';
import session from 'express-session';
import bodyParser from 'body-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import dotenv from 'dotenv';
import cron from 'node-cron';
import typeDefs from './graphql/schema.js';
import resolvers from './graphql/resolvers.js';
import { sourceManager } from './src/sources/index.js';
import logger from './src/utils/logger.js';

// Charger les variables d'environnement
dotenv.config();

const app = express();

// Configuration de la base de données
async function initializeDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/greendata', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info('MongoDB connecté avec succès');
  } catch (error) {
    logger.error('Erreur de connexion MongoDB', error);
    process.exit(1);
  }
}

// Configuration des sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 heures
    }
  })
);

// Middleware Passport
app.use(passport.initialize());
app.use(passport.session());

// Configuration Passport
import('./config/passport.js').then(module => {
  const configurePassport = module.default;
  configurePassport(passport);
});

// Middleware de parsing
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configuration GraphQL
async function initializeGraphQL() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: (error) => {
      logger.error('GraphQL Error', error);
      return {
        message: error.message,
        code: error.extensions?.code || 'INTERNAL_SERVER_ERROR'
      };
    }
  });

  await server.start();

  app.use('/graphql', 
    expressMiddleware(server, {
      context: async ({ req }) => ({
        user: req.user,
        isAuthenticated: req.isAuthenticated()
      })
    })
  );

  logger.info('GraphQL Server initialisé');
}

// Routes API REST
app.post("/login", passport.authenticate("local"), (req, res) => {
  res.json({ message: "Connexion réussie", user: req.user });
});

app.use('/api/users', (await import('./routes/api/users.js')).default);
app.use('/api/profiles', (await import('./routes/api/profiles.js')).default);

// Routes pour la gestion des sources
app.get('/api/sources', async (req, res) => {
  try {
    const sources = sourceManager.getSources();
    res.json(sources);
  } catch (error) {
    logger.error('Erreur lors de la récupération des sources', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sources/:sourceId/harvest', async (req, res) => {
  try {
    const { sourceId } = req.params;
    const params = req.body;
    
    const result = await sourceManager.harvestSourceById(sourceId, params);
    res.json(result);
  } catch (error) {
    logger.error('Erreur lors de la récolte', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/harvest/all', async (req, res) => {
  try {
    const results = await sourceManager.harvestAll();
    res.json(results);
  } catch (error) {
    logger.error('Erreur lors de la récolte globale', error);
    res.status(500).json({ error: error.message });
  }
});

// Configuration des tâches cron
function initializeCronJobs() {
  try {
    // Récolte automatique des données INSEE SIRENE
    cron.schedule('0 2 * * *', async () => {
      logger.info('Début de la récolte automatique SIRENE');
      try {
        await sourceManager.harvestSourceById('insee-sirene');
        logger.info('Récolte automatique SIRENE terminée');
      } catch (error) {
        logger.error('Erreur lors de la récolte automatique SIRENE', error);
      }
    }, {
      timezone: 'Europe/Paris'
    });

    // Récolte automatique des données INSEE BDM
    cron.schedule('0 3 * * *', async () => {
      logger.info('Début de la récolte automatique BDM');
      try {
        await sourceManager.harvestSourceById('insee-bdm');
        logger.info('Récolte automatique BDM terminée');
      } catch (error) {
        logger.error('Erreur lors de la récolte automatique BDM', error);
      }
    }, {
      timezone: 'Europe/Paris'
    });

    logger.info('Tâches cron configurées');
  } catch (error) {
    logger.error('Erreur lors de la configuration des tâches cron', error);
  }
}

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0'
  });
});

// Gestion des erreurs
app.use((error, req, res, next) => {
  logger.error('Erreur serveur', error);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur est survenue'
  });
});

// Initialisation de l'application
async function initializeApp() {
  try {
    // Initialiser la base de données
    await initializeDatabase();
    
    // Initialiser le gestionnaire de sources
    await sourceManager.initialize();
    
    // Initialiser GraphQL
    await initializeGraphQL();
    
    // Configurer les tâches cron
    initializeCronJobs();
    
    const PORT = process.env.PORT || 5000;
    
    app.listen(PORT, () => {
      logger.info(`Serveur démarré sur le port ${PORT}`);
      logger.info(`GraphQL disponible sur http://localhost:${PORT}/graphql`);
    });
  } catch (error) {
    logger.error('Erreur lors de l\'initialisation de l\'application', error);
    process.exit(1);
  }
}

// Gestion de l'arrêt propre
process.on('SIGINT', async () => {
  logger.info('Arrêt de l\'application...');
  try {
    await sourceManager.close();
    await mongoose.connection.close();
    logger.info('Application arrêtée proprement');
    process.exit(0);
  } catch (error) {
    logger.error('Erreur lors de l\'arrêt de l\'application', error);
    process.exit(1);
  }
});

// Démarrer l'application
initializeApp();