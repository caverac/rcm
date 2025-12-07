# RCM MCP Server

[![Documentation](https://img.shields.io/badge/docs-live-blue)](https://caverac.github.io/rcm/)
[![GitHub](https://img.shields.io/badge/GitHub-caverac%2Frcm-blue)](https://github.com/caverac/rcm)

Revenue Cycle Management platform with AI-powered denial triage, cash leakage analytics, and pre-submission validation.

## 🚀 Quick Start

### Local Development with Docker

1. **Start PostgreSQL database:**

   ```bash
   docker-compose up -d postgres
   ```

2. **Run migrations:**

   ```bash
   cd packages/migrations
   yarn migrate:up
   ```

3. **Start MCP server:**
   ```bash
   cd packages/mcp-server
   yarn build && node dist/index.js
   ```

### Without Docker

See [Full Installation Guide](https://caverac.github.io/rcm/docs/getting-started/installation)

## 📦 Project Structure

```
rcm/
├── packages/
│   ├── shared-types/      # Zod schemas & shared TypeScript types
│   ├── coding/            # Medical coding assignment engine
│   ├── mcp-server/        # MCP server with AI tools
│   ├── migrations/        # PostgreSQL database migrations
│   ├── infrastructure/    # AWS CDK infrastructure code
│   └── docs/              # Docusaurus documentation site
├── docker-compose.yml     # Local PostgreSQL setup
└── .env.example          # Environment variables template
```

## 🎯 Core Workflows

### Flow A: Denial Triage

AI-powered denial classification and action recommendations

- Tools: `classify_denial`, `suggest_next_action`
- [Learn more →](https://caverac.github.io/rcm/docs/workflows/denial-triage)

### Flow B: Cash Leakage Analysis

Identify patterns and prevent revenue loss

- Tools: `batch_classify_denials`
- [Learn more →](https://caverac.github.io/rcm/docs/workflows/cash-leakage)

### Flow C: Pre-Submission Validation

Catch coding errors before submission

- Tools: `normalize_claim`, `audit_coding`
- [Learn more →](https://caverac.github.io/rcm/docs/workflows/pre-submission)

## 🛠 Technology Stack

- **Database:** PostgreSQL 16 (chosen for complex analytics)
- **Backend:** Node.js + TypeScript
- **Schema Validation:** Zod
- **Infrastructure:** AWS CDK (RDS, VPC, S3)
- **AI Integration:** Claude via Model Context Protocol
- **Testing:** Jest with 100% coverage target
- **Documentation:** Docusaurus

## 📚 Documentation

**Full documentation:** https://caverac.github.io/rcm/

- [Getting Started](https://caverac.github.io/rcm/docs/getting-started/installation)
- [Workflow Examples](https://caverac.github.io/rcm/docs/workflows/denial-triage)
- [API Reference](https://caverac.github.io/rcm/docs/mcp-server/overview)
- [Infrastructure Guide](https://caverac.github.io/rcm/docs/infrastructure/deployment)

## 🧪 Testing

```bash
# Run all tests
yarn test

# Watch mode
yarn test:watch

# Coverage report
yarn test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests (maintain 100% coverage)
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- **Documentation:** https://caverac.github.io/rcm/
- **Repository:** https://github.com/caverac/rcm
- **Issues:** https://github.com/caverac/rcm/issues
