---
sidebar_position: 1
---

# Infrastructure Deployment

AWS CDK infrastructure for production deployment of the RCM system.

## Overview

The infrastructure package provisions AWS resources using Infrastructure as Code (CDK):

- **RDS PostgreSQL** - Production database
- **VPC Networking** - Secure network isolation
- **S3 Bucket** - Document storage (future use)
- **Security Groups** - Access control

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured (`aws configure`)
- Node.js 20+
- Yarn package manager

## Quick Deploy

```bash
cd packages/infrastructure

# Install dependencies
yarn install

# Bootstrap CDK (first time only)
yarn cdk bootstrap

# Deploy stack
yarn deploy
```

## Deployment Output

After deployment completes, CDK outputs the DATABASE_URL:

```bash
Outputs:
RcmStack.DatabaseUrl = postgresql://username:password@rcm-db.xxxxx.us-east-1.rds.amazonaws.com:5432/rcmdb
```

## Use with Migrations

```bash
# Copy DATABASE_URL from CDK output
export DATABASE_URL="postgresql://username:password@host:5432/rcmdb"

# Run migrations
cd ../migrations
yarn migrate:up
```

## Use with MCP Server

```bash
export DATABASE_URL="postgresql://username:password@host:5432/rcmdb"
cd ../mcp-server
yarn build
node dist/index.js
```

## Stack Resources

### RDS PostgreSQL

- **Engine**: PostgreSQL 16
- **Instance**: db.t3.micro (configurable)
- **Storage**: 20GB SSD
- **Backup**: Automated daily
- **Multi-AZ**: Optional (production recommended)

### VPC Configuration

- **Public Subnets**: For application servers
- **Private Subnets**: For RDS database
- **NAT Gateway**: For private subnet internet access
- **Security Groups**: Restrict access to database

### Cost Estimate

**Development:**

- RDS db.t3.micro: ~$16/month
- NAT Gateway: ~$32/month
- **Total: ~$48/month**

**Production:**

- RDS db.t3.small Multi-AZ: ~$70/month
- NAT Gateway: ~$32/month
- **Total: ~$102/month**

## Cleanup

```bash
yarn cdk destroy
```

**Warning**: This deletes all data. Take database backups first!

## Next Steps

- **[Run Migrations](/docs/migrations/setup)** - Set up database schema
- **[Deploy MCP Server](/docs/mcp-server/overview)** - Connect to production database
