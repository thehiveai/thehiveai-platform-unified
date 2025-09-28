// server-side only
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { randomBytes } from 'crypto';

export async function POST(req, { params }) {
  const { orgId } = params;
  const { email, role = 'member', createdBy } = await req.json();

  const token = randomBytes(16).toString('hex');

  const { error } = await supabaseAdmin
    .from('org_invites')
    .insert({ org_id: orgId, email, role, token, created_by: createdBy });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  // Optionally: send invite email via SendGrid/SES with link /accept?token=...
  return new Response(JSON.stringify({ ok: true, token }), { status: 200 });
}
