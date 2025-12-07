# Appeals Management

The Appeals Management workflow (Flow E) helps you manage the complete appeal lifecycle for denied claims, track appeal status, and analyze appeal success rates.

## Overview

When claims are denied, you may need to appeal the decision to recover revenue. This workflow provides tools to:

- Create and track appeals for denied claims
- Update appeal status as it progresses through payer review
- Monitor overdue appeals and prioritize work
- Analyze appeal success rates and recovery amounts

## Prerequisites

- Denied claim records in the database
- Appeal reason documentation
- Supporting documents for the appeal

## Workflow Steps

### 1. Create an Appeal

When you receive a denial that should be appealed, create an appeal record:

```typescript
const result = await use_mcp_tool({
  server_name: 'rcm-mcp-server',
  tool_name: 'create_appeal',
  arguments: {
    denial_id: '123e4567-e89b-12d3-a456-426614174000',
    claim_id: '123e4567-e89b-12d3-a456-426614174001',
    appeal_amount: 500.0,
    appeal_reason:
      'Authorization was obtained prior to service date. Attached documentation shows pre-authorization approval dated 2024-01-10.',
    priority: 'high',
    due_date: '2024-02-15',
    supporting_documents: [
      'pre-auth-approval-2024-01-10.pdf',
      'medical-records-patient-12345.pdf',
    ],
    assigned_to: 'Appeals Team',
  },
})
```

**What happens:**

- Appeal record is created with status "pending"
- Claim status is automatically updated to "appealed"
- Denial record is updated with action_taken = "appeal"
- Due date helps track timely filing requirements

### 2. Update Appeal Status

As the appeal progresses, update its status:

```typescript
// When you submit the appeal to the payer
await use_mcp_tool({
  server_name: 'rcm-mcp-server',
  tool_name: 'update_appeal',
  arguments: {
    appeal_id: 'appeal-uuid',
    status: 'submitted',
    filed_date: '2024-01-20',
    notes: 'Appeal submitted via payer portal. Confirmation #AP-2024-12345',
  },
})

// When you receive a decision
await use_mcp_tool({
  server_name: 'rcm-mcp-server',
  tool_name: 'update_appeal',
  arguments: {
    appeal_id: 'appeal-uuid',
    status: 'approved',
    decision_date: '2024-02-10',
    approved_amount: 450.0,
    payer_response:
      'Appeal approved. Authorization requirement waived due to emergency services. Check mailed 2/15/2024.',
  },
})
```

**Status lifecycle:**

1. **pending** - Appeal created but not yet worked
2. **in_progress** - Gathering documents and preparing appeal
3. **submitted** - Sent to payer
4. **under_review** - Payer is reviewing
5. **approved** - Appeal won (full approval)
6. **partially_approved** - Partial recovery
7. **denied** - Appeal lost
8. **withdrawn** - Appeal cancelled

**What happens on approval:**

- Denial is automatically marked as "resolved"
- Recovered amount is tracked
- Success metrics are updated

### 3. Monitor Active Appeals

List appeals that need attention:

```typescript
// Get all high-priority pending appeals
const pendingAppeals = await use_mcp_tool({
  server_name: 'rcm-mcp-server',
  tool_name: 'list_appeals',
  arguments: {
    status: 'pending',
    priority: 'high',
  },
})

// Find overdue appeals
const overdueAppeals = await use_mcp_tool({
  server_name: 'rcm-mcp-server',
  tool_name: 'list_appeals',
  arguments: {
    overdue_only: true,
  },
})

// Get appeals for specific team member
const myAppeals = await use_mcp_tool({
  server_name: 'rcm-mcp-server',
  tool_name: 'list_appeals',
  arguments: {
    assigned_to: 'Jane Smith',
    status: 'in_progress',
  },
})
```

**Results are sorted by:**

1. Priority (high → medium → low)
2. Due date (earliest first)
3. Created date (most recent first)

### 4. Analyze Appeal Performance

Get comprehensive analytics on your appeals:

```typescript
const analytics = await use_mcp_tool({
  server_name: 'rcm-mcp-server',
  tool_name: 'get_appeal_analytics',
  arguments: {},
})
```

**Example response:**

