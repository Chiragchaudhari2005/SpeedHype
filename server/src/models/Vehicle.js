import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    make: { type: String, required: true, trim: true, maxlength: 60 },
    model: { type: String, required: true, trim: true, maxlength: 80 },
    year: { type: Number, required: true, min: 1886, max: 2200 },
    category: { type: String, required: true, trim: true, maxlength: 48 },
    imageUrl: { type: String, default: '' },
    summary: { type: String, default: '', trim: true, maxlength: 400 },
    launchDate: { type: Date, default: Date.now },
    addedBy: { type: String, required: true },
  },
  { timestamps: true },
);

vehicleSchema.index({ createdAt: -1 });

export default mongoose.model('Vehicle', vehicleSchema);
