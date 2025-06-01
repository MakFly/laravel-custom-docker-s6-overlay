# Makefile pour Preavis Laravel
# ----------------------------------------------------------------------------

.PHONY: help install build start stop restart shell logs fix-permissions migrate seed test \
        watch artisan tinker setup db-reset clear-cache update-deps npm-install npm-dev \
        docker-rebuild status minio-setup adminer swagger phpdoc backup frankenphp octane \
        start-octane stop-octane build-octane

# Couleurs pour les messages
BOLD := $(shell tput -Txterm bold)
GREEN := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
RESET := $(shell tput -Txterm sgr0)

# Commande Docker Compose
DOCKER_COMPOSE := docker compose

# ----------------------------------------------------------------------------
# Documentation d'aide
# ----------------------------------------------------------------------------

help: ## Afficher l'aide
	@echo "$(BOLD)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo "$(BOLD)🚀 $(GREEN)Makefile pour Preavis Laravel$(RESET)"
	@echo "$(BOLD)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo ""
	@echo "$(YELLOW)Commandes principales:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BOLD)make %-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Exemple:$(RESET) $(BOLD)make start$(RESET) - Démarre tous les conteneurs Docker"
	@echo ""

# ----------------------------------------------------------------------------
# Configuration et installation
# ----------------------------------------------------------------------------

install: ## Installer le projet (première utilisation)
	@echo "$(GREEN)Installation du projet...$(RESET)"
	cp -n .env.example .env || true
	$(DOCKER_COMPOSE) build
	$(DOCKER_COMPOSE) up -d
	$(MAKE) fix-permissions
	$(DOCKER_COMPOSE) exec app php artisan key:generate
	$(DOCKER_COMPOSE) exec app php artisan migrate:fresh --seed
	$(DOCKER_COMPOSE) exec app php artisan storage:link
	$(DOCKER_COMPOSE) exec app npm install
	$(DOCKER_COMPOSE) exec app npm run build
	@echo "$(GREEN)Installation terminée! L'application est disponible sur http://localhost:8000$(RESET)"

setup: ## Configurer l'environnement de développement après l'installation
	@echo "$(GREEN)Configuration de l'environnement...$(RESET)"
	$(MAKE) minio-setup
	@echo "$(GREEN)Configuration terminée!$(RESET)"

update-deps: ## Mettre à jour les dépendances (composer et npm)
	@echo "$(GREEN)Mise à jour des dépendances...$(RESET)"
	$(DOCKER_COMPOSE) exec app composer update
	$(DOCKER_COMPOSE) exec app npm update
	$(DOCKER_COMPOSE) exec app npm run build
	@echo "$(GREEN)Dépendances mises à jour!$(RESET)"

npm-install: ## Installer les dépendances npm
	$(DOCKER_COMPOSE) exec app npm install

npm-dev: ## Compiler les assets en mode développement (avec surveillance)
	$(DOCKER_COMPOSE) exec app npm run dev

# ----------------------------------------------------------------------------
# Commandes Docker
# ----------------------------------------------------------------------------

build: ## Construire les images Docker
	@echo "$(GREEN)Construction des images Docker...$(RESET)"
	$(DOCKER_COMPOSE) build

dev: ## Démarrer tous les conteneurs Docker
	@echo "$(GREEN)Démarrage des conteneurs...$(RESET)"
	$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)✅ Services démarrés:$(RESET)"
	@echo "   🌐 Application: $(BOLD)http://localhost:8000$(RESET)"
	@echo "   🌐 Horizon: $(BOLD)http://localhost:8000/horizon$(RESET)"
	@echo "   🛢️ Adminer DB: $(BOLD)http://localhost:9080$(RESET)"
	@echo "   📦 Minio S3:   $(BOLD)http://localhost:9001$(RESET)"
	@echo "   📋 Logs:       $(BOLD)http://localhost:8888$(RESET)"

stop: ## Arrêter tous les conteneurs Docker
	@echo "$(GREEN)Arrêt des conteneurs...$(RESET)"
	$(DOCKER_COMPOSE) stop

