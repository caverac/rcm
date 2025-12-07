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
- **denial_code_library** - Reference data for denial codes
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

## Schema Documentation

See the [Migrations Package README](https://github.com/caverac/rcm/tree/main/packages/migrations) for:
- Complete Mermaid ER diagram
- Detailed table descriptions with real-world examples
- Relationship explanations
- Data flow examples

## Next Steps

- **[MCP Server Setup](/docs/mcp-server/overview)** - Use the database with AI tools
- **[View Complete Schema](https://github.com/caverac/rcm/tree/main/packages/migrations#schema-diagram)** - See the full ER diagram
