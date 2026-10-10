import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    displayName: { type: String, required: true, maxlength: 80 },
    imageUrl: { type: String, default: '' },
  },
  { _id: false },
);

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, required: true, trim: true, maxlength: 1200 },
    category: {
      type: String,
      required: true,
      enum: ['Cars', 'Bikes', 'EVs', 'Modifications', 'Racing', 'Restoration', 'Off-road', 'General'],
    },
    coverImage: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    creatorId: { type: String, required: true, index: true },
    creatorName: { type: String, required: true, trim: true, maxlength: 80 },
    creatorImage: { type: String, default: '' },
    members: { type: [memberSchema], default: [] },
  },
  { timestamps: true },
);

communitySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
communitySchema.index({ 'members.userId': 1 });

export default mongoose.model('Community', communitySchema);
