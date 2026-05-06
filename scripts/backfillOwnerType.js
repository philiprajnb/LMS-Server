/**
 * Backfill script: set owner_type on existing leads.
 *
 * Rules:
 * - assigned_to is set and non-empty  → owner_type = 'agent'
 * - otherwise                         → owner_type = 'unassigned'
 *
 * Run once after deploying the assignment engine:
 *   node scripts/backfillOwnerType.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const Lead = require('../models/Lead');

  // Agent-owned
  const agentRes = await Lead.updateMany(
    {
      assigned_to: { $exists: true, $ne: null, $ne: '' },
      owner_type: { $exists: false }
    },
    { $set: { owner_type: 'agent' } }
  );
  console.log(`Set owner_type='agent' on ${agentRes.modifiedCount} leads`);

  // Unassigned
  const unassignedRes = await Lead.updateMany(
    {
      $or: [
        { assigned_to: { $exists: false } },
        { assigned_to: null },
        { assigned_to: '' }
      ],
      owner_type: { $exists: false }
    },
    { $set: { owner_type: 'unassigned' } }
  );
  console.log(`Set owner_type='unassigned' on ${unassignedRes.modifiedCount} leads`);

  // Catch anything still missing (safety net)
  const remainingRes = await Lead.updateMany(
    { owner_type: { $exists: false } },
    { $set: { owner_type: 'unassigned' } }
  );
  console.log(`Safety-net fallback applied to ${remainingRes.modifiedCount} leads`);

  await mongoose.disconnect();
  console.log('Done. Disconnected.');
}

run().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
