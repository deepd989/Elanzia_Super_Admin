import { ResponsiveContainer } from 'recharts';
import { cn } from '@/utils/cn';
import { THEME } from '@/theme/tokens';
import Card from './primitives/Card';
import Spinner from './primitives/Spinner';
import EmptyState from './primitives/EmptyState';
import ErrorState from './primitives/ErrorState';

// A thin Recharts wrapper: card chrome, a fixed height, and the four states.
// The screen passes the actual chart as children and reads colours from
// chartColors so no hex ever reaches a screen file.
//
//   <ChartCard title="GMV by month" status={status} onRetry={reload}>
//     <BarChart data={data}>
//       <Bar dataKey="gmv" fill={chartColors[0]} />
//     </BarChart>
//   </ChartCard>
export const chartColors = THEME.chartSeries;

// Recharts axis and grid styling, spread onto the elements by the screen so
// every chart in the portal shares one look.
export const chartAxisProps = {
  stroke: THEME.colors.charcoal.lighter,
  tick: { fill: THEME.colors.charcoal.light, fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: THEME.colors.lightGray.dark },
};

export const chartGridProps = {
  stroke: THEME.colors.lightGray.dark,
  strokeDasharray: '3 3',
  vertical: false,
};

export const chartTooltipProps = {
  contentStyle: {
    borderRadius: THEME.radii.DEFAULT,
    border: `1px solid ${THEME.colors.lightGray.dark}`,
    boxShadow: THEME.shadows.md,
    fontFamily: THEME.fonts.body.join(', '),
    fontSize: 13,
  },
  cursor: { fill: THEME.colors.lightGray.DEFAULT },
};

export default function ChartCard({
  title,
  description,
  action,
  height = 280,
  status = 'succeeded',
  onRetry,
  emptyBody,
  legend,
  className,
  children,
}) {
  return (
    <Card title={title} description={description} action={action} className={className}>
      <div style={{ height }}>
        {status === 'loading' ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : status === 'failed' ? (
          <ErrorState onRetry={onRetry} className="py-0 h-full justify-center" />
        ) : status === 'empty' ? (
          <EmptyState body={emptyBody} className="py-0 h-full justify-center" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        )}
      </div>

      {legend && status === 'succeeded' ? (
        <div className={cn('mt-4 flex flex-wrap gap-4 border-t border-lightGray pt-3')}>
          {legend.map((entry) => (
            <span key={entry.label} className="flex items-center gap-2 text-sm text-charcoal-light">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              {entry.label}
            </span>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
