#!/bin/bash

# Wrapper pour exécuter artisan avec correction automatique des permissions

CONTAINER_NAME="preavis-laravel-app"
USER_ID=$(id -u)
GROUP_ID=$(id -g)

echo "🚀 Exécution d'artisan: $@"

# Exécuter la commande artisan
docker exec -it $CONTAINER_NAME php artisan "$@"

# Corriger les permissions des fichiers créés
echo "🔧 Correction des permissions..."
docker exec -it $CONTAINER_NAME chown -R $USER_ID:$GROUP_ID /app/app/
docker exec -it $CONTAINER_NAME chown -R $USER_ID:$GROUP_ID /app/database/
docker exec -it $CONTAINER_NAME chown -R $USER_ID:$GROUP_ID /app/routes/

echo "✅ Terminé !" 