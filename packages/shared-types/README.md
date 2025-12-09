# Share Types

Shared Zod schemas and TypeScript types for RCM packages. This package provides a single source of truth for data validation and type definitions across the monorepo.

## Installation

```bash
# From workspace root
yarn workspace @rcm/your-package add @rcm/shared-types
```

Or add to your package's `package.json`:

```json
{
  "dependencies": {
    "@rcm/shared-types": "workspace:*"
  }
}
```

## Usage

### Importing Types

```typescript
import type {
  Claim,
  Denial,
  Appeal,
  Payer,
  WriteOff,
  Rebill,
  PaymentVariance,
} from '@rcm/shared-types'
```

### Importing Zod Schemas

```typescript
import {
  ClaimSchema,
  DenialSchema,
  CreateAppealInputSchema,
  PaymentVarianceSchema,
} from '@rcm/shared-types'
```

### Runtime Validation

```typescript
import { CreateAppealInputSchema } from '@rcm/shared-types'

const input = {
  denial_id: '550e8400-e29b-41d4-a716-446655440000',
  claim_id: '650e8400-e29b-41d4-a716-446655440000',
  appeal_amount: 1500,
  appeal_reason: 'Medical necessity documentation attached',
}

// Validate and parse
const result = CreateAppealInputSchema.safeParse(input)
if (result.success) {
  console.log('Valid input:', result.data)
} else {
  console.error('Validation errors:', result.error.issues)
}
```

### Generating JSON Schema (Zod 4)

Zod 4 includes native JSON Schema generation, useful for API documentation or MCP tool definitions:

```typescript
import { z } from 'zod'
import { CreateAppealInputSchema } from '@rcm/shared-types'

const jsonSchema = z.toJSONSchema(CreateAppealInputSchema, {
  target: 'draft-7',
})

console.log(JSON.stringify(jsonSchema, null, 2))
// {
//   "$schema": "http://json-schema.org/draft-07/schema#",
//   "type": "object",
//   "properties": {
//     "denial_id": { "type": "string", "format": "uuid" },
//     "appeal_amount": { "type": "number", "exclusiveMinimum": 0 },
//     ...
//   }
// }
```

## Available Schemas

### Entity Schemas

| Schema                  | Type              | Description                              |
| ----------------------- | ----------------- | ---------------------------------------- |
| `ClaimSchema`           | `Claim`           | Insurance claim with CPT/diagnosis codes |
| `DenialSchema`          | `Denial`          | Claim denial with reason codes           |
| `AppealSchema`          | `Appeal`          | Appeal for denied claims                 |
| `PayerSchema`           | `Payer`           | Insurance payer/carrier                  |
| `WriteOffSchema`        | `WriteOff`        | Written-off denial amounts               |
| `RebillSchema`          | `Rebill`          | Corrected claim resubmissions            |
| `PaymentVarianceSchema` | `PaymentVariance` | Payment discrepancies                    |
| `OrgPolicySchema`       | `OrgPolicy`       | Organization billing policies            |
| `CodingRuleSchema`      | `CodingRule`      | CPT/ICD coding rules                     |

### Input Schemas (for tool/API parameters)

| Schema                             | Type                         | Purpose                |
| ---------------------------------- | ---------------------------- | ---------------------- |
| `NormalizeClaimInputSchema`        | `NormalizeClaimInput`        | Claim normalization    |
| `ClassifyDenialInputSchema`        | `ClassifyDenialInput`        | Denial classification  |
| `SuggestNextActionInputSchema`     | `SuggestNextActionInput`     | Action recommendations |
| `CreateAppealInputSchema`          | `CreateAppealInput`          | Create new appeal      |
| `UpdateAppealInputSchema`          | `UpdateAppealInput`          | Update existing appeal |
| `ListAppealsInputSchema`           | `ListAppealsInput`           | Query appeals          |
| `CreateWriteOffInputSchema`        | `CreateWriteOffInput`        | Create write-off       |
| `ListWriteOffsInputSchema`         | `ListWriteOffsInput`         | Query write-offs       |
| `CreateRebillInputSchema`          | `CreateRebillInput`          | Create rebill          |
| `UpdateRebillInputSchema`          | `UpdateRebillInput`          | Update rebill          |
| `ListRebillsInputSchema`           | `ListRebillsInput`           | Query rebills          |
| `CreatePaymentVarianceInputSchema` | `CreatePaymentVarianceInput` | Create variance        |
| `UpdatePaymentVarianceInputSchema` | `UpdatePaymentVarianceInput` | Update variance        |
| `ListPaymentVariancesInputSchema`  | `ListPaymentVariancesInput`  | Query variances        |

### Seed Data Schemas

For database seeding with string dates instead of Date objects:

| Schema                      | Type                  | Description              |
| --------------------------- | --------------------- | ------------------------ |
| `ClaimSeedSchema`           | `ClaimSeed`           | Seed data for claims     |
| `DenialSeedSchema`          | `DenialSeed`          | Seed data for denials    |
| `AppealSeedSchema`          | `AppealSeed`          | Seed data for appeals    |
| `PayerSeedSchema`           | `PayerSeed`           | Seed data for payers     |
| `WriteOffSeedSchema`        | `WriteOffSeed`        | Seed data for write-offs |
| `RebillSeedSchema`          | `RebillSeed`          | Seed data for rebills    |
| `PaymentVarianceSeedSchema` | `PaymentVarianceSeed` | Seed data for variances  |

### Analytics Schemas

