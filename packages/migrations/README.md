# RCM Database Migrations

PostgreSQL database migrations for Revenue Cycle Management system.

## Table of Contents

- [Schema Overview](#schema-overview)
  - [Core Entities](#core-entities)
  - [Reference Tables](#reference-tables)
  - [Data Flow Example](#data-flow-example)
- [Setup](#setup)
  - [Quick Start (Docker)](#quick-start-docker)
  - [Alternative Setup](#alternative-setup)
  - [Database Management](#database-management)
  - [Troubleshooting](#troubleshooting)
- [Managing Migrations](#managing-migrations)
- [Migration Files](#migration-files)
- [Seeded Data](#seeded-data)
- [Database Connection](#database-connection)
- [Schema Diagram](#schema-diagram)

## Schema Overview

This database tracks the complete healthcare revenue cycle workflow, from claim submission through payment collection or resolution.

### Core Entities

#### Payers

**What it is:** Insurance companies that pay for medical services.

**Example:** A payer record with ID `550e8400-e29b-41d4-a716-446655440000` represents "Blue Cross Blue Shield - California" (commercial insurance) with contact information and active status. This payer is referenced by all claims submitted to BCBS-CA.

#### Claims

**What it is:** A billing request submitted to an insurance payer for reimbursement of medical services provided to a patient.

**Example:** A claim with ID `CLM-2024-001234` represents a patient visit where Dr. Smith performed an office consultation (CPT 99213) on January 15, 2024, for hypertension (ICD-10 I10). The claim was submitted to Blue Cross for $150, with an allowed amount of $120. The claim references the payer ID to track which insurance company should pay.

**Why it matters:** Claims are the foundation of revenue cycle management - they represent money owed to the healthcare provider.

#### Denials

**What it is:** A rejection by the insurance payer refusing to pay all or part of a claim.

**Example:** A denial with ID `DEN-2024-005678` is linked to claim `CLM-2024-001234` with denial code "CO-197" (missing prior authorization). The payer denied the full $150 because no authorization was obtained before the service. The denial has a resolution deadline of February 15, 2024, and is marked as "pending resolution."

**Why it references a claim:** Every denial is tied to a specific claim that was rejected. The denial tracks why the claim wasn't paid and what actions are being taken to resolve it.

#### Appeals (Phase 1)

**What it is:** A formal request to the insurance payer asking them to reconsider a denial and pay the claim.

**Example:** An appeal with ID `APL-2024-000123` references denial `DEN-2024-005678` (the missing authorization denial). It's a "first_level" appeal for the full $150, filed on January 20, 2024, with a due date of February 20, 2024. The appeal includes supporting documents showing the authorization was actually obtained (stored in the `supporting_documents` JSONB field). The appeal status is "submitted" and priority is "high" because the amount exceeds the organization's threshold. It can be approved (payer agrees to pay), denied (payer upholds denial), or partially approved (payer pays less than requested).

**Why it references both denial and claim:** The appeal needs to reference the denial it's contesting AND the original claim to maintain a complete audit trail.

#### Write-offs (Phase 2)

**What it is:** A decision to stop pursuing payment for a denied claim and accept the financial loss.

**Example:** A write-off with ID `WO-2024-000045` references denial `DEN-2024-005679` where a claim for $15 was denied due to "patient not covered" (PR-1). The organization decided the $15 is too small to pursue (below the $25 small-balance threshold in org_policies), so it's written off. The record tracks that this write-off was NOT preventable (patient eligibility should have been verified upfront), has a root cause of "registration error," and was approved by the billing manager on January 25, 2024.

**Why it references claim and denial:** Links to the claim for financial reporting and to the denial to understand why the write-off was necessary.

#### Rebills (Phase 2)

**What it is:** Resubmitting a corrected claim after a denial, fixing the issues that caused the original rejection.

**Example:** A rebill with ID `REB-2024-000089` references denial `DEN-2024-005680` where a claim was denied for "modifier error" (CO-4). The correction type is "modifier_correction" - the biller added modifier 25 to the E/M code. The rebill status is "submitted" with new claim ID `CLM-2024-001567`. If successful, the `recovered_amount` will be updated to $120 when the corrected claim is paid.

**Why it references claim and denial:** Tracks the original claim that was denied and which denial prompted the rebill, creating an audit trail of the correction workflow.

#### Payment Variances (Phase 2)

**What it is:** A discrepancy between what the provider expected to receive for a claim and what was actually paid.

**Example:** A payment variance with ID `PV-2024-000234` references claim `CLM-2024-001890` where the expected payment was $500 (based on contracted rates), but the actual payment received was $425. The variance amount is -$75 (underpayment), calculated as -15%. The variance type is "underpayment" and reason category is "incorrect_fee_schedule" - the payer applied wrong rates. Resolution status is "appealed" and the record links to appeal `APL-2024-000167` created to recover the $75 shortfall.

**Why it references claim and optionally appeal:** Links to the claim to track payment accuracy and to the appeal if the variance is being contested.

### Reference Tables

#### Denial Code Library

**What it is:** A reference table containing standard denial codes, their meanings, and recommended actions.

**Example:** A record for code "CO-197" describes it as "Precertification/Authorization missing" in the "Authorization" category, marked as appealable with a 65% success rate and average recovery time of 30 days. The recommended action is: "Obtain retroactive authorization if possible within payer guidelines; submit appeal with proof of medical necessity."

**Why it exists:** Provides consistent classification and action guidance when denials are received.

#### Organization Policies

**What it is:** Configurable business rules that determine how denials should be handled.

**Example:** A policy record for "Authorization Denials - High Priority" states that any authorization denial (CO-197) over $250 should be automatically escalated to high priority for appeal, with a 30-day response deadline. Another policy states claims under $25 should be written off rather than appealed to save administrative costs.

**Why it exists:** Allows the MCP server's `suggest_next_action` tool to provide intelligent, policy-driven recommendations.

#### Coding Rules

**What it is:** Validation rules that check claims for coding errors before submission to prevent denials.

**Example:** A coding rule for "Modifier 25 Required" validates that when an E/M code (99213) is billed on the same day as a procedure, modifier 25 must be present. Another rule checks that screening colonoscopy claims (CPT 45378) must have appropriate screening diagnosis codes (Z12.11), not symptom codes, to ensure proper coverage.

**Why it exists:** Enables the `audit_coding` tool to catch errors before claims are submitted, reducing preventable denials.

### Data Flow Example

1. **Claim Submission:** Claim `CLM-2024-001234` is created for a $500 service, referencing payer "United Healthcare"
2. **Denial Received:** Denial `DEN-2024-005678` is created with code CO-50 (lack of medical necessity), denying $500
3. **Appeal Filed:** Appeal `APL-2024-000123` is created referencing the denial, requesting reconsideration with clinical documentation
4. **Two Possible Outcomes:**
   - **Approved:** Appeal status updates to "approved" with `approved_amount: $500`, claim status updates to "paid"
   - **Denied:** Appeal status updates to "denied," then either:
     - Write-off `WO-2024-000045` is created if amount too small to pursue
     - Rebill `REB-2024-000089` is created if there's a correction to make (e.g., different diagnosis code)
     - Payment variance `PV-2024-000234` is created if payment received but less than expected

## Setup

### Quick Start (Docker)

```bash
# 1. Start PostgreSQL (port 5432)
docker-compose up -d

# 2. Create environment file
cp .env.example .env

# 3. Install dependencies
yarn install

# 4. Build and run migrations
yarn workspace @rcm/migrations build
yarn workspace @rcm/migrations migrate:up

# 5. Verify setup
docker exec -it rcm-postgres psql -U rcm_admin -d rcmdb -c "\dt"
```

**Connection Details:**

- Host: `localhost:5432`
- Database: `rcmdb`
- Username: `rcm_admin`
- Password: `rcm_password`
- DATABASE_URL: `postgresql://rcm_admin:rcm_password@localhost:5432/rcmdb`

**Optional - pgAdmin UI:**

```bash
docker-compose --profile tools up -d pgadmin
# Access at http://localhost:5050 (admin@rcm.local / admin)
```

### Alternative Setup

**Manual PostgreSQL (without Docker):**

```bash
brew install postgresql@16 && brew services start postgresql@16
createdb rcmdb
psql rcmdb -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
# Update .env: DATABASE_URL=postgresql://localhost:5432/rcmdb
yarn workspace @rcm/migrations migrate:up
```

**AWS RDS (production):**

```bash
cd ../infrastructure && yarn deploy
# Get DATABASE_URL from CDK outputs
export DATABASE_URL="postgresql://..."
yarn workspace @rcm/migrations migrate:up
```

### Database Management

```bash
# Stop database (preserves data)
docker-compose down

# Start database
docker-compose up -d

# Reset database (deletes all data)
docker exec rcm-postgres psql -U rcm_admin -d rcmdb -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
yarn workspace @rcm/migrations build && yarn workspace @rcm/migrations migrate:up
```

### Troubleshooting

| Issue                            | Solution                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------- |
| DATABASE_URL not set             | Create `.env` file at project root with correct DATABASE_URL                    |
| Directory not found              | Run `yarn workspace @rcm/migrations build` first                                |
| Unknown file extension .ts/.d.ts | Config should use `"migration-file-language": "js"`, `"dir": "dist/migrations"` |
| Relation already exists          | Reset database schema (see Database Management above)                           |

## Managing Migrations

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

Use the exported helper in your application code:

```typescript
import { getDbClient } from '@rcm/migrations'

const client = await getDbClient()
const result = await client.query('SELECT * FROM claims WHERE claim_id = $1', [
  claimId,
])
```

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
    rebills }o--|| claims : "belongs to"

    payment_variances }o--|| claims : "belongs to"
    payment_variances }o--o| appeals : "may link to"

    payers {
        uuid id PK
        varchar name
        varchar type
        jsonb contact_info
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    claims {
        uuid id PK
        uuid payer_id FK
        varchar claim_id
        varchar patient_name
        date service_date
        varchar cpt_codes
        varchar diagnosis_codes
        decimal billed_amount
        decimal allowed_amount
        decimal paid_amount
        varchar status
        jsonb raw_edi_data
        timestamp created_at
        timestamp updated_at
    }

    denials {
        uuid id PK
        uuid claim_id FK
        varchar denial_code
        varchar category
        text reason
        decimal denied_amount
        varchar resolution_status
        date received_date
        date resolution_deadline
        text resolution_notes
        boolean appealed
        timestamp created_at
        timestamp updated_at
    }

    appeals {
        uuid id PK
        uuid denial_id FK
        uuid claim_id FK
        varchar appeal_type
        varchar status
        varchar priority
        decimal appeal_amount
        timestamp filed_date
        timestamp due_date
        timestamp decision_date
        decimal approved_amount
        text appeal_reason
        jsonb supporting_documents
        text notes
        varchar assigned_to
        text payer_response
        timestamp created_at
        timestamp updated_at
    }

    write_offs {
        uuid id PK
        uuid denial_id FK
        uuid claim_id FK
        varchar reason_category
        decimal write_off_amount
        boolean is_preventable
        text root_cause
        varchar approved_by
        timestamp approval_date
        text notes
        timestamp created_at
        timestamp updated_at
    }

    rebills {
        uuid id PK
        uuid denial_id FK
        uuid claim_id FK
        varchar correction_type
        varchar status
        text correction_details
        decimal original_amount
        decimal rebilled_amount
        timestamp rebill_date
        varchar new_claim_id
        decimal recovered_amount
        text notes
        timestamp created_at
        timestamp updated_at
    }

    payment_variances {
        uuid id PK
        uuid claim_id FK
        uuid appeal_id FK "nullable"
        decimal expected_payment
        decimal actual_payment
        decimal variance_amount
        decimal variance_percentage
        varchar variance_type
        varchar reason_category
        varchar resolution_status
        text analysis_notes
        timestamp identified_date
        timestamp resolved_date
        timestamp created_at
        timestamp updated_at
    }

    denial_code_library {
        uuid id PK
        varchar code
        varchar category
        text description
        boolean is_appealable
        int appeal_success_rate
        int avg_recovery_days
        text recommended_action
        timestamp created_at
        timestamp updated_at
    }

    org_policies {
        uuid id PK
        uuid payer_id FK "nullable"
        varchar policy_type
        varchar policy_name
        jsonb rules
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    coding_rules {
        uuid id PK
        uuid payer_id FK "nullable"
        varchar rule_type
        varchar rule_name
        jsonb validation_criteria
        varchar severity
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
```

### Key Relationships

- **Payers** are the root entity, connected to claims and optionally to specific policies and coding rules
- **Claims** can have multiple denials and payment variances
- **Denials** can have multiple appeals and rebills, but only one write-off
- **Appeals, Write-offs, and Rebills** all reference both denial and claim for complete audit trail
- **Payment Variances** track expected vs actual payments and may link to appeals
- **Reference Tables** (denial_code_library, org_policies, coding_rules) provide validation and workflow rules
