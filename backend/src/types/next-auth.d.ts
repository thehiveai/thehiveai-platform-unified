import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      oid?: string | null;
      upn?: string | null;
      preferred_username?: string | null;
    };
    userId?: string; // Internal app.users.id
    orgId?: string;  // Organization ID
    role?: "owner" | "admin" | "user";
  }

  interface JWT {
    oid?: string;
    upn?: string;
    preferred_username?: string;
    userId?: string;
    orgId?: string;
    role?: "owner" | "admin" | "user";
  }
}
