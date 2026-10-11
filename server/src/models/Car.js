import mongoose from 'mongoose';

const carSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true, trim: true, maxlength: 80 },
    model: { type: String, required: true, trim: true, maxlength: 100 },
    variant: { type: String, default: '', trim: true, maxlength: 120 },
    launchYear: { type: Number, required: true, min: 1886, max: 2200 },
    // Null until a source explicitly states it; an admin must set it before approval.
    category: { type: String, default: null, enum: ['sedan', 'suv', 'hatchback', 'truck', 'coupe', 'convertible', 'electric', 'hybrid', null] },
    priceAmount: { type: Number, min: 0, default: null },
    priceCurrency: { type: String, default: '', uppercase: true, minlength: 0, maxlength: 3 },
    engine: { type: String, default: '' },
    horsepower: { type: Number, min: 0, default: null },
    horsepowerUnit: { type: String, default: '', maxlength: 12 },
    torque: { type: Number, min: 0, default: null },
    torqueUnit: { type: String, default: '', maxlength: 12 },
    mileage: { type: Number, min: 0, default: null },
    mileageUnit: { type: String, default: '', maxlength: 20 },
    fuelType: { type: String, default: '' },
    transmission: { type: String, default: '' },
    seatingCapacity: { type: Number, min: 1, default: null },
    specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
    images: [{
      url: { type: String, required: true },
      alt: { type: String, default: '' },
      sourceUrl: { type: String, default: '' },
      license: { type: String, default: '' },
      attribution: { type: String, default: '' },
      permissionStatus: { type: String, default: 'unverified' },
    }],
    sourceUrl: { type: String, required: true },
    sourceTitle: { type: String, default: '', maxlength: 300 },
    sourceName: { type: String, required: true },
    sourceLicense: { type: String, required: true },
    sourceLicenseUrl: { type: String, default: '' },
    sourceVerifiedAt: { type: Date, required: true },
    fieldSources: { type: mongoose.Schema.Types.Mixed, default: {} },
    identityKey: { type: String, required: true, unique: true },
    ingestionUpdatedAt: { type: Date, default: Date.now },
    // Review workflow. Only 'approved' records are visible in the public catalog.
    reviewStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reviewedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewNotes: { type: String, default: '', maxlength: 1000 },
    approvalOverrideReason: { type: String, default: '', maxlength: 1000 },
    editedBy: { type: String, default: null },
    editedAt: { type: Date, default: null },
    editedFields: { type: [String], default: [] },
    // Audit trail written by the ingestion agent.
    validation: { type: mongoose.Schema.Types.Mixed, default: null },
    sources: { type: [mongoose.Schema.Types.Mixed], default: [] },
    ingestionRunId: { type: String, default: null },
    ingestedBy: { type: String, default: null },
  },
  { timestamps: true },
);

carSchema.index({ brand: 1, model: 1, launchYear: -1 });
carSchema.index({ category: 1, priceAmount: 1 });
carSchema.index({ fuelType: 1, transmission: 1 });

export default mongoose.model('Car', carSchema);
