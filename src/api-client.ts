import type {
  CreateScanRequest,
  ScanCreatedResponse,
  ScanDetails,
  FindingsResponse,
} from "./types.js";

const DEFAULT_API_URL = "https://api.depfender.dev";
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 100; // ~5 minutes max

export class DepfenderApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiUrl?: string, apiKey?: string) {
    this.baseUrl = (apiUrl || DEFAULT_API_URL).replace(/\/+$/, "");
    const key = apiKey || process.env.DEPFENDER_API_KEY;
    if (!key) {
      throw new Error(
        "DEPFENDER_API_KEY is required. Set it as an environment variable or pass it directly."
      );
    }
    this.apiKey = key;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-internal-secret": this.apiKey,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage: string;
      try {
        const parsed = JSON.parse(errorBody);
        errorMessage = parsed.message || parsed.error || errorBody;
      } catch {
        errorMessage = errorBody;
      }
      throw new Error(
        `API request failed (${response.status}): ${errorMessage}`
      );
    }

    return response.json() as Promise<T>;
  }

  async createScan(req: CreateScanRequest): Promise<ScanCreatedResponse> {
    return this.request<ScanCreatedResponse>("POST", "/api/v1/scans", req);
  }

  async getScan(scanId: string): Promise<ScanDetails> {
    return this.request<ScanDetails>("GET", `/api/v1/scans/${scanId}`);
  }

  async getFindings(scanId: string): Promise<FindingsResponse> {
    return this.request<FindingsResponse>(
      "GET",
      `/api/v1/scans/${scanId}/findings`
    );
  }

  async pollUntilComplete(scanId: string): Promise<ScanDetails> {
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      const scan = await this.getScan(scanId);

      if (scan.status === "completed" || scan.status === "failed") {
        return scan;
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error(
      `Scan ${scanId} did not complete within the polling timeout`
    );
  }
}
