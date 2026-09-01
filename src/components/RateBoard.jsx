import { cn } from '@/utils/cn';
import { t } from '@/i18n/en';
import { formatINR, formatPurity } from '@/utils/format';

// The metal rate board, as it hangs in a shop. A document, so radius 0.
//
// A rate is never shown without its basis and the time it was taken - a bare
// figure is not a rate, and a jeweller cannot act on one. There is no
// countdown and no live ticker here; the timestamp is absolute.
//
// rows: [{ purity, ratePerTenGrams }]
export default function RateBoard({ rows = [], asOf, basis = t('price.perTenGrams'), className }) {
  return (
    <div className={cn('max-w-[340px] rounded-none border-2 border-charcoal bg-white', className)}>
      <header className="flex items-baseline justify-between border-b-2 border-charcoal px-4 py-2.5">
        <h3 className="font-heading text-h3 text-charcoal">{t('price.rateBoardTitle')}</h3>
        {asOf ? (
          <span className="text-micro font-semibold tabular-nums text-charcoal-tertiary">{asOf}</span>
        ) : null}
      </header>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border-b border-border px-4 pb-1.5 pt-2 text-left text-micro font-bold text-charcoal-tertiary">
              {t('price.purity')}
            </th>
            <th className="border-b border-border px-4 pb-1.5 pt-2 text-right text-micro font-bold text-charcoal-tertiary">
              {basis}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.purity}>
              <td className="border-b border-border-subtle px-4 py-1.5 text-left font-mono text-sm font-bold text-charcoal">
                {formatPurity(row.purity)}
              </td>
              <td className="border-b border-border-subtle px-4 py-1.5 text-right text-sm font-medium tabular-nums text-charcoal">
                {formatINR(row.ratePerTenGrams)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
