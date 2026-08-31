import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import RolePermission from '@/models/RolePermission';
import AuditLog from '@/models/AuditLog';
import { getSession } from '@/lib/auth';
import { invalidateRolePermissions, loadRolePermissions } from '@/lib/rolePermissions';
import {
  PERMISSIONS,
  ROLES,
  ROLE_META,
  ROLE_PERMISSIONS,
  can,
  effectiveRolePermissions,
  isRoleCustomised,
  type Permission,
  type Role,
} from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * Role configuration.
 *
 * GET is readable by anyone who can see the Users screen — it is what that
 * screen renders. PUT is Super Admin only, and refuses to touch SUPER_ADMIN
 * itself: the role that grants access must not be able to revoke its own
 * ability to grant it, or the system locks everyone out with no way back.
 */

export async function GET() {
  const user = await getSession();
  if (!can(user?.role, 'users.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await loadRolePermissions(true);

  return NextResponse.json({
    permissions: PERMISSIONS,
    editable: user?.role === 'SUPER_ADMIN',
    roles: ROLES.map((role) => ({
      role,
      labelEn: ROLE_META[role].labelEn,
      labelAr: ROLE_META[role].labelAr,
      descEn: ROLE_META[role].descEn,
      descAr: ROLE_META[role].descAr,
      badge: ROLE_META[role].badge,
      permissions: effectiveRolePermissions(role),
      defaults: ROLE_PERMISSIONS[role],
      customised: isRoleCustomised(role),
      locked: role === 'SUPER_ADMIN',
    })),
  });
}

export async function PUT(req: NextRequest) {
  const user = await getSession();
  if (user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Only a Super Admin can change what a role can reach' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const role = String(body.role || '') as Role;
  const reset = body.reset === true;

  if (!(ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: 'Unknown role' }, { status: 400 });
  }
  if (role === 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'The Super Admin role always has full access and cannot be narrowed' },
      { status: 400 }
    );
  }

  await connectDB();

  if (reset) {
    await RolePermission.deleteOne({ role });
  } else {
    if (!Array.isArray(body.permissions)) {
      return NextResponse.json({ error: 'permissions must be an array' }, { status: 400 });
    }
    // Only real permissions are stored; anything unknown is dropped rather
    // than saved and silently ignored later.
    const permissions = (body.permissions as string[]).filter((p): p is Permission =>
      (PERMISSIONS as readonly string[]).includes(p)
    );

    await RolePermission.findOneAndUpdate(
      { role },
      { role, permissions, updatedBy: user.name },
      { upsert: true, new: true }
    );
  }

  // The next request re-reads, so the change is live immediately rather than
  // when a cache happens to expire.
  invalidateRolePermissions();
  await loadRolePermissions(true);

  try {
    await AuditLog.create({
      userId: user.id,
      action: reset ? 'role.permissions.reset' : 'role.permissions.update',
      entity: 'RolePermission',
      entityId: role,
      details: reset ? { role } : { role, count: (body.permissions as string[]).length },
    });
  } catch {
    /* the change stands whether or not it could be logged */
  }

  return NextResponse.json({
    role,
    permissions: effectiveRolePermissions(role),
    customised: isRoleCustomised(role),
  });
}
