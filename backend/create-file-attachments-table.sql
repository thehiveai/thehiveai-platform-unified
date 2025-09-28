-- Create file_attachments table for storing uploaded files and their metadata
CREATE TABLE IF NOT EXISTS file_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- File metadata
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash TEXT NOT NULL, -- SHA256 hash for deduplication
    category TEXT NOT NULL CHECK (category IN ('document', 'image', 'data', 'other')),
    
    -- Content and processing
    file_content TEXT, -- Base64 encoded file content (for small files)
    extracted_text TEXT, -- Extracted text content for search and AI processing
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT, -- Error message if processing failed
    
    -- Metadata for AI processing
    embedding_vector vector(1536), -- OpenAI embedding for semantic search
    summary TEXT, -- AI-generated summary of the file content
    keywords TEXT[], -- Extracted keywords for search
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT unique_file_per_thread_hash UNIQUE (thread_id, file_hash)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_file_attachments_org_id ON file_attachments(org_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_thread_id ON file_attachments(thread_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_uploaded_by ON file_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_attachments_category ON file_attachments(category);
CREATE INDEX IF NOT EXISTS idx_file_attachments_processing_status ON file_attachments(processing_status);
CREATE INDEX IF NOT EXISTS idx_file_attachments_created_at ON file_attachments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_attachments_file_hash ON file_attachments(file_hash);

-- Full-text search index on extracted text
CREATE INDEX IF NOT EXISTS idx_file_attachments_text_search ON file_attachments USING gin(to_tsvector('english', extracted_text));

-- Vector similarity search index (if using pgvector extension)
-- CREATE INDEX IF NOT EXISTS idx_file_attachments_embedding ON file_attachments USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_file_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_file_attachments_updated_at
    BEFORE UPDATE ON file_attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_file_attachments_updated_at();

-- Create message_attachments junction table to link messages with files
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_attachment_id UUID NOT NULL REFERENCES file_attachments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_message_file UNIQUE (message_id, file_attachment_id)
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_file_id ON message_attachments(file_attachment_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access files from their organization
CREATE POLICY file_attachments_org_access ON file_attachments
    FOR ALL USING (
        org_id IN (
            SELECT org_id FROM memberships 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    );

-- Policy: Users can only access message attachments from their organization
CREATE POLICY message_attachments_org_access ON message_attachments
    FOR ALL USING (
        file_attachment_id IN (
            SELECT id FROM file_attachments 
            WHERE org_id IN (
                SELECT org_id FROM memberships 
                WHERE user_id = auth.uid() 
                AND status = 'active'
            )
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON file_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_attachments TO authenticated;
GRANT USAGE ON SEQUENCE file_attachments_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE message_attachments_id_seq TO authenticated;
