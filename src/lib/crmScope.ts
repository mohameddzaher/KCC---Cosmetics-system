import { Types } from 'mongoose';
import User from '@/models/User';
import CrmAccount from '@/models/CrmAccount';
import { can } from '@/lib/roles';

/**
 * Whose work a person is shown — by the reporting line, at any depth.
 *
 * A manager reads his own team and everyone beneath them: the country manager
 * sees the commercial manager, the commercial manager's regionals, and anybody
 * added under those later, without a list to maintain anywhere. It walks
 * `managerId` downwards rather than hardcoding three levels, so a fourth level
 * works the day it is created.
 *
 * `crm.viewAll` bypasses the tree entirely, for the country manager and the
 * admins who are not in anybody's branch.
 *
 * Unowned accounts are visible to everyone with crm.view. The upcoming list is
 * the shared pool a rep is supposed to work from; scoping him out of it would
 * leave him an empty screen and nothing to do. An account becomes his the
 * moment he logs something against it.
 */

export interface Viewer {
  id?: string;
  role?: string;
}

/** Guards against a cycle in the reporting line, and against a silly depth. */
const MAX_DEPTH = 8;

export function seesEveryAccount(user: Viewer | null | undefined): boolean {
  return can(user?.role, 'crm.viewAll');
}

/**
 * This person, plus everyone reporting to them, directly or through somebody
 * else. Returns an empty list for a viewer who sees everything — there is
 * nothing to narrow to.
 */
export async function visibleOwnerIds(user: Viewer | null | undefined): Promise<string[]> {
  if (!user?.id || seesEveryAccount(user)) return [];

  const seen = new Set<string>([String(user.id)]);
  let frontier = [String(user.id)];

  for (let depth = 0; depth < MAX_DEPTH && frontier.length > 0; depth++) {
    const children = await User.find({ managerId: { $in: frontier } })
      .select('_id')
      .lean();
    frontier = children
      .map((c: Record<string, unknown>) => String(c._id))
      .filter((id) => !seen.has(id));
    for (const id of frontier) seen.add(id);
  }

  return [...seen];
}

/**
 * The same ids as real ObjectIds.
 *
 * `find()` casts a string id against the schema, but an aggregation pipeline
 * is not cast at all: a `$match` on `{ byId: { $in: ['65f…'] } }` silently
 * matches nothing, and a manager's screen reads as a team that did no work.
 * Every scope below is used in both kinds of query, so they all hand back
 * ObjectIds and neither kind can be wrong.
 */
function asIds(ids: string[]): Types.ObjectId[] {
  return ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
}

/** The viewer's branch as ObjectIds — empty when they see everything. */
export async function visibleOwnerObjectIds(
  user: Viewer | null | undefined
): Promise<Types.ObjectId[]> {
  return asIds(await visibleOwnerIds(user));
}

/** Conditions to fold into an account query for this viewer. */
export async function accountScope(
  user: Viewer | null | undefined
): Promise<Record<string, unknown>> {
  const ids = asIds(await visibleOwnerIds(user));
  if (ids.length === 0) return {};
  return {
    $or: [
      { ownerId: { $in: ids } },
      { ownerId: { $exists: false } },
      { ownerId: null },
    ],
  };
}

/** Conditions for activity queries — whose logged work this viewer may read. */
export async function activityScope(
  user: Viewer | null | undefined
): Promise<Record<string, unknown>> {
  const ids = asIds(await visibleOwnerIds(user));
  if (ids.length === 0) return {};
  return { byId: { $in: ids } };
}

/**
 * What was said about the accounts this viewer owns, whoever said it. A client's
 * own complaint is written by the client, so filtering on the author alone would
 * hide it from the very rep who has to answer it.
 */
export async function accountActivityScope(
  user: Viewer | null | undefined
): Promise<Record<string, unknown>> {
  const ids = asIds(await visibleOwnerIds(user));
  if (ids.length === 0) return {};
  const accounts = await CrmAccount.find({ ownerId: { $in: ids } }).select('_id').lean();
  return { $or: [{ byId: { $in: ids } }, { accountId: { $in: accounts.map((a) => a._id) } }] };
}

/** True when this viewer may open that particular account. */
export async function mayOpenAccount(
  user: Viewer | null | undefined,
  account: { ownerId?: unknown } | null
): Promise<boolean> {
  if (seesEveryAccount(user)) return true;
  if (!account) return false;

  const owner = account.ownerId;
  // Nobody owns it yet, so it is still in the shared pool.
  if (!owner) return true;

  const ownerId =
    typeof owner === 'object' && owner !== null && '_id' in owner
      ? String((owner as { _id: unknown })._id)
      : String(owner);

  return (await visibleOwnerIds(user)).includes(ownerId);
}
