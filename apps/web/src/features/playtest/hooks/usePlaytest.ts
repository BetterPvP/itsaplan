import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  playtestApi,
  playtestKeys,
  type FeedEntry,
  type LogLine,
  type Playtest,
  type PlaytestState,
} from '../services/playtestApi';

const MAX_LOG_LINES = 5000;

// An issue's playtest, kept current by the event stream while the section is open.
export function usePlaytest(issueId: number, enabled: boolean) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: playtestKeys.issue(issueId),
    queryFn: () => playtestApi.get(issueId),
    enabled,
  });
  const [log, setLog] = useState<LogLine[]>([]);
  const lastSeq = useRef(0);
  const live = enabled && !!query.data?.eligible && !!query.data.configured;

  useEffect(() => {
    if (!live) return;
    const abort = new AbortController();
    let retry = 1000;

    const apply = (event: string, data: unknown) => {
      if (event === 'state') {
        qc.setQueryData<Playtest>(playtestKeys.issue(issueId), (old) =>
          old ? { ...old, playtest: data as PlaytestState | null } : old,
        );
        // A new server starts a new log.
        if ((data as PlaytestState | null)?.stage === 'launch') {
          lastSeq.current = 0;
          setLog([]);
        }
      } else if (event === 'feed') {
        qc.setQueryData<Playtest>(playtestKeys.issue(issueId), (old) =>
          old && !old.feed.some((f) => f.id === (data as FeedEntry).id)
            ? { ...old, feed: [...old.feed, data as FeedEntry] }
            : old,
        );
      } else if (event === 'log') {
        const lines = (data as LogLine[]).filter((l) => l.seq > lastSeq.current);
        if (!lines.length) return;
        lastSeq.current = lines[lines.length - 1].seq;
        setLog((old) => [...old, ...lines].slice(-MAX_LOG_LINES));
      }
    };

    const connect = async () => {
      while (!abort.signal.aborted) {
        try {
          const res = await playtestApi.events(issueId, lastSeq.current, abort.signal);
          if (!res.ok || !res.body) throw new Error(String(res.status));
          retry = 1000;
          const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
          let buffer = '';
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += value;
            let end: number;
            while ((end = buffer.indexOf('\n\n')) >= 0) {
              const frame = buffer.slice(0, end);
              buffer = buffer.slice(end + 2);
              const event = /^event: (.*)$/m.exec(frame)?.[1];
              const data = /^data: (.*)$/m.exec(frame)?.[1];
              if (event && data) apply(event, JSON.parse(data));
            }
          }
        } catch {
          if (abort.signal.aborted) return;
        }
        await new Promise((r) => setTimeout(r, retry));
        retry = Math.min(retry * 2, 30_000);
      }
    };
    void connect();
    return () => abort.abort();
  }, [live, issueId, qc]);

  return { ...query, log };
}
