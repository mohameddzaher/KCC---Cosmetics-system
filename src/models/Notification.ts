import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotification extends Document {
  userId?: Types.ObjectId;
  type: string;
  title: { en: string; ar: string };
  message: { en: string; ar: string };
  data: any;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: ['order_status', 'low_stock', 'new_order', 'payment', 'system'],
      required: true,
    },
    title: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    message: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    data: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ createdAt: -1 });

const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;