```json
{
  "total_appeals": 150,
  "total_amount": 75000.0,
  "total_approved_amount": 52500.0,
  "success_rate": 70.0,
  "average_days_to_decision": 18.5,
  "by_status": {
    "pending": 25,
    "in_progress": 15,
    "submitted": 20,
    "under_review": 10,
    "approved": 65,
    "denied": 10,
    "partially_approved": 5
  },
  "by_priority": {
    "high": 45,
    "medium": 85,
    "low": 20
  },
  "overdue_count": 8,
  "insights": [
    "Overall appeal success rate: 70.0%",
    "Recovery rate: 70.0% ($52500.00 of $75000.00)",
    "⚠️ 8 appeals are overdue and requires immediate attention",
    "45 high-priority appeals in queue",
    "Average time to decision: 18.5 days"
  ]
}
```

**Use analytics to:**

- Track team performance
- Identify improvement opportunities
- Forecast revenue recovery
- Report to stakeholders

## Best Practices

### Appeal Prioritization

Set priority based on:

- **High**: Large dollar amounts ($1000+), timely filing deadlines soon, likely to win
- **Medium**: Moderate amounts ($100-$1000), reasonable timeframes
- **Low**: Small amounts (under $100), low win probability

### Documentation Requirements

Include these in your appeal reason:

- Specific denial reason you're contesting
- Why the denial is incorrect
- Supporting evidence (pre-auth, medical necessity, coding references)
- Relevant payer policy sections

Example:

```
"Claim denied CO-197 for missing authorization. However, pre-authorization
#PA-2024-12345 was obtained on 1/15/2024 prior to service date of 1/20/2024.
Attached: (1) Pre-auth approval letter, (2) Verification of benefits showing
auth on file. Per payer policy section 4.2.1, services rendered within 60 days
of authorization approval are covered."
```

### Due Date Management

Set due dates based on payer timely filing limits:

- **First level appeals**: Typically 180 days from denial
- **Second level appeals**: 30-60 days from first level denial
- **External review**: 30 days from second level denial

**Pro tip:** Set due dates 15-30 days before actual deadline to allow time for unexpected delays.

### Status Updates

Update status regularly:

- When documents are gathered → `in_progress`
- When submitted to payer → `submitted` (record filed_date)
- When payer acknowledges → `under_review`
- When decision received → `approved`/`denied`/`partially_approved` (record decision_date and amounts)

## Common Scenarios

### Scenario 1: Mass Appeal for Coding Denial

If a payer denied multiple claims for the same coding issue:

```typescript
// First, find all related denials
const denials = await use_mcp_tool({
  server_name: "rcm-mcp-server",
  tool_name: "batch_classify_denials",
  arguments: {
    denials: [...], // Your denials
    group_by: "code"
  }
});

// Create appeals for CO-4 (modifier issue) denials
for (const denial of denials.groups.find(g => g.group_key === "CO-4").denials) {
  await use_mcp_tool({
    server_name: "rcm-mcp-server",
    tool_name: "create_appeal",
    arguments: {
      denial_id: denial.id,
      claim_id: denial.claim_id,
      appeal_amount: denial.amount,
      appeal_reason: "Modifier -25 was appropriately appended per CPT guidelines...",
      priority: "medium"
    }
  });
}
```

### Scenario 2: Expedited Appeal

For urgent cases (e.g., ongoing treatment denied):

```typescript
await use_mcp_tool({
  server_name: 'rcm-mcp-server',
  tool_name: 'create_appeal',
  arguments: {
    denial_id: 'denial-uuid',
    claim_id: 'claim-uuid',
    appeal_type: 'external_review', // Skip internal appeals
    appeal_amount: 5000.0,
    appeal_reason:
      'Request expedited external review due to serious jeopardy to patient health. Ongoing chemotherapy treatment denied as not medically necessary...',
    priority: 'high',
    due_date: '2024-01-25', // 3 days
    supporting_documents: [
      'physician-letter-medical-necessity.pdf',
      'clinical-guidelines.pdf',
    ],
  },
})
```

### Scenario 3: Second Level Appeal

If first level appeal was denied:

