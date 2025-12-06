# RCM Infrastructure

AWS CDK infrastructure for the Revenue Cycle Management application.

## Architecture

This package defines the AWS infrastructure including:

- **PostgreSQL RDS**: Claims, denials, and analytics data storage
- **VPC**: Isolated network with public, private, and database subnets
- **S3**: Document storage with versioning and intelligent tiering
- **Lambda**: Claims processing functions (VPC-enabled)
- **API Gateway**: REST API for claims operations
- **Secrets Manager**: Database credentials management

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js 20+
- AWS CDK CLI

## Building

```bash
yarn build
```

## Deploying

First, synthesize the CloudFormation template:

```bash
yarn synth
```

Deploy to AWS:

```bash
yarn deploy
```

## CDK Commands

- `yarn cdk diff` - Compare deployed stack with current state
- `yarn cdk synth` - Emit the synthesized CloudFormation template
- `yarn deploy` - Deploy this stack to your default AWS account/region

## Configuration

Set the following environment variables:

- `CDK_DEFAULT_ACCOUNT` - AWS account ID
- `CDK_DEFAULT_REGION` - AWS region (e.g., us-east-1)

Or use AWS CLI configuration defaults.

## Post-Deployment Setup

After deployment, you'll need to run database migrations:

### 1. Get Database Credentials

```bash
# Get the secret ARN from CDK outputs
aws cloudformation describe-stacks --stack-name RcmStack --query 'Stacks[0].Outputs'

# Get database credentials from Secrets Manager
aws secretsmanager get-secret-value --secret-id <SECRET_ARN> --query SecretString --output text
```

### 2. Connect to Database

You can connect from a bastion host or use Systems Manager Session Manager to connect to an EC2 instance in the VPC:

```bash
# Option A: From within VPC
psql -h <DB_ENDPOINT> -U rcm_admin -d rcmdb

# Option B: SSH tunnel through bastion (if configured)
ssh -L 5432:<DB_ENDPOINT>:5432 bastion-host
psql -h localhost -U rcm_admin -d rcmdb
```

### 3. Run Migrations

```bash
# From the migrations package
cd ../migrations

# Set DATABASE_URL with credentials from Secrets Manager
export DATABASE_URL="postgresql://rcm_admin:<PASSWORD>@<DB_ENDPOINT>:5432/rcmdb"

# Run migrations
yarn migrate:up
```

## Infrastructure Components

### PostgreSQL RDS

- Engine: PostgreSQL 16
- Instance Type: t4g.micro (adjustable for production)
- Storage: 20 GB (auto-scaling up to 100 GB)
- Backups: 7-day retention
- Performance Insights: Enabled
- Encryption: At-rest encryption enabled
- Network: Deployed in isolated subnets

### VPC Configuration

- 2 Availability Zones
- 1 NAT Gateway (for cost optimization)
- Subnets:
  - Public: For NAT gateway
  - Private with Egress: For Lambda functions
  - Isolated: For RDS database

### Security

- Database is not publicly accessible
- Lambda functions connect via VPC
- Database credentials stored in Secrets Manager
- Security groups restrict access between components

## Cost Optimization

For development:
- Uses t4g.micro RDS instance (~$15/month)
- Single NAT Gateway (~$32/month)
- Storage auto-scales only when needed

For production, consider:
- Multi-AZ deployment for high availability
- Larger instance types based on workload
- Additional NAT Gateways for redundancy
- Aurora PostgreSQL for better scaling

## Outputs

After deployment, the stack provides these outputs:

- `DatabaseEndpoint`: RDS endpoint hostname
- `DatabasePort`: RDS port (5432)
- `DatabaseName`: Database name (rcmdb)
- `DatabaseSecretArn`: Secret ARN for credentials
- `DocumentsBucketName`: S3 bucket name
- `ApiEndpoint`: API Gateway URL
- `DatabaseConnectionString`: Connection string template
