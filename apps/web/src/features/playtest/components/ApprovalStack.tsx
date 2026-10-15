import Avatar from '@/components/common/Avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Review } from '../services/playtestApi';

// The current build's reviewers as overlapping avatars, and how many of the required
// approvals it has. A request for changes shows with a red ring.
export default function ApprovalStack({
  reviews,
  approved,
  required,
  className,
}: {
  reviews: Review[];
  approved: number;
  required: number;
  className?: string;
}) {
  const met = approved >= required;
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {reviews.length > 0 && (
        <div className="flex -space-x-1.5">
          {reviews.slice(0, 6).map((r) => (
            <Tooltip key={r.userId}>
              <TooltipTrigger asChild>
                <Avatar
                  name={r.name}
                  image={r.image}
                  className={cn(
                    'size-5 ring-2',
                    r.verdict === 'approved' ? 'ring-background' : 'ring-red-500',
                  )}
                />
              </TooltipTrigger>
              <TooltipContent>
                {r.name}: {r.verdict === 'approved' ? 'approved' : 'requested changes'}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}
      <span
        className={cn(
          'text-xs tabular-nums',
          met ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground',
        )}
      >
        {approved} of {required} approved
      </span>
    </div>
  );
}
