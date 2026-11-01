import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AuditLog from '@/models/AuditLog';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { auditFilter, withActor } from '@/lib/audit/query';

export const dynamic = 'force-dynamic';

/** The log, newest first. Read-only: there is deliberately no write route here. */
export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!can(user.role, 'audit.view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await connectDB();

    const p = req.nextUrl.searchParams;
    const filter = auditFilter(p);
    const limit = Math.min(Math.max(parseInt(p.get('limit') || '50', 10) || 50, 1), 200);
    const page = Math.max(parseInt(p.get('page') || '1', 10) || 1, 1);
    const dayAgo = new Date(Date.now() - 86400000);

    const [items, total, entities, actors, day] = await Promise.all([
      AuditLog.find(filter)
        // A row is opened for its detail; the list only needs to name it.
        .select('-body -userAgent -details')
        .populate('userId', 'name email role')
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
      AuditLog.distinct('entity'),
      AuditLog.aggregate([
        { $match: { userId: { $ne: null } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$userId', name: { $first: '$actorName' }, email: { $first: '$actorEmail' } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u', pipeline: [{ $project: { name: 1, email: 1 } }] } },
      ]),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: dayAgo } } },
        { $group: { _id: '$outcome', n: { $sum: 1 } } },
      ]),
    ]);

    const lastDay: Record<string, number> = {};
    for (const d of day) lastDay[d._id || 'success'] = d.n;

    return NextResponse.json({
      items: items.map((r) => withActor(r as Record<string, unknown>)),
      total,
      page,
      pages: Math.ceil(total / limit),
      entities: (entities as string[]).sort(),
      actors: actors
        .map((a) => ({ id: String(a._id), name: a.name || a.u?.[0]?.name || a.email || String(a._id) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      lastDay,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
