import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { IssueFormQuestion } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 });
    }

    // Fetch the view to get enabled_issue_form_ids
    const { data: viewData, error: viewError } = await supabaseAdmin
      .from('public_views')
      .select('allow_issue_creation, enabled_issue_form_ids')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (viewError || !viewData) {
      return NextResponse.json({ error: 'View not found' }, { status: 404 });
    }

    if (!viewData.allow_issue_creation || !viewData.enabled_issue_form_ids?.length) {
      return NextResponse.json({ success: true, forms: [] });
    }

    // Fetch the enabled issue forms — stale UUIDs are silently ignored by .in()
    const { data: forms, error: formsError } = await supabaseAdmin
      .from('issue_forms')
      .select('id, name, questions')
      .in('id', viewData.enabled_issue_form_ids);

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
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