restart: ## Redémarrer tous les conteneurs Docker
	@echo "$(GREEN)Redémarrage des conteneurs...$(RESET)"
	$(DOCKER_COMPOSE) restart

down: ## Arrêter et supprimer tous les conteneurs Docker
	@echo "$(GREEN)Suppression des conteneurs...$(RESET)"
	$(DOCKER_COMPOSE) down

docker-rebuild: ## Reconstruire et redémarrer les conteneurs Docker
	@echo "$(GREEN)Reconstruction complète des conteneurs...$(RESET)"
	$(DOCKER_COMPOSE) down
	$(DOCKER_COMPOSE) build --no-cache
	$(DOCKER_COMPOSE) up -d

status: ## Vérifier le statut des conteneurs Docker
	@echo "$(GREEN)Statut des conteneurs:$(RESET)"
	$(DOCKER_COMPOSE) ps

logs: ## Afficher les logs de tous les conteneurs
	$(DOCKER_COMPOSE) logs -f

app-logs: ## Afficher uniquement les logs de l'application
	$(DOCKER_COMPOSE) logs -f app

# ----------------------------------------------------------------------------
# Commandes Laravel
# ----------------------------------------------------------------------------

migrate: ## Exécuter les migrations de base de données
	@echo "$(GREEN)Exécution des migrations...$(RESET)"
	$(DOCKER_COMPOSE) exec app php artisan migrate

migrate-fresh: ## Rafraîchir la base de données et exécuter toutes les migrations
	@echo "$(GREEN)Réinitialisation et migration de la base de données...$(RESET)"
	$(DOCKER_COMPOSE) exec app php artisan migrate:fresh

seed: ## Remplir la base de données avec des données de test
	@echo "$(GREEN)Remplissage de la base de données...$(RESET)"
	$(DOCKER_COMPOSE) exec app php artisan db:seed

db-reset: ## Reconstruire la base de données et la remplir avec des données
	@echo "$(GREEN)Réinitialisation complète de la base de données...$(RESET)"
	$(DOCKER_COMPOSE) exec app php artisan migrate:fresh --seed

test: ## Exécuter les tests
	@echo "$(GREEN)Exécution des tests...$(RESET)"
	$(DOCKER_COMPOSE) exec app php artisan test

artisan: ## Exécuter une commande Artisan (utilisation: make artisan "commande")
	@echo "$(GREEN)Exécution de la commande Artisan...$(RESET)"
	$(DOCKER_COMPOSE) exec app php artisan $(filter-out $@,$(MAKECMDGOALS))

tinker: ## Démarrer Tinker (shell interactif Laravel)
	@echo "$(GREEN)Démarrage de Tinker...$(RESET)"
	$(DOCKER_COMPOSE) exec app php artisan tinker

workspace: ## Ouvrir le workspace dans le conteneur d'application
	@echo "$(GREEN)Ouverture du workspace...$(RESET)"
	$(DOCKER_COMPOSE) exec app bash

clear-cache: ## Vider tous les caches (config, routes, vues, etc.)
	@echo "$(GREEN)Vidage des caches...$(RESET)"
	$(DOCKER_COMPOSE) exec app php artisan optimize:clear
	@echo "$(GREEN)Cache vidé!$(RESET)"

# ----------------------------------------------------------------------------
# Commandes système
# ----------------------------------------------------------------------------

shell: ## Ouvrir un shell dans le conteneur d'application
	@echo "$(GREEN)Ouverture du shell...$(RESET)"
	$(DOCKER_COMPOSE) exec app bash

fix-permissions: ## Corriger les permissions des fichiers
	@echo "$(GREEN)Correction des permissions...$(RESET)"
	./fix-permissions.sh

# ----------------------------------------------------------------------------
# Commandes spécifiques aux services
# ----------------------------------------------------------------------------

