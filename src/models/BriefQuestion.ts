import mongoose, { Schema, Document } from 'mongoose';

/**
 * BriefQuestion — Phase 2 questions in the Sample Quiz.
 * Fully admin-driven: admin can add / edit / remove questions and options.
 * Customer-facing quiz reads these live (no static fallback).
 */

export type BriefQuestionWidget =
  | 'cards'        // Single-select large cards (2x2 grid)
  | 'image-cards'  // Single-select cards with imagery
  | 'chips-single' // Single-select chips (pill row)
  | 'chips-multi'  // Multi-select chips
  | 'yes-no'       // Yes/No toggle
  | 'text'         // Free text
  | 'textarea'     // Long text
  | 'hero-ingredient'; // Special widget for Q10 sub-flow

export interface IBriefOption {
  value: string;            // stable key sent in payload (e.g. "female")
  labelEn: string;
  labelAr?: string;
  description?: string;     // optional helper subtitle on chip/card
  imageUrl?: string;        // for image-cards widget
}

export interface IBriefQuestion extends Document {
  questionKey: string;          // stable key referenced in surveyData (e.g. "developmentType")
  order: number;                // display order
  widget: BriefQuestionWidget;
  titleEn: string;
  titleAr?: string;
  subtitleEn?: string;
  subtitleAr?: string;
  helperEn?: string;
  helperAr?: string;
  options: IBriefOption[];
  maxSelect?: number;           // for chips-multi, default unlimited
  required: boolean;
  active: boolean;              // soft-disable without deleting
  allowNote: boolean;           // show "Add a note" toggle
  // Conditional visibility — show only if all conditions match
  // e.g. { questionKey: "categoryMain", value: "hair-care" }
  conditions?: Array<{ questionKey: string; value: string | string[] }>;
  category?: 'hair' | 'skin' | 'general'; // optional grouping for filtering
  createdAt: Date;
  updatedAt: Date;
}

const OptionSchema = new Schema<IBriefOption>(
  {
    value: { type: String, required: true },
    labelEn: { type: String, required: true },
    labelAr: { type: String },
    description: { type: String },
    imageUrl: { type: String },
  },
  { _id: false }
);

const ConditionSchema = new Schema(
  {
    questionKey: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const BriefQuestionSchema = new Schema<IBriefQuestion>(
  {
    questionKey: { type: String, required: true, unique: true, trim: true },
    order: { type: Number, required: true, default: 0 },
    widget: {
      type: String,
      enum: ['cards', 'image-cards', 'chips-single', 'chips-multi', 'yes-no', 'text', 'textarea', 'hero-ingredient'],
      required: true,
    },
    titleEn: { type: String, required: true },
    titleAr: { type: String },
    subtitleEn: { type: String },
    subtitleAr: { type: String },
    helperEn: { type: String },
    helperAr: { type: String },
    options: { type: [OptionSchema], default: [] },
    maxSelect: { type: Number },
    required: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    allowNote: { type: Boolean, default: true },
    conditions: { type: [ConditionSchema], default: [] },
    category: { type: String, enum: ['hair', 'skin', 'general'], default: 'general' },
  },
  { timestamps: true }
);

BriefQuestionSchema.index({ order: 1 });
BriefQuestionSchema.index({ active: 1 });

const BriefQuestion =
  mongoose.models.BriefQuestion ||
  mongoose.model<IBriefQuestion>('BriefQuestion', BriefQuestionSchema);

export default BriefQuestion;
