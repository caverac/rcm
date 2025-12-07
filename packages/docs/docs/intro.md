---
sidebar_position: 1
---

# Introduction

Welcome to the **RCM MCP Server** documentation! This is a comprehensive Revenue Cycle Management platform with AI-powered denial triage, cash leakage analytics, and pre-submission coding validation.

## What is RCM MCP Server?

RCM MCP Server is a Model Context Protocol (MCP) server that provides intelligent revenue cycle management tools for healthcare organizations. It integrates with Claude AI to help you:

- **Triage denials** with AI-powered recommendations
- **Analyze cash leakage** patterns across payers and denial categories
- **Validate coding** before claim submission to prevent denials
- **Automate workflows** based on configurable organization policies

## Key Features

### 🎯 Intelligent Denial Triage

Automatically classify denial codes and get action recommendations based on your organization's policies. The system considers:

- Denial category and appealability
- Amount thresholds
- Recovery probability
- Days to action deadlines

### 📊 Cash Leakage Analytics

Identify patterns and prevent revenue loss with comprehensive analytics:

- Group denials by category, payer, or code
- Identify high-volume low-value vs. low-volume high-value denials
- Detect concentration risks
- Get actionable recommendations

### ✅ Pre-Submission Validation

Catch coding errors before claims are submitted:

- Modifier requirements (25, 50, 59, RT/LT)
- Diagnosis support validation
- Bundling and NCCI edits
- Payer-specific rules

### ⚙️ Configurable Policies

Customize for your organization:

- Appeal thresholds by payer and category
- Auto-processing rules
- Write-off limits
- Coding validation rules

## Architecture

```
┌─────────────────┐
│ Claude Desktop  │
└────────┬────────┘
         │ stdio (MCP)
         ▼
┌─────────────────┐
│  MCP Server     │
│  (Node.js)      │
└────────┬────────┘
         │ pg client
         ▼
┌─────────────────┐
│  PostgreSQL RDS │
│  (AWS)          │
└─────────────────┘
```

## Technology Stack

- **Database**: PostgreSQL 16 (chosen for complex analytics queries)
- **MCP Server**: Node.js + TypeScript
- **Infrastructure**: AWS CDK (RDS, VPC, S3)
- **AI Integration**: Claude via Model Context Protocol

## Quick Start

Get started in 5 minutes:

1. **Install dependencies**

   ```bash
   yarn install
   ```

2. **Deploy infrastructure** (optional for cloud mode)

   ```bash
   cd packages/infrastructure
   yarn deploy
   ```

3. **Run migrations** (if using PostgreSQL)

   ```bash
   cd packages/migrations
   export DATABASE_URL="postgresql://..."
   yarn migrate:up
   ```

4. **Start MCP server**
   ```bash
   cd packages/mcp-server
   yarn build
   node dist/index.js
   ```

## Next Steps

- **[Getting Started Guide](./getting-started/installation.md)** - Install and configure the system
- **[MCP Server Documentation](./mcp-server/overview.md)** - Learn about available tools
- **[Workflow Examples](./workflows/denial-triage.md)** - See real-world usage examples
- **[Infrastructure Guide](./infrastructure/deployment.md)** - Deploy to AWS
