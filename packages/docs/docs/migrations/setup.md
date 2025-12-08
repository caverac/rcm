---
sidebar_position: 1
---

# Database Migrations

PostgreSQL database migrations for the RCM system, including schema definitions, reference data, and demo seed data.

The migrations can run against any PostgreSQL database - local Docker containers for development, or production databases like AWS RDS.

## Quick Start (Local Development)

For local development, use Docker to run PostgreSQL:

```bash
# 1. Start PostgreSQL (port 5432)
docker-compose up -d

# 2. Create environment file
cp packages/migrations/.env.example packages/migrations/.env

# 3. Install dependencies
yarn install

# 4. Build and run migrations
yarn workspace @rcm/migrations build
yarn workspace @rcm/migrations migrate:up

# 5. Seed demo data (optional - for development only)
yarn workspace @rcm/migrations seed

# 6. Verify setup
docker exec -it rcm-postgres psql -U rcm_admin -d rcmdb -c "\dt"
```

**Local Connection Details:**

| Property | Value |
|----------|-------|
| Host | `localhost:5432` |
| Database | `rcmdb` |
| Username | `rcm_admin` |
| Password | `rcm_password` |
| DATABASE_URL | `postgresql://rcm_admin:rcm_password@localhost:5432/rcmdb` |

**Optional - pgAdmin UI (local only):**

```bash
docker-compose --profile tools up -d pgadmin
# Access at http://localhost:5050 (admin@example.com / admin)
```

## Production Deployment

To run migrations against a production database (e.g., AWS RDS), set the `DATABASE_URL` environment variable and run the migration commands:

```bash
# Set connection string to your production database
export DATABASE_URL="postgresql://user:password@your-rds-endpoint.amazonaws.com:5432/rcmdb"

# Build and run migrations
yarn workspace @rcm/migrations build
yarn workspace @rcm/migrations migrate:up
```

:::caution
Do not run the `seed` command against production databases. Seed data is for development and testing only.
:::

See the [Infrastructure](/docs/infrastructure/deployment) docs for deploying the database with AWS CDK.

## Schema Overview

The database tracks the complete healthcare revenue cycle workflow, from claim submission through payment collection or resolution.

### Core Entities

| Table | Description |
|-------|-------------|
| **payers** | Insurance companies that pay for medical services |
| **claims** | Billing requests submitted for reimbursement |
| **denials** | Rejections by payers refusing to pay claims |
| **appeals** | Formal requests to reconsider denied claims |
| **write_offs** | Decisions to stop pursuing payment |
| **rebills** | Corrected claims resubmitted after denial |
| **payment_variances** | Discrepancies between expected and actual payments |

### Reference Tables

| Table | Description |
|-------|-------------|
| **denial_code_library** | Standard denial codes with meanings and recommended actions |
| **org_policies** | Configurable business rules for handling denials |
| **coding_rules** | Pre-submission validation rules to prevent denials |

## Schema Diagram

```mermaid
erDiagram
    payers ||--o{ claims : "has many"
    payers ||--o{ org_policies : "has many (optional)"
    payers ||--o{ coding_rules : "has many (optional)"

    claims ||--o{ denials : "has many"
    claims ||--o{ payment_variances : "has many"

    denials ||--o{ appeals : "has many"
    denials ||--o| write_offs : "has one (optional)"
    denials ||--o{ rebills : "has many"

    appeals }o--|| denials : "belongs to"
    appeals }o--|| claims : "belongs to"

    write_offs }o--|| denials : "belongs to"
    write_offs }o--|| claims : "belongs to"

    rebills }o--|| denials : "belongs to"
    rebills }o--|| claims : "original claim"
    rebills }o--o| claims : "new claim (optional)"

    payment_variances }o--|| claims : "belongs to"
    payment_variances }o--o| appeals : "may link to"

    payers {
        uuid id PK
        varchar payer_id UK
        varchar name
        varchar type
        jsonb contact_info
    }

    claims {
        uuid id PK
        varchar claim_id UK
        varchar patient_id
        uuid payer_id FK
        varchar status
        decimal amount
        decimal paid_amount
        jsonb cpt_codes
        jsonb diagnosis_codes
    }

    denials {
        uuid id PK
        uuid claim_id FK
        varchar denial_code
        varchar denial_category
        decimal denial_amount
        boolean is_preventable
        varchar resolution_status
    }

    appeals {
        uuid id PK
        uuid denial_id FK
        uuid claim_id FK
        varchar appeal_type
        varchar status
        varchar priority
        decimal appeal_amount
    }

    write_offs {
        uuid id PK
        uuid denial_id FK
        uuid claim_id FK
        decimal write_off_amount
        varchar write_off_reason
        boolean is_preventable
    }

    rebills {
        uuid id PK
        uuid original_claim_id FK
        uuid new_claim_id FK
        uuid denial_id FK
        varchar rebill_reason
        jsonb changes_made
        decimal recovered_amount
    }

    payment_variances {
        uuid id PK
        uuid claim_id FK
        decimal expected_amount
        decimal actual_amount
        decimal variance_amount
        varchar variance_type
    }
```

