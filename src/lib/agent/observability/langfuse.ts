import { CallbackHandler } from '@langfuse/langchain';
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

import { log } from '../../log.js';

// Initialize open telemetry node-sdk, this needs to happen before
// initializing a langfuse callback handler
//
export const langfuseSpanProcessor = new LangfuseSpanProcessor();

const sdk = new NodeSDK({
  spanProcessors: [langfuseSpanProcessor],
});

sdk.start();
/**
 * Langfuse observability integration for agent tracing
 *
 * Provides automatic tracking of:
 * - LLM calls (inputs, outputs, token usage, latency)
 * - Tool calls and results
 * - Errors and exceptions
 *
 * Can be disabled via LANGFUSE_ENABLED=false
 *
 * Note: CallbackHandler reads credentials directly from process.env:
 * - LANGFUSE_SECRET_KEY (required)
 * - LANGFUSE_PUBLIC_KEY (required)
 * - LANGFUSE_HOST (optional, defaults to cloud.langfuse.com)
 */
let langfuseHandler: CallbackHandler | null = null;

/**
 * Initialize Langfuse callback handler if enabled
 *
 * Reads configuration directly from process.env:
 * - LANGFUSE_ENABLED: Set to 'true' to enable
 * - LANGFUSE_SECRET_KEY: Secret key from Langfuse
 * - LANGFUSE_PUBLIC_KEY: Public key from Langfuse
 * - LANGFUSE_HOST: Optional host (defaults to cloud.langfuse.com)
 */
export function initializeLangfuse(): CallbackHandler | null {
  const enabled = process.env.LANGFUSE_ENABLED === 'true';
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const host = process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASE_URL;

  if (!enabled) {
    log({ langfuse: 'disabled', reason: 'LANGFUSE_ENABLED is not "true"' });
    return null;
  }

  if (!secretKey || !publicKey) {
    log({
      langfuse: 'disabled',
      reason: 'Missing LANGFUSE_SECRET_KEY or LANGFUSE_PUBLIC_KEY',
      hasSecretKey: !!secretKey,
      hasPublicKey: !!publicKey,
    });
    return null;
  }

  // Set LANGFUSE_HOST if LANGFUSE_BASE_URL is provided
  if (host && !process.env.LANGFUSE_HOST) {
    // Extract host from URL if full URL provided
    const hostValue = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
    process.env.LANGFUSE_HOST = hostValue;
  }

  try {
    langfuseHandler = new CallbackHandler({
      // Optional metadata can be added here
      userId: process.env.BEDROCK_USERNAME,
      // sessionId: sessionId,
      tags: [
        `host:${process.env.BEDROCK_HOST}:${process.env.BEDROCK_PORT}`
      ],
    });

    log({
      langfuse: 'initialized',
      host: process.env.LANGFUSE_HOST || 'cloud.langfuse.com',
      hasSecretKey: !!secretKey,
      hasPublicKey: !!publicKey,
    });

    return langfuseHandler;
  } catch (error) {
    log({
      langfuse: 'initialization_error',
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    return null;
  }
}

/**
 * Get the Langfuse callback handler
 * Returns null if not initialized or disabled
 */
export function getLangfuseHandler(): CallbackHandler | null {
  if (!langfuseHandler) {
    langfuseHandler = initializeLangfuse();
  }
  return langfuseHandler;
}

/**
 * Check if Langfuse is enabled and configured
 */
export function isLangfuseEnabled(): boolean {
  return (
    process.env.LANGFUSE_ENABLED === 'true' &&
    !!process.env.LANGFUSE_SECRET_KEY &&
    !!process.env.LANGFUSE_PUBLIC_KEY
  );
}

/**
 * Flush pending Langfuse traces to ensure they are sent
 * Should be called after completing agent operations to ensure
 * the latest traces are flushed before the next invocation
 */
export async function flushLangfuse(): Promise<void> {
  await langfuseSpanProcessor.forceFlush();
  log({
    langfuse: 'forceFlush'
  });
}
