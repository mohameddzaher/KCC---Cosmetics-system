import connectDB from '@/lib/db';
import RolePermission from '@/models/RolePermission';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  setRoleOverrides,
  type Permission,
  type Role,
} from '@/lib/roles';

/**
 * Keeps `can()` honest about what a Super Admin has configured.
 *
 * `can()` is synchronous and called from three dozen route handlers, so it
 * cannot go and ask the database itself. Instead this loads the overrides into
 * the module-level map that `can()` reads, and every route already funnels
 * through `getSession()` — which awaits this first. One small query, cached,
 * on the request path that was going to hit the database anyway.
 */

/*
 * Deliberately not cached across requests.
 *
 * A per-process cache looked attractive until it was tested: Next serves each
 * route from its own module instance, so a save made through /api/roles
 * updated that route's copy of the map and nobody else's. A permission change
 * would then take effect somewhere between "now" and "whenever the TTL
 * expires", which is not something you can explain to whoever just revoked
 * someone's access.
 *
 * So every authenticated request reads it. The collection holds at most one
 * small document per role, it is indexed on a unique key, and these routes are
 * already talking to the same database several times over — this is far and
 * away the cheapest query on the path, and it buys genuinely immediate
 * propagation. Concurrent loads within one tick still share a single query.
 */
let inFlight: Promise<void> | null = null;

/** Kept for call sites that want to be explicit; loading is already eager. */
export function invalidateRolePermissions() {
  /* no cache to invalidate — see the note above */
}

export async function loadRolePermissions(_force = false): Promise<void> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      await connectDB();
      const docs = await RolePermission.find({}).lean();
      const overrides: Partial<Record<Role, Permission[]>> = {};
      for (const doc of docs as Array<{ role: string; permissions: string[] }>) {
        // Drop anything that is no longer a real permission, so a rename in
        // the code cannot leave a stale grant behind.
        overrides[doc.role as Role] = doc.permissions.filter((p): p is Permission =>
          (PERMISSIONS as readonly string[]).includes(p)
        );
      }
      setRoleOverrides(overrides);
    } catch {
      // The database being unavailable must not silently widen access, and it
      // must not lock everyone out either: `can()` falls back to the shipped
      // defaults, which is the safe, known-good state.
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** What a role can reach right now, defaults plus any override. */
export async function effectivePermissions(role: Role): Promise<Permission[]> {
  await loadRolePermissions();
  const { effectiveRolePermissions } = await import('@/lib/roles');
  return effectiveRolePermissions(role);
}

export { ROLE_PERMISSIONS };
