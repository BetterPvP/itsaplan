import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PlaytestFilter = 'all' | 'needs-testers';
export type PlaytestLayout = 'cards' | 'list';

// The filter (all, or the live servers still short of approvals) and the layout.
export default function PlaytestsToolbar({
  filter,
  onFilter,
  layout,
  onLayout,
  needsTesters,
}: {
  filter: PlaytestFilter;
  onFilter: (f: PlaytestFilter) => void;
  layout: PlaytestLayout;
  onLayout: (l: PlaytestLayout) => void;
  needsTesters: number;
}) {
  const tab = (value: PlaytestFilter, label: string) => (
    <button
      type="button"
      onClick={() => onFilter(value)}
      className={cn(
        'rounded-md px-2.5 py-1 text-xs',
        filter === value
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex gap-1">
        {tab('all', 'All')}
        {tab('needs-testers', `Needs testers${needsTesters ? ` · ${needsTesters}` : ''}`)}
      </div>
      <div className="flex gap-0.5">
        <Button
          variant={layout === 'cards' ? 'secondary' : 'ghost'}
          size="icon"
          className="size-7"
          aria-label="Show as cards"
          onClick={() => onLayout('cards')}
        >
          <LayoutGrid className="size-3.5" />
        </Button>
        <Button
          variant={layout === 'list' ? 'secondary' : 'ghost'}
          size="icon"
          className="size-7"
          aria-label="Show as a list"
          onClick={() => onLayout('list')}
        >
          <List className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
