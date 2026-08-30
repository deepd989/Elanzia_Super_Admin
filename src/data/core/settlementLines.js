// CANONICAL FIXTURE - the settlement split, one row per order and manufacturer.
//
// This is core rather than a feature fixture because three areas read it and
// none of them may disagree: Payments settles it (ADM-054 to ADM-056), Tax
// invoices against it (ADM-053, ADM-059 to ADM-061), and Operations counts the
// failures on the dashboard (ADM-010, ADM-012). One split, one place.
//
// WHY THIS FILE EXISTS
//
// An order is placed with one jeweller but is very often filled by several
// manufacturers - 38 of the 50 orders in src/data/core/orders.js have two or
// three. The order record carries a single `settlement.manufacturerPayout`,
// which is the total owed across all of them. That total is not payable to
// anybody: each manufacturer is owed its own share, is invoiced separately, and
// is paid separately, because each one shipped its own goods under its own
// GSTIN. This file is that split, and it is the row a payout is made against.
//
// HOW THE MONEY DIVIDES
//
//   goodsValue  the sum of that manufacturer's own order lines. Nothing
//               approximate about it - it is addition.
//
//   commission  Elanzia's cut, allocated out of the order's permanent
//               `commission` total in proportion to goodsValue. See the note on
//               allocateCommission below for why it is allocated rather than
//               recomputed.
//
//   payout      goodsValue minus commission. Shipping and insurance are
//               Elanzia's revenue and never enter a payout, which is why the
//               parts sum to `settlement.manufacturerPayout` (goods net of
//               commission) and not to `order.total`.
//
// The money sits in the payment aggregator's nodal account throughout, never in
// Elanzia's own, and splits from there to each manufacturer net of commission.

import { orders } from './orders';

// How long after delivery a jeweller may still raise a return. A settlement is
// not due until this closes, because paying a manufacturer for goods that are
// about to come back means clawing the money back afterwards.
export const RETURN_WINDOW_DAYS = 7;

// Used only to project a due date for consignments that have shipped but not
// yet been marked delivered. A real system reads the courier's promised date.
export const ASSUMED_TRANSIT_DAYS = 4;

const DAY_MS = 24 * 3600000;

function isoDaysAfter(iso, days) {
  if (!iso) return null;
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString();
}

/**
 * Split a permanent total into parts, in proportion to `weights`, so that the
 * parts always sum back to exactly that total.
 *
 * The order's `commission` is fixed at confirmation and is what Elanzia has
 * actually charged. Recomputing each manufacturer's share from its own
 * negotiated percentage would produce a set of numbers that does not add up to
 * the charge on the order, and the difference would have to be written off by
 * somebody. So the charge is allocated, not recalculated.
 *
 * Allocation is by largest remainder: floor every share, then hand the leftover
 * rupees out one at a time to the lines with the largest fractional parts. That
 * is the standard apportionment method, and unlike "give the rounding to the
 * biggest line" it does not systematically favour one manufacturer.
 */
export function allocateCommission(total, weights) {
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightTotal === 0) return weights.map(() => 0);

  const exact = weights.map((weight) => (total * weight) / weightTotal);
  const shares = exact.map((value) => Math.floor(value));
  let remainder = total - shares.reduce((sum, value) => sum + value, 0);

  // Indices ordered by the size of the fraction we just discarded.
  const byFraction = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction);

  let cursor = 0;
  while (remainder > 0) {
    shares[byFraction[cursor % byFraction.length].index] += 1;
    remainder -= 1;
    cursor += 1;
  }

  return shares;
}

// The manufacturers on an order, in the order their lines first appear. Read
// off the lines rather than off `manufacturerIds` so that the split can never
// name a manufacturer that shipped nothing.
function manufacturersOn(order) {
  return [...new Set(order.lines.map((line) => line.manufacturerId))];
}

export const settlementLines = orders.flatMap((order) => {
  const manufacturerIds = manufacturersOn(order);

  const goodsValues = manufacturerIds.map((manufacturerId) =>
    order.lines
      .filter((line) => line.manufacturerId === manufacturerId)
      .reduce((sum, line) => sum + line.lineTotal, 0),
  );

  const commissions = allocateCommission(order.commission, goodsValues);

  // The return window closes this long after the goods land. Until then the
  // money stays in the nodal account however finished the order looks.
  const dueAt = order.deliveredAt
    ? isoDaysAfter(order.deliveredAt, RETURN_WINDOW_DAYS)
    : isoDaysAfter(order.dispatchedAt, ASSUMED_TRANSIT_DAYS + RETURN_WINDOW_DAYS);

  return manufacturerIds.map((manufacturerId, index) => {
    const goodsValue = goodsValues[index];
    const commission = commissions[index];
    const lines = order.lines.filter((line) => line.manufacturerId === manufacturerId);

    return {
      id: `STL-${order.id.slice(4)}-${manufacturerId}`,
      orderId: order.id,
      jewellerId: order.jewellerId,
      manufacturerId,
      lineIds: lines.map((line) => line.id),
      lineCount: lines.length,
      netWeight: Number(lines.reduce((sum, line) => sum + line.netWeight * line.quantity, 0).toFixed(3)),
      goodsValue,
      commission,
      // Restated from the allocated figures so it describes what was actually
      // deducted from this manufacturer rather than the order's blended rate.
      commissionPercent: goodsValue === 0 ? 0 : Number(((commission / goodsValue) * 100).toFixed(2)),
      payout: goodsValue - commission,
      // Mirrors the order. A settlement is a property of the order's money
      // having cleared, and one manufacturer on an order cannot be settled
      // while another is not.
      status: order.settlement.status,
      dueAt,
      settledAt: order.settlement.settledAt,
      nodalReference: order.settlement.nodalReference,
    };
  });
});

export const settlementLineById = Object.fromEntries(
  settlementLines.map((line) => [line.id, line]),
);

export const settlementLinesByOrderId = settlementLines.reduce((map, line) => {
  (map[line.orderId] ??= []).push(line);
  return map;
}, {});

export const settlementLinesByManufacturerId = settlementLines.reduce((map, line) => {
  (map[line.manufacturerId] ??= []).push(line);
  return map;
}, {});
