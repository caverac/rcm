---
sidebar_position: 1
---

# Shared Types Package

TypeScript types and Zod schemas shared across RCM packages for type safety and validation.

## Overview

The shared-types package provides:

- **TypeScript interfaces** for all domain entities
- **Zod schemas** for runtime validation
- **Type guards** for type narrowing
- **Shared across packages** for consistency

## Usage

```typescript
import {
  ClaimSchema,
  DenialSchema,
  AppealSchema,
  type Claim,
  type Denial,
  type Appeal,
} from '@rcm/shared-types'

// Runtime validation
const claim = ClaimSchema.parse(untrustedData)

// Type checking (compile time)
function processClaim(claim: Claim) {
  console.log(claim.claim_id)
}

// Type guard
if (AppealSchema.safeParse(data).success) {
  // data is validated Appeal
}
```

## Available Schemas

### Claim Schema

```typescript
ClaimSchema.parse({
  claim_id: 'CLM-2024-001234',
  payer_id: 'uuid',
  patient_name: 'John Doe',
  service_date: '2024-01-15',
  cpt_codes: ['99213', '70553'],
  diagnosis_codes: ['I10', 'Z79.4'],
  billed_amount: 450.0,
  status: 'submitted',
})
```

### Denial Schema

```typescript
DenialSchema.parse({
  denial_code: 'CO-197',
  denied_amount: 450.0,
  category: 'AUTHORIZATION',
  reason: 'Missing prior authorization',
  resolution_status: 'pending',
})
```

### Appeal Schema

```typescript
AppealSchema.parse({
  appeal_type: 'first_level',
  status: 'submitted',
  priority: 'high',
  appeal_amount: 450.0,
  filed_date: '2024-01-20T10:00:00Z',
  due_date: '2024-02-20T17:00:00Z',
})
```

## Benefits

### Type Safety

- Catch errors at compile time
- IDE autocomplete and IntelliSense
- Refactoring confidence

### Runtime Validation

- Validate API inputs
- Sanitize user data
- Catch malformed data

### Consistency

- Same types across frontend/backend
- Shared validation logic
- Single source of truth

## Used By

- **MCP Server** - Validates tool inputs/outputs
- **Migrations** - Type-safe database operations (future)
- **Frontend** (future) - Form validation and API types

## Next Steps

- **[MCP Server](/docs/mcp-server/overview)** - See types in action
- **[GitHub](https://github.com/caverac/rcm/tree/main/packages/shared-types)** - View source code
