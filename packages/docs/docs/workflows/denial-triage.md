---
sidebar_position: 1
---

# Denial Triage

Intelligent denial classification and action recommendations based on organization policies.

## Overview

The denial triage workflow helps you quickly understand denial reasons and get actionable recommendations for next steps. It combines denial code classification with your organization's policies to suggest whether to appeal, write off, or take other actions.

## Tools Used

| Tool                  | Purpose                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `classify_denial`     | Look up denial code in library, get category and resolution guidance |
| `suggest_next_action` | Apply organization policies to recommend action                      |

## Example: CO-197 Authorization Denial

Using the seeded data, claim `CLM-2024-001235` has a CO-197 denial for $500 (MRI procedure).

**User prompt:**

```
We have a CO-197 denial for $500 on claim CLM-2024-001235. What should we do?
```

**Step 1: Classify Denial**

The `classify_denial` tool looks up CO-197 in the denial code library:

```json
{
  "code": "CO-197",
  "category": "AUTHORIZATION",
  "description": "Precertification/authorization/notification absent",
  "is_appealable": true,
  "appeal_success_rate": 65,
  "common_resolution": "Obtain retroactive authorization or appeal with medical necessity",
  "prevention_tips": "Implement pre-service authorization checks"
}
```

**Step 2: Suggest Next Action**

The `suggest_next_action` tool applies organization policies:

```json
{
  "recommended_action": "appeal",
  "reason": "Amount $500 meets appeal threshold of $250. Authorization denial.",
  "priority": "high",
  "days_to_action": 15,
  "auto_process": true,
  "policy_applied": "Authorization Denials - Auto Appeal",
  "estimated_recovery_chance": 65,
  "next_steps": [
    "Gather supporting documentation",
    "Obtain retroactive authorization or appeal with medical necessity",
    "Submit appeal within timely filing limits",
    "Track appeal status"
  ]
}
```

**Expected Response:**

> This is an AUTHORIZATION denial (CO-197 - precertification absent). Based on your organization's policy, I recommend appealing within 15 days since the $500 amount exceeds the $250 threshold. The estimated recovery chance is 65%.
>
> **Next Steps:**
>
> 1. Gather pre-auth documentation
> 2. Submit appeal with medical necessity justification
> 3. Track status for follow-up

## Seeded Denials

The database includes these denials you can test with:

| Claim ID        | Denial Code | Amount | Category               | Recommended Action |
| --------------- | ----------- | ------ | ---------------------- | ------------------ |
| CLM-2024-001235 | CO-197      | $500   | Authorization          | Appeal             |
| CLM-2024-001236 | PR-1        | $15    | Patient Responsibility | Write-off          |
| CLM-2024-001237 | CO-4        | $250   | Coding Error           | Rebill             |
| CLM-2024-001235 | CO-50       | $500   | Medical Necessity      | Appeal             |

## Customization

You can customize the behavior by updating organization policies:

```sql
-- Increase appeal threshold for authorization denials
UPDATE org_policies
SET min_amount = 500.00
WHERE policy_type = 'appeal_threshold'
AND denial_category = 'AUTHORIZATION';

-- Add payer-specific policy
INSERT INTO org_policies (policy_name, policy_type, payer_id, denial_category, min_amount, auto_appeal)
VALUES ('BCBS Auth Denials', 'appeal_threshold',
        (SELECT id FROM payers WHERE payer_id = 'BCBS-CA-001'),
        'AUTHORIZATION', 200.00, true);
```

## Next Steps

- **[Cash Leakage Analysis](./cash-leakage.md)** - Identify denial patterns across multiple claims
- **[Appeals Management](./appeals-management.md)** - Track and manage appeals for denied claims
- **[Coding Validation](./coding-validation.md)** - Prevent denials before submission
