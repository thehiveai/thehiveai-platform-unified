import Link from "next/link";

export default function Custom404() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>404 — Page not found</h1>
      <p style={{ marginBottom: "1rem" }}>
        The page you’re looking for doesn’t exist.
      </p>
      <p>
        <Link href="/">← Go back home</Link>
      </p>
    </main>
  );
}
