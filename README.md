# GreenDataHarvester v2.0.0

Une application moderne de collecte, d'agrégation et de fourniture de données via GraphQL ou une interface frontale, avec une architecture modulaire en arbre.

## 🚀 Fonctionnalités

- **Architecture modulaire en arbre** : Configuration organisée par source de données
- **Système de commandes structuré** : Gestion des opérations via Makefile et commandes en arbre
- **Vérification d'état des sources** : Monitoring automatique avec stockage minimal de données
- **Infrastructure Docker centralisée** : Configuration complète dans `.infrastructure`
- **Tests automatisés avec mocks** : Vérification d'état sans impact sur les services externes
- **Collecte de données INSEE** : SIRENE, BDM, Données Locales
- **API GraphQL moderne** : Requêtes et mutations pour toutes les données
- **Persistance configurable** : MongoDB et Redis avec stratégies flexibles
- **Transformation de données** : Règles configurables pour nettoyer et formater
- **Planification automatique** : Tâches cron pour la récolte régulière
- **Rate limiting intelligent** : Gestion des limites d'API INSEE
- **Logging avancé** : Winston avec rotation des fichiers
- **Monitoring complet** : Prometheus, Grafana, alertes automatiques

## 📋 Prérequis

- Node.js 18+
- Docker et Docker Compose
- Token API INSEE

## 🛠️ Installation

1. **Cloner le repository**
```bash
git clone <repository-url>
cd GreenDataHarvester
```

2. **Configuration initiale**
```bash
make setup
```

3. **Installer les dépendances**
```bash
make install
```

4. **Configurer l'environnement**
```bash
# Copier et éditer le fichier d'environnement
cp env.example .env
# Éditer .env avec vos paramètres
```

5. **Démarrer l'infrastructure**
```bash
make docker-up
```

6. **Lancer l'application**
```bash
make dev
```

## 🏗️ Architecture

### Structure de configuration en arbre

```
config/
├── global.json              # Configuration globale de l'application
├── insee/                   # Configuration spécifique à INSEE
│   ├── connection.json      # Paramètres de connexion
│   ├── persistence.json     # Stratégies de persistance
│   ├── schedule.json        # Planification des tâches
│   ├── transform.json       # Règles de transformation
│   └── health.json          # Configuration de vérification d'état
└── [autres-sources]/        # Autres sources de données
```

### Système de commandes en arbre

```
commands/
├── data/                    # Commandes de gestion des données
│   ├── fetch.js            # Récupération de données
│   └── query.js            # Interrogation de données
├── source/                  # Commandes de gestion des sources
│   ├── health.js           # Vérification d'état
│   └── configure.js        # Configuration des sources
└── user/                    # Commandes de gestion des utilisateurs
    └── create.js           # Création d'utilisateurs
```

### Infrastructure Docker centralisée

```
.infrastructure/
├── docker-compose.yml       # Orchestration des services
├── Dockerfile.app          # Image de l'application
├── Dockerfile.db           # Image de la base de données
├── Dockerfile.nginx        # Image du reverse proxy
├── nginx/
│   └── nginx.conf         # Configuration Nginx
└── monitoring/
    ├── prometheus.yml      # Configuration Prometheus
    └── grafana/            # Dashboards Grafana
```

## ⚙️ Configuration

### Variables d'environnement

```env
# Configuration de l'application
NODE_ENV=development
PORT=3000

# Base de données MongoDB
MONGO_URL=mongodb://localhost:27017/greendataharvester
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password

# Redis (pour le cache)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Session
SESSION_SECRET=your-super-secret-session-key

# INSEE API
INSEE_API_TOKEN=your-insee-api-token

# Monitoring
GRAFANA_PASSWORD=admin
```

### Configuration globale (`config/global.json`)

```json
{
  "app": {
    "name": "GreenDataHarvester",
    "version": "2.0.0",
    "environment": "development"
  },
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "database": {
    "mongo": {
      "url": "mongodb://localhost:27017/greendataharvester"
    },
    "redis": {
      "url": "redis://localhost:6379"
    }
  }
}
```

### Configuration des sources

Chaque source de données a sa propre configuration dans un dossier dédié :

#### Connexion (`config/insee/connection.json`)
```json
{
  "baseUrl": "https://api.insee.fr",
  "authentication": {
    "type": "bearer",
    "token": "${INSEE_API_TOKEN}"
  },
  "rateLimit": {
    "requestsPerMinute": 30,
    "requestsPerHour": 1000
  }
}
```

#### Persistance (`config/insee/persistence.json`)
```json
{
  "strategies": {
    "primary": "mongo",
    "secondary": "redis"
  },
  "collections": {
    "sirene": {
      "name": "insee_sirene",
      "indexes": [
        { "fields": { "siret": 1 }, "unique": true }
      ],
      "ttl": 86400
    }
  }
}
```