| Schema                           | Type                       | Description              |
| -------------------------------- | -------------------------- | ------------------------ |
| `DenialAnalyticsSchema`          | `DenialAnalytics`          | Denial pattern analytics |
| `AppealAnalyticsSchema`          | `AppealAnalytics`          | Appeal success metrics   |
| `WriteOffAnalyticsSchema`        | `WriteOffAnalytics`        | Write-off summaries      |
| `RebillAnalyticsSchema`          | `RebillAnalytics`          | Rebill recovery metrics  |
| `PaymentVarianceAnalyticsSchema` | `PaymentVarianceAnalytics` | Variance patterns        |

### Enum Schemas

| Schema                 | Values                                                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ClaimStatusSchema`    | `pending`, `submitted`, `paid`, `denied`, `appealed`, `written_off`                                                                                                                                   |
| `AppealTypeSchema`     | `first_level`, `second_level`, `third_level`, `external_review`                                                                                                                                       |
| `AppealStatusSchema`   | `pending`, `in_progress`, `submitted`, `under_review`, `approved`, `denied`, `partially_approved`, `withdrawn`                                                                                        |
| `AppealPrioritySchema` | `high`, `medium`, `low`                                                                                                                                                                               |
| `WriteOffReasonSchema` | `below_threshold`, `timely_filing_expired`, `non_covered_service`, `patient_responsibility`, `contract_adjustment`, `uncollectible`, `other`                                                          |
| `RebillReasonSchema`   | `corrected_coding`, `added_modifier`, `updated_diagnosis`, `corrected_info`, `resubmit_timely`, `provider_change`, `other`                                                                            |
| `RebillStatusSchema`   | `pending`, `submitted`, `accepted`, `paid`, `denied_again`, `partially_paid`                                                                                                                          |
| `VarianceTypeSchema`   | `underpayment`, `overpayment`, `expected`                                                                                                                                                             |
| `VarianceReasonSchema` | `contract_adjustment`, `bundling`, `non_covered_service`, `missing_authorization`, `credentialing_issue`, `coordination_of_benefits`, `incorrect_coding`, `timely_filing`, `duplicate_claim`, `other` |

## Example: MCP Server Integration

The `@rcm/mcp-server` package uses shared-types for tool definitions and input validation:

### Type-Safe Tool Handlers

```typescript
// packages/mcp-server/src/index.ts
import type {
  CreateAppealInput,
  UpdateAppealInput,
  ListAppealsInput,
} from '@rcm/shared-types'

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const toolArgs = args as unknown

  switch (name) {
    case 'create_appeal': {
      const input = toolArgs as CreateAppealInput
      const result = await createAppeal(input)
      return successResponse(result)
    }
    // ...
  }
})
```

### JSON Schema Generation for Tools

```typescript
// packages/mcp-server/src/tool-schemas.ts
import { z } from 'zod'
import {
  CreateAppealInputSchema,
  ListAppealsInputSchema,
} from '@rcm/shared-types'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'

function toInputSchema(schema: z.ZodType): Tool['inputSchema'] {
  return z.toJSONSchema(schema, {
    target: 'draft-7',
    unrepresentable: 'any',
  }) as Tool['inputSchema']
}

export const tools: Tool[] = [
  {
    name: 'create_appeal',
    description: 'Create a new appeal for a denied claim',
    inputSchema: toInputSchema(CreateAppealInputSchema),
  },
  {
    name: 'list_appeals',
    description: 'Query appeals with filters',
    inputSchema: toInputSchema(ListAppealsInputSchema),
  },
]
```

## Example: Database Seeding

The `@rcm/migrations` package uses seed schemas for type-safe seeding:

```typescript
// packages/migrations/src/seeds/seed_appeals.ts
import type { Client } from 'pg'
import type { AppealSeed } from '@rcm/shared-types'

export async function seedAppeals(client: Client): Promise<void> {
  const appeals: AppealSeed[] = [
    {
      id: '750e8400-e29b-41d4-a716-446655440001',
      denial_id: '850e8400-e29b-41d4-a716-446655440001',
      claim_id: '650e8400-e29b-41d4-a716-446655440001',
      appeal_type: 'first_level',
      status: 'pending',
      priority: 'high',
      appeal_amount: 1500.0,
      filed_date: '2024-02-20',
      due_date: '2024-03-20',
      appeal_reason: 'Medical necessity documentation attached',
    },
  ]

  for (const appeal of appeals) {
    await client.query(
      `INSERT INTO appeals (...) VALUES (...)`,
      [appeal.id, appeal.denial_id, ...]
    )
  }
}
```

## Development

```bash
# Build
yarn workspace @rcm/shared-types build

# Watch mode
yarn workspace @rcm/shared-types dev

# Run tests
yarn workspace @rcm/shared-types test

# Type check
yarn workspace @rcm/shared-types type-check
```

## Adding New Schemas

1. Create a new file in `src/schemas/`:

```typescript
// src/schemas/new-entity.schema.ts
import { z } from 'zod'

export const NewEntitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  // ...
})

export type NewEntity = z.infer<typeof NewEntitySchema>

// Input schema for creating
export const CreateNewEntityInputSchema = z.object({
  name: z.string().min(1),
  // ... (no id, created_at, etc.)
})

export type CreateNewEntityInput = z.infer<typeof CreateNewEntityInputSchema>
```

2. Export from `src/index.ts`:

```typescript
export * from './schemas/new-entity.schema.js'
```

3. Rebuild the package:

```bash
yarn workspace @rcm/shared-types build
```
