# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-tenant SaaS Laravel application for contract management and automatic renewal prevention ("reconduction tacite"). It uses AI-powered OCR and pattern matching to analyze contracts and alert users about upcoming renewals.

**Core Features:**
- Multi-tenant architecture with organization-based data isolation
- Contract OCR processing (Enhanced + Basic modes)
- AI-powered contract analysis using OpenAI
- Automated alert system for contract renewals
- Credit-based AI usage system
- Stripe billing integration

## Development Commands

### Primary Development
```bash
# Start development environment with all services
make dev
# or
composer run dev

# Development with SSR support
composer run dev:ssr

# Run tests
composer run test
# or
make test

# Frontend development (ALWAYS use pnpm or bun - NEVER npm)
pnpm run dev         # Watch mode for assets (preferred)
bun run dev          # Alternative fast runtime
pnpm run build       # Production build
pnpm run lint        # ESLint with auto-fix
pnpm run types       # TypeScript checking
pnpm run format      # Prettier formatting

# React 19 Testing & Performance
pnpm run test        # Run test suite with Vitest
pnpm run test:ui     # Test UI interface
pnpm run test:coverage # Coverage report
pnpm run test:watch  # Watch mode testing
```

### Laravel-specific Commands
```bash
# Database operations
make migrate         # Run migrations
make seed           # Seed database
make db-reset       # Fresh migration + seed

# Cache management
make clear-cache    # Clear all Laravel caches
php artisan optimize:clear

# Queue management (via Horizon)
php artisan horizon              # Start Horizon dashboard
php artisan queue:work           # Manual queue worker
php artisan queue:listen --tries=1

# Custom commands
php artisan fix:user-org-ids     # Fix users without org_id
php artisan test:ocr            # Test OCR functionality
php artisan test:openai         # Test OpenAI integration
```

### Docker Operations
```bash
make install        # First-time setup
make shell          # Access app container
make logs           # View all logs
make app-logs       # App-specific logs
make restart        # Restart containers
```

## Architecture

### Multi-Tenant Design
- **Data Isolation**: Every model includes `org_id` for tenant separation
- **Global Scopes**: Automatic filtering by organization on all queries
- **Policy-Based Authorization**: All access controlled through Laravel policies
- **Trait Pattern**: `BelongsToOrg` trait handles automatic tenant scoping

### Core Services
- **OCRService**: Basic Tesseract OCR processing
- **EnhancedOCRService**: Advanced OCR with image preprocessing
- **OpenAIService**: AI contract analysis with credit management
- **ContractPatternService**: Pattern-based contract analysis (fallback mode)
- **DiscordWebhookService**: Discord notifications for alerts

### Job Processing Pipeline
1. **ProcessContractOCR** / **ProcessEnhancedContractOCR**: Extract text from PDFs
2. **AnalyzeContractWithAI**: AI analysis using OpenAI (with credit deduction)
3. **CreateContractAlerts**: Generate renewal alerts based on analysis

### Frontend Stack (React 19 Modernized)
- **React 19.0.0**: Latest with concurrent features and new hooks
- **Inertia.js + React**: Full-stack SPA with TypeScript
- **Tailwind CSS v4**: Modern styling framework
- **Radix UI**: Accessible component primitives
- **TanStack Query**: Data fetching and caching
- **PDF.js**: In-browser PDF viewing
- **Vitest + Testing Library**: Modern testing infrastructure
- **pnpm/bun**: Fast package management (REQUIRED)

### Database Schema
```
orgs (organizations)
├── users (org_id)
├── contracts (org_id, user_id)
│   ├── alerts (contract_id)
│   └── contract_clauses (contract_id)
└── subscription management (Stripe)
```

## Key Configuration Files

### Contract Analysis
- `config/contract_patterns.php`: Pattern matching rules and regex
- `config/openai.php`: OpenAI API configuration and prompts
- `config/ocr.php`: OCR service configuration and thresholds

### Multi-tenant Settings
- Models use `BelongsToOrg` trait for automatic scoping
- Policies verify `org_id` matching for all resources
- File storage organized by organization: `contracts/{org_id}/`

## Development Patterns

### File Organization
- **API Controllers**: `app/Http/Controllers/Api/` for API endpoints
- **Web Controllers**: `app/Http/Controllers/Web/` for Inertia pages
- **Business Logic**: `app/Services/` for domain services
- **Background Jobs**: `app/Jobs/` with descriptive action names
- **Form Validation**: `app/Http/Requests/` with tenant-aware rules

