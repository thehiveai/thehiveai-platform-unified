// API endpoints for individual thread operations
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureUser, resolveOrgId } from '@/lib/membership';
import { getThread, getMessages, updateThreadTitle, deleteThread } from '@/lib/threads';

// GET /api/threads/[id] - Get thread with messages
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = await ensureUser(session);
    const orgId = await resolveOrgId(userId);
    const threadId = params.id;

    const thread = await getThread(threadId, orgId);
    if (!thread) {
      return NextResponse.json(
        { success: false, error: 'Thread not found' },
        { status: 404 }
      );
    }

    const messages = await getMessages(threadId, orgId);

    return NextResponse.json({
      success: true,
      thread,
      messages,
      messageCount: messages.length
    });
  } catch (error: any) {
    console.error(`GET /api/threads/${params.id} error:`, error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/threads/[id] - Update thread (title)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = await ensureUser(session);
    const orgId = await resolveOrgId(userId);
    const body = await request.json();
    const { title } = body;
    const threadId = params.id;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    await updateThreadTitle(threadId, orgId, title);

    return NextResponse.json({
      success: true,
      message: 'Thread title updated'
    });
  } catch (error: any) {
    console.error(`PATCH /api/threads/${params.id} error:`, error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/threads/[id] - Delete thread
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = await ensureUser(session);
    const orgId = await resolveOrgId(userId);
    const threadId = params.id;

    await deleteThread(threadId, orgId);

    return NextResponse.json({
      success: true,
      message: 'Thread deleted'
    });
  } catch (error: any) {
    console.error(`DELETE /api/threads/${params.id} error:`, error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
