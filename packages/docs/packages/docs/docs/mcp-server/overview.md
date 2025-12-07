---
sidebar_position: 1
---

# MCP Server Overview

The RCM MCP Server provides AI-powered revenue cycle management tools through the Model Context Protocol (MCP). It enables AI assistants to help with denial triage, cash leakage analysis, appeals management, and coding validation.

## What is MCP?

Model Context Protocol (MCP) is an open protocol that enables AI assistants to securely connect to external data sources and tools. The RCM MCP Server implements this protocol to provide healthcare-specific RCM capabilities.

## Key Capabilities

### 🎯 Denial Triage & Classification

- Classify denial codes and get resolution recommendations
- AI-powered analysis of denial patterns
- Policy-based action suggestions (appeal, write-off, rebill)

### 📊 Cash Leakage Analysis

- Batch analysis of denial patterns
- Identify high-impact denial categories
- Detect payer concentration risks

### ⚖️ Appeals Management

- Track appeal lifecycle from filing to resolution
- Monitor overdue appeals
- Analyze appeal success rates by type and payer

### 💰 Financial Workflows

- Write-off tracking with preventability analysis
- Rebilling workflows with correction tracking
- Payment variance detection and resolution

### ✅ Pre-Submission Validation

- Coding rule validation (modifiers, diagnosis support)
- Prevent denials before claim submission
- Payer-specific rules compliance

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (optional - can run in-memory mode)
- Yarn package manager

### Local Setup with Docker

**1. Start PostgreSQL database:**

See [Migrations Setup](/docs/migrations/setup) for detailed database setup instructions.

```bash
# From project root
docker-compose up -d
cp .env.example .env
```

**2. Run migrations:**

```bash
yarn workspace @rcm/migrations build
yarn workspace @rcm/migrations migrate:up
```

**3. Build and start MCP server:**

```bash
cd packages/mcp-server
yarn build
export DATABASE_URL="postgresql://rcm_admin:rcm_password@localhost:5432/rcmdb"
node dist/index.js
```

Output: `RCM MCP Server v2.0 running on stdio (PostgreSQL connected)`

### In-Memory Mode (No Database)

For testing without PostgreSQL:

```bash
cd packages/mcp-server
yarn build
node dist/index.js
```

Output: `RCM MCP Server v2.0 running on stdio (in-memory mode)`

**Note:** In-memory mode stores data temporarily - it's lost when the server stops.

### Integration with AI Assistants

The MCP server communicates via stdio using the Model Context Protocol. Configure your AI assistant client to connect:

```json
{
  "mcpServers": {
    "rcm": {
      "command": "node",
      "args": ["/absolute/path/to/rcm/packages/mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://rcm_admin:rcm_password@localhost:5432/rcmdb"
      }
    }
  }
}
```

## Available Tools

The MCP server provides 24 tools organized by workflow:

| Category           | Tools                                                                                                            | Description                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **Core Workflows** | `normalize_claim`, `classify_denial`, `suggest_next_action`, `batch_classify_denials`, `audit_coding`            | Denial triage and validation |
| **Appeals**        | `create_appeal`, `update_appeal`, `list_appeals`, `get_appeal_analytics`                                         | Appeal lifecycle management  |
| **Write-offs**     | `create_write_off`, `list_write_offs`, `get_write_off_analytics`                                                 | Uncollectible tracking       |
| **Rebills**        | `create_rebill`, `update_rebill`, `list_rebills`, `get_rebill_analytics`                                         | Correction workflows         |
| **Variances**      | `create_payment_variance`, `update_payment_variance`, `list_payment_variances`, `get_payment_variance_analytics` | Payment analysis             |

## Workflow Examples

- **[Denial Triage](/docs/mcp-server/workflows/denial-triage)** - Classify denials and get AI-powered recommendations
- **[Cash Leakage Analysis](/docs/mcp-server/workflows/cash-leakage)** - Identify revenue loss patterns
- **[Appeals Management](/docs/mcp-server/workflows/appeals)** - Track and analyze appeals
- **[Pre-Submission Coding](/docs/mcp-server/workflows/coding-validation)** - Prevent denials with AI validation
- **[Write-Off Analysis](/docs/mcp-server/workflows/write-offs)** - Track preventable write-offs
- **[Payment Variances](/docs/mcp-server/workflows/payment-variances)** - Detect underpayments

## Why Use AI for RCM?

### Pattern Recognition

AI excels at identifying complex patterns across thousands of denials that humans might miss. It can detect:

- Payer-specific denial trends
- Time-based patterns (denials increasing on certain days/months)
- Correlation between denial codes and claim characteristics

### Natural Language Processing

Healthcare staff can describe issues in plain English instead of learning complex query languages:

- "Show me all authorization denials over $500 this month"
- "Which payers are denying most frequently?"
- "What's our appeal success rate for medical necessity?"

### Intelligent Recommendations

AI applies organization policies consistently and suggests optimal actions:

- Considers multiple factors (amount, appealability, success rate, deadlines)
- Learns from historical outcomes
- Adapts recommendations based on payer behavior

### Efficiency Gains

- **Reduces manual research time** - AI retrieves denial code information instantly
- **Prevents errors** - Pre-submission validation catches mistakes before submission
- **Prioritizes work** - Automatically identifies high-value, high-probability appeals
- **Scalable analysis** - Can analyze thousands of denials in seconds

## Architecture

```mermaid
graph TB
    A[AI Assistant] -->|MCP Protocol| B[MCP Server]
    B -->|SQL Queries| C[PostgreSQL]
    C -->|Data| B
    B -->|Tool Results| A

    B --> D[Denial Triage Tools]
    B --> E[Appeals Tools]
    B --> F[Analytics Tools]
    B --> G[Validation Tools]

    C --> H[Claims Table]
    C --> I[Denials Table]
    C --> J[Appeals Table]
    C --> K[Reference Data]
```

## Next Steps

1. **[Set up your first workflow](/docs/mcp-server/workflows/denial-triage)** - Start with denial triage
2. **[Explore all workflows](/docs/workflows/appeals-management)** - See detailed examples
3. **[Customize policies](/docs/migrations/setup#organization-policies)** - Configure for your organization
