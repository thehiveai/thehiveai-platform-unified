// API endpoints for thread management
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureUser, resolveOrgId } from '@/lib/membership';
import { createThread, getThreads } from '@/lib/threads';

// GET /api/threads - List threads for org
export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const threads = await getThreads(orgId, limit);

    return NextResponse.json({
      success: true,
      threads,
      count: threads.length
    });
  } catch (error: any) {
    console.error('GET /api/threads error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/threads - Create new thread
export async function POST(request: NextRequest) {
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

    const thread = await createThread({
      orgId,
      createdBy: userId,
      title: title || undefined
    });

    return NextResponse.json({
      success: true,
      thread
    });
  } catch (error: any) {
    console.error('POST /api/threads error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
