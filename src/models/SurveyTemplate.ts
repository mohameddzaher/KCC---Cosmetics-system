import mongoose, { Schema, Document } from 'mongoose';

interface IBilingualText {
  en: string;
  ar: string;
}

interface ISurveyOption {
  value: string;
  label: IBilingualText;
}

interface ISurveyQuestion {
  key: string;
  label: IBilingualText;
  type: 'text' | 'select' | 'multiselect' | 'toggle' | 'range' | 'textarea';
  options?: ISurveyOption[];
  required: boolean;
  conditional?: {
    dependsOn: string;
    value: any;
  };
  placeholder?: IBilingualText;
}

interface ISurveyStep {
  stepNumber: number;
  title: IBilingualText;
  description: IBilingualText;
  questions: ISurveyQuestion[];
}

export interface ISurveyTemplate extends Document {
  name: string;
  type: 'sample' | 'bulk';
  isActive: boolean;
  steps: ISurveyStep[];
  createdAt: Date;
  updatedAt: Date;
}

const SurveyOptionSchema = new Schema(
  {
    value: { type: String, required: true },
    label: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
  },
  { _id: false }
);

const SurveyQuestionSchema = new Schema(
  {
    key: { type: String, required: true },
    label: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    type: {
      type: String,
      enum: ['text', 'select', 'multiselect', 'toggle', 'range', 'textarea'],
      required: true,
    },
    options: [SurveyOptionSchema],
    required: { type: Boolean, default: false },
    conditional: {
      type: new Schema(
        {
          dependsOn: { type: String, required: true },
          value: { type: Schema.Types.Mixed, required: true },
        },
        { _id: false }
      ),
      required: false,
    },
    placeholder: {
      en: { type: String },
      ar: { type: String },
    },
  },
  { _id: false }
);

const SurveyStepSchema = new Schema(
  {
    stepNumber: { type: Number, required: true },
    title: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    description: {
      en: { type: String },
      ar: { type: String },
    },
    questions: [SurveyQuestionSchema],
  },
  { _id: false }
);

const SurveyTemplateSchema = new Schema<ISurveyTemplate>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['sample', 'bulk'], required: true },
    isActive: { type: Boolean, default: true },
    steps: [SurveyStepSchema],
  },
  { timestamps: true }
);

SurveyTemplateSchema.index({ type: 1 });
SurveyTemplateSchema.index({ isActive: 1 });

const SurveyTemplate = mongoose.models.SurveyTemplate || mongoose.model<ISurveyTemplate>('SurveyTemplate', SurveyTemplateSchema);
export default SurveyTemplate;
