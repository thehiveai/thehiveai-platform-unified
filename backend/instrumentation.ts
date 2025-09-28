/** Next.js server instrumentation — runs in Node (SSR/route handlers).
 * Safe no-op if APPLICATIONINSIGHTS_CONNECTION_STRING is unset.
 */
import appInsights from "applicationinsights";

declare global {
  // Guard against double-start in dev/hot-reload
  // eslint-disable-next-line no-var
  var __APP_INSIGHTS_STARTED__: boolean | undefined;
}

export function register() {
  if (globalThis.__APP_INSIGHTS_STARTED__) return;

  const conn = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (!conn) return; // no-op if not configured

  try {
    appInsights
      .setup(conn)
      .setAutoCollectConsole(true, true)      // track console.* as traces
      .setAutoCollectExceptions(true)         // unhandled exceptions
      .setAutoCollectDependencies(true)       // outgoing HTTP calls
      .setAutoCollectPerformance(true, true)  // perf metrics
      .setDistributedTracingMode(appInsights.DistributedTracingModes.AI)
      .setSendLiveMetrics(false)              // can be enabled later
      .start();

    const client = appInsights.defaultClient;
    // Tag a role name to distinguish this app in App Insights
    client.context.tags[client.context.keys.cloudRole] = "nextjs-web";

    globalThis.__APP_INSIGHTS_STARTED__ = true;
    // Optional: log once
    // console.log("[AppInsights] server instrumentation started");
  } catch (e) {
    console.warn("[AppInsights] server init failed:", e);
  }
}
