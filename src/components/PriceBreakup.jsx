import { cn } from '@/utils/cn';
import { t } from '@/i18n/en';
import { formatINR, formatGrams, formatPercent, formatPurity } from '@/utils/format';

// Shared because the composition of a price is a domain rule, not a layout
// choice. It must read identically on a product page, an order page and an
// invoice, or the marketplace loses the manufacturer's trust.
//
//   price = (metal rate x net weight) + wastage + making charges
//           + stone value + GST
//
// breakup: {
//   purity, netWeight, grossWeight, metalRatePerGram, metalValue,
//   wastageValue, wastagePercent, makingCharges, makingChargesPerGram,
//   stoneValue, subtotal, gstPercent, gstValue, total
// }
export default function PriceBreakup({ breakup, dense = false, className }) {
  if (!breakup) return null;

  const rowPadding = dense ? 'py-1.5' : 'py-2.5';

  return (
    <div className={cn('rounded-md border border-lightGray-dark bg-white', className)}>
      <header className="flex items-baseline justify-between border-b border-lightGray-dark px-4 py-3">
        <h3 className="font-display text-base text-primary">{t('price.breakupTitle')}</h3>
        <span className="text-xs text-charcoal-light">
          {formatPurity(breakup.purity)} · {formatGrams(breakup.netWeight)} {t('units.net').toLowerCase()}
        </span>
      </header>

      <dl className="divide-y divide-lightGray px-4">
        <Line
          className={rowPadding}
          label={t('price.metalValue')}
          hint={`${formatINR(breakup.metalRatePerGram)}/g x ${formatGrams(breakup.netWeight)}`}
          value={breakup.metalValue}
        />

        {/* Wastage is ADDED to the metal value, not deducted - trade convention. */}
        <Line
          className={rowPadding}
          label={t('price.wastage')}
          hint={breakup.wastagePercent != null ? formatPercent(breakup.wastagePercent) : undefined}
          value={breakup.wastageValue}
        />

        <Line
          className={rowPadding}
          label={t('price.makingCharges')}
          hint={
            breakup.makingChargesPerGram != null
              ? `${formatINR(breakup.makingChargesPerGram)}/g`
              : undefined
          }
          value={breakup.makingCharges}
        />

        {breakup.stoneValue ? (
          <Line className={rowPadding} label={t('price.stoneValue')} value={breakup.stoneValue} />
        ) : null}

        <Line className={rowPadding} label={t('price.subtotal')} value={breakup.subtotal} emphasis />

        <Line
          className={rowPadding}
          label={t('price.gst')}
          hint={breakup.gstPercent != null ? formatPercent(breakup.gstPercent) : undefined}
          value={breakup.gstValue}
        />
      </dl>

      <div className="flex items-baseline justify-between border-t-2 border-primary px-4 py-3">
        <dt className="font-body text-base font-semibold text-primary">{t('price.total')}</dt>
        <dd className="font-display text-xl text-primary num">{formatINR(breakup.total)}</dd>
      </div>
    </div>
  );
}

function Line({ label, hint, value, emphasis = false, className }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4', className)}>
      <dt className="min-w-0">
        <span className={cn('text-base', emphasis ? 'font-medium text-charcoal' : 'text-charcoal-light')}>
          {label}
        </span>
        {hint ? <span className="ml-2 text-xs text-charcoal-lighter num">{hint}</span> : null}
      </dt>
      <dd className={cn('shrink-0 text-base num', emphasis ? 'font-semibold text-charcoal' : 'text-charcoal')}>
        {formatINR(value)}
      </dd>
    </div>
  );
}
