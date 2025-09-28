# 🐝 Hive AI Platform - Unified Database Schema

## Overview

This document resolves the conflicting database schema approaches found in the documentation and provides a single, comprehensive schema that supports all platform features:

- **Thread Persistence System** (conversation management)
- **Collaborative AI System** (multi-model orchestration)
- **Context Engine** (semantic memory and intelligence)
- **Platform Management** (security, compliance, analytics)

## Schema Architecture

### Core Foundation
The schema builds on existing Supabase auth and core tables:
- `auth.users` - Supabase authentication
- `app.orgs` - Organizations
- `app.org_members` - User-organization relationships
- `app.users` - User profiles

### Unified Table Structure

#### 1. Thread Persistence Layer
```sql
app.threads          -- Conversation containers
app.messages         -- Individual messages (unified with collaborative AI)
app.file_attachments -- Document and image attachments
```

#### 2. Collaborative AI Layer
```sql
app.sessions         -- Multi-model AI collaboration sessions
app.turns            -- Rounds of collaborative AI interaction
app.verdicts         -- Final decisions from AI collaboration
```

#### 3. Context Engine Layer
```sql
app.context_embeddings    -- Semantic search vectors
app.context_entities      -- Extracted entities (people, dates, concepts)
app.context_relationships -- Links between information
app.context_summaries     -- Intelligent conversation summaries
```

#### 4. Platform Management Layer
```sql
app.model_invocations -- Usage tracking and billing
app.tenant_settings   -- Organization configuration
app.audit_logs       -- Compliance and security auditing
app.dlp_rules        -- Data loss prevention
```

## Key Design Decisions

### 1. Unified Messages Table
Instead of separate message tables for different features, we use a single `app.messages` table with optional foreign keys:
- `thread_id` - For standard conversations
- `session_id` - For collaborative AI sessions
- `turn_id` - For specific AI collaboration rounds

This approach:
- ✅ Eliminates data duplication
- ✅ Enables cross-feature queries
- ✅ Simplifies application logic
- ✅ Maintains referential integrity

### 2. Extensible Context System
The context engine is designed to work with any content:
- **Threads** get automatic context extraction
- **Collaborative AI** benefits from semantic memory
- **Document uploads** are indexed for retrieval
- **Cross-conversation** intelligence is enabled

### 3. Comprehensive Security
Every table implements Row Level Security (RLS) with:
- **Org isolation** - Users only see their organization's data
- **Service role bypass** - Backend operations work seamlessly
- **Audit trails** - All actions are logged for compliance

### 4. Performance Optimized
Strategic indexes support:
- **Fast conversation loading** - Thread and message queries
- **Semantic search** - Vector similarity matching
- **Analytics queries** - Time-based reporting
- **Compliance searches** - Audit log filtering

## Resolved Conflicts

### Thread vs Collaborative AI Tables
**Problem**: Documentation showed two different message storage approaches
**Solution**: Single messages table with optional foreign keys for sessions/turns

### Organizations vs Orgs Table Name
**Problem**: Health endpoint used `organizations`, schema used `orgs`
**Solution**: Standardized on `app.orgs` and updated health endpoint

### Context Engine Integration
**Problem**: Context engine was separate from main conversation system
**Solution**: Integrated context extraction with threads and messages

### RLS Policy Consistency
**Problem**: Different RLS approaches across documentation
**Solution**: Consistent org-isolation pattern across all tables

## Migration Strategy

### Phase 1: Core Tables (Immediate)
1. Run `unified-database-schema.sql` in Supabase
2. Verify health endpoint returns 200 OK
3. Test basic thread creation

### Phase 2: Context Engine (Next)
1. Enable pgvector extension
2. Set up embedding generation pipeline
3. Implement semantic search functions

### Phase 3: Collaborative AI (Future)
1. Implement session management
2. Build multi-model orchestration
3. Add verdict generation logic

## Environment Requirements

### Database Extensions
```sql
CREATE EXTENSION IF NOT EXISTS vector; -- For semantic search
```

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE=your_service_role_key
DEFAULT_ORG_ID=00000000-0000-0000-0000-000000000001
```

## Validation Queries

### Check Schema Setup
```sql
-- Verify all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'app'
  AND table_name IN ('threads', 'messages', 'sessions', 'context_embeddings', 'tenant_settings');

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'app' AND rowsecurity = true;
```

### Test Data Access
```sql
-- Verify org isolation works
SELECT COUNT(*) FROM app.threads; -- Should only show user's org data
SELECT COUNT(*) FROM app.messages; -- Should only show user's org data
```

### Health Check
```bash
curl http://localhost:3000/healthz
# Should return 200 OK with database status "ok"
```

## Benefits of Unified Approach

### For Developers
- **Single source of truth** for all conversation data
- **Consistent APIs** across features
- **Simplified queries** for cross-feature functionality
- **Easier testing** with unified test data

### For Platform Operations
- **Unified backup/restore** procedures
- **Consistent monitoring** across all features
- **Simplified scaling** decisions
- **Single security model** to audit

### For Users
- **Seamless experience** across features
- **Persistent context** in all interactions
- **Unified search** across all conversations
- **Consistent performance** expectations

## Next Steps

1. **Deploy Schema**: Run `unified-database-schema.sql` in production Supabase
2. **Update Health Endpoint**: Verify `/healthz` returns 200 OK
3. **Test Core Features**: Validate thread creation and message persistence
4. **Implement Context Engine**: Set up embedding generation pipeline
5. **Build Collaborative AI**: Implement multi-model orchestration

This unified schema provides the foundation for all Hive AI Platform features while maintaining security, performance, and scalability.