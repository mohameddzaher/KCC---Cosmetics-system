import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamMember extends Document {
  name: string;
  role: { en: string; ar: string };
  image: string;
  section: 'leadership' | 'team';
  order: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    name: { type: String, required: true, trim: true },
    role: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, required: true, trim: true },
    },
    image: { type: String, trim: true },
    section: { type: String, enum: ['leadership', 'team'], default: 'team' },
    order: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const TeamMember = mongoose.models.TeamMember || mongoose.model<ITeamMember>('TeamMember', TeamMemberSchema);
export default TeamMember;
