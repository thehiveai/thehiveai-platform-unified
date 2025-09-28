// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

const {
  AZURE_AD_CLIENT_ID,
  AZURE_AD_CLIENT_SECRET,
  AZURE_AD_TENANT_ID,
  NEXTAUTH_SECRET,
} = process.env;

export const authOptions: NextAuthOptions = {
  secret: NEXTAUTH_SECRET!,
  session: { strategy: "jwt" },
  providers: [
    AzureADProvider({
      clientId: AZURE_AD_CLIENT_ID!,
      clientSecret: AZURE_AD_CLIENT_SECRET!,
      tenantId: AZURE_AD_TENANT_ID!,
      authorization: { params: { scope: "openid profile email" } },
      profile(profile) {
        return {
          id: (profile as any).oid ?? profile.sub,
          name: profile.name,
          email:
            (profile as any).email ??
            (profile as any).preferred_username ??
            (profile as any).upn ??
            null,
          oid: (profile as any).oid ?? null,
          upn: (profile as any).upn ?? null,
          preferred_username: (profile as any).preferred_username ?? null,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, profile, user }) {
      const p = (profile ?? {}) as any;

      // Store Azure AD profile data
      if (p.oid) token.oid = p.oid;
      if (p.upn) token.upn = p.upn;
      if (p.preferred_username) token.preferred_username = p.preferred_username;
      if (!token.email)
        token.email = p.email ?? p.preferred_username ?? p.upn ?? token.email ?? null;

      // Resolve org membership on sign-in (only if we don't have orgId yet)
      if (profile && !token.orgId) {
        try {
          const { ensureUser, resolveOrgId } = await import("@/lib/membership");
          const { supabaseAdmin } = await import("@/lib/supabaseAdmin");

          // Create a temporary session object for ensureUser
          const tempSession = {
            user: {
              name: token.name,
              email: token.email,
              oid: token.oid,
              upn: token.upn,
              preferred_username: token.preferred_username,
            }
          } as any;

          const userId = await ensureUser(tempSession);
          const orgId = await resolveOrgId(userId);

          // Cache org info in JWT for future requests
          token.userId = userId;
          token.orgId = orgId;

          // Get user role for this org
          const { data: memberData } = await supabaseAdmin
            .from("org_members")
            .select("role")
            .eq("user_id", userId)
            .eq("org_id", orgId)
            .single();

          token.role = memberData?.role || "user";

        } catch (error) {
          console.error("Failed to resolve user org membership:", error);
          // Don't fail auth, but orgId will be null
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Populate session with cached data from JWT
      (session.user as any).oid = (token as any).oid ?? null;
      (session.user as any).upn = (token as any).upn ?? null;
      (session.user as any).preferred_username = (token as any).preferred_username ?? null;
      (session as any).userId = (token as any).userId ?? null;
      (session as any).orgId = (token as any).orgId ?? null;
      (session as any).role = (token as any).role ?? "user";

      return session;
    },
  },
};
