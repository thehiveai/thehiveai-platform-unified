"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div style={{ color: "white" }}>Loading…</div>;

  if (!session) {
    return (
      <div style={{ color: "white" }}>
        <p>Not signed in</p>
        <button onClick={() => signIn("azure-ad")}>Sign in with Azure AD</button>
      </div>
    );
  }

  const user = session.user as any;

  return (
    <div style={{ color: "white" }}>
      <h3>Hello, {user?.name || session.user?.email}</h3>
      <p>Email: {session.user?.email}</p>
      <p>UserId: {user?.id ?? "(none)"}</p>
      <p>OrgId: {user?.orgId ?? "(none)"}</p>
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  );
}
