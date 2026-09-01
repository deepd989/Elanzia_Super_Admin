import { cn } from '@/utils/cn';
import { t } from '@/i18n/en';
import { formatINR, formatGrams, formatPercent, formatPurity } from '@/utils/format';
import DocumentFrame, { DocumentLine } from './DocumentFrame';

// Shared because the composition of a price is a domain rule, not a layout
// choice. It must read identically on a product page, an order page and an
// invoice, or the marketplace loses the manufacturer's trust.
//
//   price = (metal rate x net weight) + wastage + making charges
//           + stone value + GST
//
// It is a document, not a card: radius 0, a near-black edge, and a fold rule
// above the total.
//
// breakup: {
//   purity, netWeight, grossWeight, metalRatePerGram, metalValue,
//   wastageValue, wastagePercent, makingCharges, makingChargesPerGram,
//   stoneValue, subtotal, gstPercent, gstValue, total
// }
export default function PriceBreakup({ breakup, dense = false, className }) {
  if (!breakup) return null;

  return (
    <DocumentFrame
      className={className}
      title={<h3 className="font-heading text-h3 text-charcoal">{t('price.breakupTitle')}</h3>}
      meta={
        <>
          {formatPurity(breakup.purity)}
          {' · '}
          {formatGrams(breakup.netWeight)} {t('units.net').toLowerCase()}
        </>
      }
    >
      <dl className={cn('px-4', dense ? 'py-1.5' : 'py-3')}>
        <DocumentLine
          label={t('price.metalValue')}
          hint={`${formatINR(breakup.metalRatePerGram)}/g x ${formatGrams(breakup.netWeight)}`}
          value={formatINR(breakup.metalValue)}
        />

        {/* Wastage is ADDED to the metal value, not deducted - trade convention. */}
        <DocumentLine
          label={t('price.wastage')}
          hint={breakup.wastagePercent != null ? formatPercent(breakup.wastagePercent) : undefined}
          value={formatINR(breakup.wastageValue)}
        />

        <DocumentLine
          label={t('price.makingCharges')}
          hint={
            breakup.makingChargesPerGram != null
              ? `${formatINR(breakup.makingChargesPerGram)}/g`
              : undefined
          }
          value={formatINR(breakup.makingCharges)}
        />

        {breakup.stoneValue ? (
          <DocumentLine label={t('price.stoneValue')} value={formatINR(breakup.stoneValue)} />
        ) : null}

        <DocumentLine label={t('price.subtotal')} value={formatINR(breakup.subtotal)} emphasis fold />

        <DocumentLine
          label={t('price.gst')}
          hint={breakup.gstPercent != null ? formatPercent(breakup.gstPercent) : undefined}
          value={formatINR(breakup.gstValue)}
        />
      </dl>

      <div className="flex items-baseline justify-between border-t-2 border-charcoal px-4 py-3">
        <dt className="font-body text-body font-bold text-charcoal">{t('price.total')}</dt>
        <dd className="font-heading text-h2 text-charcoal num">{formatINR(breakup.total)}</dd>
      </div>
    </DocumentFrame>
  );
}
