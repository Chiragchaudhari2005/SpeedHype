import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    content: { type: String, required: true, maxlength: 30000 },
    coverImage: { type: imageSchema, default: null },
    images: {
      type: [imageSchema],
      default: [],
      validate: {
        validator: (images) => images.length <= 5,
        message: 'A blog can have up to five gallery images.',
      },
    },
    category: { type: String, required: true, trim: true, maxlength: 48 },
    tags: {
      type: [{ type: String, trim: true, maxlength: 500 }],
      default: [],
      validate: {
        validator: (tags) => tags.length <= 10 && tags.join(', ').length <= 500,
        message: 'Use no more than ten tags and keep the complete tags field within 500 characters.',
      },
    },
    authorId: { type: String, required: true, index: true },
    authorName: { type: String, required: true, trim: true, maxlength: 80 },
    authorImage: { type: String, default: '' },
  },
  { timestamps: true },
);

blogSchema.index({ createdAt: -1 });
blogSchema.index({ category: 1, createdAt: -1 });

export default mongoose.model('Blog', blogSchema);
