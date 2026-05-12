import mongoose, { Schema, Document } from 'mongoose';

/**
 * SpecOptionMaster — the master library of every option available in
 * each of the 7 Spec Categories.
 *
 * Admin can edit / extend this master list; per-product config picks a
 * subset for each spec category.
 */

// Kept as a hint for known categories; not enforced at the schema level so admins
// can add new categories (e.g. "fragrance-intensity") without a code change.
export type SpecCategoryKey = string;

export type SpecWidget =
  | 'chips-multi'
  | 'chips-single'
  | 'color-swatches'
  | 'icon-cards'
  | 'visual-cards'
  | 'fragrance-flow';

export interface ISpecOption {
  value: string;        // stable key
  labelEn: string;
  labelAr?: string;
  meta?: Record<string, unknown>; // e.g. hex for product-color, icon for packaging
}

export interface ISpecOptionMaster extends Document {
  categoryKey: SpecCategoryKey;
  defaultTitleEn: string;
  defaultTitleAr?: string;
  defaultSubtitleEn?: string;
  defaultSubtitleAr?: string;
  widget: SpecWidget;
  options: ISpecOption[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SpecOptionSchema = new Schema<ISpecOption>(
  {
    value: { type: String, required: true },
    labelEn: { type: String, required: true },
    labelAr: { type: String },
    meta: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const SpecOptionMasterSchema = new Schema<ISpecOptionMaster>(
  {
    categoryKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    defaultTitleEn: { type: String, required: true },
    defaultTitleAr: { type: String },
    defaultSubtitleEn: { type: String },
    defaultSubtitleAr: { type: String },
    widget: {
      type: String,
      enum: ['chips-multi', 'chips-single', 'color-swatches', 'icon-cards', 'visual-cards', 'fragrance-flow'],
      required: true,
    },
    options: { type: [SpecOptionSchema], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const SpecOptionMaster =
  mongoose.models.SpecOptionMaster ||
  mongoose.model<ISpecOptionMaster>('SpecOptionMaster', SpecOptionMasterSchema);

export default SpecOptionMaster;
