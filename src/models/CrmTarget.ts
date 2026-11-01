import mongoose, { Schema, Document } from 'mongoose';

/**
 * The sales targets and the process, as the KPIs sheet lays them out.
 *
 * Kept as data rather than constants because they are the business's numbers:
 * "4 to 5 visits a day" is a decision someone made and may change, and a target
 * hardcoded in a dashboard is a target nobody can correct.
 *
 * One document, key 'main', the same shape as SiteSettings uses.
 */

export interface ICrmTarget extends Document {
  key: string;

  /** Visits per rep per day — the sheet's "4 to 5". */
  dailyVisits: { min: number; max: number };
  /** Distinct accounts a rep should see in a week — "20 to 25 clients". */
  weeklyClients: { min: number; max: number };
  /** "Each acc. 1 weekly visit (4 monthly)". */
  visitsPerAccountWeekly: number;
  visitsPerAccountMonthly: number;

  /**
   * How the week's visits should be spread, and which sectors count towards
   * each share — "60% companies / saudi brand pharmacies chains 30% / 10%
   * scattered". The categories are listed so the split can be re-cut without
   * touching code.
   */
  sectorMix: Array<{
    key: string;
    labelEn: string;
    labelAr: string;
    sharePct: number;
    categories: string[];
  }>;

  /** The six-step process, with the checklist each step carries. */
  steps: Array<{
    key: string;
    order: number;
    labelEn: string;
    labelAr: string;
    checklist: string[];
  }>;

  /** The statuses the sheet's "status" column uses. */
  statusOptions: string[];

  createdAt: Date;
  updatedAt: Date;
}

const CrmTargetSchema = new Schema<ICrmTarget>(
  {
    key: { type: String, required: true, unique: true, default: 'main' },

    dailyVisits: {
      min: { type: Number, default: 4 },
      max: { type: Number, default: 5 },
    },
    weeklyClients: {
      min: { type: Number, default: 20 },
      max: { type: Number, default: 25 },
    },
    visitsPerAccountWeekly: { type: Number, default: 1 },
    visitsPerAccountMonthly: { type: Number, default: 4 },

    sectorMix: {
      type: [
        new Schema(
          {
            key: { type: String, required: true },
            labelEn: { type: String, default: '' },
            labelAr: { type: String, default: '' },
            sharePct: { type: Number, default: 0 },
            categories: { type: [String], default: [] },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    steps: {
      type: [
        new Schema(
          {
            key: { type: String, required: true },
            order: { type: Number, default: 0 },
            labelEn: { type: String, default: '' },
            labelAr: { type: String, default: '' },
            checklist: { type: [String], default: [] },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    statusOptions: { type: [String], default: [] },
  },
  { timestamps: true }
);

const CrmTarget =
  mongoose.models.CrmTarget || mongoose.model<ICrmTarget>('CrmTarget', CrmTargetSchema);
export default CrmTarget;