## 🎯 Utilisation

### Commandes Makefile

```bash
# Configuration et installation
make setup              # Configuration initiale
make install            # Installation des dépendances

# Développement
make dev                # Démarrer le serveur de développement
make dev-full           # Démarrer serveur + client
make test               # Exécuter les tests
make test-mock          # Tests avec mocks

# Docker
make docker-up          # Démarrer les services Docker
make docker-down        # Arrêter les services Docker
make docker-build       # Construire les images

# Données
make data-fetch         # Récupérer toutes les données
make data-fetch-source SOURCE=insee-sirene  # Source spécifique
make data-query SOURCE=insee-sirene LIMIT=100  # Interroger les données

# Sources
make source-health      # Vérifier l'état de toutes les sources
make source-health-detail SOURCE=insee-sirene  # État détaillé
make source-list        # Lister les sources configurées

# Monitoring
make health             # Vérifier l'état de l'application
make logs               # Afficher les logs
make logs-error         # Logs d'erreur uniquement

# Utilitaires
make shell              # Shell dans le conteneur
make mongo-shell        # Shell MongoDB
make redis-cli          # Client Redis
```

### Vérification d'état des sources

```bash
# Vérification automatique avec mocks
node scripts/health-check.js

# Vérification détaillée
node scripts/health-check.js --detailed

# Vérification de sources spécifiques
node scripts/health-check.js --sources insee-sirene,insee-bdm

# Vérification sans mocks (production)
node scripts/health-check.js --no-mocks
```

### API GraphQL

L'application expose une API GraphQL complète :

```graphql
# Récupérer les sources configurées
query {
  sources {
    id
    name
    type
    status
  }
}

# Récupérer des données SIRENE
query {
  sireneData(limit: 10) {
    siret
    siren
    uniteLegale {
      denominationUniteLegale
    }
  }
}

# Déclencher une récolte
mutation {
  harvestSource(sourceId: "insee-sirene") {
    success
    message
    timestamp
  }
}
```

## 🧪 Tests

### Tests unitaires
```bash
make test               # Tous les tests
make test-watch         # Tests en mode watch
make test-coverage      # Tests avec couverture
```

### Tests d'intégration
```bash
make test-mock          # Tests avec mocks
npm run test:integration # Tests d'intégration complets
```

### Vérification d'état automatisée
```bash
# Dans un pipeline CI/CD
node scripts/health-check.js --no-mocks --sources insee-sirene
```

## 🚀 Déploiement

### Développement
```bash
make dev-full           # Serveur + client en développement
```

### Production avec Docker
```bash
make deploy             # Build + Docker + Démarrage
make deploy-prod        # Déploiement en production
```

### Monitoring
```bash
# Accéder aux interfaces de monitoring
# Prometheus: http://localhost:9091
# Grafana: http://localhost:3001
```

## 📊 Monitoring

L'application inclut un système de monitoring complet :

- **Prometheus** : Collecte de métriques
- **Grafana** : Visualisation et alertes
- **Health checks** : Vérification automatique des sources
- **Logs structurés** : Winston avec rotation

### Métriques disponibles

- Temps de réponse des APIs
- Taux d'erreur par source
- Utilisation des ressources
- État des connexions de base de données

## 🔧 Développement

### Ajouter une nouvelle source

1. **Créer la configuration**
```bash
mkdir config/nouvelle-source
# Créer connection.json, persistence.json, etc.
```

2. **Créer le connecteur**
```javascript
// src/sources/nouvelle-source/index.js
export class NouvelleSourceConnector {
  constructor(config, persistenceManager) {
    // Implémentation
  }
}
```

3. **Enregistrer le connecteur**
```javascript
// src/sources/index.js
this.connectors.set('nouvelle-source', NouvelleSourceConnector);
```

### Ajouter une nouvelle commande

1. **Créer la commande**
```javascript
// commands/nouvelle-categorie/nouvelle-commande.js
export class NouvelleCommande {
  async execute(options = {}) {
    // Implémentation
  }
}
```

2. **Enregistrer dans le gestionnaire**
```javascript
// commands/index.js
this.commands['nouvelle-categorie:nouvelle-commande'] = new NouvelleCommande();
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Changelog

### v2.0.0
- Architecture modulaire en arbre
- Système de commandes structuré
- Vérification d'état des sources
- Infrastructure Docker centralisée
- Tests automatisés avec mocks
- Monitoring complet (Prometheus/Grafana)

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Consulter la documentation dans `/docs`
- Vérifier les logs avec `make logs`
