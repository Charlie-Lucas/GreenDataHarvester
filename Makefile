# GreenDataHarvester Makefile
# Usage: make <target>

# Variables
PROJECT_NAME = GreenDataHarvester
NODE_VERSION = 18
DOCKER_COMPOSE_FILE = .infrastructure/docker-compose.yml

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# Help target
.PHONY: help
help: ## Afficher cette aide
	@echo "$(BLUE)$(PROJECT_NAME) - Commandes disponibles$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# =============================================================================
# SETUP & INSTALLATION
# =============================================================================

.PHONY: setup
setup: ## Configuration initiale du projet
	@echo "$(YELLOW)Configuration initiale du projet...$(NC)"
	@node scripts/setup.js

.PHONY: install
install: ## Installer les dépendances
	@echo "$(YELLOW)Installation des dépendances...$(NC)"
	@npm install
	@cd client && npm install

.PHONY: install-prod
install-prod: ## Installer les dépendances de production uniquement
	@echo "$(YELLOW)Installation des dépendances de production...$(NC)"
	@npm ci --only=production

# =============================================================================
# DEVELOPMENT
# =============================================================================

.PHONY: dev
dev: ## Démarrer le serveur de développement
	@echo "$(YELLOW)Démarrage du serveur de développement...$(NC)"
	@npm run dev

.PHONY: dev-client
dev-client: ## Démarrer le client de développement
	@echo "$(YELLOW)Démarrage du client de développement...$(NC)"
	@cd client && npm run dev

.PHONY: dev-full
dev-full: ## Démarrer le serveur et le client en parallèle
	@echo "$(YELLOW)Démarrage complet du développement...$(NC)"
	@concurrently "npm run dev" "cd client && npm run dev"

# =============================================================================
# BUILD
# =============================================================================

.PHONY: build
build: ## Construire l'application
	@echo "$(YELLOW)Construction de l'application...$(NC)"
	@npm run build

.PHONY: build-client
build-client: ## Construire le client
	@echo "$(YELLOW)Construction du client...$(NC)"
	@cd client && npm run build

.PHONY: clean
clean: ## Nettoyer les fichiers de build
	@echo "$(YELLOW)Nettoyage des fichiers de build...$(NC)"
	@rm -rf dist/
	@rm -rf client/dist/
	@rm -rf logs/
	@rm -rf coverage/

# =============================================================================
# TESTING
# =============================================================================

.PHONY: test
test: ## Exécuter les tests
	@echo "$(YELLOW)Exécution des tests...$(NC)"
	@npm test

.PHONY: test-watch
test-watch: ## Exécuter les tests en mode watch
	@echo "$(YELLOW)Exécution des tests en mode watch...$(NC)"
	@npm run test:watch

.PHONY: test-coverage
test-coverage: ## Exécuter les tests avec couverture
	@echo "$(YELLOW)Exécution des tests avec couverture...$(NC)"
	@npm run test:coverage

.PHONY: test-mock
test-mock: ## Exécuter les tests avec mocks
	@echo "$(YELLOW)Exécution des tests avec mocks...$(NC)"
	@NODE_ENV=test npm test

# =============================================================================
# LINTING & FORMATTING
# =============================================================================

.PHONY: lint
lint: ## Vérifier le code avec ESLint
	@echo "$(YELLOW)Vérification du code avec ESLint...$(NC)"
	@npm run lint

.PHONY: lint-fix
lint-fix: ## Corriger automatiquement les erreurs ESLint
	@echo "$(YELLOW)Correction automatique des erreurs ESLint...$(NC)"
	@npm run lint:fix

# =============================================================================
# DOCKER
# =============================================================================

.PHONY: docker-build
docker-build: ## Construire les images Docker
	@echo "$(YELLOW)Construction des images Docker...$(NC)"
	@docker-compose -f $(DOCKER_COMPOSE_FILE) build

