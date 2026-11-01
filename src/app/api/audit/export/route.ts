import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AuditLog from '@/models/AuditLog';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { buildXlsx, type XlsxColumn } from '@/lib/xlsx';
import { audited } from '@/lib/audit';
import { auditFilter, withActor } from '@/lib/audit/query';

export const dynamic = 'force-dynamic';

const MAX_ROWS = 20000;

function text(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}

/** The log as a workbook. Taking it out of the system is itself logged. */
export const GET = audited(async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!can(user.role, 'audit.view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await connectDB();

    const docs = await AuditLog.find(auditFilter(req.nextUrl.searchParams))
      .select('-body -details')
      .populate('userId', 'name email role')
      .sort({ createdAt: -1, _id: -1 })
      .limit(MAX_ROWS)
      .lean();

    const rows = docs.map((d) => {
      const r = withActor(d as Record<string, unknown>) as Record<string, any>;
      return {
        at: new Date(r.createdAt).toISOString().replace('T', ' ').slice(0, 19),
        who: r.actorName || 'Visitor',
        email: r.actorEmail || '',
        role: r.actorRole || '',
        action: r.action,
        entity: r.entity,
        record: r.entityLabel || r.entityId || '',
        changes: (r.changes || [])
          .map((c: { field: string; from?: unknown; to?: unknown }) => `${c.field}: ${text(c.from)} → ${text(c.to)}`)
          .join('\n')
          .slice(0, 30000),
        outcome: r.outcome || 'success',
        error: r.error || '',
        request: r.method ? `${r.method} ${r.path}` : '',
        ip: r.ip || '',
      };
    });

    const columns: XlsxColumn[] = [
      { header: 'When (UTC)', key: 'at', width: 20 },
      { header: 'Who', key: 'who', width: 22 },
      { header: 'Email', key: 'email', width: 26 },
      { header: 'Role', key: 'role', width: 16 },
      { header: 'Action', key: 'action', width: 14 },
      { header: 'Entity', key: 'entity', width: 18 },
      { header: 'Record', key: 'record', width: 28 },
      { header: 'What changed', key: 'changes', width: 70 },
      { header: 'Result', key: 'outcome', width: 10 },
      { header: 'Error', key: 'error', width: 28 },
      { header: 'Request', key: 'request', width: 36 },
      { header: 'IP', key: 'ip', width: 16 },
    ];

    const stamp = new Date().toISOString().slice(0, 10);
    const book = buildXlsx({ sheetName: 'Audit log', columns, rows, title: `KCC audit log, exported ${stamp}` });

    return new NextResponse(new Uint8Array(book), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="kcc-audit-log-${stamp}.xlsx"`,
        'Content-Length': String(book.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}, { action: 'export', entity: 'AuditLog' });
