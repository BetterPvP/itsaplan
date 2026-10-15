import { Check, MessageSquareWarning } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import { cn } from '@/lib/utils';
import type { Review } from '../../services/playtestApi';
import { shortCommit } from '../../utils/format';

// Who approved or asked for changes, newest build first. Reviews of an older build
// stay visible, greyed out, and do not count.
export default function ReviewsPanel({
  reviews,
  commit,
  approved,
  required,
}: {
  reviews: Review[];
  commit: string | null;
  approved: number;
  required: number;
}) {
  const sorted = [...reviews].sort(
    (a, b) => Number(b.commit === commit) - Number(a.commit === commit) || b.ts - a.ts,
  );
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Reviews
        </h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {approved} of {required} approved
        </span>
      </div>
      {sorted.length === 0 && <p className="text-xs text-muted-foreground">No reviews yet.</p>}
      {sorted.map((r) => {
        const old = r.commit !== commit;
        return (
          <div
            key={`${r.userId}-${r.commit}`}
            className={cn('flex items-center gap-2 text-sm', old && 'opacity-45')}
            title={old ? `On an older build (${shortCommit(r.commit)})` : undefined}
          >
            <Avatar name={r.name} image={r.image} className="size-6 text-[10px]" />
            <span className="min-w-0 flex-1 truncate">{r.name}</span>
            {r.verdict === 'approved' ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                <Check className="size-3.5" /> Approved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                <MessageSquareWarning className="size-3.5" /> Changes
              </span>
            )}
            {old && (
              <span className="font-mono text-[10px] text-muted-foreground">
                {shortCommit(r.commit)}
              </span>
            )}
          </div>
        );
      })}
    </section>
  );
}
