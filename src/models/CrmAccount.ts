import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * A target account — a company the sales team is working, not a registered user.
 *
 * The existing CRM is a kanban over customers who have signed up. These are the
 * accounts before that: pharmacy chains, distributors, Saudi brands, hospitals,
 * platforms. Most have no login, no email and no order; what they have is a
 * sector, a city, the brands they carry and a key person worth knowing.
 *
 * `stage` is the whole point of the screens built on this:
 *   upcoming — a target nobody has acted on yet
 *   current  — the moment any action is logged against it, it moves here
 *   hold / won / lost — parked, converted, or closed out
 *
 * The move is never typed by hand: logging a visit does it, which is why the
 * upcoming list empties itself as the team works.
 */

export const CRM_STAGES = ['upcoming', 'current', 'hold', 'won', 'lost'] as const;
export type CrmStage = (typeof CRM_STAGES)[number];

/**
 * The six steps of the sales process, from the KPIs sheet. Each is ticked by
 * logging the matching action, so an account's progress is a consequence of the
 * work recorded rather than a separate thing to remember to update.
 */
export const CRM_STEPS = [
  'scheduled',    // 1 — a meeting is booked
  'introduced',   // 2 — KCC introduced: profile, what we provide, history
  'accountInfo',  // 3 — volume, rank, best sellers, umbrella brands, prices
  'keyPerson',    // 4 — name, position, department, phone
  'feedback',     // 5 — interested / moderate / not, and why
  'commercial',   // 6 — prices, quantities, payment method
] as const;
export type CrmStep = (typeof CRM_STEPS)[number];

export interface ICrmAccount extends Document {
  /** As written in the sheet; either script may be the one that is filled in. */
  name: string;
  nameAr?: string;
  /** Sector: pharmacy chain, distributor, Saudi local brand, hospital, platform… */
  category?: string;
  city?: string;
  /** Skincare, Haircare, Makeup… what they sell. */
  segment?: string;
  /** Where the lead came from: SFDA, referral, event. */
  source?: string;
  brands: string[];
  links: string[];
  keyPerson?: { name?: string; position?: string; phone?: string; email?: string };

  stage: CrmStage;
  /** The sales rep who owns it. */
  ownerId?: Types.ObjectId;
  ownerName?: string;

  /** Ticked by the activity that satisfies each one. */
  steps: Partial<Record<CrmStep, Date>>;

  /** Filled in by the team as the account progresses. */
  feedback?: string;
  finalStatus?: string;
  requirement?: string;
  nextStep?: string;

  /** Counters the dashboard reads without walking the whole history. */
  visitCount: number;
  meetingCount: number;
  activityCount: number;
  firstActionAt?: Date;
  lastActionAt?: Date;

  /** Set once this company also exists as a registered customer. */
  customerId?: Types.ObjectId;
  /** Sample and bulk orders traced back to this account. */
  orderIds: Types.ObjectId[];

  /**
   * Normalised name, and every spelling this account can be recognised by —
   * its names and its brands. The two sheets name the same company different
   * ways ("DeLile" against "مؤسسة دي لايل التجارية" carrying the brand DeLile),
   * and an order arriving later names it a third way.
   */
  nameKey: string;
  matchKeys: string[];

  notes?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CrmAccountSchema = new Schema<ICrmAccount>(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, trim: true },
    category: { type: String, trim: true },
    city: { type: String, trim: true },
    segment: { type: String, trim: true },
    source: { type: String, trim: true },
    brands: { type: [String], default: [] },
    links: { type: [String], default: [] },
    keyPerson: {
      name: { type: String, trim: true },
      position: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
    },

    // Not an enum: these five are the business's own words and a sixth would
    // otherwise be rejected silently, the way `fragrance-intensity` once was.
    stage: { type: String, default: 'upcoming', index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    ownerName: { type: String, trim: true },

    steps: { type: Schema.Types.Mixed, default: {} },

    feedback: { type: String, trim: true },
    finalStatus: { type: String, trim: true },
    requirement: { type: String, trim: true },
    nextStep: { type: String, trim: true },

    visitCount: { type: Number, default: 0 },
    meetingCount: { type: Number, default: 0 },
    activityCount: { type: Number, default: 0 },
    firstActionAt: { type: Date },
    lastActionAt: { type: Date },

    customerId: { type: Schema.Types.ObjectId, ref: 'User' },
    orderIds: [{ type: Schema.Types.ObjectId, ref: 'Order' }],

    nameKey: { type: String, required: true, index: true },
    matchKeys: { type: [String], default: [], index: true },

    notes: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CrmAccountSchema.index({ stage: 1, lastActionAt: -1 });
CrmAccountSchema.index({ category: 1, city: 1 });
CrmAccountSchema.index({ ownerId: 1, stage: 1 });
CrmAccountSchema.index({ name: 'text', nameAr: 'text', brands: 'text' });

const CrmAccount =
  mongoose.models.CrmAccount || mongoose.model<ICrmAccount>('CrmAccount', CrmAccountSchema);
export default CrmAccount;
