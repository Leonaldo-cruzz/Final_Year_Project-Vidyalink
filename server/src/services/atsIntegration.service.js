import { env } from '../config/env.js';

/**
 * Adapter for the existing ATS service. It deliberately contains no scoring logic:
 * deployments opt in by configuring ATS_ANALYSIS_URL to the already-provisioned service.
 */
class AtsIntegrationService {
  async analyze(content, targetJob) {
    if (!env.ATS_ANALYSIS_URL) return { status: 'unavailable' };
    try {
      const controller = new globalThis.AbortController();
      const timeout = globalThis.setTimeout(() => controller.abort(), 5000);
      const response = await globalThis.fetch(env.ATS_ANALYSIS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ resume: content, targetJob }),
      });
      globalThis.clearTimeout(timeout);
      if (!response.ok) return { status: 'unavailable' };
      return { status: 'completed', ...(await response.json()) };
    } catch {
      return { status: 'unavailable' };
    }
  }
}

export default new AtsIntegrationService();
