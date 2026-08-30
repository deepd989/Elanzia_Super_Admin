// ADM-011
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Search } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  StatusPill,
  Tabs,
} from '@/components/primitives';
import {
  clearSearch,
  runSearch,
  selectGlobalSearch,
  setSearchEntityType,
  setSearchTerm,
} from '@/store/slices/operationsSlice';
import { formatINR, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

// Typing is not a query. Waiting a beat means one request per thought rather
// than one per keystroke, which is what the real endpoint will need too.
const DEBOUNCE_MS = 250;
const MIN_TERM_LENGTH = 2;

const ENTITY_TYPES = ['manufacturer', 'jeweller', 'order', 'product', 'ticket'];

// Every entity brings its own status vocabulary, so the tone is decided per
// value rather than per entity. Anything unmapped falls back to neutral.
const STATUS_TONES = {
  approved: 'success',
  live: 'success',
  delivered: 'success',
  resolved: 'success',
  closed: 'neutral',
  applied: 'info',
  under_review: 'info',
  placed: 'info',
  confirmed: 'info',
  open: 'info',
  in_production: 'warning',
  ready_to_dispatch: 'warning',
  dispatched: 'warning',
  pending_review: 'warning',
  info_requested: 'warning',
  draft: 'neutral',
  archived: 'neutral',
  out_of_stock: 'warning',
  awaiting_customer: 'warning',
  escalated: 'danger',
  rejected: 'danger',
  suspended: 'danger',
  cancelled: 'danger',
  disputed: 'danger',
  returned: 'danger',
  payment_failed: 'danger',
};

export default function GlobalSearch() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const { term, entityType, groups, countsByType, total, truncated, recent, viewState, error } =
    useSelector(selectGlobalSearch);

  // The input is screen state. The committed term is store state. They are
  // different things, and conflating them is what makes a search box lag.
  const [draft, setDraft] = useState(term);

  useEffect(() => {
    const timer = setTimeout(() => dispatch(setSearchTerm(draft.trim())), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [dispatch, draft]);

  useEffect(() => {
    if (term.length >= MIN_TERM_LENGTH) dispatch(runSearch());
  }, [dispatch, term, entityType]);

  // Handlers.
  const handleRecent = (value) => {
    setDraft(value);
    dispatch(setSearchTerm(value));
  };

  const handleClear = () => {
    setDraft('');
    dispatch(clearSearch());
  };

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('operations.eyebrow')}
        title={t('operations.searchTitle')}
        subtitle={t('operations.searchSubtitle')}
        meta={
          viewState === 'populated' ? (
            <StatusPill tone="info">
              {t('operations.searchResultCount', { count: total, term })}
            </StatusPill>
          ) : null
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="global-search"
          className="w-full max-w-xl"
          iconLeft={Search}
          placeholder={t('operations.searchPlaceholder')}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        {draft ? (
          <Button variant="ghost" onClick={handleClear}>
            {t('common.reset')}
          </Button>
        ) : null}
      </div>

      {viewState === 'populated' ? (
        <Tabs
          activeId={entityType}
          onChange={(next) => dispatch(setSearchEntityType(next))}
          tabs={[
            { id: 'all', label: t('operations.searchTabAll'), count: countsByType.all ?? 0 },
            ...ENTITY_TYPES.filter((type) => (countsByType[type] ?? 0) > 0).map((type) => ({
              id: type,
              label: t(`operations.group.${type}`),
              count: countsByType[type],
            })),
          ]}
        />
      ) : null}

      {viewState === 'loading' ? <SearchSkeleton /> : null}

      {viewState === 'error' ? (
        <ErrorState detail={error?.message} onRetry={() => dispatch(runSearch())} />
      ) : null}

      {/* An unasked question is not an empty result. Showing "nothing here yet"
          to somebody who has not typed anything would be a bug. */}
      {viewState === 'prompt' ? (
        <Card>
          <EmptyState
            icon={Search}
            title={t('operations.searchPromptTitle')}
            body={t('operations.searchPromptBody')}
          />
          {recent.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-charcoal-light">{t('operations.searchRecent')}</span>
              {recent.map((value) => (
                <Button key={value} size="sm" variant="ghost" onClick={() => handleRecent(value)}>
                  {value}
                </Button>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      {viewState === 'empty-filtered' || viewState === 'empty' ? (
        <Card>
          <EmptyState
            icon={Search}
            title={t('operations.searchNoMatchTitle', { term })}
            body={t('operations.searchNoMatchBody')}
            actionLabel={t('common.reset')}
            onAction={handleClear}
          />
        </Card>
      ) : null}

      {viewState === 'populated' ? (
        <>
          {truncated ? (
            <p className="text-sm text-charcoal-light">
              {t('operations.searchTruncated', { count: groups.reduce((sum, g) => sum + g.total, 0) })}
            </p>
          ) : null}

          {groups.map((group) => (
            <ResultGroup key={group.entityType} group={group} />
          ))}
        </>
      ) : null}
    </div>
  );
}

function ResultGroup({ group }) {
  return (
    <Card title={t(`operations.group.${group.entityType}`)} padded={false}>
      <ul className="divide-y divide-lightGray">
        {group.results.map((result) => (
          <ResultRow key={`${result.entityType}-${result.id}`} result={result} />
        ))}
      </ul>
    </Card>
  );
}

function ResultRow({ result }) {
  return (
    <li>
      {/* A Link so an operator can open three candidates in three tabs, which
          is how a search result list is actually used. */}
      <Link
        to={result.targetPath}
        className="flex w-full items-start gap-3 px-5 py-3 text-left transition hover:bg-lightGray"
      >
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-base font-medium text-charcoal">
            {result.title}
            {/* A private piece is visible to an admin and to nobody else. The
                marker is the difference between a listing and one that is
                deliberately off the marketplace. */}
            {result.visibility === 'private' ? (
              <Badge tone="outline">{t('operations.searchPrivate')}</Badge>
            ) : null}
          </p>
          <p className="truncate text-xs text-charcoal-light">{result.subtitle}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="flex items-center gap-2">
            {result.amount !== null ? (
              <span className="text-sm tabular-nums text-charcoal">{formatINR(result.amount)}</span>
            ) : null}
            {/* Raw vocabulary from the API, so `label` is right here -
                StatusPill humanises it into 'Pending Review'. */}
            <StatusPill
              size="sm"
              tone={STATUS_TONES[result.status] ?? 'neutral'}
              label={result.status}
            />
          </span>
          <span className="font-mono text-xs text-charcoal-lighter">{result.identifier}</span>
          {result.at ? (
            <span className="text-xs text-charcoal-lighter">{formatRelativeTime(result.at)}</span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

function SearchSkeleton({ rows = 6 }) {
  return (
    <Card padded={false}>
      <div className="divide-y divide-lightGray">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-5 py-4">
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-3 w-56 animate-pulse rounded-sm bg-lightGray-dark" />
              <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
            </div>
            <div className="h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
          </div>
        ))}
      </div>
    </Card>
  );
}
