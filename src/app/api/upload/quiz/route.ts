import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Customer-facing upload for the Sample Quiz (product photo, ingredient list,
 * existing formula …).
 *
 * Unlike /api/upload (admin, images only) this also accepts PDF, and stores
 * files OUTSIDE `public/` so nothing is served statically. They are read back
 * through /api/files/quiz/[name], which forces a download and refuses to
 * render anything inline — so an uploaded file can never execute in the
 * app's origin.
 */

const ALLOWED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export function quizUploadDir(): string {
  const base = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(process.cwd(), '.uploads');
  return path.join(base, 'quiz');
}

function sniff(type: string, b: Buffer): boolean {
  switch (type) {
    case 'image/png':
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    case 'image/jpeg':
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case 'image/webp':
      return b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    case 'application/pdf':
      return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // %PDF
    default:
      return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Ordering is limited to provisioned customers, so an upload always has a session.
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limited = rateLimit(req, `quiz-upload:${user.id}`, 30, 60_000);
    if (limited) return limited;

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!ALLOWED[file.type]) {
      return NextResponse.json(
        { error: 'Only PNG, JPG, WEBP or PDF files are allowed' },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!sniff(file.type, buffer)) {
      return NextResponse.json({ error: 'File content does not match its type' }, { status: 400 });
    }

    const dir = quizUploadDir();
    await mkdir(dir, { recursive: true });

    // Stored name is generated — the client-supplied filename is never trusted
    // for the path, only echoed back for display.
    const stored = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ALLOWED[file.type]}`;
    await writeFile(path.join(dir, stored), buffer);

    return NextResponse.json({
      url: `/api/files/quiz/${stored}`,
      name: file.name.slice(0, 120),
      size: file.size,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to upload file';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
