// CANONICAL FIXTURE - the payout attempt log.
//
// This is core rather than a feature fixture because two areas read it and they
// may not disagree: Payments works the failure queue (ADM-056) and Operations
// counts it on the dashboard (ADM-010, ADM-012).
//
// AN ATTEMPT IS NOT A SETTLEMENT
//
// This is the distinction the whole file exists to hold. A settlement line says
// what a manufacturer is owed and whether that money has cleared. An attempt
// says what happened the last time somebody tried to push it out of the nodal
// account. A failed attempt leaves the settlement line exactly where it was:
// the money never left the payment aggregator's nodal account, nothing was
// clawed back, and nothing about the order changed. It is a retry queue, not a
// fourth settlement state.
//
// That is why this is a log with many rows per line rather than a status on the
// line. "Paid on the third attempt after the IFSC was corrected" is a sentence
// the finance desk needs to be able to read, and a single status field cannot
// say it.
//
// A line that is not yet due has no attempts at all. Money that is not owed
// cannot have failed to arrive.

import { manufacturers } from './manufacturers';
import { settlementLines } from './settlementLines';

export const PAYOUT_NOW = '2026-08-29T10:00:00+05:30';

// How long a manufacturer may reasonably be kept waiting once a settlement is
// due. Breaching this is what turns a queued payout into an alert.
export const PAYOUT_SLA_HOURS = 72;

const NOW_MS = Date.parse(PAYOUT_NOW);
const HOUR_MS = 3600000;

const manufacturerById = Object.fromEntries(manufacturers.map((row) => [row.id, row]));

const isoHoursAgo = (hours) => new Date(NOW_MS - hours * HOUR_MS).toISOString();
const pad = (value, width) => String(value).padStart(width, '0');

// Real reasons a bank transfer to a beneficiary comes back. Three of the four
// need the manufacturer to do something, which is why ADM-056 pairs the retry
// with a way to correct the bank details rather than only offering a retry.
const PAYOUT_FAILURES = [
  { code: 'invalid_ifsc', reason: 'IFSC on the registered bank account no longer exists' },
  { code: 'beneficiary_bank_returned', reason: 'Beneficiary bank returned the credit without a reason code' },
  { code: 'account_frozen', reason: 'Beneficiary account is frozen by the bank' },
  { code: 'name_mismatch', reason: 'Beneficiary name does not match the account holder on record' },
  { code: 'nodal_insufficient', reason: 'Nodal balance short of the batch total at the time of release' },
];

// Which rail a payout goes out on. At these ticket sizes RTGS is the norm; the
// threshold is the RBI minimum for it, and below that NEFT carries the traffic.
const RTGS_MINIMUM = 200000;

function railFor(amount) {
  if (amount >= RTGS_MINIMUM) return 'RTGS';
  if (amount >= 100000) return 'NEFT';
  return 'IMPS';
}

// A settlement that has not fallen due has never been attempted.
const attemptable = settlementLines.filter((line) => line.status !== 'not_due');

let sequence = 0;

export const payoutAttempts = attemptable.flatMap((line, lineIndex) => {
  const manufacturer = manufacturerById[line.manufacturerId];
  const rail = railFor(line.payout);
  const settled = line.status === 'settled';

  // A settled line cleared. Roughly one in five needed a second push, which is
  // the history the desk reads when a manufacturer asks why they were paid late.
  const attemptCount = settled ? (lineIndex % 5 === 2 ? 2 : 1) : 1 + (lineIndex % 3);

  return Array.from({ length: attemptCount }).map((_, attemptIndex) => {
    const isLast = attemptIndex === attemptCount - 1;
    const failure = PAYOUT_FAILURES[(lineIndex + attemptIndex) % PAYOUT_FAILURES.length];

    // On a settled line the last attempt is the one that worked. On a line
    // still pending, the last attempt is either sitting in the queue or came
    // back, and everything before it came back.
    const status = settled
      ? isLast
        ? 'succeeded'
        : 'failed'
      : isLast
        ? lineIndex % 5 < 3
          ? 'failed'
          : 'queued'
        : 'failed';

    // Walk backwards from the settlement date on a cleared line, and from now
    // on one still outstanding, so the newest attempt is always the last row.
    const hoursAgo = settled
      ? Math.max(
          1,
          Math.round((NOW_MS - Date.parse(line.settledAt ?? line.dueAt ?? PAYOUT_NOW)) / HOUR_MS) +
            (attemptCount - attemptIndex - 1) * 26,
        )
      : 4 + (lineIndex % 7) * 9 + (attemptCount - attemptIndex - 1) * 31;

    sequence += 1;
    const succeeded = status === 'succeeded';

    return {
      id: `PYT-${pad(sequence, 4)}`,
      settlementLineId: line.id,
      orderId: line.orderId,
      manufacturerId: line.manufacturerId,
      manufacturerName: manufacturer.businessName,
      attemptNumber: attemptIndex + 1,

      // The manufacturer's share, net of Elanzia's commission. The commission
      // never enters the payout - it is retained at the nodal split, so this is
      // the figure that leaves the aggregator's account, not the order total.
      amount: line.payout,
      rail,
      nodalReference: line.nodalReference,

      status,
      // Nothing is in flight in this fixture at rest: a queued row means the
      // batch has not been released, not that a transfer is halfway through.
      attemptedAt: status === 'queued' ? null : isoHoursAgo(hoursAgo),
      queuedAt: isoHoursAgo(hoursAgo + 2),
      completedAt: succeeded ? isoHoursAgo(Math.max(0, hoursAgo - 1)) : null,
      utr: succeeded ? `UTR${pad(sequence, 6)}${line.orderId.slice(4)}` : null,

      failureCode: status === 'failed' ? failure.code : null,
      failureReason: status === 'failed' ? failure.reason : null,
      // The attempts already behind this one. A first attempt has none.
      retryCount: attemptIndex,

      slaHours: PAYOUT_SLA_HOURS,
      dueAt: line.dueAt,
    };
  });
});

export const payoutAttemptById = Object.fromEntries(payoutAttempts.map((row) => [row.id, row]));

export const payoutAttemptsByLineId = payoutAttempts.reduce((map, row) => {
  (map[row.settlementLineId] ??= []).push(row);
  return map;
}, {});

// The one attempt per settlement line that still needs somebody's attention:
// the newest, and only where it did not clear. This is what ADM-056 queues and
// what the ADM-010 tile counts, so both read the same function and cannot drift.
export const outstandingPayouts = Object.values(payoutAttemptsByLineId)
  .map((attempts) => attempts[attempts.length - 1])
  .filter((attempt) => attempt.status === 'failed' || attempt.status === 'queued');
