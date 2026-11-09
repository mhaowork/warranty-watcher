# AGENTS.md

Guidance for coding agents working in this repository. This file is the only agent guide; `CLAUDE.md` just imports it.

## Development Commands

### Core Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run lint` - Run ESLint checks  
- `npm run stress-test` - Run database stress test with 5000 sample devices

### Testing Commands
- `npx tsx scripts/stress-test-devices.ts` - Direct stress test execution
- Database located at `data/warranty.db` (configurable via `DB_PATH` env var)

## Code Architecture

### High-Level System Design
This is a warranty management system that bridges IT management platforms (RMMs/PSAs) with manufacturer warranty APIs. The architecture follows a clean separation of concerns:

**Data Flow**: Platform Import → Device Storage → Warranty Lookup → Database Storage → Optional Writeback

### Core Layers

#### 1. Service Layer (`lib/services/`)
- **warrantyLookup.ts**: Client-side warranty lookup orchestration with progress tracking
- **warrantySync.ts**: Server-side warranty fetching, storage, and synchronization

#### 2. Database Layer (`lib/database/index.ts`)
- SQLite-based device storage with intelligent device merging
- Multi-tenant support for MSP scenarios
- Warranty lifecycle tracking (fetched_at, written_back_at timestamps)

#### 3. Platform Integration (`lib/platforms/`)
- Connectors for RMM/PSA platforms (Datto RMM, N-Central, HaloPSA)
- CSV import functionality
- Standardized device import with source tracking

#### 4. Manufacturer Integration (`lib/manufacturers/`)
- API connectors for Dell, HP, Lenovo warranty APIs
- OAuth2/API key authentication with caching
- Standardized warranty response parsing

### Key Technical Patterns

#### Database Operations
- Device deduplication by serial number with intelligent merging
- Warranty data preserved across device updates from multiple sources
- Client-based device segregation for multi-tenant scenarios

#### Error Handling
- Individual device failures don't break batch operations
- Graceful fallbacks and skip logic for existing warranty data
- Progress tracking with real-time UI updates

#### Authentication & Credentials
- Manufacturer API credentials stored in browser localStorage
- Token caching for OAuth2-based APIs (Dell)
- Platform-specific credential management

## Code Style & Conventions

Follow the .cursorrules patterns:
- Functional programming patterns, avoid classes
- TypeScript interfaces over types
- Use semantic Tailwind colors (bg-muted, text-foreground) over specific utilities
- Prefer React Server Components, minimize 'use client'
- Use "@" imports instead of relative paths
- Follow Next.js App Router patterns

## Important File Locations

### Configuration
- `components.json` - Shadcn UI configuration
- `next.config.ts` - Next.js configuration
- Database schema in `lib/database/index.ts:36-56`

### Type Definitions
- `types/device.ts` - Core Device interface
- `types/manufacturer.ts` - Supported manufacturers
- `types/warranty.ts` - Warranty information structure
- `types/platform.ts` & `types/credentials.ts` - Platform integration types

### API Routes
- `app/api/platform-data/` - Platform device import endpoints
- `app/api/warranty/` - Warranty lookup endpoints  
- `app/api/database/` - Database management endpoints

## Environment Variables
- `DB_PATH` - SQLite database location (default: `data/warranty.db`)

## Hosting (as of 2026-11-09)
- `demo.warrantywatcher.com`: public demo, Coolify app `dsw088kss4sc88sc00w0s0g0` (project "Warranty Watcher") on the
  Hostinger VPS, built from this repo's `main` with `NEXT_PUBLIC_DEPLOYMENT_MODE=self-hosted`.
- `api.warrantywatcher.com`: HP/Lenovo lookup proxy (`mhaowork/warranty-watcher-api`, Coolify app
  `b4ssgcsgco0sw0okw4k4kwgk`); `lib/manufacturers/hp.ts` and `lenovo.ts` call it.
- `warrantywatcher.com`: one-page marketing site on Lovable, not in this repo.
- The paid hosted app (`app.warrantywatcher.com`, SaaS mode with Supabase and Stripe) was shut down on 2026-11-09: its
  Supabase project no longer exists, the Coolify app and DNS record were deleted, and the Stripe product and price were
  archived. The SaaS-mode code (`NEXT_PUBLIC_DEPLOYMENT_MODE=saas`, `lib/supabase`, `lib/stripe`, `lib/subscription`,
  billing and login pages, the PostgreSQL adapter) is still in the repo because it is woven through the shared database
  and UI code; nothing runs it now. Self-hosted mode is the default and does not touch it.

## Docker Deployment
- Production: `docker run -p 3000:3000 -v ./data:/app/data -e DB_PATH=/app/data/warranty.db mhaowork/warrantywatcher:latest`
- Development: `docker-compose up -d`

## Docs
- [`docs/dell.md`](docs/dell.md), [`docs/hp-lenovo.md`](docs/hp-lenovo.md): how to get Dell, HP and Lenovo warranty API access.
- [`docs/halopsa.md`](docs/halopsa.md): HaloPSA integration setup.
