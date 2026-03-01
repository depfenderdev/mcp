# @depfenderdev/mcp

MCP (Model Context Protocol) server for Depfender IDE integration. Allows AI coding assistants to scan npm packages for security threats directly from the IDE.

## Setup

```bash
npm install
npm run build
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEPFENDER_API_URL` | Yes | Backend API URL (e.g., `http://localhost:3000`) |
| `DEPFENDER_API_KEY` | Yes | Backend API secret (`x-internal-secret` value) |

### IDE Configuration

Add to your MCP settings (e.g., Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "depfender": {
      "command": "node",
      "args": ["/path/to/packages/mcp/dist/index.js"],
      "env": {
        "DEPFENDER_API_URL": "http://localhost:3000",
        "DEPFENDER_API_KEY": "your-api-secret"
      }
    }
  }
}
```

## Tools

### `scan_package`

Scans an npm package for data exfiltration and security threats.

**Parameters:**
- `package` (required) — npm package name (e.g., `lodash`)
- `version` (optional) — version to scan (defaults to latest)
- `ecosystem` (optional) — package ecosystem (default: `npm`)

## Testing

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
```

E2E tests require `DEPFENDER_API_KEY` and a running backend:

```bash
DEPFENDER_API_KEY=your-secret DEPFENDER_API_URL=http://localhost:3000 npm test
```

## Development

```bash
npm run dev                 # Run with tsx (no build needed)
npm run build               # Compile TypeScript
```
