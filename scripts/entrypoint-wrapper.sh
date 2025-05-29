#!/bin/bash

echo "=== Entrypoint Wrapper for Laravel FrankenPHP ==="
echo "Environment: $ENVIRONMENT"
echo "Use S6 Overlay: $USE_S6_OVERLAY"
echo "Enable Worker: $ENABLE_WORKER"
echo "Server Name: $SERVER_NAME"

# Attendre que la base de données soit prête (si PostgreSQL)
# if [ ! -z "$DB_HOST" ] && [ "$DB_CONNECTION" = "pgsql" ]; then
#     echo "Attente de la base de données PostgreSQL..."
#     while ! pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USERNAME" 2>/dev/null; do
#         echo "En attente de PostgreSQL..."
#         sleep 2
#     done
#     echo "PostgreSQL est prêt!"
# fi

# Exécuter les migrations si en mode développement
if [ "$ENVIRONMENT" = "dev" ] || [ "$APP_ENV" = "local" ]; then
    echo "Exécution des migrations Laravel..."
    php artisan migrate --force || echo "Erreur lors des migrations"
    
    echo "Création du lien symbolique pour le storage..."
    php artisan storage:link || echo "Lien symbolique déjà existant"
fi

# Nettoyer le cache si nécessaire
if [ "$ENVIRONMENT" = "prod" ]; then
    echo "Nettoyage du cache pour la production..."
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
else
    echo "Nettoyage du cache pour le développement..."
    php artisan config:clear
    php artisan route:clear
    php artisan view:clear
fi

# Définir les permissions finales
if [ "$ENVIRONMENT" = "dev" ] || [ "$APP_ENV" = "local" ]; then
    echo "Configuration des permissions pour le dev (user local)..."
    chown -R $(id -u):$(id -g) /app/storage /app/bootstrap/cache || true
else
    echo "Configuration des permissions pour www-data (prod/container)..."
    chown -R www-data:www-data /app/storage /app/bootstrap/cache || true
fi

# Lancer s6-overlay si activé, sinon lancer FrankenPHP directement
if [ "$USE_S6_OVERLAY" = "true" ]; then
    echo "Démarrage avec s6-overlay..."
    exec /init
else
    echo "Démarrage direct de FrankenPHP..."
    cd /app
    exec /usr/local/bin/frankenphp run --config /etc/caddy/Caddyfile
fi