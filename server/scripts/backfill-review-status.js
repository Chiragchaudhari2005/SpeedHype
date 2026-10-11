// One-off migration: records created before the review workflow existed have no
// `reviewStatus` and would disappear from the public catalog. This marks them
// 'approved' (they were already publicly visible). Run explicitly:
//   node scripts/backfill-review-status.js          # dry run (counts only)
//   node scripts/backfill-review-status.js --apply  # perform the update
import 'dotenv/config';
import mongoose from 'mongoose';

const apply = process.argv.includes('--apply');
await mongoose.connect(process.env.MONGO_URI);
const cars = mongoose.connection.collection('cars');
const filter = { reviewStatus: { $exists: false } };
const count = await cars.countDocuments(filter);
console.log(`${count} legacy car record(s) without reviewStatus.`);
if (apply && count > 0) {
  const result = await cars.updateMany(filter, {
    $set: { reviewStatus: 'approved', reviewedBy: 'legacy-backfill', reviewedAt: new Date(), reviewNotes: 'Existing record approved by migration.' },
  });
  console.log(`Updated ${result.modifiedCount} record(s).`);
} else if (!apply) {
  console.log('Dry run only. Re-run with --apply to update.');
}
await mongoose.disconnect();
