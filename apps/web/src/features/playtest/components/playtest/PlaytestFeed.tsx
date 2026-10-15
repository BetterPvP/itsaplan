import { useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { cn } from '@/lib/utils';
import type { FeedEntry } from '../../services/playtestApi';
import { formatTime } from '../../utils/labels';

const SHOWN = 5;

const render = (message: string) =>
  DOMPurify.sanitize(marked.parseInline(message, { async: false }), { ADD_ATTR: ['target'] });

// What the playtest reported, newest last: stages, who did what, failures.
export default function PlaytestFeed({ feed }: { feed: FeedEntry[] }) {
  const [all, setAll] = useState(false);
  if (feed.length === 0) return null;
  const shown = all ? feed : feed.slice(-SHOWN);

  return (
    <div className="space-y-1">
      {feed.length > SHOWN && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setAll((v) => !v)}
        >
          {all ? 'Show fewer' : `Show all ${feed.length}`}
        </button>
      )}
      {shown.map((f) => (
        <div key={f.id} className="flex gap-2 text-xs">
          <span className="shrink-0 text-muted-foreground tabular-nums">{formatTime(f.ts)}</span>
          <span
            className={cn('[&_a]:underline', f.failed && 'text-red-600 dark:text-red-400')}
            dangerouslySetInnerHTML={{ __html: render(f.message) }}
          />
        </div>
      ))}
    </div>
  );
}
