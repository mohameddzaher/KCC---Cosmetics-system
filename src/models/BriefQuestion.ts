import mongoose, { Schema, Document } from 'mongoose';

/**
 * BriefQuestion — every admin-authored question in the Sample Quiz.
 *
 * A question belongs to a SCOPE, which decides where in the flow it is asked:
 *
 *   scope='general'  scopeKey=''                     → the shared brief (Phase 2),
 *                                                      asked on every request.
 *   scope='main'     scopeKey='body-care'            → asked right after the
 *                                                      customer picks that main
 *                                                      category, before specs.
 *   scope='sub'      scopeKey='hair-care__shampoo'   → after the sub-category pick.
 *   scope='product'  scopeKey='<productKey>'         → after the exact product pick.
 *
 * That is why `questionKey` is unique *per scope*, not globally: two categories
 * may both ask "concern" without colliding.
 *
 * Branching (e.g. "Reformulation of an existing product" opening a 6-step
 * sub-flow) is expressed with `conditions` — a follow-up question simply
 * declares which answer it depends on. No hardcoded flows anywhere.
 */

export type BriefQuestionWidget =
  | 'cards'          // Single-select large cards
  | 'image-cards'    // Single-select cards with imagery
  | 'chips-single'   // Single-select chips
  | 'chips-multi'    // Multi-select chips
  | 'yes-no'         // Yes/No toggle
  | 'text'           // Free text
  | 'textarea'       // Long text
  | 'upload'         // One or more file slots (product photo, INCI list, formula…)
  | 'checkbox-list'  // Multi-select where each choice can carry its own note
  | 'hero-ingredient'; // Special widget for the hero-ingredient sub-flow

export type BriefScope = 'general' | 'main' | 'sub' | 'product';

export const BRIEF_WIDGETS: BriefQuestionWidget[] = [
  'cards', 'image-cards', 'chips-single', 'chips-multi', 'yes-no',
  'text', 'textarea', 'upload', 'checkbox-list', 'hero-ingredient',
];

export interface IBriefOption {
  value: string;            // stable key sent in the payload (e.g. "female")
  labelEn: string;
  labelAr?: string;
  description?: string;     // helper subtitle (English)
  descriptionAr?: string;
  imageUrl?: string;        // for image-cards
  /** checkbox-list: let the customer attach a note to this specific choice. */
  allowNote?: boolean;
  noteLabelEn?: string;
  noteLabelAr?: string;
  /** upload: this slot must be filled before continuing. */
  slotRequired?: boolean;
}

export interface IBriefCondition {
  questionKey: string;
  value: string | string[];
}

export interface IBriefQuestion extends Document {
  questionKey: string;
  scope: BriefScope;
  scopeKey: string;             // '' for general
  order: number;
  widget: BriefQuestionWidget;
  titleEn: string;
  titleAr?: string;
  subtitleEn?: string;
  subtitleAr?: string;
  helperEn?: string;
  helperAr?: string;
  options: IBriefOption[];
  maxSelect?: number;
  /** upload widget: comma-separated accept list, e.g. "image/*,.pdf". */
  accept?: string;
  required: boolean;
  active: boolean;
  allowNote: boolean;
  conditions?: IBriefCondition[];
  category?: string;            // legacy grouping hint, kept for old records
  createdAt: Date;
  updatedAt: Date;
}

const OptionSchema = new Schema<IBriefOption>(
  {
    value: { type: String, required: true },
    labelEn: { type: String, required: true },
    labelAr: { type: String },
    description: { type: String },
    descriptionAr: { type: String },
    imageUrl: { type: String },
    allowNote: { type: Boolean, default: false },
    noteLabelEn: { type: String },
    noteLabelAr: { type: String },
    slotRequired: { type: Boolean, default: false },
  },
  { _id: false }
);

const ConditionSchema = new Schema<IBriefCondition>(
  {
    questionKey: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const BriefQuestionSchema = new Schema<IBriefQuestion>(
  {
    questionKey: { type: String, required: true, trim: true },
    scope: {
      type: String,
      enum: ['general', 'main', 'sub', 'product'],
      default: 'general',
      required: true,
    },
    scopeKey: { type: String, default: '', trim: true },
    order: { type: Number, required: true, default: 0 },
    widget: { type: String, enum: BRIEF_WIDGETS, required: true },
    titleEn: { type: String, required: true },
    titleAr: { type: String },
    subtitleEn: { type: String },
    subtitleAr: { type: String },
    helperEn: { type: String },
    helperAr: { type: String },
    options: { type: [OptionSchema], default: [] },
    maxSelect: { type: Number },
    accept: { type: String },
    required: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    allowNote: { type: Boolean, default: true },
    conditions: { type: [ConditionSchema], default: [] },
    category: { type: String, default: 'general' },
  },
  { timestamps: true }
);

// A key is unique within its scope — 'concern' may exist for both hair and skin.
BriefQuestionSchema.index({ scope: 1, scopeKey: 1, questionKey: 1 }, { unique: true });
BriefQuestionSchema.index({ scope: 1, scopeKey: 1, order: 1 });
BriefQuestionSchema.index({ active: 1 });

const BriefQuestion =
  mongoose.models.BriefQuestion ||
  mongoose.model<IBriefQuestion>('BriefQuestion', BriefQuestionSchema);

export default BriefQuestion;
