import Link from "next/link";

export default function LegacyIndex() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Legacy Index</h1>
      <p style={{ marginBottom: "1rem" }}>
        This page was simplified to allow the production build to complete.
      </p>
      <p>
        <Link href="/">← Go to the App Router home</Link>
      </p>
    </main>
  );
}
