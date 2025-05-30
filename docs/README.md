# Documentation Contract-Tacit

Ce dossier contient la documentation technique du projet **Contract-Tacit**, une application Laravel + React spécialisée dans la gestion et l'alerte de reconduction tacite des contrats.

## Documents Disponibles

### 📋 Aperçu du Projet

- **[`project-overview.md`](./project-overview.md)** - Vue d'ensemble complète de Contract-Tacit
  - Objectifs et fonctionnalités principales
  - Architecture Laravel + React
  - Modèles de données détaillés
  - Structure des API et routes
  - Configuration et déploiement

### 🛠️ Guide Technique

- **[`technical-implementation.md`](./technical-implementation.md)** - Guide d'implémentation technique
  - Configuration des packages Laravel et React
  - Modèles Eloquent avec relations
  - Services OCR et OpenAI
  - Jobs et queues de traitement
  - Composants React TypeScript
  - Hooks et gestion d'état

## Vue d'Ensemble - Contract-Tacit

**Contract-Tacit** est une application web innovante qui révolutionne la gestion des contrats en automatisant la détection des clauses de reconduction tacite et en alertant proactivement les utilisateurs avant les échéances.

### 🎯 Problème Résolu

Les contrats avec reconduction tacite génèrent des millions d'euros de charges non désirées chaque année. Contract-Tacit résout ce problème en :

- **Scannant automatiquement** les contrats via OCR
- **Détectant intelligemment** les clauses de reconduction tacite avec l'IA
- **Alertant proactivement** les utilisateurs avant les dates butoirs
- **Séparant** les contrats professionnels et personnels

### 🏗️ Architecture Technique

```
┌─────────────────────────────────────────────────────────────┐
│                    Contract-Tacit                           │
├─────────────────────────────┬───────────────────────────────┤
│        Frontend React      │         Backend Laravel       │
│                             │                               │
│ ┌─────────────────────────┐ │ ┌─────────────────────────┐   │
│ │ • Dashboard Contrats    │ │ │ • API REST             │   │
│ │ • Upload & OCR View     │ │ │ • OCR Tesseract        │   │
│ │ │ • Analyse IA Results   │ │ │ • OpenAI GPT-4         │   │
│ │ • Alert Management      │ │ │ • Queue System         │   │
│ │ • Pro/Perso Filters     │ │ │ • Notification Engine  │   │
│ └─────────────────────────┘ │ └─────────────────────────┘   │
│             │               │               │               │
│             │    Laravel    │               │               │
│             │  Sanctum API  │               │               │
│             └───────────────┼───────────────┘               │
├─────────────────────────────┼───────────────────────────────┤
│                 Infrastructure Laravel                      │
│ ┌─────────────────────────┐ │ ┌─────────────────────────┐   │
│ │    PostgreSQL           │ │ │      Redis              │   │
│ │ • Users & Contracts     │ │ │ • Cache & Sessions      │   │
│ │ • Alerts & Clauses      │ │ │ • Queue Jobs            │   │
│ │ • OCR & AI Analysis     │ │ │ • Real-time Updates     │   │
│ └─────────────────────────┘ │ └─────────────────────────┘   │
└─────────────────────────────┴───────────────────────────────┘
```

## Fonctionnalités Principales

### 1. 📄 Upload et OCR Intelligent
- **Drag & drop** de contrats PDF/images
- **OCR Tesseract** avec preprocessing avancé
- **Traitement asynchrone** avec suivi en temps réel
- **Support multi-pages** optimisé

### 2. 🤖 Analyse IA Avancée
- **Détection automatique** des clauses de reconduction tacite
- **Extraction des dates** importantes (début, fin, préavis)
- **Classification** du type de contrat (assurance, télécom, énergie...)
- **Score de confiance** pour chaque analyse

### 3. 🚨 Système d'Alertes Proactives
- **Notifications multi-canaux** : Email, SMS, Push web
- **Calendrier intelligent** :
  - 3 mois avant : "Renouvellement approche"
  - 1 mois avant : "Préavis de résiliation à donner"  
  - 1 semaine avant : "Dernière chance"
  - Jour J : "Contrat renouvelé automatiquement"

### 4. 📊 Dashboard Pro/Perso
- **Séparation claire** contrats professionnels et personnels
- **Vue d'ensemble** des échéances importantes
- **Statistiques** et tendances de dépenses
- **Filtres avancés** par catégorie, statut, montant

## Stack Technologique

### Backend Laravel
- **Framework** : Laravel 10+ (PHP 8.2+)
- **Base de données** : PostgreSQL avec migrations Eloquent
- **Cache & Queues** : Redis avec Laravel Horizon
- **OCR** : Tesseract.js + spatie/pdf-to-image
- **IA** : OpenAI GPT-4 via openai-php/laravel
- **Auth** : Laravel Sanctum (SPA)
- **Storage** : Laravel Storage (S3 compatible)

### Frontend React
- **Framework** : React 18+ avec TypeScript
- **State Management** : TanStack Query + React Context
- **UI Components** : Headless UI + Tailwind CSS
- **Forms** : React Hook Form + Zod validation
- **Routing** : React Router v6
- **HTTP Client** : Axios avec intercepteurs Sanctum

## Flux de Données Typique

1. **📤 Upload** : Utilisateur glisse un contrat PDF dans l'interface React
2. **💾 Stockage** : Laravel sauvegarde le fichier de manière sécurisée
3. **🔄 Queue OCR** : Job ajouté à la queue Redis pour traitement asynchrone
4. **👁️ Extraction** : Tesseract extrait le texte avec preprocessing d'image
5. **🧠 Analyse IA** : OpenAI GPT-4 analyse le texte et détecte les clauses importantes
6. **📅 Alertes** : Système programme automatiquement les notifications
7. **📱 Interface** : React affiche les résultats avec mise à jour temps réel

## Configuration Rapide

```bash
# Clone et installation
git clone [repository-url] contract-tacit
cd contract-tacit

# Backend Laravel
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan storage:link

# Frontend React
npm install
npm run build

# Workers
php artisan horizon
```

## Variables d'Environnement Clés

```env
# Application
APP_NAME="Contract-Tacit"
APP_URL=https://contract-tacit.com

# Base de données
DB_CONNECTION=pgsql
DB_DATABASE=contract_tacit

# OpenAI pour analyse IA
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# Tesseract OCR
TESSERACT_PATH=/usr/bin/tesseract
TESSERACT_LANGUAGES=fra,eng

# Notifications
MAIL_MAILER=smtp
TWILIO_SID=ACxxxxx
TWILIO_TOKEN=xxxxx
```

## Roadmap et Extensions

### Phase 1 - MVP ✅
- Upload et OCR de base
- Analyse IA simple
- Alertes email
- Interface React basique

### Phase 2 - Amélioration 🚧
- Notifications SMS/Push
- Dashboard analytics avancé
- API mobile
- Intégration calendrier

### Phase 3 - Évolution 📋
- OCR multi-langues
- IA prédictive pour négociation
- Intégration bancaire
- Plateforme collaborative entreprise

## Support et Contribution

Cette documentation technique est maintenue pour faciliter le développement et la maintenance de Contract-Tacit. Pour toute question technique ou suggestion d'amélioration, consulter l'équipe de développement.

---

*Contract-Tacit - Ne laissez plus aucun contrat vous surprendre* 