#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { isDatabaseAvailable, query, closePool } from './db.js';
import { normalizeClaim } from './tools/normalize-claim.js';
import { classifyDenial } from './tools/classify-denial.js';
import { suggestNextAction } from './tools/suggest-next-action.js';
import { batchClassifyDenials } from './tools/batch-classify-denials.js';
import { auditCoding } from './tools/audit-coding.js';

// In-memory fallback for when database is not available
const inMemoryClaims = new Map<string, any>();

const tools: Tool[] = [
  {
    name: 'normalize_claim',
    description: 'Normalize and validate claim data from various formats (837, 835, JSON). Stores claim in database if valid.',
    inputSchema: {
      type: 'object',
      properties: {
        claim_data: {
          type: 'object',
          description: 'Claim data to normalize (supports 837, 835, or JSON format)',
        },
        format: {
          type: 'string',
          enum: ['837', '835', 'json'],
          description: 'Input format (default: json)',
        },
      },
      required: ['claim_data'],
    },
  },
  {
    name: 'classify_denial',
    description: 'Classify a denial code and return category, description, and resolution guidance',
    inputSchema: {
      type: 'object',
      properties: {
        denial_code: {
          type: 'string',
          description: 'Denial code (e.g., CO-197, PR-1)',
        },
        denial_text: {
          type: 'string',
          description: 'Optional denial reason text from remittance',
        },
        claim_data: {
          type: 'object',
          description: 'Optional claim data for context',
        },
      },
      required: ['denial_code'],
    },
  },
  {
    name: 'suggest_next_action',
    description: 'Suggest next action for a denial based on organization policies and denial characteristics',
    inputSchema: {
      type: 'object',
      properties: {
        claim_id: {
          type: 'string',
          description: 'Claim ID',
        },
        denial_code: {
          type: 'string',
          description: 'Denial code (e.g., CO-197)',
        },
        denial_amount: {
          type: 'number',
          description: 'Denied amount in dollars',
        },
        payer_id: {
          type: 'string',
          description: 'Optional payer ID for payer-specific policies',
        },
      },
      required: ['claim_id', 'denial_code', 'denial_amount'],
    },
  },
  {
    name: 'batch_classify_denials',
    description: 'Classify multiple denials and return analytics grouped by category, payer, or code. Useful for identifying patterns and cash leakage.',
    inputSchema: {
      type: 'object',
      properties: {
        denials: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              claim_id: { type: 'string' },
              denial_code: { type: 'string' },
              denial_amount: { type: 'number' },
              payer_id: { type: 'string' },
            },
            required: ['denial_code', 'denial_amount'],
          },
          description: 'Array of denials to classify',
        },
        group_by: {
          type: 'string',
          enum: ['category', 'payer', 'code'],
          description: 'How to group denials for analytics (default: category)',
        },
      },
      required: ['denials'],
    },
  },
  {
    name: 'audit_coding',
    description: 'Audit claim coding for potential issues before submission. Checks for modifier requirements, diagnosis support, bundling issues, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        claim_data: {
          type: 'object',
          properties: {
            cpt_codes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  modifiers: { type: 'array', items: { type: 'string' } },
                  units: { type: 'number' },
                },
                required: ['code'],
              },
              description: 'CPT codes with optional modifiers',
            },
            diagnosis_codes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  pointer: { type: 'number' },
                },
                required: ['code'],
              },
              description: 'ICD-10 diagnosis codes',
            },
            payer_id: {
              type: 'string',
              description: 'Optional payer ID for payer-specific rules',
            },
            place_of_service: {
              type: 'string',
              description: 'Place of service code',
            },
          },
          required: ['cpt_codes', 'diagnosis_codes'],
        },
        include_warnings: {
          type: 'boolean',
          description: 'Include warning-level issues (default: true)',
        },
      },
      required: ['claim_data'],
    },
  },
  // Keep legacy tools for backward compatibility
  {
    name: 'create_claim',
    description: '[LEGACY] Create a new insurance claim for a patient. Use normalize_claim for better validation.',
    inputSchema: {
      type: 'object',
      properties: {
        patientId: {
          type: 'string',
          description: 'Unique identifier for the patient',
        },
        amount: {
          type: 'number',
          description: 'Claim amount in dollars',
        },
      },
      required: ['patientId', 'amount'],
    },
  },
  {
    name: 'get_claim',
    description: 'Retrieve claim information by claim ID',
    inputSchema: {
      type: 'object',
      properties: {
        claimId: {
          type: 'string',
          description: 'Unique identifier for the claim',
        },
      },
      required: ['claimId'],
    },
  },
  {
    name: 'update_claim_status',
    description: 'Update the status of an existing claim',
    inputSchema: {
      type: 'object',
      properties: {
        claimId: {
          type: 'string',
          description: 'Unique identifier for the claim',
        },
        status: {
          type: 'string',
          enum: ['pending', 'submitted', 'paid', 'denied', 'appealed', 'written_off'],
          description: 'New status for the claim',
        },
      },
      required: ['claimId', 'status'],
    },
  },
  {
    name: 'list_claims',
    description: 'List all claims, optionally filtered by patient ID',
    inputSchema: {
      type: 'object',
      properties: {
        patientId: {
          type: 'string',
          description: 'Optional patient ID to filter claims',
        },
      },
    },
  },
];

