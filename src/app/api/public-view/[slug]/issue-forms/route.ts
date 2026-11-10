import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { IssueFormQuestion } from '@/lib/supabase';
import { authorisePublicView } from '@/lib/public-view-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const auth = await authorisePublicView(slug, request);
    if (!auth.ok) return auth.response;
    const viewData = auth.view;

    if (!viewData.allow_issue_creation || !viewData.enabled_issue_form_ids?.length) {
      return NextResponse.json({ success: true, forms: [] });
    }

    // Stale UUIDs are silently ignored by .in(); the organisation filter stops a
    // view from exposing another organisation's forms.
    const { data: forms, error: formsError } = await supabaseAdmin
      .from('issue_forms')
      .select('id, name, questions')
      .in('id', viewData.enabled_issue_form_ids)
      .eq('organisation_id', viewData.organisation_id);

    if (formsError) {
      throw formsError;
    }

    // Return forms in the order they appear in enabled_issue_form_ids (deduplicated)
    const orderedForms = [...new Set<string>(viewData.enabled_issue_form_ids)]
      .map((id: string) => forms?.find((f: { id: string }) => f.id === id))
      .filter((f): f is NonNullable<typeof f> => f != null)
      .map((f) => ({
        id: f.id,
        name: f.name,
        questions: (f.questions as IssueFormQuestion[]) || [],
      }));

    return NextResponse.json({ success: true, forms: orderedForms });

  } catch (error) {
    console.error('Public view issue-forms GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load issue forms' },
      { status: 500 }
    );
  }
}