## Data Flow Examples

### Denial → Appeal (Authorization Issue)

1. **Claim Submission:** Claim `CLM-2024-001235` created for $500 MRI
2. **Denial Received:** CO-197 (authorization absent), denying $500
3. **Appeal Filed:** First-level appeal with supporting documents
4. **Outcome:** Pending review, assigned to staff member

### Denial → Write-off (Small Balance)

1. **Claim Submission:** Claim `CLM-2024-001236` created for $15
2. **Denial Received:** PR-1 (patient responsibility)
3. **Write-off Created:** Amount below $25 threshold
4. **Outcome:** Written off per organization policy

### Denial → Rebill (Coding Error)

1. **Claim Submission:** Claim `CLM-2024-001237` for $250, missing modifier
2. **Denial Received:** CO-4 (modifier error)
3. **Rebill Created:** Corrected claim with modifier 25 added
4. **Outcome:** New claim paid $200

## Managing Migrations

```bash
# Apply all pending migrations
yarn workspace @rcm/migrations migrate:up

# Rollback last migration
yarn workspace @rcm/migrations migrate:down

# Create new migration
yarn workspace @rcm/migrations migrate:create migration-name
```

## Seeded Reference Data

### Denial Codes

Common codes seeded in `denial_code_library`:

- **CO-197:** Authorization missing (65% appeal success rate)
- **CO-4:** Modifier error (rebill recommended)
- **CO-50:** Medical necessity (appeal with clinical notes)
- **CO-97:** Bundling issue (review NCCI edits)
- **PR-1/PR-2:** Patient responsibility (verify eligibility)

### Organization Policies

Default policies in `org_policies`:

- Appeal thresholds ($100+ default)
- Authorization denials auto-appeal ($250+)
- Small balance write-offs (under $25)
- Coding errors route to rebill queue

### Coding Rules

Validation rules in `coding_rules`:

- Modifier 25 required with E/M codes on same day as procedure
- Bilateral procedure modifier 50
- Screening colonoscopy diagnosis requirements
- Invalid diagnosis code detection

## Database Management

```bash
# Stop database (preserves data)
docker-compose down

# Start database
docker-compose up -d

# Reset database (deletes all data)
docker exec rcm-postgres psql -U rcm_admin -d rcmdb \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
yarn workspace @rcm/migrations build && yarn workspace @rcm/migrations migrate:up
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| DATABASE_URL not set | Create `.env` file with correct DATABASE_URL |
| Directory not found | Run `yarn workspace @rcm/migrations build` first |
| Unknown file extension .ts/.d.ts | Config should use `"migration-file-language": "js"` |
| Relation already exists | Reset database schema (see above) |

## Using in Application Code

```typescript
import { getDbClient } from '@rcm/migrations'

const client = await getDbClient()
const result = await client.query(
  'SELECT * FROM claims WHERE claim_id = $1',
  [claimId]
)
```

## Next Steps

- **[MCP Server](/docs/mcp-server/overview)** - Use the database with AI-powered tools
- **[Workflows](/docs/workflows/denial-triage)** - See how data flows through the system
