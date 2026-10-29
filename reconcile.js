// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

// Amounts arrive as numbers or as strings with thousands separators ("4,804.15"). Work in kobo to avoid float drift.
function toKobo(amount) {
  return Math.round(Number(String(amount).replace(/,/g, "")) * 100);
}

// Only the latest attempt for each txn_id counts. Events are not in time order.
const latest = new Map();
for (const line of fs.readFileSync("payments.jsonl", "utf8").split("\n")) {
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue; // blank or truncated line
  }
  if (!event || !event.txn_id) continue;
  const ts = Date.parse(event.ts);
  const prev = latest.get(event.txn_id);
  if (!prev || ts > prev.ts) latest.set(event.txn_id, { ts, event });
}

let totalKobo = 0;
let count = 0;
for (const { event } of latest.values()) {
  if (event.status === "success") {
    totalKobo += toKobo(event.amount);
    count += 1;
  }
}
const total = totalKobo / 100;

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(total)}`);
}
