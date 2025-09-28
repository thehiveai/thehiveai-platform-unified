"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function AcceptInviteClient() {
  const search = useSearchParams();
  const token = search.get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing token in the URL.");
      return;
    }
    setStatus("loading");
    (async () => {
      try {
        const res = await fetch("/api/admin/invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const bodyText = await res.text();
        if (!res.ok) throw new Error(bodyText || `HTTP ${res.status}`);
        setStatus("ok");
        setMessage("Invite accepted. You can close this window.");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Request failed";
        setStatus("error");
        setMessage(msg);
      }
    })();
  }, [token]);

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold mb-2">Accepting invite…</h1>
      {status === "loading" && <p>Working…</p>}
      {status === "ok" && <p className="text-green-600">{message}</p>}
      {status === "error" && <p className="text-red-600">{message}</p>}
    </div>
  );
}
