import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

let sdk: NodeSDK | undefined;

export function initMcpTelemetry(): void {
  if (process.env.OTEL_ENABLED !== 'true') return;

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
  const honeycombKey = process.env.HONEYCOMB_API_KEY || '';

  const otlpHeaders: Record<string, string> = {};
  if (honeycombKey) {
    otlpHeaders['x-honeycomb-team'] = honeycombKey;
  }

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'depfender-mcp',
      [ATTR_SERVICE_VERSION]: '0.1.0',
    }),
    spanProcessors: [
      new SimpleSpanProcessor(
        new OTLPTraceExporter({
          url: `${endpoint}/v1/traces`,
          headers: otlpHeaders,
        })
      ),
    ],
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-undici': { enabled: true },
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
      }),
    ],
  });

  sdk.start();

  const shutdown = () => {
    sdk?.shutdown().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
