# RCM MCP Server

Model Context Protocol (MCP) server for Revenue Cycle Management operations.

## Features

This MCP server provides tools for managing insurance claims:

- **create_claim**: Create a new insurance claim for a patient
- **get_claim**: Retrieve claim information by claim ID
- **update_claim_status**: Update the status of an existing claim
- **list_claims**: List all claims, optionally filtered by patient ID

## Building

```bash
yarn build
```

## Running

```bash
node dist/index.js
```

## Development

```bash
yarn dev
```

## Integration

To use this MCP server with Claude Desktop or other MCP clients, add it to your configuration:

```json
{
  "mcpServers": {
    "rcm": {
      "command": "node",
      "args": ["/path/to/rcm/packages/mcp-server/dist/index.js"]
    }
  }
}
```
