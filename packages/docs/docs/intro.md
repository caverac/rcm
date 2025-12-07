---
sidebar_position: 1
---

# Introduction

**RCM** (Revenue Cycle Management) is a comprehensive healthcare billing platform that uses AI to optimize claim processing, reduce denials, and maximize revenue recovery.

## Overview

The RCM platform helps healthcare organizations manage the complete revenue cycle - from claim submission through payment collection. By integrating AI assistants through the Model Context Protocol (MCP), it transforms complex billing workflows into conversational interactions.

## What Problems Does It Solve?

### 1. Denial Management
Healthcare providers lose billions annually to claim denials. RCM provides:
- **Instant denial classification** - Understand why claims were denied
- **AI-powered recommendations** - Know whether to appeal, rebill, or write off
- **Pattern detection** - Identify systemic issues causing repeated denials

### 2. Cash Leakage
Money slips through the cracks when denials aren't worked properly. RCM helps:
- **Identify revenue loss patterns** - Group denials by category, payer, or code
- **Calculate recovery potential** - Know which denials are worth pursuing
- **Prioritize work** - Focus staff time on high-value opportunities

### 3. Preventable Denials
Many denials can be prevented with better processes. RCM enables:
- **Pre-submission validation** - Catch coding errors before claims are sent
- **Automated rule checking** - Verify modifiers, diagnosis support, and NCCI edits
- **Policy compliance** - Ensure claims meet payer requirements

### 4. Manual Research Time
Billing staff spend hours looking up denial codes and policies. RCM provides:
- **Conversational access** to denial code libraries and payer policies
- **Instant recommendations** based on organization rules
- **Natural language queries** instead of complex database searches

## Platform Components

RCM is organized as a monorepo containing four main packages:

### [MCP Server](/docs/mcp-server/overview)
AI-powered revenue cycle management tools accessible through the Model Context Protocol:
- 24 specialized tools for denial triage, appeals, write-offs, and analytics
- Works with any AI assistant that supports MCP
- Can run with PostgreSQL or in-memory mode

### [Database Migrations](/docs/migrations/setup)
PostgreSQL schema with comprehensive RCM data model:
- 10 tables tracking claims, denials, appeals, and financial workflows
- Seeded reference data (denial codes, policies, coding rules)
- Complete audit trail for compliance

### [Infrastructure](/docs/infrastructure/deployment)
AWS CDK templates for production deployment:
- RDS PostgreSQL database
- VPC networking and security
- S3 document storage

### [Shared Types](/docs/shared-types/overview)
TypeScript schemas and validation:
- Zod runtime validation
- Shared across all packages
- Type-safe API contracts

## How It Works

1. **Ask Questions** - Billing staff asks AI assistant about denials, appeals, or coding issues
2. **AI Uses Tools** - Assistant calls MCP server tools to access RCM data and logic
3. **Get Recommendations** - AI provides specific, policy-driven recommendations
4. **Take Action** - Staff follows guidance to appeal, rebill, or write off claims

## Example Interaction

**Staff:** "We got a CO-197 denial for $450. What should we do?"

**AI Assistant:**
> This is an authorization denial (CO-197). Your policy says to appeal all authorization denials over $250.
>
> **Recommended Action:** Appeal (High Priority)
> - Amount: $450 exceeds $250 threshold
> - Success rate: 65% for authorization denials
> - Next steps: Gather authorization documentation, file within 15 days


## Next Steps

- **[Explore Workflows](/docs/workflows/denial-triage)** - See detailed workflow examples
- **[Setup Guide](/docs/mcp-server/overview)** - Install and configure the platform
- **[Package Documentation](/docs/mcp-server/overview)** - Learn about each component
