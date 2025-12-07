---
sidebar_position: 6
---

# Payment Variance Analysis

Detect and resolve discrepancies between expected and actual payments with AI-powered pattern detection.

## Overview

Payment variances occur when payers pay different amounts than contracted rates or expected payments. AI helps identify underpayments, overpayments, and patterns that indicate contract compliance issues.

## Why Use AI?

### Automatic Detection

- AI calculates expected payment based on contracts
- Flags variances outside acceptable thresholds
- Categorizes variance reasons (fee schedule errors, bundling, etc.)

### Pattern Recognition

- Identifies systematic underpayments by payer
- Detects contract interpretation discrepancies
- Highlights when contract renegotiation is needed

### Recovery Prioritization

- Ranks variances by recovery probability and amount
- Recommends appeal vs. payer outreach vs. contract review
- Tracks which variances are worth pursuing

## Tool Usage

### Create Variance

```typescript
create_payment_variance({
  claim_id: "uuid-of-claim",
  expected_payment: 500.00,
  actual_payment: 425.00,
  reason_category: "incorrect_fee_schedule",
  analysis_notes: "Payer applied 2023 rates instead of 2024 contracted rates"
})

// AI automatically calculates
{
  variance_amount: -75.00,      // negative = underpayment
  variance_percentage: -15.0,
  variance_type: "underpayment",
  created_variance_id: "uuid"
}
```

### Get Analytics

```typescript
get_payment_variance_analytics({
  start_date: "2024-01-01",
  end_date: "2024-03-31"
})

// Returns
{
  total_variances: 234,
  total_underpayment: -47250.00,
  total_overpayment: 3420.00,
  net_loss: -43830.00,

  by_payer: [
    {
      payer: "United Healthcare",
      variance_count: 89,
      net_variance: -18650.00,
      pattern: "Systematic underpayment on imaging codes",
      recommended_action: "Contract review meeting - fee schedule discrepancy"
    }
  ],

  by_reason: [
    {
      reason: "incorrect_fee_schedule",
      count: 102,
      amount: -28900.00,
      recoverable: "Yes - appeal with contract"
    },
    {
      reason: "bundling_issue",
      count: 76,
      amount: -12340.00,
      recoverable: "Partial - review coding"
    }
  ]
}
```

## Real-World Impact

**Example:** One organization discovered United Healthcare was consistently paying 85% of contracted rates for certain imaging codes. AI detected the pattern across 156 claims ($47,200 underpaid). Organization appealed with contract documentation and recovered $44,880 (95%).

## Next Steps

- **[Appeals Workflow](/docs/mcp-server/workflows/appeals)** - Recover underpayments
- **[Cash Leakage](/docs/mcp-server/workflows/cash-leakage)** - Identify variance patterns
