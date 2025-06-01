# Gestion des Produits Stripe - Préavis

Ce document explique comment utiliser la command `stripe:products` et la factory `StripeProductFactory` pour gérer les produits et prix Stripe.

## Configuration des Clés Stripe

Ajoutez ces variables à votre fichier `.env` :

```bash
# Stripe Configuration
STRIPE_KEY=pk_test_...                      # Clé publique Stripe (test)
STRIPE_SECRET=sk_test_...                   # Clé secrète Stripe (test)
CASHIER_CURRENCY=eur

# Stripe Product Price IDs (générés par la command)
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...
```

## Command Stripe Products

### Actions disponibles

#### 1. Lister les produits existants
```bash
php artisan stripe:products list
```
Affiche tous les produits Stripe avec leurs prix.

#### 2. Créer un produit personnalisé
```bash
php artisan stripe:products create --product="Mon Produit" --price=990 --description="Description du produit"
```

Ou en mode interactif :
```bash
php artisan stripe:products create
```

#### 3. Configuration automatique des produits Préavis
```bash
php artisan stripe:products setup
```
Crée automatiquement les 3 plans :
- **Starter** : 9.90€/mois ou 99€/an
- **Pro** : 19.90€/mois ou 199€/an  
- **Enterprise** : 49.90€/mois ou 499€/an

#### 4. Synchronisation et génération de configuration
```bash
php artisan stripe:products sync
```
Génère la configuration PHP pour le `BillingController` et les variables d'environnement.

### Options disponibles

- `--product=` : Nom du produit
- `--price=` : Prix en centimes (ex: 990 pour 9.90€)
- `--currency=` : Devise (défaut: eur)
- `--interval=` : Intervalle de facturation (month, year)
- `--description=` : Description du produit

## Factory StripeProductFactory

### Usage de base

```php
use Database\Factories\StripeProductFactory;

// Générer des données de produit aléatoires
$productData = StripeProductFactory::new()->make();

// Générer un plan spécifique
$starterPlan = StripeProductFactory::new()->starter()->make();
$proPlan = StripeProductFactory::new()->pro()->make();
$enterprisePlan = StripeProductFactory::new()->enterprise()->make();

// Avec période d'essai
$trialPlan = StripeProductFactory::new()->starter()->withTrial(14)->make();

// Plan inactif
$inactivePlan = StripeProductFactory::new()->inactive()->make();
```

### Configuration de test

```php
// Obtenir la configuration pour les tests
$testConfig = StripeProductFactory::generateTestConfig();

// Générer le code PHP pour BillingController
echo StripeProductFactory::getBillingConfiguration();
```

## Workflow de Développement

### 1. Configuration initiale

```bash
# 1. Installer Cashier (déjà fait)
composer require laravel/cashier

# 2. Publier les migrations (déjà fait)  
php artisan vendor:publish --tag="cashier-migrations"

# 3. Migrer la base de données
php artisan migrate

# 4. Configurer les produits Stripe
php artisan stripe:products setup
```

### 2. Synchronisation

```bash
# Récupérer la configuration après création des produits
php artisan stripe:products sync

# Copier les Price IDs dans le .env
# Mettre à jour BillingController si nécessaire
```

### 3. Test de l'intégration

```bash
# Lister pour vérifier
php artisan stripe:products list

# Tester dans l'interface Préavis
# Aller sur /billing et tester l'abonnement
```

## Structure des Produits

### Plan Starter (9.90€/mois)
- Jusqu'à 10 contrats
- Alertes email
- OCR basique  
- Support email

### Plan Pro (19.90€/mois)
- Contrats illimités
- Alertes email + Discord
- OCR avancé + IA
- Rapports personnalisés
- Support prioritaire
- Accès API

### Plan Enterprise (49.90€/mois)
- Multi-organisations
- Toutes les fonctionnalités Pro
- Tableaux de bord personnalisés
- Intégrations API
- Support téléphonique
- Manager de compte dédié

## Intégration avec BillingController

Le controller utilise maintenant les variables d'environnement :

```php
$priceIds = [
    'starter_monthly' => env('STRIPE_PRICE_STARTER_MONTHLY'),
    'starter_yearly' => env('STRIPE_PRICE_STARTER_YEARLY'),
    'pro_monthly' => env('STRIPE_PRICE_PRO_MONTHLY'),
    'pro_yearly' => env('STRIPE_PRICE_PRO_YEARLY'),
    'enterprise_monthly' => env('STRIPE_PRICE_ENTERPRISE_MONTHLY'),
    'enterprise_yearly' => env('STRIPE_PRICE_ENTERPRISE_YEARLY'),
];
```

## Exemples d'Usage

### Créer des produits pour un environnement de test

```bash
# Produit de test simple
php artisan stripe:products create \
  --product="Test Starter" \
  --price=100 \
  --description="Plan de test"

# Produit annuel avec réduction
php artisan stripe:products create \
  --product="Test Pro Annual" \
  --price=1200 \
  --interval=year \
  --description="Plan Pro annuel avec réduction"
```

### Récupérer la configuration existante

```bash
# Lister tous les produits
php artisan stripe:products list

# Synchroniser et obtenir la config
php artisan stripe:products sync
```

## Dépannage

### Erreur "No API key provided"
Vérifiez que `STRIPE_SECRET` est défini dans `.env` avec une clé valide.

### Erreur "Product already exists"
La command `setup` évite les doublons. Utilisez `list` pour voir les produits existants.

### Prix non trouvés
Vérifiez que les variables `STRIPE_PRICE_*` sont définies dans `.env` avec les bons IDs Stripe.

## Tests

### Utiliser les clés de test Stripe

```bash
# Clés de test (commencent par sk_test_ et pk_test_)
STRIPE_KEY=pk_test_...
STRIPE_SECRET=sk_test_...

# Mode test : pas de vrais paiements
# Les webhooks peuvent être testés avec ngrok ou Stripe CLI
```

### Factory en mode test

```php
// Générer des configurations de test
$testProducts = StripeProductFactory::new()->count(3)->make();

// Configuration pour tests unitaires
$testConfig = StripeProductFactory::generateTestConfig();
``` 