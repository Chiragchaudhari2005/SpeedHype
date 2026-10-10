import mongoose from 'mongoose';

const notificationStateSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    lastReadAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export default mongoose.model('NotificationState', notificationStateSchema);
