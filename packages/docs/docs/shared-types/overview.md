---
sidebar_position: 1
---

# Shared Types Package

TypeScript types and Zod schemas shared across RCM packages for type safety and validation.

## Usage

```typescript
import { 
  ClaimSchema, 
  DenialSchema, 
  AppealSchema 
} from '@rcm/shared-types'

// Runtime validation
const claim = ClaimSchema.parse(untrustedData)
```

## Benefits

- Type safety at compile time
- Runtime validation with Zod
- Consistency across packages

## Next Steps

- **[MCP Server](/docs/mcp-server/overview)** - See types in action
- **[GitHub](https://github.com/caverac/rcm/tree/main/packages/shared-types)** - View source