.PHONY: docker-up
docker-up: ## Démarrer les services Docker
	@echo "$(YELLOW)Démarrage des services Docker...$(NC)"
	@docker-compose -f $(DOCKER_COMPOSE_FILE) up -d

.PHONY: docker-down
docker-down: ## Arrêter les services Docker
	@echo "$(YELLOW)Arrêt des services Docker...$(NC)"
	@docker-compose -f $(DOCKER_COMPOSE_FILE) down

.PHONY: docker-restart
docker-restart: ## Redémarrer les services Docker
	@echo "$(YELLOW)Redémarrage des services Docker...$(NC)"
	@docker-compose -f $(DOCKER_COMPOSE_FILE) restart

.PHONY: docker-logs
docker-logs: ## Afficher les logs Docker
	@echo "$(YELLOW)Affichage des logs Docker...$(NC)"
	@docker-compose -f $(DOCKER_COMPOSE_FILE) logs -f

.PHONY: docker-clean
docker-clean: ## Nettoyer les conteneurs et images Docker
	@echo "$(YELLOW)Nettoyage Docker...$(NC)"
	@docker-compose -f $(DOCKER_COMPOSE_FILE) down -v --rmi all

# =============================================================================
# DATA COMMANDS
# =============================================================================

.PHONY: data-fetch
data-fetch: ## Récupérer les données de toutes les sources
	@echo "$(YELLOW)Récupération des données...$(NC)"
	@node -e "import('./commands/index.js').then(m => new m.CommandManager().execute('data:fetch'))"

.PHONY: data-fetch-source
data-fetch-source: ## Récupérer les données d'une source spécifique (usage: make data-fetch-source SOURCE=insee-sirene)
	@echo "$(YELLOW)Récupération des données de la source $(SOURCE)...$(NC)"
	@node -e "import('./commands/index.js').then(m => new m.CommandManager().execute('data:fetch', {sourceId: '$(SOURCE)'}))"

.PHONY: data-query
data-query: ## Interroger les données (usage: make data-query SOURCE=insee-sirene LIMIT=100)
	@echo "$(YELLOW)Interrogation des données de $(SOURCE)...$(NC)"
	@node -e "import('./commands/index.js').then(m => new m.CommandManager().execute('data:query', {sourceId: '$(SOURCE)', limit: $(LIMIT)}))"

# =============================================================================
# SOURCE COMMANDS
# =============================================================================

.PHONY: source-health
source-health: ## Vérifier l'état de toutes les sources
	@echo "$(YELLOW)Vérification de l'état des sources...$(NC)"
	@node -e "import('./commands/index.js').then(m => new m.CommandManager().execute('source:health'))"

.PHONY: source-health-detail
source-health-detail: ## Vérifier l'état détaillé d'une source (usage: make source-health-detail SOURCE=insee-sirene)
	@echo "$(YELLOW)Vérification détaillée de l'état de $(SOURCE)...$(NC)"
	@node -e "import('./commands/index.js').then(m => new m.CommandManager().execute('source:health', {sourceId: '$(SOURCE)', detailed: true}))"

.PHONY: source-list
source-list: ## Lister toutes les sources configurées
	@echo "$(YELLOW)Liste des sources configurées...$(NC)"
	@node -e "import('./commands/index.js').then(m => new m.CommandManager().execute('source:configure', {action: 'list'}))"

.PHONY: source-validate
source-validate: ## Valider la configuration d'une source (usage: make source-validate SOURCE=insee-sirene)
	@echo "$(YELLOW)Validation de la configuration de $(SOURCE)...$(NC)"
	@node -e "import('./commands/index.js').then(m => new m.CommandManager().execute('source:configure', {action: 'validate', sourceId: '$(SOURCE)'}))"

# =============================================================================
# USER COMMANDS
# =============================================================================