```typescript
// Update original appeal
await use_mcp_tool({
  server_name: 'rcm-mcp-server',
  tool_name: 'update_appeal',
  arguments: {
    appeal_id: 'first-level-appeal-uuid',
    status: 'denied',
    decision_date: '2024-02-01',
    payer_response: 'Upheld original denial. Authorization not on file.',
  },
})

// Create second level appeal
await use_mcp_tool({
  server_name: 'rcm-mcp-server',
  tool_name: 'create_appeal',
  arguments: {
    denial_id: 'same-denial-uuid',
    claim_id: 'same-claim-uuid',
    appeal_type: 'second_level',
    appeal_amount: 500.0,
    appeal_reason:
      "Second level appeal. New evidence shows authorization was obtained via phone on 1/14/2024. Payer's records incomplete. Attached: (1) Phone log with auth rep name and reference number...",
    priority: 'high',
    due_date: '2024-03-01',
  },
})
```

## Integration with Other Flows

### Flow A: Denial Triage → Appeals

```typescript
// Step 1: Classify denial (Flow A)
const classification = await use_mcp_tool({
  server_name: 'rcm-mcp-server',
  tool_name: 'classify_denial',
  arguments: { denial_code: 'CO-197' },
})

// Step 2: Get recommended action
const action = await use_mcp_tool({
  server_name: 'rcm-mcp-server',
  tool_name: 'suggest_next_action',
  arguments: {
    claim_id: 'claim-uuid',
    denial_code: 'CO-197',
    denial_amount: 500,
  },
})

// Step 3: If action is "appeal", create appeal (Flow E)
if (action.recommended_action === 'appeal') {
  await use_mcp_tool({
    server_name: 'rcm-mcp-server',
    tool_name: 'create_appeal',
    arguments: {
      denial_id: 'denial-uuid',
      claim_id: 'claim-uuid',
      appeal_amount: 500,
      appeal_reason: action.next_steps.join(' '),
      priority: action.priority,
    },
  })
}
```

### Flow B: Cash Leakage → Targeted Appeals

```typescript
// Find systematic issues
const analytics = await use_mcp_tool({
  server_name: 'rcm-mcp-server',
  tool_name: 'batch_classify_denials',
  arguments: {
    denials: monthlyDenials,
    group_by: 'category',
  },
})

// Target highest impact category for appeals
const topCategory = analytics.groups[0] // AUTHORIZATION category, $50k
console.log(
  `Focus appeals on ${topCategory.group_key}: ${topCategory.count} denials, $${topCategory.total_amount}`
)
```

## Database Schema

Appeals are stored in the `appeals` table:

```sql
CREATE TABLE appeals (
  id UUID PRIMARY KEY,
  denial_id UUID REFERENCES denials(id),
  claim_id UUID REFERENCES claims(id),
  appeal_type VARCHAR(50) DEFAULT 'first_level',
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  appeal_amount DECIMAL(10,2) NOT NULL,
  filed_date TIMESTAMP,
  due_date TIMESTAMP,
  decision_date TIMESTAMP,
  approved_amount DECIMAL(10,2),
  appeal_reason TEXT,
  supporting_documents JSONB,
  notes TEXT,
  assigned_to VARCHAR(255),
  payer_response TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**Automatic updates:**

- When appeal is created → `claims.status` set to 'appealed'
- When appeal is created → `denials.appealed` flag set to true
- When appeal approved → `denials.resolution_status` set to 'resolved'
- When appeal denied → `denials.resolution_status` set to 'abandoned'

## Tools Reference

| Tool                   | Purpose                      | Key Parameters                                    |
| ---------------------- | ---------------------------- | ------------------------------------------------- |
| `create_appeal`        | Create new appeal            | denial_id, claim_id, appeal_amount, appeal_reason |
| `update_appeal`        | Update appeal status/outcome | appeal_id, status, approved_amount                |
| `list_appeals`         | Query appeals with filters   | status, priority, overdue_only                    |
| `get_appeal_analytics` | Get success metrics          | (none)                                            |

## Next Steps

- Review [Denial Triage](./denial-triage.md) for identifying appealable denials
- Use `batch_classify_denials` tool for systematic denial pattern analysis
- Check the mcp-server README for detailed tool parameter schemas
