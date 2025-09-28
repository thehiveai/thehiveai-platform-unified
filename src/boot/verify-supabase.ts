const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

fetch(`${API_BASE}/api/supa-ping`, { credentials: "include" })
  .then(r => r.json())
  .then(d => console.log("supa OK:", d))
  .catch(e => console.error("supa ERR:", e));
