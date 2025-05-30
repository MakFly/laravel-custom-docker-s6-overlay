#!/bin/bash

# Script pour corriger les permissions des fichiers créés par artisan dans Docker

echo "🔧 Correction des permissions des fichiers Laravel..."

# Obtenir l'UID et GID de l'utilisateur courant
USER_ID=$(id -u)
GROUP_ID=$(id -g)

echo "👤 Utilisateur: $USER ($USER_ID:$GROUP_ID)"

# Corriger les permissions des fichiers créés par artisan
echo "📁 Correction des permissions du répertoire app/..."
sudo chown -R $USER_ID:$GROUP_ID app/

echo "📁 Correction des permissions du répertoire database/..."
sudo chown -R $USER_ID:$GROUP_ID database/

echo "📁 Correction des permissions du répertoire routes/..."
sudo chown -R $USER_ID:$GROUP_ID routes/

echo "📁 Correction des permissions du répertoire config/..."
sudo chown -R $USER_ID:$GROUP_ID config/

echo "📁 Correction des permissions du répertoire tests/..."
sudo chown -R $USER_ID:$GROUP_ID tests/

# Permissions spéciales pour les répertoires Laravel
echo "🔒 Application des permissions Laravel..."
chmod -R 755 app/
chmod -R 755 database/
chmod -R 755 routes/
chmod -R 755 config/
chmod -R 755 tests/

echo "✅ Permissions corrigées !"

# Afficher un résumé
echo "📊 Résumé des permissions:"
ls -la app/Http/Controllers/Api/ | head -5 