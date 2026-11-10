import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { IssueFormQuestion } from '@/lib/supabase';
import { assertOrgMember } from '@/lib/organisations';

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// supabaseAdmin bypasses RLS, so org membership must be checked by hand.
async function canAccessIssueForm(userId: string, id: string): Promise<boolean> {
  const { data: issueForm } = await supabaseAdmin
    .from('issue_forms')
    .select('organisation_id')
    .eq('id', id)
    .maybeSingle();

  if (!issueForm) return false;
  return assertOrgMember(supabaseAdmin, userId, issueForm.organisation_id);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { id } = await params;
    if (!(await canAccessIssueForm(user.id, id))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data: issueForm, error } = await supabaseAdmin
      .from('issue_forms')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !issueForm) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      issueForm: {
        ...issueForm,
        questions: (issueForm.questions as unknown as IssueFormQuestion[]) || [],
      },
    });
  } catch (error) {
    console.error('Issue form GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { id } = await params;
    if (!(await canAccessIssueForm(user.id, id))) {
      return NextResponse.json({ error: 'Not found or update failed' }, { status: 404 });
    }

    const body = await request.json() as { name?: string; questions?: IssueFormQuestion[] };

    const updates: { name?: string; questions?: IssueFormQuestion[] } = {};
    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      updates.name = body.name.trim();
    }
    if (body.questions !== undefined) {
      updates.questions = body.questions;
    }

    const { data: issueForm, error } = await supabaseAdmin
      .from('issue_forms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !issueForm) {
      return NextResponse.json({ error: 'Not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      issueForm: {
        ...issueForm,
        questions: (issueForm.questions as unknown as IssueFormQuestion[]) || [],
      },
    });
  } catch (error) {
    console.error('Issue form PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { id } = await params;
    if (!(await canAccessIssueForm(user.id, id))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('issue_forms')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Issue form DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
