# RCM Infrastructure

AWS CDK infrastructure for the Revenue Cycle Management application.

## Architecture

This package defines the AWS infrastructure including:

- **DynamoDB**: Claims data storage with GSI for patient queries
- **S3**: Document storage with versioning and intelligent tiering
- **Lambda**: Claims processing functions
- **API Gateway**: REST API for claims operations

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
