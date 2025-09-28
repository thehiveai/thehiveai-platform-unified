import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureUser, resolveOrgId } from "@/lib/membership";
import URLBasedChatInterface from "@/components/chat/URLBasedChatInterface";

export default async function ChatPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold text-white mb-4">The Hive AI Platform</h1>
          <p className="text-gray-300 mb-6">Please sign in to access the chat interface.</p>
          <a
            href="/api/auth/signin"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In with Azure AD
          </a>
        </div>
      </div>
    );
  }

  const userId = await ensureUser(session);
  const orgId = await resolveOrgId(userId);
  // ids are re-derived in the API, so no need to pass to client

  return (
    <div className="h-[100dvh]">
      <URLBasedChatInterface />
    </div>
  );
}
