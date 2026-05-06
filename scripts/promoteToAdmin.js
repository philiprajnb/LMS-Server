#!/usr/bin/env node
require('dotenv').config();

const connectDB = require('../config/database');
const User = require('../models/User');

const parseArg = (flag) => {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1];
};

const run = async () => {
  const email = parseArg('--email');
  const key = parseArg('--key');

  if (!email) {
    console.error('Usage: npm run promote-admin -- --email user@example.com --key <BOOTSTRAP_ADMIN_KEY>');
    process.exit(1);
  }

  if (!process.env.BOOTSTRAP_ADMIN_KEY) {
    console.error('BOOTSTRAP_ADMIN_KEY is not set in environment. Refusing to run.');
    process.exit(1);
  }

  if (!key || key !== process.env.BOOTSTRAP_ADMIN_KEY) {
    console.error('Invalid or missing --key. Refusing to run.');
    process.exit(1);
  }

  await connectDB();

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    console.error(`User not found for email: ${email}`);
    process.exit(1);
  }

  if (!user.isActive) {
    console.error('Cannot promote an inactive user.');
    process.exit(1);
  }

  if (user.role === 'admin') {
    console.log(`User ${user.email} is already an admin.`);
    process.exit(0);
  }

  const previousRole = user.role;
  user.role = 'admin';
  await user.save();

  console.log(`Promoted ${user.email} from ${previousRole} to admin successfully.`);
  process.exit(0);
};

run().catch((error) => {
  console.error('Promotion failed:', error.message);
  process.exit(1);
});
