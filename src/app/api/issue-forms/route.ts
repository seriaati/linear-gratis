import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { IssueForm, IssueFormQuestion } from '@/lib/supabase';
import { getActiveOrganisationIdAdmin } from '@/lib/organisations';

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

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const organisationId = await getActiveOrganisationIdAdmin(supabaseAdmin, user.id);
    if (!organisationId) {
      return NextResponse.json({ error: 'No active organisation for this user' }, { status: 500 });
    }

    // supabaseAdmin bypasses RLS, so the organisation filter is load-bearing.
    const { data: issueForms, error } = await supabaseAdmin
      .from('issue_forms')
      .select('*')
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      issueForms: (issueForms || []).map((f: IssueForm) => ({
        ...f,
        questions: (f.questions as unknown as IssueFormQuestion[]) || [],
      })),
    });
  } catch (error) {
    console.error('Issue forms GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const body = await request.json() as { name?: string; questions?: IssueFormQuestion[] };
    const { name, questions = [] } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const organisationId = await getActiveOrganisationIdAdmin(supabaseAdmin, user.id);
    if (!organisationId) {
      return NextResponse.json({ error: 'No active organisation for this user' }, { status: 500 });
    }

    const { data: issueForm, error } = await supabaseAdmin
      .from('issue_forms')
      .insert({
        user_id: user.id,
        created_by: user.id,
        organisation_id: organisationId,
        name: name.trim(),
        questions,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      issueForm: {
        ...issueForm,
        questions: (issueForm.questions as unknown as IssueFormQuestion[]) || [],
      },
    });
  } catch (error) {
    console.error('Issue forms POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
