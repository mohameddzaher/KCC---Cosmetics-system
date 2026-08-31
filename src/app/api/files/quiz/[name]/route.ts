import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { getSession } from '@/lib/auth';
import { quizUploadDir } from '@/app/api/upload/quiz/route';

export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

/**
 * Serves a Sample-Quiz attachment.
 *
 * Files live outside `public/` and only reach a browser through here, always
 * as a download and never rendered inline — so an uploaded file cannot execute
 * script in the app's origin. A session is required; upload names are
 * unguessable (timestamp + 12 hex chars of CSPRNG).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name } = await params;
    // Reject anything that is not exactly one generated filename — no traversal.
    if (!/^\d{10,}-[0-9a-f]{12}\.(png|jpg|webp|pdf)$/.test(name)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const ext = name.split('.').pop() as string;
    const filePath = path.join(quizUploadDir(), name);

    try {
      await stat(filePath);
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const buf = await readFile(filePath);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${name}"`,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Cache-Control': 'private, max-age=300',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to read file';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
