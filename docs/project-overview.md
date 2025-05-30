# Contract-Tacit - Aperçu du Projet

## Vue d'Ensemble

**Contract-Tacit** est une application web de gestion de contrats développée avec Laravel et React, spécialisée dans la détection et l'alerte de reconduction tacite des contrats professionnels et personnels.

### Objectif Principal

Permettre aux utilisateurs de :
- **Scanner et analyser** leurs contrats via OCR
- **Détecter automatiquement** les clauses de reconduction tacite
- **Recevoir des alertes** avant l'échéance pour éviter les reconductions non désirées
- **Gérer** leurs contrats pro et perso dans une interface intuitive

## Architecture Technique

### Stack Technologique

- **Backend** : Laravel 10+ (PHP 8.2+)
- **Frontend** : React 18+ avec TypeScript
- **Base de données** : PostgreSQL
- **Cache & Queues** : Redis
- **OCR** : Tesseract.js via Laravel
- **IA** : OpenAI GPT-4 pour analyse contractuelle
- **Stockage** : Laravel Storage (S3 compatible)
- **Authentification** : Laravel Sanctum
- **API** : Laravel API Resources

### Architecture Applicative

```
┌─────────────────────────────────────────────────────────────┐
│                    Contract-Tacit                           │
├─────────────────────────────┬───────────────────────────────┤
│        Frontend React      │         Backend Laravel       │
│                             │                               │
│ ┌─────────────────────────┐ │ ┌─────────────────────────┐   │
│ │   Dashboard             │ │ │   API Routes            │   │
│ │   Contract Upload       │ │ │   OCR Processing        │   │
│ │   OCR Results View      │ │ │   OpenAI Analysis       │   │
│ │   Alert Management      │ │ │   Alert System          │   │
│ │   Pro/Perso Separation  │ │ │   User Management       │   │
│ └─────────────────────────┘ │ └─────────────────────────┘   │
│             │               │               │               │
│             │  Laravel API  │               │               │
│             └───────────────┼───────────────┘               │
├─────────────────────────────┼───────────────────────────────┤
│                    Infrastructure                           │
│                             │                               │
│ ┌─────────────────────────┐ │ ┌─────────────────────────┐   │
│ │      PostgreSQL         │ │ │        Redis            │   │
│ │   (Contracts & Users)   │ │ │   (Cache & Queues)      │   │
│ └─────────────────────────┘ │ └─────────────────────────┘   │
└─────────────────────────────┴───────────────────────────────┘
```

## Structure du Projet Laravel

### Modèles de Données

#### 1. User
```php
- id: integer
- name: string
- email: string (unique)
- email_verified_at: timestamp
- password: string
- phone?: string
- notification_preferences: json
- created_at, updated_at: timestamps
```

#### 2. Contract
```php
- id: integer
- user_id: integer (FK)
- title: string
- type: enum('pro', 'perso')
- category: string ('assurance', 'telecom', 'energie', 'autre')
- file_path: string
- file_original_name: string
- amount_cents: integer
- currency: string ('EUR')
- start_date: date
- end_date?: date
- notice_period_days: integer
- is_tacit_renewal: boolean
- next_renewal_date?: date
- status: enum('active', 'expired', 'cancelled')
- ocr_status: enum('pending', 'processing', 'completed', 'failed')
- ocr_raw_text?: text
- ai_analysis?: json
- created_at, updated_at: timestamps
```

#### 3. Alert
```php
- id: integer
- contract_id: integer (FK)
- type: enum('renewal_warning', 'notice_deadline', 'contract_expired')
- scheduled_for: datetime
- sent_at?: datetime
- status: enum('pending', 'sent', 'failed')
- notification_method: enum('email', 'sms', 'push')
- message: text
- created_at, updated_at: timestamps
```

#### 4. ContractClause
```php
- id: integer
- contract_id: integer (FK)
- type: enum('renewal', 'termination', 'price_change', 'other')
- content: text
- ai_confidence_score: float
- is_validated: boolean
- created_at, updated_at: timestamps
```

### API Routes Structure

