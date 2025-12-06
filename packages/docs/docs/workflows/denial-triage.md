---
sidebar_position: 1
---

# Flow A: Denial Triage

Intelligent denial classification and action recommendations based on organization policies.

## Overview

The denial triage workflow helps you quickly understand denial reasons and get actionable recommendations for next steps. It combines denial code classification with your organization's policies to suggest whether to appeal, write off, or take other actions.

## Example Scenario

**User Input:**
```
"We're getting CO-197 denials on outpatient imaging. One claim is $450 for CPT 70553. What should we do?"
```

## What Happens

### Step 1: Classify Denial

ChatGPT calls `classify_denial` with "CO-197":

**Response:**
```json
{
  "code": "CO-197",
  "category": "AUTHORIZATION",
  "description": "Precertification/authorization/notification absent",
  "is_appealable": true,
  "common_resolution": "Obtain retroactive authorization or appeal with medical necessity",
  "prevention_tips": "Implement pre-service authorization checks"
}
```

### Step 2: Suggest Next Action

ChatGPT calls `suggest_next_action` with claim details:

**Request:**
```json
{
  "claim_id": "CLM-123",
  "denial_code": "CO-197",
  "denial_amount": 450.00
}
```

**Response:**
```json
{
  "recommended_action": "appeal",
  "reason": "Amount $450 meets appeal threshold of $250. Authorization denial.",
  "priority": "high",
  "days_to_action": 15,
  "auto_process": true,
  "policy_applied": "Authorization Denials - Auto Appeal",
  "estimated_recovery_chance": 60,
  "next_steps": [
    "Gather supporting documentation",
    "Obtain retroactive authorization or appeal with medical necessity",
    "Submit appeal within timely filing limits",
    "Track appeal status"
  ]
}
```

### Step 3: Present to User

ChatGPT synthesizes the information:

> **This is an AUTHORIZATION denial (missing pre-cert).** For $450, this meets your org's appeal threshold. I recommend appealing within 15 days with a 60% estimated recovery chance.
>
> **Next Steps:**
> 1. Gather pre-auth documentation
> 2. Submit appeal with medical necessity justification
> 3. Track status for follow-up

## Tools Used

- `classify_denial` - Look up denial code in library
- `suggest_next_action` - Apply organization policies

## Customization

You can customize the behavior by updating organization policies:

```sql
-- Increase appeal threshold for authorization denials
UPDATE org_policies
SET min_amount = 500.00
WHERE policy_type = 'appeal_threshold'
AND denial_category = 'AUTHORIZATION';

-- Enable auto-appeal
UPDATE org_policies
SET auto_appeal = true
WHERE policy_name = 'Authorization Denials - Auto Appeal';
```

## See Also

- [Denial Code Library](../reference/denial-codes.md)
- [Organization Policies](../reference/org-policies.md)
- [Tool Reference: classify_denial](../mcp-server/tools/classify-denial.md)
- [Tool Reference: suggest_next_action](../mcp-server/tools/suggest-next-action.md)
