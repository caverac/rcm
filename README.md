# Revenue Cycle Management (RCM) Application

A TypeScript monorepo for a revenue cycle management application built with Yarn 4 workspaces.

## Structure

```
rcm/
├── packages/
│   ├── mcp-server/         # Model Context Protocol server
│   └── infrastructure/     # AWS CDK infrastructure
├── .yarn/                  # Yarn 4 configuration and cache
├── eslint.config.mjs       # ESLint configuration
├── tsconfig.base.json      # Base TypeScript configuration
└── package.json            # Root package.json with workspace config
```

## Prerequisites

- Node.js 20+
- Yarn 4.2.2 (managed via corepack)

## Getting Started

Install dependencies:

```bash
yarn install
```

Build all packages:

```bash
yarn build
```

Clean build artifacts:

```bash
yarn clean
```

Run linting:

```bash
yarn lint
```

Type check all packages:

```bash
yarn type-check
```

## Packages

### @rcm/mcp-server

Model Context Protocol server for revenue cycle management operations. Provides tools for:
- Creating insurance claims
- Retrieving claim information
- Updating claim status
- Listing claims by patient

[View package README](./packages/mcp-server/README.md)

### @rcm/infrastructure

AWS CDK infrastructure as code for the RCM application. Includes:
- DynamoDB tables for claims data
- S3 buckets for document storage
- Lambda functions for processing
- API Gateway for REST endpoints

[View package README](./packages/infrastructure/README.md)

## Development

### Working with Individual Packages

Navigate to a package directory and run package-specific commands:

```bash
cd packages/mcp-server
yarn build
yarn dev
```

### Building

The monorepo uses TypeScript with strict mode enabled. All packages are built in parallel using Yarn workspaces.

### Linting

ESLint 9 is configured with the flat config format and TypeScript support. Run linting from the root:

```bash
yarn lint
```

## Technology Stack

- **Package Manager**: Yarn 4.2.2 (Berry)
- **Language**: TypeScript 5.7.2
- **Linting**: ESLint 9.17.0
- **Infrastructure**: AWS CDK 2.174.2
- **MCP SDK**: @modelcontextprotocol/sdk 1.24.3

## License

UNLICENSED