const server = new Server(
  {
    name: 'rcm-mcp-server',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Check database availability for database-dependent tools
    const dbAvailable = await isDatabaseAvailable();

    switch (name) {
      case 'normalize_claim': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { error: 'Database not available. Set DATABASE_URL environment variable.' },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
        const result = await normalizeClaim(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'classify_denial': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { error: 'Database not available. Set DATABASE_URL environment variable.' },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
        const result = await classifyDenial(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'suggest_next_action': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { error: 'Database not available. Set DATABASE_URL environment variable.' },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
        const result = await suggestNextAction(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'batch_classify_denials': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { error: 'Database not available. Set DATABASE_URL environment variable.' },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
        const result = await batchClassifyDenials(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'audit_coding': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { error: 'Database not available. Set DATABASE_URL environment variable.' },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
        const result = await auditCoding(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // Legacy tools (in-memory or database)
      case 'create_claim': {
        const { patientId, amount } = args as { patientId: string; amount: number };
        const claimId = `CLM-${Date.now()}`;

        if (dbAvailable) {
          // Use database
          const result = await query(
            `INSERT INTO claims (claim_id, patient_id, status, amount)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [claimId, patientId, 'pending', amount]
          );
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result[0], null, 2),
              },
            ],
          };
        } else {
          // Use in-memory
          const claim = {
            claimId,
            patientId,
            amount,
            status: 'pending',
          };
          inMemoryClaims.set(claimId, claim);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(claim, null, 2),
              },
            ],
          };
        }
      }

      case 'get_claim': {
        const { claimId } = args as { claimId: string };

        if (dbAvailable) {
          const result = await query('SELECT * FROM claims WHERE claim_id = $1', [claimId]);
          if (result.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: 'Claim not found' }),
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result[0], null, 2),
              },
            ],
          };
        } else {
          const claim = inMemoryClaims.get(claimId);
          if (!claim) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: 'Claim not found' }),
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(claim, null, 2),
              },
            ],
          };
        }
      }

      case 'update_claim_status': {
        const { claimId, status } = args as { claimId: string; status: string };

        if (dbAvailable) {
          const result = await query(
            'UPDATE claims SET status = $1, updated_at = now() WHERE claim_id = $2 RETURNING *',
            [status, claimId]
          );
          if (result.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: 'Claim not found' }),
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result[0], null, 2),
              },
            ],
          };
        } else {
          const claim = inMemoryClaims.get(claimId);
          if (!claim) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: 'Claim not found' }),
                },
              ],
              isError: true,
            };
          }
          claim.status = status;
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(claim, null, 2),
              },
            ],
          };
        }
      }

      case 'list_claims': {
        const { patientId } = (args as { patientId?: string }) || {};

        if (dbAvailable) {
          const result = patientId
            ? await query('SELECT * FROM claims WHERE patient_id = $1', [patientId])
            : await query('SELECT * FROM claims ORDER BY created_at DESC LIMIT 100');

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } else {
          let claimsList = Array.from(inMemoryClaims.values());
          if (patientId) {
            claimsList = claimsList.filter((c) => c.patientId === patientId);
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(claimsList, null, 2),
              },
            ],
          };
        }
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: `Unknown tool: ${name}` }),
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    console.error(`Error in ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            tool: name,
          }),
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Check database connection
  const dbAvailable = await isDatabaseAvailable();
  if (dbAvailable) {
    console.error('RCM MCP Server v2.0 running on stdio (PostgreSQL connected)');
  } else {
    console.error('RCM MCP Server v2.0 running on stdio (in-memory mode - set DATABASE_URL for full functionality)');
  }
}

process.on('SIGINT', async () => {
  console.error('Shutting down...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down...');
  await closePool();
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
