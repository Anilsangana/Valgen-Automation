#!/usr/bin/env node
// Quick verification script (does NOT print the raw password) to help debug .env parsing
require('dotenv').config();
const { VG_USERNAME, VG_PASSWORD } = process.env;
if (!VG_USERNAME || !VG_PASSWORD) {
  console.error('Missing VG_USERNAME or VG_PASSWORD in environment.');
  process.exit(1);
}
console.log('VG_USERNAME:', VG_USERNAME);
console.log('VG_PASSWORD length:', VG_PASSWORD.length);
console.log('VG_PASSWORD startsWith single-quote:', VG_PASSWORD.startsWith("'"));
console.log('VG_PASSWORD startsWith double-quote:', VG_PASSWORD.startsWith('"'));
console.log('VG_PASSWORD endsWith single-quote:', VG_PASSWORD.endsWith("'"));
console.log('VG_PASSWORD endsWith double-quote:', VG_PASSWORD.endsWith('"'));
// show a masked sample (first and last char) to confirm contents without revealing full secret
const first = VG_PASSWORD.charAt(0);
const last = VG_PASSWORD.charAt(VG_PASSWORD.length - 1);
console.log('VG_PASSWORD sample:', first + '...' + last);
