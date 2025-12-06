# RCM MCP Server Documentation

Official documentation site for the RCM MCP Server, built with [Docusaurus](https://docusaurus.io/).

## Local Development

```bash
yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
yarn build
```

This command generates static content into the `build` directory.

## Deployment

The documentation is automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

You can also manually deploy using:

```bash
GIT_USER=<Your GitHub username> yarn deploy
```

## Structure

```
docs/
├── intro.md                 # Introduction page
├── getting-started/         # Installation and setup guides
├── mcp-server/              # MCP Server documentation
├── workflows/              # Workflow examples (Flow A, B, C)
├── infrastructure/         # AWS deployment guides
├── migrations/            # Database migration docs
└── reference/            # API reference and data structures
```

## Live Site

Once deployed: https://cavera.github.io/rcm/
