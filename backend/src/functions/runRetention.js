// Azure Functions (Node.js v4 programming model)
const { app } = require("@azure/functions");

// Runs at :17 every hour (UTC)
app.timer("runRetention", {
  schedule: "0 17 * * * *",
  handler: async (myTimer, context) => {
    const url = process.env.RUN_ALL_URL;            // e.g. https://app.gohive.ai/api/admin/retention/run-all
    const token = process.env.CRON_TOKEN;           // your shared secret header
    const triggeredAt = new Date().toISOString();

    if (!url || !token) {
      context.log.error(
        "[runRetention] Missing RUN_ALL_URL or CRON_TOKEN in Function App application settings."
      );
      return;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "X-Cron-Token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source: "azure-function", triggeredAt }),
      });

      const text = await res.text();
      if (!res.ok) {
        context.log.error(`[runRetention] ${res.status} ${res.statusText}: ${text.slice(0, 800)}`);
      } else {
        context.log(`[runRetention] OK ${res.status}: ${text.slice(0, 800)}`);
      }
    } catch (err) {
      context.log.error("[runRetention] Error calling run-all:", err?.message || err);
    }
  },
});
