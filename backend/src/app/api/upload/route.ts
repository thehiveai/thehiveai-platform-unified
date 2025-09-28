// File upload API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureUser, resolveOrgId, assertMembership } from '@/lib/membership';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

// Supported file types and their processing capabilities
const SUPPORTED_FILE_TYPES = {
  // Documents
  'application/pdf': { category: 'document', extractText: true, maxSize: 50 * 1024 * 1024 }, // 50MB
  'application/msword': { category: 'document', extractText: true, maxSize: 25 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { category: 'document', extractText: true, maxSize: 25 * 1024 * 1024 },
  'text/plain': { category: 'document', extractText: true, maxSize: 10 * 1024 * 1024 },
  'text/csv': { category: 'data', extractText: true, maxSize: 100 * 1024 * 1024 },
  'application/json': { category: 'data', extractText: true, maxSize: 50 * 1024 * 1024 },
  
  // Images
  'image/jpeg': { category: 'image', extractText: false, maxSize: 20 * 1024 * 1024 },
  'image/png': { category: 'image', extractText: false, maxSize: 20 * 1024 * 1024 },
  'image/gif': { category: 'image', extractText: false, maxSize: 10 * 1024 * 1024 },
  'image/webp': { category: 'image', extractText: false, maxSize: 20 * 1024 * 1024 },
  
  // Spreadsheets
  'application/vnd.ms-excel': { category: 'data', extractText: true, maxSize: 50 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { category: 'data', extractText: true, maxSize: 50 * 1024 * 1024 },
  
  // Presentations
  'application/vnd.ms-powerpoint': { category: 'document', extractText: true, maxSize: 100 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { category: 'document', extractText: true, maxSize: 100 * 1024 * 1024 },
};

function generateFileId(): string {
  return crypto.randomUUID();
}

function getFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer as any).digest('hex');
}

async function extractTextContent(buffer: Buffer, mimeType: string, filename: string): Promise<string | null> {
  try {
    switch (mimeType) {
      case 'text/plain':
        return buffer.toString('utf-8');
      
      case 'application/json':
        try {
          const jsonData = JSON.parse(buffer.toString('utf-8'));
          return JSON.stringify(jsonData, null, 2);
        } catch {
          return buffer.toString('utf-8');
        }
      
      case 'text/csv':
        return buffer.toString('utf-8');
      
      // For other document types, we'll need additional libraries
      // For now, return null and handle them later
      default:
        console.log(`Text extraction not yet implemented for ${mimeType}`);
        return null;
    }
  } catch (error) {
    console.error('Error extracting text content:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await ensureUser(session);
    const orgId = await resolveOrgId(userId);
    await assertMembership(orgId, userId);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const threadId = formData.get('threadId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID required' }, { status: 400 });
    }

    // Validate file type
    const fileType = SUPPORTED_FILE_TYPES[file.type as keyof typeof SUPPORTED_FILE_TYPES];
    if (!fileType) {
      return NextResponse.json({ 
        error: `Unsupported file type: ${file.type}. Supported types: ${Object.keys(SUPPORTED_FILE_TYPES).join(', ')}` 
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > fileType.maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size for ${file.type}: ${Math.round(fileType.maxSize / 1024 / 1024)}MB` 
      }, { status: 400 });
    }

    // Verify thread belongs to org
    const { data: thread, error: threadError } = await supabaseAdmin
      .from('threads')
      .select('id')
      .eq('id', threadId)
      .eq('org_id', orgId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found or access denied' }, { status: 404 });
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = getFileHash(buffer);
    const fileId = generateFileId();

    // Extract text content if supported
    let extractedText: string | null = null;
    if (fileType.extractText) {
      extractedText = await extractTextContent(buffer, file.type, file.name);
    }

    // Store file metadata in database
    const { data: fileRecord, error: dbError } = await supabaseAdmin
      .from('file_attachments')
      .insert({
        id: fileId,
        org_id: orgId,
        thread_id: threadId,
        uploaded_by: userId,
        filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        file_hash: fileHash,
        category: fileType.category,
        extracted_text: extractedText,
        processing_status: extractedText ? 'completed' : 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to save file metadata' }, { status: 500 });
    }

    // For now, we'll store files in a simple way
    // In production, you'd want to use proper cloud storage (S3, etc.)
    // For this MVP, we'll store the file content in the database (not recommended for large files)
    
    // Update with file content (for small files only)
    if (file.size < 5 * 1024 * 1024) { // 5MB limit for database storage
      const { error: updateError } = await supabaseAdmin
        .from('file_attachments')
        .update({ 
          file_content: buffer.toString('base64'),
          processing_status: 'completed'
        })
        .eq('id', fileId);

      if (updateError) {
        console.error('Error storing file content:', updateError);
      }
    }

    return NextResponse.json({
      success: true,
      file: {
        id: fileId,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        category: fileType.category,
        hasExtractedText: !!extractedText,
        extractedText: extractedText?.substring(0, 1000) + (extractedText && extractedText.length > 1000 ? '...' : ''), // Preview
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// Get file attachments for a thread
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await ensureUser(session);
    const orgId = await resolveOrgId(userId);
    await assertMembership(orgId, userId);

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');

    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID required' }, { status: 400 });
    }

    // Get file attachments for the thread
    const { data: files, error } = await supabaseAdmin
      .from('file_attachments')
      .select('id, filename, mime_type, file_size, category, processing_status, created_at, extracted_text')
      .eq('thread_id', threadId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching files:', error);
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      files: files?.map(file => ({
        ...file,
        extractedText: file.extracted_text?.substring(0, 1000) + (file.extracted_text && file.extracted_text.length > 1000 ? '...' : ''),
      })) || []
    });

  } catch (error) {
    console.error('Get files error:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
}