minio-setup: ## Configurer le bucket Minio
	@echo "$(GREEN)Configuration du bucket Minio...$(RESET)"
	$(DOCKER_COMPOSE) up -d minio
	sleep 5
	$(DOCKER_COMPOSE) exec -T app sh -c '\
		mkdir -p /tmp/mc && \
		cd /tmp/mc && \
		curl -O https://dl.min.io/client/mc/release/linux-amd64/mc && \
		chmod +x mc && \
		./mc alias set myminio http://minio:9000 minioadmin minioadmin && \
		./mc mb --ignore-existing myminio/contracts && \
		./mc anonymous set public myminio/contracts && \
		rm -rf /tmp/mc \
	'
	@echo "$(GREEN)Bucket Minio configuré!$(RESET)"

adminer: ## Ouvrir Adminer dans le navigateur
	@echo "$(GREEN)Ouverture d'Adminer...$(RESET)"
	xdg-open http://localhost:9080 || open http://localhost:9080 || echo "Veuillez ouvrir http://localhost:9080 manuellement"

# ----------------------------------------------------------------------------
# Commandes de documentation
# ----------------------------------------------------------------------------

swagger: ## Générer la documentation API Swagger
	@echo "$(GREEN)Génération de la documentation API...$(RESET)"
	$(DOCKER_COMPOSE) exec app php artisan l5-swagger:generate
	@echo "$(GREEN)La documentation API est disponible sur http://localhost:8000/api/documentation$(RESET)"

phpdoc: ## Générer la documentation PHP
	@echo "$(GREEN)Génération de la documentation PHP...$(RESET)"
	$(DOCKER_COMPOSE) exec app php artisan ide-helper:generate
	$(DOCKER_COMPOSE) exec app php artisan ide-helper:models -N
	@echo "$(GREEN)Documentation PHP générée!$(RESET)"

# ----------------------------------------------------------------------------
# Commandes de maintenance
# ----------------------------------------------------------------------------

backup: ## Créer une sauvegarde de la base de données
	@echo "$(GREEN)Création d'une sauvegarde de la base de données...$(RESET)"
	mkdir -p ./backups
	$(DOCKER_COMPOSE) exec -T postgres pg_dump -U contract contract > ./backups/backup-$(shell date +%Y%m%d-%H%M%S).sql
	@echo "$(GREEN)Sauvegarde créée dans ./backups/$(RESET)"

# ----------------------------------------------------------------------------
# Commandes FrankenPHP
# ----------------------------------------------------------------------------

frankenphp: build start ## Démarrer avec FrankenPHP (configuration par défaut)
	@echo "$(GREEN)🚀 Application Laravel démarrée avec FrankenPHP!$(RESET)"
	@echo "$(YELLOW)Accès: http://localhost:8000$(RESET)"

build-octane: ## Construire l'image Docker avec Octane
	@echo "$(GREEN)🔨 Construction de l'image Docker avec Laravel Octane...$(RESET)"
	$(DOCKER_COMPOSE) -f compose.octane.yml build --no-cache

start-octane: ## Démarrer avec FrankenPHP + Laravel Octane (haute performance)
	@echo "$(GREEN)🚀 Démarrage avec FrankenPHP + Laravel Octane...$(RESET)"
	$(DOCKER_COMPOSE) -f compose.octane.yml up -d
	@echo "$(GREEN)🔥 Application en mode haute performance démarrée!$(RESET)"
	@echo "$(YELLOW)Accès: http://localhost:8000$(RESET)"
	@echo "$(YELLOW)HTTPS: https://localhost:8443$(RESET)"

stop-octane: ## Arrêter la configuration Octane
	@echo "$(GREEN)Arrêt de la configuration Octane...$(RESET)"
	$(DOCKER_COMPOSE) -f compose.octane.yml down

octane: build-octane start-octane ## Build et démarrage complet avec Octane
	@echo "$(GREEN)🎯 Configuration Octane prête!$(RESET)"

# Permettre de passer n'importe quel argument à artisan
%:
	@:

# Valeur par défaut lorsque aucune cible n'est spécifiée
.DEFAULT_GOAL := help
