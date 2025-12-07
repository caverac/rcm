---
sidebar_position: 1
---

# Database Migrations Setup

PostgreSQL database migrations for the RCM system, including schema definitions and reference data.

## Quick Start

```bash
# Start PostgreSQL with Docker
docker-compose up -d

# Create environment file
cp .env.example .env

# Install dependencies
yarn install

# Build and run migrations
yarn workspace @rcm/migrations build
yarn workspace @rcm/migrations migrate:up

# Verify setup
docker exec -it rcm-postgres psql -U rcm_admin -d rcmdb -c "\dt"
```

## What's Included

### Core Schema (6 Tables)

- **payers** - Insurance companies
- **claims** - Billing requests
- **denials** - Rejection records
- **denial_code_library** - Reference data for ~400 denial codes
- **org_policies** - Configurable business rules
- **coding_rules** - Pre-submission validation rules

### Phase 1: Appeals (1 Table)

- **appeals** - Appeal lifecycle tracking

### Phase 2: Advanced Workflows (3 Tables)

- **write_offs** - Uncollectible tracking
- **rebills** - Correction workflows
- **payment_variances** - Payment analysis

## Connection Details

**Default (Docker):**

```
Host: localhost:5432
Database: rcmdb
Username: rcm_admin
Password: rcm_password
DATABASE_URL: postgresql://rcm_admin:rcm_password@localhost:5432/rcmdb
```

## Database Schema

See the [Migrations Package README](https://github.com/caverac/rcm/tree/main/packages/migrations) for:

- Complete schema diagram (Mermaid ER diagram)
- Detailed table descriptions with examples
- Relationship explanations
- Data flow examples

## Managing Migrations

### Create New Migration

```bash
yarn workspace @rcm/migrations migrate:create my-migration-name
```

### Rollback Last Migration

```bash
yarn workspace @rcm/migrations migrate:down
```

### Reset Database

```bash
docker exec rcm-postgres psql -U rcm_admin -d rcmdb -c \
  "DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
yarn workspace @rcm/migrations build
yarn workspace @rcm/migrations migrate:up
```

## Seeded Reference Data

### 12 Denial Codes

Common codes like CO-197 (authorization), CO-4 (modifier), CO-50 (medical necessity)

### 5 Organization Policies

- Appeal thresholds ($100+ default)
- Small balance write-offs (<$25)
- Coding error rebills

### 5 Coding Rules

- Modifier 25 requirements
- Diagnosis code validation
- Bundling rules

## Using in Your Code

```typescript
import { getDbClient } from '@rcm/migrations'

const client = await getDbClient()
const result = await client.query('SELECT * FROM denials WHERE status = $1', [
  'pending',
])
```

## Next Steps

- **[MCP Server Setup](/docs/mcp-server/overview)** - Use the database with AI tools
- **[Schema Documentation](https://github.com/caverac/rcm/tree/main/packages/migrations#schema-diagram)** - View complete ER diagram
