# RCM MCP Server

Model Context Protocol (MCP) server for Revenue Cycle Management operations.

## Features

This MCP server provides tools for managing insurance claims:

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

**Note:** The server currently uses **in-memory storage**. All data is lost when the server stops. This is perfect for local development and testing.

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

## Running in the Cloud

To run the MCP server in production with persistent storage, you'll need to:

### 1. Deploy AWS Infrastructure

First, deploy the required AWS resources:

```bash
cd ../infrastructure

# Configure AWS credentials
export AWS_PROFILE=your-profile

# Deploy the stack
yarn build
yarn deploy
```

This creates:
- DynamoDB table for claims storage
- S3 bucket for document storage
- API Gateway endpoints
- Lambda functions

### 2. Update the MCP Server

Modify `src/index.ts` to use AWS services instead of in-memory storage:

**Current (in-memory):**
```typescript
const claims = new Map<string, ClaimData>();
```

**For Production (DynamoDB):**
```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.CLAIMS_TABLE_NAME || 'ClaimsTable';
```

### 3. Add Required Dependencies

```bash
yarn add @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
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

Set these environment variables for cloud deployment:

```bash
AWS_REGION=us-east-1
CLAIMS_TABLE_NAME=RcmStack-ClaimsTable-XXXXX
DOCUMENTS_BUCKET_NAME=rcmstack-documentsbucket-XXXXX
```

Get the actual resource names from CDK outputs:

```bash
cd ../infrastructure
yarn synth | grep -A 20 "Outputs"
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
    ↓ (AWS SDK)
AWS DynamoDB + S3
```

## Troubleshooting

### Server Not Appearing in Claude Desktop

1. Check the config file path is correct
2. Ensure absolute paths are used (not relative)
3. Verify the server builds without errors: `yarn build`
4. Check Claude Desktop logs for errors

### Claims Not Persisting

This is expected in local mode. The server uses in-memory storage and all data is lost on restart. To persist data, follow the "Running in the Cloud" instructions above.

## API Reference

### create_claim

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
