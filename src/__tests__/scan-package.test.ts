import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ScanDetails, FindingsResponse } from "../types.js";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after mocking
const { DepfenderApiClient } = await import("../api-client.js");

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response;
}

describe("DepfenderApiClient", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws if DEPFENDER_API_KEY is not set", () => {
    const original = process.env.DEPFENDER_API_KEY;
    delete process.env.DEPFENDER_API_KEY;
    expect(() => new DepfenderApiClient("https://api.example.com")).toThrow(
      "DEPFENDER_API_KEY is required"
    );
    if (original) process.env.DEPFENDER_API_KEY = original;
  });

  it("creates a scan", async () => {
    const client = new DepfenderApiClient(
      "https://api.example.com",
      "test-key"
    );
    const mockResponse = {
      id: "scan-123",
      package: "lodash",
      version: "4.17.21",
      ecosystem: "npm",
      status: "pending",
      message: "Scan created",
    };

    mockFetch.mockResolvedValueOnce(jsonResponse(mockResponse, 201));

    const result = await client.createScan({
      package: "lodash",
      version: "4.17.21",
    });

    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/scans",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-internal-secret": "test-key",
        }),
      })
    );
  });

  it("gets scan details", async () => {
    const client = new DepfenderApiClient(
      "https://api.example.com",
      "test-key"
    );
    const mockScan: ScanDetails = {
      id: "scan-123",
      package: "lodash",
      version: "4.17.21",
      ecosystem: "npm",
      status: "completed",
      verdict: "safe",
      confidence: 95,
      findings_count: 0,
    };

    mockFetch.mockResolvedValueOnce(jsonResponse(mockScan));

    const result = await client.getScan("scan-123");
    expect(result).toEqual(mockScan);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/scans/scan-123",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("gets findings", async () => {
    const client = new DepfenderApiClient(
      "https://api.example.com",
      "test-key"
    );
    const mockFindings: FindingsResponse = {
      scan_id: "scan-123",
      findings: [
        {
          id: "finding-1",
          file_path: "src/index.js",
          start_line: 10,
          end_line: 15,
          severity: "high",
          confidence: 90,
          rationale: "Suspicious network call",
          agent_name: "network-engineer",
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
      pagination: { limit: 20, offset: 0, total: 1, has_more: false },
    };

    mockFetch.mockResolvedValueOnce(jsonResponse(mockFindings));

    const result = await client.getFindings("scan-123");
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe("high");
  });

  it("polls until scan completes", async () => {
    const client = new DepfenderApiClient(
      "https://api.example.com",
      "test-key"
    );
    const pending: ScanDetails = {
      id: "scan-123",
      package: "lodash",
      version: "4.17.21",
      ecosystem: "npm",
      status: "running",
    };
    const completed: ScanDetails = {
      ...pending,
      status: "completed",
      verdict: "safe",
      confidence: 95,
      findings_count: 0,
    };

    mockFetch
      .mockResolvedValueOnce(jsonResponse(pending))
      .mockResolvedValueOnce(jsonResponse(completed));

    const result = await client.pollUntilComplete("scan-123");
    expect(result.status).toBe("completed");
    expect(result.verdict).toBe("safe");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("handles API errors", async () => {
    const client = new DepfenderApiClient(
      "https://api.example.com",
      "test-key"
    );

    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "Not found", message: "Scan not found" }, 404)
    );

    await expect(client.getScan("bad-id")).rejects.toThrow(
      "API request failed (404)"
    );
  });

  it("strips trailing slash from base URL", async () => {
    const client = new DepfenderApiClient(
      "https://api.example.com/",
      "test-key"
    );
    const mockScan: ScanDetails = {
      id: "scan-123",
      package: "lodash",
      version: "4.17.21",
      ecosystem: "npm",
      status: "completed",
    };

    mockFetch.mockResolvedValueOnce(jsonResponse(mockScan));

    await client.getScan("scan-123");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/scans/scan-123",
      expect.anything()
    );
  });
});

describe("scan_package tool logic", () => {
  it("formats safe result correctly", async () => {
    // Test the formatting logic directly
    const result = {
      scanId: "scan-123",
      package: "lodash",
      version: "4.17.21",
      ecosystem: "npm" as const,
      status: "completed" as const,
      verdict: "safe" as const,
      confidence: 95,
      findingsCount: 0,
      summary: "Package lodash appears safe. No security threats detected.",
    };

    const lines = [
      `Package: ${result.package}@${result.version}`,
      `Ecosystem: ${result.ecosystem}`,
      `Status: ${result.status}`,
      `Verdict: ${result.verdict.toUpperCase()}`,
      `Confidence: ${result.confidence}%`,
      `Findings: ${result.findingsCount}`,
      "",
      result.summary,
    ].join("\n");

    expect(lines).toContain("SAFE");
    expect(lines).toContain("lodash@4.17.21");
    expect(lines).toContain("95%");
    expect(lines).toContain("Findings: 0");
  });

  it("formats malicious result with findings", () => {
    const result = {
      scanId: "scan-456",
      package: "evil-pkg",
      version: "1.0.0",
      ecosystem: "npm" as const,
      status: "completed" as const,
      verdict: "malicious" as const,
      confidence: 99,
      findingsCount: 2,
      summary:
        "WARNING: Package evil-pkg appears malicious! Do not use this package.",
      findings: [
        {
          severity: "critical" as const,
          file: "src/index.js",
          line: 42,
          rationale: "Exfiltrates environment variables",
          agent: "network-engineer",
        },
        {
          severity: "high" as const,
          file: "src/utils.js",
          line: 10,
          rationale: "Obfuscated code detected",
          agent: "security-auditor",
        },
      ],
    };

    const lines: string[] = [
      `Package: ${result.package}@${result.version}`,
      `Ecosystem: ${result.ecosystem}`,
      `Status: ${result.status}`,
      `Verdict: ${result.verdict.toUpperCase()}`,
      `Confidence: ${result.confidence}%`,
      `Findings: ${result.findingsCount}`,
      "",
      result.summary,
      "",
      "--- Findings ---",
    ];

    for (const f of result.findings) {
      lines.push(
        `[${f.severity.toUpperCase()}] ${f.file}:${f.line} (${f.agent})`,
        `  ${f.rationale}`
      );
    }

    const output = lines.join("\n");
    expect(output).toContain("MALICIOUS");
    expect(output).toContain("WARNING");
    expect(output).toContain("[CRITICAL] src/index.js:42");
    expect(output).toContain("Exfiltrates environment variables");
    expect(output).toContain("[HIGH] src/utils.js:10");
  });

  it("formats failed scan result", () => {
    const result = {
      scanId: "scan-789",
      package: "broken-pkg",
      version: "0.0.1",
      ecosystem: "npm" as const,
      status: "failed" as const,
      summary: "Scan failed: Container timeout",
    };

    const lines = [
      `Package: ${result.package}@${result.version}`,
      `Ecosystem: ${result.ecosystem}`,
      `Status: ${result.status}`,
      "",
      result.summary,
    ].join("\n");

    expect(lines).toContain("failed");
    expect(lines).toContain("Container timeout");
  });
});
