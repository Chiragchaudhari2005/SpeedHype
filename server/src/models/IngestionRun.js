import mongoose from 'mongoose';

// Written by the Python ingestion agent; read (never written) by Express.
const ingestionRunSchema = new mongoose.Schema(
  {
    status: { type: String, index: true },
    requestedCount: Number,
    requestedBy: String,
    startedAt: { type: Date, index: true },
    finishedAt: Date,
    usage: mongoose.Schema.Types.Mixed,
    counts: mongoose.Schema.Types.Mixed,
    results: [mongoose.Schema.Types.Mixed],
    logs: [mongoose.Schema.Types.Mixed],
    errors: [String],
  },
  { collection: 'ingestionruns', strict: false, suppressReservedKeysWarning: true },
);

export default mongoose.model('IngestionRun', ingestionRunSchema);