```php
// Authentication
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/user

// Contracts
GET    /api/contracts              // Liste avec filtres pro/perso
POST   /api/contracts              // Upload et création
GET    /api/contracts/{id}         // Détail avec OCR et analyse
PUT    /api/contracts/{id}         // Mise à jour
DELETE /api/contracts/{id}         // Suppression
POST   /api/contracts/{id}/reprocess // Re-traitement OCR/IA

// OCR & Analysis
GET    /api/contracts/{id}/ocr     // Résultats OCR bruts
GET    /api/contracts/{id}/analysis // Analyse IA structurée
POST   /api/contracts/{id}/validate-clause // Validation manuelle clause

// Alerts
GET    /api/alerts                 // Alertes utilisateur
POST   /api/alerts/{id}/dismiss    // Marquer comme lue
PUT    /api/alerts/{id}/snooze     // Reporter l'alerte

// Dashboard
GET    /api/dashboard/stats        // Statistiques contrats
GET    /api/dashboard/upcoming     // Échéances prochaines
```

## Fonctionnalités Clés

### 1. Upload et OCR de Contrats

**Processus :**
1. Upload PDF/image via React
2. Stockage sécurisé Laravel
3. Queue Laravel pour OCR Tesseract
4. Extraction et nettoyage du texte
5. Affichage temps réel du statut

**Technologies :**
- Laravel Queues avec Redis
- spatie/pdf-to-image pour PDF
- thiagoalessio/tesseract-ocr-for-php
- Intervention Image pour preprocessing

### 2. Analyse IA avec OpenAI

**Objectifs de l'analyse :**
- Détecter les clauses de reconduction tacite
- Extraire dates importantes (début, fin, préavis)
- Identifier le type de contrat
- Calculer les montants et fréquences
- Repérer les conditions de résiliation

**Prompt OpenAI :**
```
Analyse ce contrat et extrait les informations suivantes au format JSON :
- type_contrat: string
- reconduction_tacite: boolean
- duree_engagement: string
- preavis_resiliation: string (en jours)
- date_fin_engagement: date
- montant: number
- frequence_paiement: string
- conditions_resiliation: array
```

### 3. Système d'Alertes Intelligentes

**Types d'alertes :**
- **3 mois avant** : "Contrat renouvelable bientôt"
- **1 mois avant** : "Préavis de résiliation à donner"
- **1 semaine avant** : "Dernière chance de résilier"
- **Jour J** : "Contrat renouvelé automatiquement"

**Canaux de notification :**
- Email (Laravel Mail)
- SMS (Twilio/Vonage)
- Push web (PWA)
- Dashboard in-app

### 4. Interface React

**Pages principales :**
```tsx
// Dashboard
/dashboard
  - Vue d'ensemble contracts
  - Alertes en cours
  - Statistiques pro/perso

// Contracts
/contracts
  - Liste avec filtres
  - Upload nouveau contrat
/contracts/{id}
  - Détail contrat
  - Vue OCR overlay
  - Analyse IA résultats
  - Clauses détectées

// Alerts
/alerts
  - Gestion notifications
  - Historique alertes
  - Paramètres préférences
```

## Configuration et Variables d'Environnement

```bash
# Base Laravel
APP_NAME="Contract-Tacit"
APP_ENV=production
APP_KEY=base64:...
APP_DEBUG=false
APP_URL=https://contract-tacit.com

# Base de données
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=contract_tacit
DB_USERNAME=postgres
DB_PASSWORD=

# Redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# Tesseract OCR
TESSERACT_PATH=/usr/bin/tesseract
TESSERACT_LANGUAGES=fra,eng

# Notifications
MAIL_MAILER=smtp
TWILIO_SID=
TWILIO_TOKEN=
TWILIO_FROM=

# Storage
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=eu-west-3
AWS_BUCKET=contract-tacit
```

## Déploiement et Performance

### Queue Workers

```bash
# Démarrage des workers
php artisan queue:work redis --queue=ocr,analysis,notifications

# Queues spécialisées
- ocr: Traitement OCR des documents
- analysis: Analyse IA avec OpenAI  
- notifications: Envoi des alertes
- default: Autres tâches
```

### Optimisations

- **Cache Redis** pour analyses IA coûteuses
- **Compression images** avant OCR
- **Chunking** pour gros documents
- **Rate limiting** OpenAI API
- **CDN** pour assets React
- **Database indexing** sur dates et statuts

### Monitoring

- **Laravel Telescope** (dev)
- **Laravel Pulse** (production)
- **Sentry** pour erreurs
- **Logs structurés** pour débogage OCR/IA

---

*Contract-Tacit - Application Laravel + React pour la gestion de reconduction tacite* 