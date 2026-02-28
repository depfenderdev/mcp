#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { DepfenderApiClient } from "./api-client.js";
import type { ScanToolResult, FindingSummary } from "./types.js";

const ScanPackageSchema = z.object({
  package: z.string().min(1).describe("npm package name (e.g., 'lodash')"),
  version: z
    .string()
    .optional()
    .describe("Package version to scan (default: latest)"),
  ecosystem: z
    .enum(["npm", "pypi", "cargo", "maven"])
    .optional()
    .default("npm")
    .describe("Package ecosystem (default: npm)"),
});

function createClient(): DepfenderApiClient {
  const apiUrl = process.env.DEPFENDER_API_URL;
  const apiKey = process.env.DEPFENDER_API_KEY;
  return new DepfenderApiClient(apiUrl, apiKey);
}

function formatResult(result: ScanToolResult): string {
  const lines: string[] = [
    `Package: ${result.package}@${result.version}`,
    `Ecosystem: ${result.ecosystem}`,
    `Status: ${result.status}`,
  ];

  if (result.verdict) {
    lines.push(`Verdict: ${result.verdict.toUpperCase()}`);
  }
  if (result.confidence !== undefined) {
    lines.push(`Confidence: ${result.confidence}%`);
  }
  if (result.findingsCount !== undefined) {
    lines.push(`Findings: ${result.findingsCount}`);
  }

  lines.push("", result.summary);

  if (result.findings && result.findings.length > 0) {
    lines.push("", "--- Findings ---");
    for (const f of result.findings) {
      lines.push(
        `[${f.severity.toUpperCase()}] ${f.file}:${f.line} (${f.agent})`,
        `  ${f.rationale}`
      );
    }
  }

  return lines.join("\n");
}

async function handleScanPackage(
  args: z.infer<typeof ScanPackageSchema>
): Promise<ScanToolResult> {
  const client = createClient();

  const createResponse = await client.createScan({
    package: args.package,
    version: args.version,
    ecosystem: args.ecosystem,
  });

  const scanDetails = await client.pollUntilComplete(createResponse.id);

  let findings: FindingSummary[] | undefined;
  if (
    scanDetails.status === "completed" &&
    scanDetails.findings_count &&
    scanDetails.findings_count > 0
  ) {
    const findingsResponse = await client.getFindings(scanDetails.id);
    findings = findingsResponse.findings.map((f) => ({
      severity: f.severity,
      file: f.file_path,
      line: f.start_line,
      rationale: f.rationale,
      agent: f.agent_name,
    }));
  }

  let summary: string;
  if (scanDetails.status === "failed") {
    summary = `Scan failed: ${scanDetails.error_message || "Unknown error"}`;
  } else if (scanDetails.verdict === "safe") {
    summary = `Package ${args.package} appears safe. No security threats detected.`;
  } else if (scanDetails.verdict === "suspicious") {
    summary = `Package ${args.package} has suspicious behavior. Review the findings below.`;
  } else if (scanDetails.verdict === "malicious") {
    summary = `WARNING: Package ${args.package} appears malicious! Do not use this package.`;
  } else {
    summary = `Scan completed with status: ${scanDetails.status}`;
  }

  return {
    scanId: scanDetails.id,
    package: scanDetails.package,
    version: scanDetails.version,
    ecosystem: scanDetails.ecosystem,
    status: scanDetails.status,
    verdict: scanDetails.verdict,
    confidence: scanDetails.confidence,
    findingsCount: scanDetails.findings_count,
    summary,
    findings,
  };
}

async function main() {
  const server = new Server(
    {
      name: "depfender",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "scan_package",
        description:
          "Scan an npm package for security threats using Depfender. " +
          "Analyzes the package for data exfiltration, malicious code, and other security risks. " +
          "Returns a verdict (safe/suspicious/malicious), confidence score, and detailed findings.",
        inputSchema: {
          type: "object" as const,
          properties: {
            package: {
              type: "string",
              description: "npm package name (e.g., 'lodash')",
            },
            version: {
              type: "string",
              description: "Package version to scan (default: latest)",
            },
            ecosystem: {
              type: "string",
              enum: ["npm", "pypi", "cargo", "maven"],
              description: "Package ecosystem (default: npm)",
              default: "npm",
            },
          },
          required: ["package"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== "scan_package") {
      return {
        content: [
          {
            type: "text" as const,
            text: `Unknown tool: ${request.params.name}`,
          },
        ],
        isError: true,
      };
    }

    try {
      const args = ScanPackageSchema.parse(request.params.arguments);
      const result = await handleScanPackage(args);
      return {
        content: [
          {
            type: "text" as const,
            text: formatResult(result),
          },
        ],
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error scanning package: ${message}`,
          },
        ],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
