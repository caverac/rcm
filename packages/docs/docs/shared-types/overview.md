---
sidebar_position: 1
---

# Shared Types Package

The `@rcm/shared-types` package provides Zod schemas and TypeScript types shared across all RCM packages. It serves as the single source of truth for data validation and type definitions.

## Why Shared Types?

In a monorepo with multiple packages (MCP server, migrations, future APIs), maintaining consistent type definitions is critical:

- **Single source of truth** - Define schemas once, use everywhere
- **Compile-time safety** - TypeScript catches type errors before runtime
- **Runtime validation** - Zod validates data at system boundaries
- **JSON Schema generation** - Zod 4 can generate JSON Schema for API docs and MCP tools

## Quick Start

### Installation

Add to your package's dependencies:

```json
{
  "dependencies": {
    "@rcm/shared-types": "workspace:*"
  }
}
```

### Import Types

```typescript
import type {
  Claim,
  Denial,
  Appeal,
  CreateAppealInput,
} from '@rcm/shared-types'

function processAppeal(input: CreateAppealInput): Appeal {
  // TypeScript knows the shape of input and return type
}
```

### Import Schemas for Validation

```typescript
import { CreateAppealInputSchema } from '@rcm/shared-types'

// Validate untrusted input
const result = CreateAppealInputSchema.safeParse(userInput)
if (!result.success) {
  console.error('Invalid input:', result.error.issues)
  return
}
// result.data is now typed as CreateAppealInput
```

## Schema Categories

| Category      | Examples                                            | Use Case                        |
| ------------- | --------------------------------------------------- | ------------------------------- |
| **Entity**    | `ClaimSchema`, `DenialSchema`, `AppealSchema`       | Database records                |
| **Input**     | `CreateAppealInputSchema`, `ListAppealsInputSchema` | API/tool parameters             |
| **Seed**      | `ClaimSeedSchema`, `AppealSeedSchema`               | Database seeding (string dates) |
| **Analytics** | `DenialAnalyticsSchema`, `AppealAnalyticsSchema`    | Aggregated metrics              |
| **Enum**      | `ClaimStatusSchema`, `AppealTypeSchema`             | Constrained string values       |

## Example: MCP Server

The MCP server uses shared-types for type-safe tool handlers:

```typescript
import type { CreateAppealInput } from '@rcm/shared-types'

case 'create_appeal': {
  const input = toolArgs as CreateAppealInput
  const result = await createAppeal(input)
  return successResponse(result)
}
```

And for generating JSON Schema for tool definitions:

```typescript
import { z } from 'zod'
import { CreateAppealInputSchema } from '@rcm/shared-types'

const jsonSchema = z.toJSONSchema(CreateAppealInputSchema, {
  target: 'draft-7',
})
// Use jsonSchema as MCP tool inputSchema
```

## Example: Database Seeding

The migrations package uses seed schemas for type-safe seeding:

```typescript
import type { AppealSeed } from '@rcm/shared-types'

const appeals: AppealSeed[] = [
  {
    id: '750e8400-e29b-41d4-a716-446655440001',
    appeal_type: 'first_level',
    status: 'pending',
    appeal_amount: 1500.0,
    filed_date: '2024-02-20', // String dates for seed data
  },
]
```

## Full Documentation

For complete schema reference, all available types, and detailed examples:

**[View the full README on GitHub](https://github.com/caverac/rcm/tree/main/packages/shared-types)**

## Next Steps

- **[MCP Server](../mcp-server/overview.md)** - See types in action with AI tools
- **[Database Setup](../migrations/setup.md)** - Seed data uses shared types
