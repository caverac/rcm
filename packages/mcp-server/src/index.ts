#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

interface ClaimData {
  claimId: string;
  patientId: string;
  amount: number;
  status: 'pending' | 'submitted' | 'paid' | 'denied';
  submittedDate?: string;
}

// In-memory storage for demonstration
const claims = new Map<string, ClaimData>();

const tools: Tool[] = [
  {
    name: 'create_claim',
    description: 'Create a new insurance claim for a patient',
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
          enum: ['pending', 'submitted', 'paid', 'denied'],
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
    version: '1.0.0',
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

  switch (name) {
    case 'create_claim': {
      const { patientId, amount } = args as { patientId: string; amount: number };
      const claimId = `CLM-${Date.now()}`;
      const claim: ClaimData = {
        claimId,
        patientId,
        amount,
        status: 'pending',
      };
      claims.set(claimId, claim);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(claim, null, 2),
          },
        ],
      };
    }

    case 'get_claim': {
      const { claimId } = args as { claimId: string };
      const claim = claims.get(claimId);
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

    case 'update_claim_status': {
      const { claimId, status } = args as {
        claimId: string;
        status: ClaimData['status'];
      };
      const claim = claims.get(claimId);
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
      if (status === 'submitted' && !claim.submittedDate) {
        claim.submittedDate = new Date().toISOString();
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

    case 'list_claims': {
      const { patientId } = (args as { patientId?: string }) || {};
      let claimsList = Array.from(claims.values());
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
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('RCM MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
