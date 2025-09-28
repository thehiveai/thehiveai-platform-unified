// src/lib/sessionHelpers.ts
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureUser, resolveOrgId, assertMembership } from "@/lib/membership";

/**
 * Enhanced session data for API routes
 */
export interface EnhancedSession extends Session {
  userId: string;
  orgId: string;
  role: "owner" | "admin" | "user";
}

/**
 * Get authenticated session with org/user data
 * Uses cached JWT data when available, falls back to database lookups
 */
export async function getAuthenticatedSession(): Promise<EnhancedSession> {
  const session = await getServerSession(authOptions);
  if (!session) {
    const error = new Error("Unauthorized");
    (error as any).status = 401;
    throw error;
  }

  // If we have cached data in session, use it
  if ((session as any).userId && (session as any).orgId) {
    return {
      ...session,
      userId: (session as any).userId,
      orgId: (session as any).orgId,
      role: (session as any).role || "user",
    } as EnhancedSession;
  }

  // Fallback: do database lookups (e.g., for existing sessions)
  console.warn("Session missing cached org data, falling back to database lookup");

  const userId = await ensureUser(session);
  const orgId = await resolveOrgId(userId);
  await assertMembership(orgId, userId);

  return {
    ...session,
    userId,
    orgId,
    role: "user", // Default role when not cached
  } as EnhancedSession;
}

/**
 * Validate org access for API routes
 * Throws 403 error if user doesn't have access to the specified org
 */
export async function validateOrgAccess(requestedOrgId: string): Promise<EnhancedSession> {
  const session = await getAuthenticatedSession();

  if (session.orgId !== requestedOrgId) {
    const error = new Error("Forbidden: access denied to this organization");
    (error as any).status = 403;
    throw error;
  }

  return session;
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(session: EnhancedSession): boolean {
  return ["owner", "admin"].includes(session.role);
}

/**
 * Require admin privileges (throws 403 if not admin)
 */
export function requireAdmin(session: EnhancedSession): void {
  if (!isAdmin(session)) {
    const error = new Error("Forbidden: admin privileges required");
    (error as any).status = 403;
    throw error;
  }
}

/**
 * Extract user info for audit logs
 */
export function getAuditInfo(session: EnhancedSession) {
  return {
    userId: session.userId,
    orgId: session.orgId,
    userEmail: session.user?.email || null,
    userName: session.user?.name || null,
    role: session.role,
  };
}