---
sidebar_position: 5
---

# Write-Off Analysis

Track uncollectible denials with preventability analysis to reduce future losses.

## Overview

Write-offs represent accepted financial losses where denials cannot be recovered through appeals or rebilling. Tracking write-offs with preventability analysis helps identify root causes and prevent similar losses in the future.

## Why Track Write-Offs with AI?

### Root Cause Analysis

- AI categorizes write-offs by reason (timely filing, patient liability, contract, etc.)
- Identifies preventable vs. non-preventable losses
- Tracks patterns that indicate process gaps

### Financial Accountability

- Separates unavoidable losses from preventable errors
- Measures impact of process improvements
- Justifies investments in prevention systems

### Continuous Improvement

- Trends show if prevention efforts are working
- Highlights which processes need attention
- Provides data for staff training needs

## Tool Usage

### Create Write-Off

```typescript
create_write_off({
  denial_id: 'uuid-of-denial',
  claim_id: 'uuid-of-claim',
  reason_category: 'small_balance',
  write_off_amount: 18.5,
  is_preventable: false,
  root_cause: 'Amount below minimum appeal threshold ($25)',
  approved_by: 'Billing Manager',
  notes: 'Per org policy, small balances <$25 written off',
})
```

### Get Analytics

```typescript
get_write_off_analytics({
  start_date: "2024-01-01",
  end_date: "2024-03-31"
})

// Returns
{
  total_write_offs: 342,
  total_amount: 87450.00,
  preventable_count: 156,
  preventable_amount: 52300.00,
  preventable_percentage: 59.8,

  by_reason: [
    {
      reason: "timely_filing",
      count: 89,
      amount: 37650.00,
      preventable: 85,
      root_causes: ["Claim tracking system gaps", "Staff turnover"]
    },
    {
      reason: "patient_liability",
      count: 124,
      amount: 18200.00,
      preventable: 12,
      root_causes: ["Patient communication needed"]
    },
    {
      reason: "contract_exclusion",
      count: 78,
      amount: 21100.00,
      preventable: 34,
      root_causes: ["Contract terms not in system"]
    },
    {
      reason: "small_balance",
      count: 51,
      amount: 10500.00,
      preventable: 0,
      root_causes: ["Per policy - cost/benefit"]
    }
  ],

  recommendations: [
    {
      issue: "Timely filing write-offs",
      current_impact: "$37,650/quarter",
      preventable: "$35,700 (95%)",
      solution: "Implement automated claim tracking with alerts 30 days before deadline",
      estimated_cost: "$15,000 setup + $500/month",
      roi: "Pays for itself in < 1 quarter"
    }
  ]
}
```

## Real-World Impact

### Preventable Loss Reduction

**Example Organization:**

- **Q1 Write-offs**: $87,450
- **Preventable**: $52,300 (60%)
- **Top causes**: Timely filing, contract exclusions
- **Actions taken**:
  - Implemented claim tracking system
  - Added payer contract rules to system
- **Q2 Write-offs**: $64,200
- **Preventable**: $22,100 (34%)
- **Savings**: $30,200/quarter = **$120,800/year**

## Next Steps

- **[Appeals Workflow](/docs/mcp-server/workflows/appeals)** - Exhaust appeal options first
- **[Cash Leakage](/docs/mcp-server/workflows/cash-leakage)** - Identify write-off trends
