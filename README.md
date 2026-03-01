<p align="center">
  <img src="https://depfender.dev/logo.png" alt="Depfender" width="200" />
</p>

<h1 align="center">@depfenderdev/mcp</h1>

<p align="center">
  MCP server for Depfender — scan packages for data exfiltration and security threats directly from your IDE.
</p>

<p align="center">
  <a href="https://depfender.dev"><img src="https://img.shields.io/badge/Website-depfender.dev-blue" alt="Website" /></a>
  <a href="https://www.npmjs.com/package/@depfenderdev/mcp"><img src="https://img.shields.io/npm/v/@depfenderdev/mcp" alt="npm" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green" alt="License" /></a>
</p>

---

## Installation

### Cursor

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "depfender": {
      "command": "npx",
      "args": ["@depfenderdev/mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add depfender -- npx @depfenderdev/mcp
```

### VS Code

Add to your VS Code MCP settings (`.vscode/mcp.json`):

```json
{
  "mcpServers": {
    "depfender": {
      "command": "npx",
      "args": ["@depfenderdev/mcp"]
    }
  }
}
```

---

## Tools

### `scan_package`

Scans a package for data exfiltration and security threats.

**Parameters:**
- `package` (required) — package name (e.g., `lodash`)
- `version` (optional) — version to scan (defaults to latest)
- `ecosystem` (optional) — package ecosystem: `npm`, `pypi`, `cargo`, `maven` (default: `npm`)

---

## Development

### Setup

```bash
npm install
npm run build
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEPFENDER_API_URL` | Yes | Backend API URL (e.g., `http://localhost:3000`) |
| `DEPFENDER_API_KEY` | Yes | Backend API secret (`x-internal-secret` value) |

### Local IDE Configuration

Add to your MCP settings (e.g., Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "depfender": {
      "command": "node",
      "args": ["/path/to/mcp/dist/index.js"],
      "env": {
        "DEPFENDER_API_URL": "http://localhost:3000",
        "DEPFENDER_API_KEY": "your-api-secret"
      }
    }
  }
}
```

### Testing

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
```

E2E tests require `DEPFENDER_API_KEY` and a running backend:

```bash
DEPFENDER_API_KEY=your-secret DEPFENDER_API_URL=http://localhost:3000 npm test
```

### Scripts

```bash
npm run dev                 # Run with tsx (no build needed)
npm run build               # Compile TypeScript
```

---

## Community

- [GitHub Discussions](https://github.com/depfenderdev/mcp/discussions) — Questions and ideas
- [Twitter/X](https://x.com/depfenderdev) — Updates and announcements
- [Website](https://depfender.dev) — Full documentation

---

## License

[MIT](LICENSE)
