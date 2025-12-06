# RCM MCP Server

Model Context Protocol (MCP) server for Revenue Cycle Management operations.

## Features

This MCP server provides comprehensive tools for managing insurance claims, denials, and revenue cycle analytics:

### Core RCM Workflows

- **normalize_claim**: Normalize and validate claim data from various formats (837, 835, JSON)
- **classify_denial**: Classify denial codes and get resolution guidance
- **suggest_next_action**: Get AI-powered recommendations for handling denials based on org policies
- **batch_classify_denials**: Analyze multiple denials for patterns and cash leakage insights
- **audit_coding**: Pre-submission coding validation to prevent denials

### Legacy Tools (Backward Compatible)

- **create_claim**: Create a new insurance claim for a patient
- **get_claim**: Retrieve claim information by claim ID
- **update_claim_status**: Update the status of an existing claim
- **list_claims**: List all claims, optionally filtered by patient ID

## Running Locally

### Prerequisites

- Node.js 20+
- Yarn 4.2.2 (managed via corepack)

### 1. Build the Server

From the monorepo root:

```bash
# Build all packages
yarn build

# Or build just the MCP server
cd packages/mcp-server
yarn build
```

### 2. Run Standalone

```bash
# From packages/mcp-server directory
node dist/index.js
```

The server will output: `RCM MCP Server running on stdio`

**Note:** The server supports two modes:
- **In-memory mode** (default): No database required, data is lost on restart
- **PostgreSQL mode**: Set `DATABASE_URL` environment variable for persistent storage

For local testing without a database, the server will use in-memory storage. For full functionality including analytics and policy-based recommendations, connect to PostgreSQL.

### 3. Integration with Claude Desktop

