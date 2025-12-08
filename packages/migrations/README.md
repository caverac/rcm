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

**Example:** A payer record with ID `550e8400-e29b-41d4-a716-446655440000` represents "Blue Cross Blue Shield - California" (commercial insurance) with contact information (phone: 1-800-555-0101, email: claims@bcbs-ca.example.com). This payer is referenced by all claims submitted to `BCBS-CA-001`.

#### Claims

**What it is:** A billing request submitted to an insurance payer for reimbursement of medical services provided to a patient.

**Example:** A claim with ID `650e8400-e29b-41d4-a716-446655440001` (`CLM-2024-001234`) represents a patient visit where an office consultation (CPT 99213) was performed on January 15, 2024, for hypertension (ICD-10 I10). The claim was submitted to Blue Cross Blue Shield - California for $150 and paid $120. The claim references payer ID `550e8400-e29b-41d4-a716-446655440000` to track which insurance company should pay.

**Why it matters:** Claims are the foundation of revenue cycle management - they represent money owed to the healthcare provider.

#### Denials

**What it is:** A rejection by the insurance payer refusing to pay all or part of a claim.

**Example:** A denial with ID `750e8400-e29b-41d4-a716-446655440001` is linked to claim `650e8400-e29b-41d4-a716-446655440002` (`CLM-2024-001235`) with denial code "CO-197" (Precertification/authorization/notification absent). The payer denied the full $500 for an MRI brain with contrast because authorization was not obtained prior to service. The denial is marked as preventable and has resolution status "pending" with an appeal filed.

**Why it references a claim:** Every denial is tied to a specific claim that was rejected. The denial tracks why the claim wasn't paid and what actions are being taken to resolve it.

#### Appeals

**What it is:** A formal request to the insurance payer asking them to reconsider a denial and pay the claim.

**Example:** An appeal with ID `850e8400-e29b-41d4-a716-446655440001` references denial `750e8400-e29b-41d4-a716-446655440001` (the `CO-197` authorization denial). It's a "first_level" appeal for $500, filed on January 20, 2024, with a due date of February 20, 2024. The appeal includes supporting documents (`auth_form_12345.pdf`, `clinical_notes_pat002.pdf`) showing the authorization was actually obtained. The appeal status is "submitted" and priority is "high" because the amount exceeds the organization's $250 threshold. Assigned to Jane Smith.

**Why it references both denial and claim:** The appeal needs to reference the denial it's contesting AND the original claim to maintain a complete audit trail.

#### Write-offs

**What it is:** A decision to stop pursuing payment for a denied claim and accept the financial loss.

**Example:** A write-off with ID `950e8400-e29b-41d4-a716-446655440001` references denial `750e8400-e29b-41d4-a716-446655440002` where claim `650e8400-e29b-41d4-a716-446655440003` (`CLM-2024-001236`) for $15 was denied due to "Deductible amount - patient not covered" (PR-1). The organization decided the $15 is too small to pursue (below the $25 small-balance threshold in org_policies), so it's written off with reason "below_threshold". The record tracks that this write-off WAS preventable (registration error - eligibility not verified), and was approved by the Billing Manager on January 30, 2024.

**Why it references claim and denial:** Links to the claim for financial reporting and to the denial to understand why the write-off was necessary.

#### Rebills

**What it is:** Resubmitting a corrected claim after a denial, fixing the issues that caused the original rejection.

**Example:** A rebill with ID `a50e8400-e29b-41d4-a716-446655440001` references denial `750e8400-e29b-41d4-a716-446655440003` where claim `650e8400-e29b-41d4-a716-446655440004` (`CLM-2024-001237`) was denied for "modifier error" (CO-4). The correction was "added_modifier" - modifier 25 was added to E/M code 99213 to indicate significant, separately identifiable evaluation and management service. The rebill status is "paid" with new claim ID `650e8400-e29b-41d4-a716-446655440005` (`CLM-2024-001567`). The `recovered_amount` is $200 after the corrected claim was paid.

**Why it references claim and denial:** Tracks the original claim that was denied and which denial prompted the rebill, creating an audit trail of the correction workflow.

#### Payment Variances

**What it is:** A discrepancy between what the provider expected to receive for a claim and what was actually paid.

**Example:** A payment variance with ID `b50e8400-e29b-41d4-a716-446655440001` references claim `650e8400-e29b-41d4-a716-446655440006` (`CLM-2024-001890`) where the expected payment was $500 (based on contracted Medicare rates), but the actual payment received was $425. The variance amount is -$75 (underpayment), calculated as -15%. The variance type is "underpayment" and variance reason is "contract_adjustment" - the payer applied incorrect 2023 fee schedule instead of 2024 rates. The variance requires appeal and is not yet resolved.

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

**Scenario 1: Denial → Appeal (Authorization Issue)**
1. **Claim Submission:** Claim `CLM-2024-001235` is created for a $500 MRI brain service, referencing payer "Blue Cross Blue Shield - California"
2. **Denial Received:** Denial `750e8400-e29b-41d4-a716-446655440001` is created with code CO-197 (authorization absent), denying $500
3. **Appeal Filed:** Appeal `850e8400-e29b-41d4-a716-446655440001` is created referencing the denial, with supporting documents showing authorization was obtained
4. **Outcome:** Pending - appeal status is "submitted", assigned to Jane Smith

