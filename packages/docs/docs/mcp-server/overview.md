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

**2. Build and start MCP server:**

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

## Available Tools

The MCP server provides 24 tools organized by workflow:

| Category | Tools | Description |
|----------|-------|-------------|
| **Core Workflows** | `normalize_claim`, `classify_denial`, `suggest_next_action`, `batch_classify_denials`, `audit_coding` | Denial triage and validation |
| **Appeals** | `create_appeal`, `update_appeal`, `list_appeals`, `get_appeal_analytics` | Appeal lifecycle management |
| **Write-offs** | `create_write_off`, `list_write_offs`, `get_write_off_analytics` | Uncollectible tracking |
| **Rebills** | `create_rebill`, `update_rebill`, `list_rebills`, `get_rebill_analytics` | Correction workflows |
| **Variances** | `create_payment_variance`, `update_payment_variance`, `list_payment_variances`, `get_payment_variance_analytics` | Payment analysis |

## Why Use AI for RCM?

### Pattern Recognition
AI excels at identifying complex patterns across thousands of denials that humans might miss.

### Natural Language Processing
Healthcare staff can describe issues in plain English instead of learning complex query languages.

### Intelligent Recommendations
AI applies organization policies consistently and suggests optimal actions.

### Efficiency Gains
- Reduces manual research time
- Prevents errors with pre-submission validation
- Prioritizes high-value work automatically
- Scalable analysis of thousands of denials

## Next Steps

1. **[Explore workflows](/docs/workflows/denial-triage)** - See detailed examples
2. **[Set up database](/docs/migrations/setup)** - Configure PostgreSQL
3. **[View MCP Server README](https://github.com/caverac/rcm/tree/main/packages/mcp-server)** - Complete tool reference
