import { cn } from '@/utils/cn';
import Badge from './Badge';

// Controlled. tabs: [{ id, label, count }]
export default function Tabs({ tabs = [], activeId, onChange, className }) {
  return (
    <div className={cn('border-b border-border', className)}>
      <nav role="tablist" className="-mb-px flex gap-6 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange?.(tab.id)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 pt-1 font-body text-body transition-colors duration-state ease-standard',
                'focus:outline-none focus-visible:shadow-focus',
                isActive
                  ? 'border-primary font-bold text-link'
                  : 'border-transparent text-charcoal-light hover:text-charcoal',
              )}
            >
              {tab.label}
              {tab.count !== undefined ? (
                <Badge tone={isActive ? 'accent' : 'neutral'}>{tab.count}</Badge>
              ) : null}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