### Security Requirements
- All models must include `org_id` for data isolation
- Use policies for authorization: `$this->authorize('view', $contract)`
- File uploads go to private storage: `contracts/{org_id}/`
- API endpoints require Sanctum authentication

### Frontend Conventions (React 19)
- **Component Structure**: Use decomposed components (see `/components/contracts/`)
- **UI Components**: Use existing components from `resources/js/components/ui/`
- **TypeScript**: Follow strict patterns in `resources/js/types/api.ts`
- **State Management**: Use Context + useReducer patterns in `providers/AppProviders.tsx`
- **Lazy Loading**: Implement with `utils/lazy-imports.tsx` patterns
- **Testing**: Write tests for all new components using Vitest
- **Performance**: Use React.memo, useMemo, useCallback appropriately
- **Error Handling**: Wrap components in React19ErrorBoundary
- **Package Manager**: ALWAYS use pnpm or bun, NEVER npm

## Testing

### Test Commands
```bash
# Laravel Backend Tests
php artisan test
php artisan test --filter=ContractTest
php artisan test tests/Feature/ContractManagementTest.php

# Custom testing commands
php artisan test:pattern-matching  # Test contract patterns
php artisan test:enhanced-ocr      # Test OCR pipeline

# React 19 Frontend Tests (use pnpm/bun ONLY)
pnpm run test               # Run all frontend tests
pnpm run test:ui           # Test UI with visual interface
pnpm run test:coverage     # Generate coverage report
pnpm run test:watch        # Watch mode for development
```

### Test Environment
- **Backend**: Uses SQLite for faster testing, Pest framework
- **Frontend**: Vitest + React Testing Library + jsdom
- **Factories**: All models with proper org relationships
- **Coverage**: Both PHP (pest) and JS (vitest) coverage reports

## Services Access

### Development URLs
- **Application**: http://localhost:8000
- **Horizon Dashboard**: http://localhost:8000/horizon (admin only)
- **Database Admin**: http://localhost:9080 (Adminer)
- **File Storage**: http://localhost:9001 (MinIO)

### Default Credentials
- **Admin**: admin@contract-tacit.com / password
- **Test User**: test@example.com / password

## Queue Management

The application uses Laravel Horizon for queue management:
- Jobs process in background for OCR and AI analysis
- Credit consumption tracked per AI request
- Failed jobs automatically logged with Discord notifications
- Queue workers should run continuously in production

## Deployment Notes

- Uses FrankenPHP for high-performance PHP serving
- Docker-based deployment with multi-stage builds
- Environment variables control feature flags and API keys
- File storage can be local or S3-compatible (MinIO)

## Critical Security & Development Rules

### Multi-Tenant Security (ALWAYS ENFORCE)
- **Authorization Check**: Use `$this->authorize('action', $resource)` on every controller method
- **Data Isolation**: Every model MUST filter by `org_id` automatically via global scopes
- **File Security**: Store uploads in private disk: `$file->store('contracts/' . $user->org_id, 'private')`
- **Resource Access**: Verify user belongs to same organization before allowing access

### Code Quality Standards
- **Type Safety**: Use proper return types on relationships (`BelongsTo`, `HasMany`)
- **Validation**: Create dedicated Request classes for complex validation logic
- **Error Handling**: Use appropriate HTTP status codes (200, 201, 400, 404, 422)
- **Database**: Add compound indexes for `[org_id, frequently_queried_column]`

### Testing Approach
- **Backend**: Run `./run-tests.sh` for comprehensive test execution
- **Frontend**: Use `pnpm run test` for React 19 component tests
- **Isolation**: Test multi-tenant isolation in all feature tests
- **Factories**: All factory classes must respect org relationships
- **Coverage**: Aim for >80% coverage on critical business logic
- **Performance**: Monitor component render performance with React Profiler

## Package Management (CRITICAL)

### Required Package Managers
- **ALWAYS use pnpm (preferred) or bun for all JavaScript operations**
- **NEVER use npm** - it's slower and has different lockfile behavior
- **Installation**: Use `pnpm install` or `bun install` for dependencies
- **Scripts**: Use `pnpm run <script>` or `bun run <script>`

### Why pnpm/bun?
- **Performance**: 2-3x faster than npm
- **Disk Space**: Efficient storage with symbolic links
- **Security**: Better dependency resolution and vulnerability handling
- **Modern**: Built for modern JavaScript ecosystems like React 19