To use with Claude Desktop, add this configuration:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "rcm": {
      "command": "node",
      "args": ["/absolute/path/to/rcm/packages/mcp-server/dist/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/rcm` with your actual project path.

### 4. Test the Server

After configuring Claude Desktop:

1. Restart Claude Desktop
2. Look for the 🔌 icon indicating MCP servers are connected
3. Try creating a claim:
   ```
   Create a claim for patient PAT-001 with amount $1500
   ```

## Development Mode

Watch mode rebuilds automatically on file changes:

```bash
yarn dev
```

## Workflow Examples

The MCP server supports three main workflow patterns for comprehensive revenue cycle management.

### Flow A: Denial Triage

**Tools Used:** `classify_denial`, `suggest_next_action`

**User Input:**
```
"We're getting CO-197 denials on outpatient imaging. One claim is $450 for CPT 70553. What should we do?"
```

**ChatGPT Workflow:**
1. Calls `classify_denial` with "CO-197"
   - Returns: AUTHORIZATION category, appealable, 60% recovery chance
2. Calls `suggest_next_action` with claim_id, CO-197, $450
   - Returns: "Appeal recommended, meets $250+ threshold, high priority, 15-day action deadline"
3. Presents to user:
   "This is an AUTHORIZATION denial (missing pre-cert). For $450, this meets your org's appeal threshold. I recommend appealing within 15 days. Steps: 1) Gather pre-auth documentation, 2) Submit appeal with medical necessity, 3) Track status"

### Flow B: Cash Leakage Analysis

**Tools Used:** `batch_classify_denials`

**User Input:**
```csv
claim_id,denial_code,amount,payer
CLM-001,CO-197,450,PAYER-X
CLM-002,CO-197,320,PAYER-X
CLM-003,CO-50,200,PAYER-Y
CLM-004,CO-4,150,PAYER-X
```

**ChatGPT Workflow:**
1. Calls `batch_classify_denials` with all denials, group_by="category"
   - Groups: 66% AUTHORIZATION ($770), 17% NON_COVERED ($200), 13% CODING_ERROR ($150)
2. Presents to user:
   "66% of your denials ($770) are AUTHORIZATION issues, mostly with Payer X on imaging. This is preventable - implement pre-cert checks for imaging orders to Payer X. The remaining denials are split between medical necessity (17%) and coding errors (13%)."

**Analytics Features:**
- Grouping by category, payer, or denial code
- Percentage breakdowns and average amounts
- Actionable insights and recommendations
- Identifies high-volume low-value vs low-volume high-value denials
- Concentration risk detection

### Flow C: Pre-Submission Check

**Tools Used:** `normalize_claim`, `audit_coding`

**User Input:**
```json
{
  "patient_id": "PAT-001",
  "cpt_codes": [{"code": "99213"}, {"code": "11055"}],
  "diagnosis_codes": [{"code": "Z00.00"}],
  "amount": 150
}
```

**ChatGPT Workflow:**
1. Calls `normalize_claim` - validates format
2. Calls `audit_coding` - finds issues:
   - Warning: E/M 99213 with procedure 11055 on same day needs modifier 25
   - Warning: Z00.00 too general for medical necessity
3. Presents to user:
   "Two issues found: (1) Missing modifier 25 on 99213 when billed with 11055 on same day, (2) Z00.00 is too general and won't support medical necessity for most payers. Fix these before submitting to avoid denials."

**Coding Rules Checked:**
- Modifier requirements (25, 50, 59, RT/LT)
- Diagnosis support for procedures
- Bundling and NCCI edits
- E/M with procedure same day
- Invalid or overly general diagnosis codes
- Payer-specific rules

## Running in the Cloud

To run the MCP server with PostgreSQL:

### 1. Deploy AWS Infrastructure

First, deploy the PostgreSQL RDS instance:

```bash
cd ../infrastructure

# Configure AWS credentials
export AWS_PROFILE=your-profile

# Deploy the stack
yarn build
yarn deploy
```

This creates:
- PostgreSQL RDS instance (encrypted, backed up)
- VPC with isolated database subnets
- S3 bucket for document storage
- Lambda functions for API access

### 2. Run Database Migrations

```bash
cd ../migrations

# Get database credentials from AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id <SECRET_ARN> --query SecretString --output text

# Set DATABASE_URL
export DATABASE_URL="postgresql://rcm_admin:<PASSWORD>@<DB_ENDPOINT>:5432/rcmdb"

# Run migrations
yarn migrate:up
```

This creates all tables and seeds reference data:
- Denial code library (CO-197, CO-50, etc.)
- Default organization policies
- Coding validation rules

### 3. Configure MCP Server

Set the DATABASE_URL environment variable:

```bash
export DATABASE_URL="postgresql://rcm_admin:<PASSWORD>@<DB_ENDPOINT>:5432/rcmdb"
```

### 4. Deployment Options

**Option A: Run as Lambda Function**
- Package the MCP server as a Lambda function
- Trigger via API Gateway
- Suitable for serverless architectures

**Option B: Run on EC2/ECS**
- Deploy as a long-running process
- Connect to DynamoDB for storage
- Suitable for persistent connections

**Option C: Hybrid Approach**
- Keep MCP server running locally/on-premise
- Connect to cloud DynamoDB via AWS SDK
- Best for development with cloud storage

### 5. Environment Variables

Set these environment variables:

```bash
DATABASE_URL=postgresql://rcm_admin:<PASSWORD>@<DB_ENDPOINT>:5432/rcmdb
DOCUMENTS_BUCKET_NAME=rcmstack-documentsbucket-XXXXX  # Optional, from CDK outputs
```

## Architecture

### Local Development
```
Claude Desktop
    ↓ (stdio)
MCP Server (in-memory)
```

### Production (Option C - Recommended)
```
Claude Desktop
    ↓ (stdio)
MCP Server
    ↓ (PostgreSQL client)
AWS RDS PostgreSQL + S3
```

## Troubleshooting

### Server Not Appearing in Claude Desktop

1. Check the config file path is correct
2. Ensure absolute paths are used (not relative)
3. Verify the server builds without errors: `yarn build`
4. Check Claude Desktop logs for errors

### Claims Not Persisting

This is expected in in-memory mode. To persist data:

1. Deploy PostgreSQL using the infrastructure package
2. Run database migrations
3. Set DATABASE_URL environment variable
4. Restart the MCP server

The server will automatically detect the database and use it for storage.

## Reference Data

When you run database migrations, the following reference data is automatically seeded:

### Denial Code Library (12 Common Codes)
- **CO-197**: Authorization missing
- **CO-4**: Modifier error
- **CO-50**: Medical necessity
- **CO-97**: Bundling
- **CO-29**: Timely filing
- **CO-18**: Duplicate claim
- **CO-22**: Coordination of benefits
- **CO-27**: Eligibility/coverage terminated
- **CO-96**: Non-covered charges
- **PR-1**: Patient deductible
- **PR-2**: Patient coinsurance
- **PR-3**: Patient copayment

### Organization Policies (5 Default Policies)
- **Default Appeal Threshold**: $100+ appeals
- **Authorization Denials**: Auto-appeal $250+ (15-day deadline)
- **Small Balance Write-Off**: <$25 auto write-off
- **Coding Errors**: Quick rebill (7-day action)
- **Patient Responsibility**: Transfer to patient balance

### Coding Rules (5 Common Rules)
- Modifier 25 required with E/M and procedure same day
- Bilateral modifier 50 for bilateral procedures
- Screening colonoscopy diagnosis requirements
- Modifier 59 for distinct procedural services
- Invalid diagnosis code warnings (Z00.00, etc.)

## Database Schema

### Claims Table
- Comprehensive billing information
- CPT codes with modifiers (JSONB)
- ICD-10 diagnosis codes (JSONB)
- Place of service, claim type
- Raw EDI data storage (837/835)

### Denials Table
- Linked to claims (foreign key)
- Denial codes, categories, reasons
- Action tracking (appeal, write-off, rebill)
- Resolution status and recovered amounts
- Root cause analysis fields

### Payers Table
- Payer information and identifiers
- Type (commercial, medicare, medicaid)
- Contact information (JSONB)

### Organization Policies Table
- Policy types (appeal_threshold, write_off_threshold, rebill_threshold)
- Payer-specific or global rules
- Category-specific or universal
- Thresholds and auto-processing flags
- Days to action deadlines

### Coding Rules Table
- Rule types (modifier_required, diagnosis_support, bundling, etc.)
- CPT patterns and specific codes
- Required modifiers and diagnosis patterns
- Payer-specific validation rules
- Error severity levels (error, warning, info)

### Denial Code Library Table
- Reference table for all denial codes
- Categories and descriptions
- Appealability flags
- Common resolution steps
- Prevention tips

## Key Benefits

1. **Intelligent Denial Triage**: Automatic classification and action recommendations based on configurable org policies
2. **Cash Leakage Analytics**: Identify patterns, concentration risks, and preventable denials with actionable insights
3. **Pre-Submission Validation**: Catch coding errors before claims are submitted, reducing denial rates
4. **Configurable Policies**: Customize appeal thresholds, write-off limits, and auto-processing rules per payer
5. **Comprehensive Tracking**: Full audit trail of denials, actions taken, and recovery rates
6. **Extensible Rules Engine**: Add payer-specific coding rules and validation logic via SQL

## Customization

### Add New Denial Codes

Connect to your database and run:

```sql
INSERT INTO denial_code_library (code, category, description, is_appealable, common_resolution, prevention_tips)
VALUES ('CO-XXX', 'YOUR_CATEGORY', 'Description', true, 'Resolution steps', 'Prevention tips');
```

### Add Organization Policies

```sql
INSERT INTO org_policies (policy_name, policy_type, min_amount, days_to_action, auto_appeal)
VALUES ('High Value Appeals', 'appeal_threshold', 1000.00, 10, true);
```

### Add Payer-Specific Policies

```sql
INSERT INTO org_policies (policy_name, policy_type, payer_id, denial_category, min_amount, auto_appeal)
VALUES ('BCBS Auth Denials', 'appeal_threshold',
        (SELECT id FROM payers WHERE payer_id = 'BCBS'),
        'AUTHORIZATION', 200.00, true);
```

### Add Coding Rules

```sql
INSERT INTO coding_rules (rule_name, rule_type, cpt_code, required_modifier, error_message, severity)
VALUES ('My Custom Rule', 'modifier_required', '12345', 'XX', 'Custom rule message', 'warning');
```

### Add Payer-Specific Coding Rules

```sql
INSERT INTO coding_rules (rule_name, rule_type, cpt_code, payer_specific, error_message, severity)
VALUES ('Medicare Modifier Rule', 'modifier_required', '99213',
        (SELECT id FROM payers WHERE payer_id = 'MEDICARE'),
        'Medicare requires specific modifier for this code', 'error');
```

## Tool Reference

### normalize_claim

Normalize and validate claim data from various formats. Stores claim in database if valid.

```typescript
{
  "claim_data": {
    "patient_id": "PAT-001",
    "amount": 1500.00,
    "cpt_codes": [
      { "code": "99213", "modifiers": ["25"] },
      { "code": "11055", "units": 1 }
    ],
    "diagnosis_codes": [
      { "code": "L60.0" }
    ],
    "service_date": "2024-01-15",
    "payer_id": "..."
  },
  "format": "json"
}
```

Returns: Normalized claim with validation warnings (if any)

### classify_denial

Classify a denial code and get category, description, and resolution guidance.

```typescript
{
  "denial_code": "CO-197",
  "denial_text": "Precertification absent"
}
```

Returns:
```json
{
  "code": "CO-197",
  "category": "AUTHORIZATION",
  "description": "Precertification/authorization/notification absent",
  "is_appealable": true,
  "common_resolution": "Obtain retroactive authorization or appeal with medical necessity",
  "prevention_tips": "Implement pre-service authorization checks"
}
```

### suggest_next_action

Get AI-powered recommendation for handling a denial.

```typescript
{
  "claim_id": "CLM-123",
  "denial_code": "CO-197",
  "denial_amount": 350.00,
  "payer_id": "..."
}
```

Returns:
```json
{
  "recommended_action": "appeal",
  "reason": "Amount $350 meets appeal threshold of $250. Authorization denial.",
  "priority": "high",
  "days_to_action": 15,
  "auto_process": true,
  "policy_applied": "Authorization Denials - Auto Appeal",
  "estimated_recovery_chance": 60,
  "next_steps": [
    "Gather supporting documentation",
    "Obtain retroactive authorization or appeal with medical necessity",
    "Submit appeal within timely filing limits",
    "Track appeal status"
  ]
}
```

### batch_classify_denials

Analyze multiple denials for patterns and insights.

```typescript
{
  "denials": [
    { "denial_code": "CO-197", "denial_amount": 450, "payer_id": "..." },
    { "denial_code": "CO-197", "denial_amount": 320, "payer_id": "..." },
    { "denial_code": "CO-50", "denial_amount": 200 }
  ],
  "group_by": "category"
}
```

Returns:
```json
{
  "total_denials": 3,
  "total_amount": 970.00,
  "groups": [
    {
      "group_key": "AUTHORIZATION",
      "count": 2,
      "total_amount": 770.00,
      "percentage": 79.38,
      "top_codes": ["CO-197"],
      "avg_amount": 385.00
    }
  ],
  "insights": [
    "79% of write-offs are from AUTHORIZATION",
    "Recommendation: Implement pre-service authorization checks"
  ]
}
```

### audit_coding

Pre-submission coding validation to prevent denials.

```typescript
{
  "claim_data": {
    "cpt_codes": [
      { "code": "99213" },
      { "code": "11055" }
    ],
    "diagnosis_codes": [
      { "code": "Z00.00" }
    ]
  },
  "include_warnings": true
}
```

Returns:
```json
{
  "passed": false,
  "errors": [
    {
      "rule_name": "E/M with Procedure Same Day",
      "severity": "warning",
      "message": "E/M code billed on same day as procedure typically requires modifier 25",
      "cpt_code": "99213",
      "suggestion": "Add modifier 25 to E/M code"
    },
    {
      "rule_name": "Invalid Diagnosis Z00.00",
      "severity": "warning",
      "message": "Z00.00 is too general and may not support medical necessity",
      "suggestion": "Use more specific diagnosis code"
    }
  ],
  "summary": {
    "total_issues": 2,
    "errors": 0,
    "warnings": 2,
    "info": 0
  },
  "risk_level": "medium"
}
```

### create_claim (Legacy)

```typescript
{
  "patientId": "PAT-001",
  "amount": 1500.00
}
```

Returns: Created claim object with generated `claimId`

### get_claim

```typescript
{
  "claimId": "CLM-1234567890"
}
```

Returns: Claim object or error if not found

### update_claim_status

```typescript
{
  "claimId": "CLM-1234567890",
  "status": "submitted" | "paid" | "denied" | "pending"
}
```

Returns: Updated claim object

### list_claims

```typescript
{
  "patientId": "PAT-001"  // optional
}
```

Returns: Array of claim objects

## System Architecture

### Technology Stack

**Database:** PostgreSQL 16
- Chosen for complex analytics queries (GROUP BY, aggregations, JOINs)
- Essential for cash leakage analysis with clustering and grouping
- JSON support for flexible schema (CPT codes, diagnosis codes, raw EDI)
- Full relational integrity for claims, denials, and policies

**MCP Server:** Node.js + TypeScript
- Model Context Protocol SDK for Claude integration
- PostgreSQL client (pg 8.16.3)
- Real-time denial classification
- Policy-based action recommendations

**Infrastructure:** AWS CDK
- PostgreSQL RDS (encrypted, backed up)
- VPC with isolated database subnets
- S3 for document storage
- Lambda functions for API access

### Architecture Diagram

```
┌─────────────────┐
│ Claude Desktop  │
│   (User)        │
└────────┬────────┘
         │ stdio (MCP)
         ▼
┌─────────────────────────────────┐
│  MCP Server (Node.js)           │
│  ┌─────────────────────────┐    │
│  │  Tools:                 │    │
│  │  - normalize_claim      │    │
│  │  - classify_denial      │    │
│  │  - suggest_next_action  │    │
│  │  - batch_classify       │    │
│  │  - audit_coding         │    │
│  └─────────────────────────┘    │
└────────┬────────────────────────┘
         │ pg client
         ▼
┌─────────────────────────────────┐
│  PostgreSQL RDS (AWS)           │
│  ┌─────────────────────────┐    │
│  │  Tables:                │    │
│  │  - claims               │    │
│  │  - denials              │    │
│  │  - payers               │    │
│  │  - denial_code_library  │    │
│  │  - org_policies         │    │
│  │  - coding_rules         │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  S3 Bucket      │
│  (Documents)    │
└─────────────────┘
```

### Data Flow

#### Flow A (Denial Triage):
```
User → Claude → normalize_claim → DB (insert claim)
                ↓
         classify_denial → DB (lookup denial code)
                ↓
      suggest_next_action → DB (apply org policies)
                ↓
              Response (recommended action)
```

#### Flow B (Cash Leakage):
```
User → Claude → batch_classify_denials → DB (query denials)
                                         ↓
                                   Group & Analyze
                                         ↓
                              Generate Insights
                                         ↓
                         Response (analytics + recommendations)
```

#### Flow C (Pre-Submission):
```
User → Claude → normalize_claim → Validate format
                ↓
           audit_coding → DB (fetch coding rules)
                ↓
         Apply validation rules
                ↓
      Response (errors/warnings)
```

### Why This Architecture?

**PostgreSQL Over DynamoDB:**
- Complex analytics queries required for Flow B
- Better JOIN performance for denials + claims + payers
- Easier ad-hoc reporting and data exploration
- Standard SQL for customization

**MCP Server Design:**
- Stateless tools for reliability
- Database handles all persistence
- Easy to scale horizontally
- Can run locally or in cloud

**Reference Data Approach:**
- Denial codes in database (not hardcoded)
- Configurable org policies per customer
- Extensible rules engine
- Easy to customize via SQL

## Implementation Details

### File Structure

```
packages/mcp-server/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── db.ts                 # PostgreSQL client
│   ├── types.ts              # TypeScript interfaces
│   └── tools/
│       ├── normalize-claim.ts
│       ├── classify-denial.ts
│       ├── suggest-next-action.ts
│       ├── batch-classify-denials.ts
│       └── audit-coding.ts
├── package.json
└── README.md
```

### Key Features

- **In-Memory Fallback**: Works without database for basic testing
- **Graceful Degradation**: Legacy tools work in both modes
- **Error Handling**: Comprehensive error messages and validation
- **Type Safety**: Full TypeScript coverage
- **Extensibility**: Easy to add new tools and rules

## Next Steps

1. **Deploy Infrastructure**: `cd ../infrastructure && yarn deploy`
2. **Run Migrations**: `cd ../migrations && yarn migrate:up`
3. **Configure Claude Desktop**: Add DATABASE_URL to config
4. **Test Workflows**: Try Flow A, B, and C examples
5. **Customize**: Add your organization's policies and coding rules