**Scenario 2: Denial → Write-off (Small Balance)**
1. **Claim Submission:** Claim `CLM-2024-001236` is created for a $15 office visit, referencing payer "United Healthcare"
2. **Denial Received:** Denial `750e8400-e29b-41d4-a716-446655440002` is created with code PR-1 (patient responsibility)
3. **Write-off Created:** Write-off `950e8400-e29b-41d4-a716-446655440001` is created because $15 is below the $25 threshold
4. **Outcome:** Resolution status "abandoned", approved by Billing Manager

**Scenario 3: Denial → Rebill (Coding Error)**
1. **Claim Submission:** Claim `CLM-2024-001237` is created for $250, missing modifier 25 on E/M code
2. **Denial Received:** Denial `750e8400-e29b-41d4-a716-446655440003` is created with code CO-4 (modifier error)
3. **Rebill Created:** Rebill `a50e8400-e29b-41d4-a716-446655440001` corrects the claim with modifier 25 added
4. **Outcome:** New claim `CLM-2024-001567` paid $200, recovery successful

**Scenario 4: Payment Variance (Underpayment)**
1. **Claim Submission:** Claim `CLM-2024-001890` is created for $500 office visit with ECG, referencing "Medicare"
2. **Payment Received:** Only $425 paid instead of expected $500
3. **Variance Created:** Payment variance `b50e8400-e29b-41d4-a716-446655440001` tracks the -$75 (-15%) underpayment
4. **Outcome:** Requires appeal - incorrect 2023 fee schedule was applied

## Setup

### Quick Start (Docker)

```bash
# 1. Start PostgreSQL (port 5432)
docker-compose up -d --build

# 2. Create environment file
cp packages/migrations/.env.example packages/migrations/.env

# 3. Install dependencies
yarn install

# 4. Build and run migrations
yarn workspace @rcm/migrations build
yarn workspace @rcm/migrations migrate:up

# 5. Seed demo data (optional)
yarn workspace @rcm/migrations seed

# 6. Verify setup (optional)
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
# Access at http://localhost:5050 (admin@example.com / admin)
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
docker-compose down -v

# Start database
docker-compose up -d --build
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
yarn migrate:create migration-name
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
        timestamp created_at
        timestamp updated_at
    }

    claims {
        uuid id PK
        varchar claim_id UK
        varchar patient_id
        uuid payer_id FK
        varchar status
        decimal amount
        decimal paid_amount
        date service_date
        timestamp submitted_date
        jsonb cpt_codes
        jsonb diagnosis_codes
        varchar place_of_service
        varchar claim_type
        jsonb raw_data
        boolean has_payment_variance
        integer variance_count
        timestamp created_at
        timestamp updated_at
    }

    denials {
        uuid id PK
        uuid claim_id FK
        varchar denial_code
        varchar denial_category
        text denial_reason
        decimal denial_amount
        timestamp denial_date
        boolean is_preventable
        varchar root_cause
        varchar action_taken
        timestamp action_date
        varchar resolution_status
        decimal recovered_amount
        jsonb raw_data
        boolean appealed
        boolean written_off
        timestamp write_off_date
        boolean rebilled
        timestamp rebill_date
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
        decimal write_off_amount
        varchar write_off_reason
        text reason_notes
        varchar approved_by
        timestamp approval_date
        varchar category
        boolean is_preventable
        timestamp created_at
        timestamp updated_at
    }

    rebills {
        uuid id PK
        uuid original_claim_id FK
        uuid new_claim_id FK
        uuid denial_id FK
        varchar rebill_reason
        jsonb changes_made
        text reason_notes
        decimal rebill_amount
        varchar status
        timestamp submitted_date
        timestamp resolution_date
        decimal recovered_amount
        varchar created_by
        timestamp created_at
        timestamp updated_at
    }

    payment_variances {
        uuid id PK
        uuid claim_id FK
        uuid payer_id
        decimal expected_amount
        decimal actual_amount
        decimal variance_amount
        decimal variance_percentage
        varchar variance_type
        varchar variance_reason
        timestamp payment_date
        text reason_notes
        boolean requires_appeal
        uuid appeal_id FK
        boolean resolved
        timestamp resolution_date
        text resolution_notes
        varchar created_by
        timestamp created_at
        timestamp updated_at
    }

    denial_code_library {
        uuid id PK
        varchar code UK
        varchar category
        text description
        boolean is_appealable
        text common_resolution
        text prevention_tips
        timestamp created_at
    }

    org_policies {
        uuid id PK
        varchar policy_name UK
        varchar policy_type
        uuid payer_id FK
        varchar denial_category
        decimal min_amount
        decimal max_amount
        integer days_to_action
        boolean auto_appeal
        boolean auto_write_off
        jsonb config
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    coding_rules {
        uuid id PK
        varchar rule_name
        varchar rule_type
        varchar cpt_code
        varchar cpt_pattern
        varchar required_modifier
        jsonb incompatible_codes
        varchar required_diagnosis_pattern
        uuid payer_specific FK
        text error_message
        varchar severity
        boolean is_active
        timestamp created_at
    }
```

### Key Relationships

- **Payers** are the root entity, connected to claims and optionally to specific policies and coding rules
- **Claims** can have multiple denials and payment variances; tracks `has_payment_variance` and `variance_count`
- **Denials** track resolution via `appealed`, `written_off`, and `rebilled` flags with corresponding dates
- **Appeals, Write-offs, and Rebills** all reference both denial and claim for complete audit trail
- **Rebills** reference both the original claim and optionally a new claim ID after correction
- **Payment Variances** track expected vs actual payments and may link to appeals
- **Reference Tables** (denial_code_library, org_policies, coding_rules) provide validation and workflow rules
