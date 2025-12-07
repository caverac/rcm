---
sidebar_position: 1
---

# Infrastructure Deployment

AWS CDK infrastructure for production deployment of the RCM system.

## Quick Deploy

```bash
cd packages/infrastructure
yarn install
yarn cdk bootstrap  # First time only
yarn deploy
```

## What's Deployed

- **RDS PostgreSQL** - Production database
- **VPC Networking** - Secure network isolation
- **S3 Bucket** - Document storage
- **Security Groups** - Access control

## Cost Estimate

**Development:** ~$48/month  
**Production:** ~$102/month

## Next Steps

- **[Run Migrations](/docs/migrations/setup)** - Set up database schema
- **[Deploy MCP Server](/docs/mcp-server/overview)** - Connect to production
