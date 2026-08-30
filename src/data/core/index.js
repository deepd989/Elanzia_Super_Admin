// The canonical entities. Feature fixtures import from here and reference
// these rows by id - they never redefine a manufacturer, jeweller, product,
// order, role, admin user, metal rate, settlement line, tax invoice or payout
// attempt of their own.
export { manufacturers } from './manufacturers';
export { jewellers } from './jewellers';
export { products } from './products';
export { orders } from './orders';
export { roles, roleById } from './roles';
export { adminUsers, adminUserById } from './adminUsers';
export {
  METALS,
  metalById,
  quotedRates,
  purityFactors,
  metalRates,
  metalRateById,
  metalRateHistory,
  rateSnapshotMeta,
  ratesForFactors,
  METAL_RATES_NOW,
  NOMINAL_DEVIATION_TOLERANCE_PERCENT,
} from './metalRates';
export {
  settlementLines,
  settlementLineById,
  settlementLinesByOrderId,
  settlementLinesByManufacturerId,
  allocateCommission,
  RETURN_WINDOW_DAYS,
  ASSUMED_TRANSIT_DAYS,
} from './settlementLines';
export {
  einvoices,
  // The Operations area has called these einvoiceRecords since ADM-010 shipped.
  // Aliased rather than renamed there, so promoting the fixture did not become
  // a rename across a screen that had nothing to do with this change.
  einvoices as einvoiceRecords,
  einvoiceById,
  einvoicesByOrderId,
  isCancellable,
  IRN_CANCELLATION_WINDOW_HOURS,
  EINVOICE_NOW,
} from './einvoices';
export {
  payoutAttempts,
  payoutAttemptById,
  payoutAttemptsByLineId,
  outstandingPayouts,
  PAYOUT_SLA_HOURS,
  PAYOUT_NOW,
} from './payouts';

import { manufacturers } from './manufacturers';
import { jewellers } from './jewellers';
import { products } from './products';
import { orders } from './orders';

// Id lookups, so a feature fixture can join without scanning.
export const manufacturerById = Object.fromEntries(manufacturers.map((row) => [row.id, row]));
export const jewellerById = Object.fromEntries(jewellers.map((row) => [row.id, row]));
export const productById = Object.fromEntries(products.map((row) => [row.id, row]));
export const orderById = Object.fromEntries(orders.map((row) => [row.id, row]));
