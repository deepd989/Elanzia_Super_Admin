import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { t } from '@/i18n/en';
import Select from './primitives/Select';

// STYLING ONLY. Sticky header, fixed row height, hover, borders and a
// pagination footer. It takes children - the screen writes its own <thead>
// and <tbody>. There is deliberately no columns config, no data prop and no
// sorting logic here; see the component policy in CLAUDE.md.
//
//   <TableShell footer={<TableShell.Pagination ... />}>
//     <TableShell.Head>
//       <TableShell.HeadCell>Business</TableShell.HeadCell>
//     </TableShell.Head>
//     <TableShell.Body>
//       <TableShell.Row>
//         <TableShell.Cell>Shree Balaji Jewellers</TableShell.Cell>
//       </TableShell.Row>
//     </TableShell.Body>
//   </TableShell>

export default function TableShell({ footer, maxHeight = '32rem', className, children }) {
  return (
    <div className={cn('overflow-hidden rounded-md border border-border bg-white', className)}>
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full border-collapse text-left">{children}</table>
      </div>
      {footer ? (
        <div className="border-t border-border bg-white px-cellX py-2">{footer}</div>
      ) : null}
    </div>
  );
}

function Head({ className, children }) {
  return (
    <thead className={cn('sticky top-0 z-sticky bg-white', className)}>
      <tr className="border-b-2 border-border-strong">{children}</tr>
    </thead>
  );
}

// align: 'left' | 'right' | 'center'. Money and weight columns go right.
function HeadCell({ align = 'left', width, className, children }) {
  return (
    <th
      scope="col"
      style={width ? { width } : undefined}
      className={cn(
        'whitespace-nowrap px-cellX py-cellY font-body text-label font-bold text-charcoal-tertiary',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  );
}

// The screen owns the sort state and passes direction back in. This renders
// the affordance; it does not sort anything.
function SortableHeadCell({ align = 'left', width, direction = null, onSort, className, children }) {
  const Icon = direction === 'asc' ? ChevronUp : direction === 'desc' ? ChevronDown : ChevronsUpDown;

  return (
    <HeadCell align={align} width={width} className={cn('p-0', className)}>
      <button
        type="button"
        onClick={onSort}
        aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}
        className={cn(
          'flex w-full items-center gap-1.5 px-cellX py-cellY',
          'hover:text-charcoal focus:outline-none focus-visible:shadow-focus',
          align === 'right' && 'justify-end',
          align === 'center' && 'justify-center',
          direction && 'text-charcoal',
        )}
      >
        {children}
        <Icon size={13} aria-hidden="true" className={cn(!direction && 'opacity-50')} />
      </button>
    </HeadCell>
  );
}

function Body({ className, children }) {
  return <tbody className={cn('divide-y divide-border [&>tr:last-child]:border-b-0', className)}>{children}</tbody>;
}

function Row({ selected = false, onClick, className, children }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'h-row transition-colors duration-hover ease-standard',
        selected
          ? 'bg-surface-selected shadow-[inset_0_1px_0_var(--status-positive-br)]'
          : 'bg-white hover:bg-surface-hover',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </tr>
  );
}

function Cell({ align = 'left', numeric = false, className, children, ...rest }) {
  return (
    <td
      className={cn(
        'px-cellX py-cellY align-middle text-body text-charcoal',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        numeric && 'num',
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}

// Narrow fixed column for the bulk-select checkbox, header and body alike.
function SelectCell({ header = false, className, children }) {
  const Tag = header ? 'th' : 'td';
  return (
    <Tag
      scope={header ? 'col' : undefined}
      className={cn('w-11 px-cellX py-cellY align-middle', className)}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </Tag>
  );
}

// Right-aligned, shrink-to-fit column for per-row buttons.
function ActionsCell({ className, children }) {
  return (
    <td
      className={cn('w-px whitespace-nowrap px-cellX py-cellY text-right align-middle', className)}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-end gap-1">{children}</div>
    </td>
  );
}

// Full-width row for the loading, empty and error states inside the table.
function StateRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        {children}
      </td>
    </tr>
  );
}

// Sits directly above the header when rows are selected. It is the only
// place the selected surface appears outside a row.
function BulkBar({ count, children, className }) {
  if (!count) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3.5 border-b border-success-border bg-surface-selected',
        'px-cellX py-cellY text-sm',
        className,
      )}
    >
      <span className="font-bold text-link num">{t('common.selectedCount', { count })}</span>
      {children}
    </div>
  );
}

// The table's own empty state. Never a bare spinner, and never "No data yet" -
// say what would appear here and what would widen the result.
function Empty({ title, body, children, className }) {
  return (
    <div className={cn('border-t border-border px-5 py-12 text-center', className)}>
      {title ? <p className="font-heading text-h3 text-charcoal">{title}</p> : null}
      {body ? <p className="mt-1.5 text-body text-charcoal-light">{body}</p> : null}
      {children}
    </div>
  );
}

const PAGE_SIZES = [10, 20, 50, 100];

function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-charcoal-light">
        {t('common.showingRange', { from, to, total })}
      </p>

      <div className="flex items-center gap-4">
        {onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-charcoal-light">{t('common.rowsPerPage')}</span>
            <Select
              id="table-page-size"
              className="w-20"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              options={PAGE_SIZES.map((size) => ({ value: size, label: String(size) }))}
            />
          </div>
        ) : null}

        <div className="flex items-center gap-1">
          <PageButton
            label={t('common.previous')}
            icon={ChevronLeft}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          />
          <span className="px-2 text-sm text-charcoal num">
            {page} {t('common.of')} {lastPage}
          </span>
          <PageButton
            label={t('common.next')}
            icon={ChevronRight}
            disabled={page >= lastPage}
            onClick={() => onPageChange(page + 1)}
          />
        </div>
      </div>
    </div>
  );
}

function PageButton({ label, icon: Icon, disabled, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-control w-control items-center justify-center rounded-sm border border-border-strong bg-white',
        'text-charcoal-light hover:border-charcoal-lighter hover:bg-surface-hover hover:text-charcoal',
        'focus:outline-none focus-visible:shadow-focus',
        'disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-sunken disabled:text-charcoal-lighter',
      )}
    >
      <Icon size={16} />
    </button>
  );
}

TableShell.Head = Head;
TableShell.HeadCell = HeadCell;
TableShell.SortableHeadCell = SortableHeadCell;
TableShell.Body = Body;
TableShell.Row = Row;
TableShell.Cell = Cell;
TableShell.SelectCell = SelectCell;
TableShell.ActionsCell = ActionsCell;
TableShell.StateRow = StateRow;
TableShell.BulkBar = BulkBar;
TableShell.Empty = Empty;
TableShell.Pagination = Pagination;
