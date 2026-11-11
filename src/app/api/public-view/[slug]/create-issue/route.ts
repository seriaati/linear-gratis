import { NextRequest, NextResponse } from 'next/server';
import { authorisePublicView } from '@/lib/public-view-auth';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/request-security';
import { supabaseAdmin } from '@/lib/supabase';
import {
  ISSUE_IMAGES_BUCKET,
  ISSUE_IMAGE_EXTENSIONS,
  MAX_ISSUE_IMAGES,
  MAX_ISSUE_IMAGE_SIZE,
  validateIssueImages,
} from '@/lib/issue-images';
import {
  appendAttachmentMarkdown,
  createIssueForPublicView,
  resolveLinearTokenForPublicView,
} from '@/lib/public-view-issue-creation';
import * as z from 'zod';

const MAX_ISSUE_CREATE_BODY_BYTES =
  MAX_ISSUE_IMAGES * MAX_ISSUE_IMAGE_SIZE + 512 * 1024;

const issueCreateSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(10000).optional(),
  labelIds: z.array(z.string().min(1).max(100)).max(20).optional().default([]),
});

type IssueCreateValues = z.infer<typeof issueCreateSchema>;

type ParsedIssueCreatePayload = {
  values: IssueCreateValues;
  images: File[];
};

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== 'undefined' && value instanceof File && value.name.trim().length > 0;
}

function parseLabelIds(formData: FormData): string[] {
  const jsonValue = getFormString(formData, 'labelIds');
  if (jsonValue) {
    try {
      const parsed = JSON.parse(jsonValue) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((labelId): labelId is string => typeof labelId === 'string');
      }
    } catch {
      return [];
    }
  }

  return formData
    .getAll('labelId')
    .filter((labelId): labelId is string => typeof labelId === 'string');
}

async function parseIssueCreatePayload(request: NextRequest): Promise<ParsedIssueCreatePayload> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const images = formData
      .getAll('images')
      .filter(isUploadedFile);

    return {
      values: {
        title: getFormString(formData, 'title'),
        description: getFormString(formData, 'description'),
        labelIds: parseLabelIds(formData),
      },
      images,
    };
  }

  return {
    values: (await request.json()) as IssueCreateValues,
    images: [],
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_ISSUE_CREATE_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Images are too large' },
        { status: 413 }
      );
    }

    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(`public-view:create-issue:${slug}:${clientIp}`, {
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfterSeconds);

    const payload = await parseIssueCreatePayload(request);

    const parsed = issueCreateSchema.safeParse(payload.values);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid issue payload', issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const issueData = parsed.data;
    const imageError = validateIssueImages(payload.images);
    if (imageError) {
      return NextResponse.json({ error: imageError }, { status: 400 });
    }

    // Auth first: is_active + expiry + password cookie.
    const auth = await authorisePublicView(slug, request);
    if (!auth.ok) return auth.response;
    const viewData = auth.view;

    // Check if issue creation is allowed
    if (!viewData.allow_issue_creation) {
      return NextResponse.json(
        { error: 'Issue creation not allowed on this view' },
        { status: 403 }
      );
    }

    if (payload.images.length > 0 && !viewData.allow_image_uploads) {
      return NextResponse.json(
        { error: 'Image uploads are not allowed for this view' },
        { status: 403 }
      );
    }

    const linearToken = await resolveLinearTokenForPublicView(viewData);
    if (!linearToken) {
      return NextResponse.json(
        { error: 'Unable to create issue - Linear API token not found' },
        { status: 500 }
      );
    }

    const uploadedPaths: string[] = [];
    let issueCreated = false;
    try {
      const uploadedImages: Array<{ fileName: string; assetUrl: string }> = [];
      // Sequential so every successful upload is recorded before a later failure triggers cleanup
      for (const image of payload.images) {
        const path = `${viewData.id}/${crypto.randomUUID()}.${ISSUE_IMAGE_EXTENSIONS[image.type]}`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from(ISSUE_IMAGES_BUCKET)
          .upload(path, image, { contentType: image.type, upsert: false });
        if (uploadError) {
          throw uploadError;
        }
        uploadedPaths.push(path);
        const { data: urlData } = supabaseAdmin.storage.from(ISSUE_IMAGES_BUCKET).getPublicUrl(path);
        uploadedImages.push({ fileName: image.name, assetUrl: urlData.publicUrl });
      }

      const result = await createIssueForPublicView(linearToken, viewData, {
        title: issueData.title,
        description: appendAttachmentMarkdown(issueData.description, uploadedImages),
        labelIds: issueData.labelIds,
      });

      if (!result.ok) {
        return NextResponse.json(
          {
            error: result.error,
            ...(result.details ? { details: result.details } : {}),
          },
          { status: result.status }
        );
      }

      issueCreated = true;
      return NextResponse.json({
        success: true,
        issue: result.issue,
      });
    } finally {
      if (!issueCreated && uploadedPaths.length > 0) {
        const { error: removeError } = await supabaseAdmin.storage
          .from(ISSUE_IMAGES_BUCKET)
          .remove(uploadedPaths);
        if (removeError) {
          console.error('Failed to clean up uploaded images:', removeError);
        }
      }
    }

  } catch (error) {
    console.error('Error creating issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
