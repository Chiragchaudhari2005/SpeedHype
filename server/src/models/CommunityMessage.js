import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: { type: String, enum: ['image', 'video'], required: true },
    format: { type: String, default: '' },
  },
  { _id: false },
);

const communityMessageSchema = new mongoose.Schema(
  {
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true, maxlength: 80 },
    authorImage: { type: String, default: '' },
    text: { type: String, trim: true, maxlength: 2000, default: '' },
    media: { type: mediaSchema, default: null },
  },
  { timestamps: true },
);

communityMessageSchema.index({ communityId: 1, createdAt: -1 });

export default mongoose.model('CommunityMessage', communityMessageSchema);
