# Documentation Site Setup Guide

Your RCM MCP Server now has a professional documentation site powered by Docusaurus!

## ✅ What's Been Created

### 1. Documentation Site (`packages/docs`)

- **Docusaurus** - Modern, TypeScript-based documentation framework (like MkDocs for Node.js)
- Configured for your RCM project
- Dark mode support
- Search functionality
- Mobile responsive

### 2. GitHub Pages Deployment

- Automatic deployment workflow (`.github/workflows/deploy-docs.yml`)
- Deploys on every push to `main` branch
- No manual deployment needed

### 3. Documentation Structure

```
packages/docs/
├── docs/
│   ├── intro.md              # Landing page
│   ├── getting-started/      # Setup guides
│   ├── mcp-server/           # MCP server docs
│   ├── workflows/            # Flow A, B, C examples
│   │   └── denial-triage.md  # ✅ Already created
│   ├── infrastructure/       # AWS deployment
│   ├── migrations/          # Database docs
│   └── reference/           # API reference
├── blog/                     # Blog posts (optional)
├── src/                      # Custom components
└── static/                   # Images, files
```

## 🚀 Quick Start

### Local Development

1. **Start the dev server:**

   ```bash
   cd packages/docs
   yarn start
   ```

   Opens http://localhost:3000

2. **Make changes:**
   - Edit `.md` files in `docs/`
   - See live updates in browser

3. **Build for production:**
   ```bash
   yarn build
   ```

## 📝 Adding Documentation

### Create a New Page

1. Create a file in `docs/`, e.g., `docs/getting-started/installation.md`:

```markdown
---
sidebar_position: 1
---

# Installation

Your content here...
```

2. The page automatically appears in the sidebar!

### Add Images

1. Put images in `static/img/`
2. Reference in markdown:

```markdown
![Architecture](./img/architecture.png)
```

### Add Code Blocks

Supports syntax highlighting for many languages:

````markdown
```typescript
const config: Config = {
  title: 'RCM MCP Server',
}
```
````

## 🌐 GitHub Pages Deployment

### First-Time Setup

1. **Enable GitHub Pages:**
   - Go to your repo: https://github.com/caverac/rcm/settings/pages
   - Under "Source", select "GitHub Actions"
   - Save

2. **Update Configuration:**

   Open `packages/docs/docusaurus.config.ts` and update these lines with your GitHub info:

   ```typescript
   url: 'https://YOUR-USERNAME.github.io',
   baseUrl: '/YOUR-REPO-NAME/',
   organizationName: 'YOUR-USERNAME',
   projectName: 'YOUR-REPO-NAME',
   ```

3. **Push to GitHub:**

   ```bash
   git add .
   git commit -m "Add documentation site"
   git push origin main
   ```

4. **Wait for deployment:**
   - GitHub Actions will automatically build and deploy
   - Check progress: https://github.com/caverac/rcm/actions
   - Site will be live at: https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/

### Manual Deployment (Alternative)

If you prefer manual control:

```bash
cd packages/docs
GIT_USER=YOUR-USERNAME yarn deploy
```

## 🎨 Customization

### Change Theme Colors

Edit `packages/docs/src/css/custom.css`:

```css
:root {
  --ifm-color-primary: #2e8555; /* Your brand color */
  --ifm-color-primary-dark: #29784c;
}
```

### Update Logo

Replace `static/img/logo.svg` with your logo.

### Add Search

Docusaurus includes built-in search. For better search, connect Algolia (free for open source):
https://docusaurus.io/docs/search#using-algolia-docsearch

### Custom Navigation

Edit `docusaurus.config.ts` navbar items:

```typescript
navbar: {
  items: [
    {
      type: 'docSidebar',
      sidebarId: 'tutorialSidebar',
      label: 'Docs',
    },
    {to: '/blog', label: 'Blog'},
    {
      href: 'https://github.com/caverac/rcm',
      label: 'GitHub',
    },
  ],
}
```

## 📚 Next Steps

### Recommended Documentation to Add

1. **Getting Started** (`docs/getting-started/`)
   - `installation.md` - How to install
   - `configuration.md` - Environment setup
   - `quick-start.md` - 5-minute tutorial

2. **MCP Server** (`docs/mcp-server/`)
   - `overview.md` - What it does
   - `tools/` - Document each tool (normalize_claim, etc.)
   - `configuration.md` - Environment variables

3. **Workflows** (`docs/workflows/`)
   - ✅ `denial-triage.md` (already created)
   - `cash-leakage.md` - Flow B with examples
   - `pre-submission.md` - Flow C with examples

4. **Infrastructure** (`docs/infrastructure/`)
   - `deployment.md` - AWS deployment guide
   - `architecture.md` - System design
   - `database.md` - PostgreSQL setup

5. **Reference** (`docs/reference/`)
   - `denial-codes.md` - All denial codes
   - `org-policies.md` - Policy configuration
   - `api.md` - Tool API reference
   - `database-schema.md` - Table structures

### Migrate Existing READMEs

You have comprehensive READMEs in:

- `packages/mcp-server/README.md` (781 lines!)
- `packages/infrastructure/README.md`
- `packages/migrations/README.md`

**To migrate:**

1. Copy sections to appropriate doc files
2. Convert to Docusaurus format (add frontmatter)
3. Update internal links
4. Keep READMEs for quick reference

Example:

```bash
# Extract MCP Server tool docs
cat packages/mcp-server/README.md | sed -n '/## Tool Reference/,/## System Architecture/p' \
  > packages/docs/docs/mcp-server/tools.md
```

## 🔧 Troubleshooting

### Build Fails

```bash
cd packages/docs
rm -rf node_modules yarn.lock
yarn install
yarn build
```

### GitHub Pages Not Updating

1. Check Actions tab: https://github.com/caverac/rcm/actions
2. Verify `deploy-docs.yml` workflow ran successfully
3. Ensure GitHub Pages is enabled in repo settings

### Port Already in Use

```bash
yarn start --port 3001
```

## 🎯 Tips

- **Use MDX**: Docusaurus supports React components in markdown (`.mdx` files)
- **Admonitions**: Use callouts:
  ```markdown
  :::tip
  This is a helpful tip!
  :::
  ```
- **Versioning**: Docusaurus supports documentation versioning
- **i18n**: Built-in internationalization support
- **Analytics**: Easy to add Google Analytics, Plausible, etc.

## 📖 Learn More

- [Docusaurus Docs](https://docusaurus.io/docs)
- [Markdown Features](https://docusaurus.io/docs/markdown-features)
- [Deployment](https://docusaurus.io/docs/deployment)
- [Docusaurus Showcase](https://docusaurus.io/showcase)

---

**Your documentation site is ready! 🎉**

Start adding content and push to GitHub to see it live!
