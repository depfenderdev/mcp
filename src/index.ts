#!/usr/bin/env node

import { initMcpTelemetry } from './telemetry.js';

// Init OTEL SDK before any other modules are loaded.
// Dynamic import ensures the MCP SDK, zod, and api-client are loaded
// AFTER the SDK has patched the module loader for auto-instrumentation.
initMcpTelemetry();

const { main } = await import('./main.js');
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
