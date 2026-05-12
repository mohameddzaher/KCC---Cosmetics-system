import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISurveyResponse extends Document {
  userId: Types.ObjectId;
  templateId: Types.ObjectId;
  answers: any;
  completedSteps: number[];
  status: 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const SurveyResponseSchema = new Schema<ISurveyResponse>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'SurveyTemplate', required: true },
    answers: { type: Schema.Types.Mixed, default: {} },
    completedSteps: [{ type: Number }],
    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
  },
  { timestamps: true }
);

SurveyResponseSchema.index({ userId: 1 });
SurveyResponseSchema.index({ templateId: 1 });

const SurveyResponse = mongoose.models.SurveyResponse || mongoose.model<ISurveyResponse>('SurveyResponse', SurveyResponseSchema);
export default SurveyResponse;