.PHONY: user-create
user-create: ## Créer un utilisateur (usage: make user-create USERNAME=john EMAIL=john@example.com PASSWORD=secret123)
	@echo "$(YELLOW)Création de l'utilisateur $(USERNAME)...$(NC)"
	@node -e "import('./commands/index.js').then(m => new m.CommandManager().execute('user:create', {username: '$(USERNAME)', email: '$(EMAIL)', password: '$(PASSWORD)'}))"

# =============================================================================
# MONITORING
# =============================================================================

.PHONY: health
health: ## Vérifier l'état de santé de l'application
	@echo "$(YELLOW)Vérification de l'état de santé...$(NC)"
	@curl -f http://localhost:3000/health || echo "$(RED)Application non accessible$(NC)"

.PHONY: logs
logs: ## Afficher les logs de l'application
	@echo "$(YELLOW)Affichage des logs...$(NC)"
	@tail -f logs/app.log

.PHONY: logs-error
logs-error: ## Afficher les logs d'erreur
	@echo "$(YELLOW)Affichage des logs d'erreur...$(NC)"
	@tail -f logs/error.log

# =============================================================================
# DEPLOYMENT
# =============================================================================

.PHONY: deploy
deploy: ## Déployer l'application (build + docker)
	@echo "$(YELLOW)Déploiement de l'application...$(NC)"
	@make build
	@make docker-build
	@make docker-up

.PHONY: deploy-prod
deploy-prod: ## Déployer en production
	@echo "$(YELLOW)Déploiement en production...$(NC)"
	@NODE_ENV=production make deploy

# =============================================================================
# UTILITIES
# =============================================================================

.PHONY: check-node
check-node: ## Vérifier la version de Node.js
	@echo "$(YELLOW)Vérification de la version Node.js...$(NC)"
	@node --version
	@npm --version

.PHONY: check-docker
check-docker: ## Vérifier Docker et Docker Compose
	@echo "$(YELLOW)Vérification de Docker...$(NC)"
	@docker --version
	@docker-compose --version

.PHONY: backup
backup: ## Sauvegarder les données
	@echo "$(YELLOW)Sauvegarde des données...$(NC)"
	@mkdir -p backups
	@docker exec greendataharvester-mongo mongodump --out /data/backup
	@docker cp greendataharvester-mongo:/data/backup backups/$(shell date +%Y%m%d_%H%M%S)

.PHONY: restore
restore: ## Restaurer les données (usage: make restore BACKUP=20240101_120000)
	@echo "$(YELLOW)Restauration des données depuis $(BACKUP)...$(NC)"
	@docker cp backups/$(BACKUP) greendataharvester-mongo:/data/restore
	@docker exec greendataharvester-mongo mongorestore /data/restore

# =============================================================================
# DEVELOPMENT TOOLS
# =============================================================================

.PHONY: shell
shell: ## Ouvrir un shell dans le conteneur de l'application
	@echo "$(YELLOW)Ouverture d'un shell dans le conteneur...$(NC)"
	@docker exec -it greendataharvester-app sh

.PHONY: mongo-shell
mongo-shell: ## Ouvrir un shell MongoDB
	@echo "$(YELLOW)Ouverture d'un shell MongoDB...$(NC)"
	@docker exec -it greendataharvester-mongo mongosh

.PHONY: redis-cli
redis-cli: ## Ouvrir un client Redis
	@echo "$(YELLOW)Ouverture d'un client Redis...$(NC)"
	@docker exec -it greendataharvester-redis redis-cli

# =============================================================================
# CLEANUP
# =============================================================================

.PHONY: clean-all
clean-all: ## Nettoyer complètement le projet
	@echo "$(YELLOW)Nettoyage complet du projet...$(NC)"
	@make clean
	@make docker-clean
	@rm -rf node_modules/
	@rm -rf client/node_modules/
	@rm -rf backups/
	@rm -rf .nyc_output/

.PHONY: reset
reset: ## Réinitialiser complètement le projet
	@echo "$(RED)ATTENTION: Cette action va supprimer toutes les données!$(NC)"
	@read -p "Êtes-vous sûr? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@make clean-all
	@make setup
	@make install

