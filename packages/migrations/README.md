# RCM Database Migrations

PostgreSQL database migrations for Revenue Cycle Management system.

## Schema Overview

### Tables

- **payers**: Insurance payer information (commercial, medicare, medicaid, etc.)
- **claims**: Patient claims with CPT codes, diagnosis codes, and billing details
- **denials**: Denial records with codes, categories, and resolution tracking
- **denial_code_library**: Reference table for common denial codes (CO-197, etc.)
- **org_policies**: Organization policies for appeal thresholds and workflows
- **coding_rules**: Validation rules for pre-submission coding audits

### Key Features

- Comprehensive claim tracking with CPT and ICD-10 codes
- Denial classification and analytics
- Organization-specific policies for appeal thresholds
- Pre-submission coding validation rules
- JSONB fields for flexible data storage (raw EDI data, etc.)
- Automatic timestamp management

## Setup

### Prerequisites

- PostgreSQL 14+
- Node.js 20+

### Environment Variables

Create a `.env` file or set:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/rcm_db
```

### Install Dependencies

```bash
yarn install
```

## Running Migrations

### Apply All Pending Migrations

```bash
yarn migrate:up
```

### Rollback Last Migration

```bash
yarn migrate:down
```

### Create New Migration

```bash
yarn migrate:create my-migration-name
```

## Migration Files

- `1733524800000_initial-schema.ts`: Creates all core tables and indexes
- `1733524900000_seed-reference-data.ts`: Seeds denial codes, policies, and coding rules

## Seeded Data

### Denial Codes

Common codes like:
- CO-197: Authorization missing
- CO-4: Modifier error
- CO-50: Medical necessity
- CO-97: Bundling
- PR-1/PR-2: Patient responsibility

### Organization Policies

Default policies for:
- Appeal thresholds ($100+ default)
- Authorization denials (auto-appeal $250+)
- Small balance write-offs (<$25)
- Coding errors (quick rebill)

### Coding Rules

Validation rules for:
- Modifier 25 with E/M codes
- Bilateral procedure modifier 50
- Screening colonoscopy diagnosis requirements
- Invalid diagnosis codes

## Database Connection

The migrations package exports a connection helper for use in other packages:

```typescript
import { getDbClient } from '@rcm/migrations';

const client = await getDbClient();
const result = await client.query('SELECT * FROM claims WHERE claim_id = $1', [claimId]);
```

## Development

### Local PostgreSQL Setup

```bash
# macOS with Homebrew
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb rcm_db

# Run migrations
yarn migrate:up
```

### AWS RDS Setup

The infrastructure package will provision RDS PostgreSQL. Get the connection string from CDK outputs:

```bash
cd ../infrastructure
yarn deploy

# Get DATABASE_URL from outputs
export DATABASE_URL="postgresql://..."
```

## Schema Diagram

```
payers
  ├─ claims (many)
  │   ├─ denials (many)
  │   └─ payer_id → payers.id
  ├─ org_policies (many, optional)
  └─ coding_rules (many, optional)

denial_code_library (reference table)
org_policies (global or payer-specific)
coding_rules (global or payer-specific)
```
