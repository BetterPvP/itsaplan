import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  playtestApi,
  playtestKeys,
  type FeedEntry,
  type IssuePlaytest,
  type LogLine,
  type Metrics,
  type PlaytestState,
  type Review,
  type PlaytestRef,
} from '../services/playtestApi';

const MAX_LOG_LINES = 8000;

// An issue's playtest or the staging server, kept current by the event stream while `live` is on. With
// `reveal` the log shows sensitive values, for someone allowed to see them.
export function usePlaytest(target: PlaytestRef | null, live: boolean, reveal = false) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: playtestKeys.issue(target ?? 0),
    queryFn: () => playtestApi.get(target!),
    enabled: target != null,
  });
  const [log, setLog] = useState<LogLine[]>([]);
  const lastSeq = useRef(0);
  const streaming = live && target != null && !!query.data?.configured && !!query.data.eligible;

  useEffect(() => {
    if (!streaming || target == null) return;
    const abort = new AbortController();
    let retry = 1000;
    lastSeq.current = 0;
    setLog([]);
    const patch = (fn: (old: IssuePlaytest) => IssuePlaytest) =>
      qc.setQueryData<IssuePlaytest>(playtestKeys.issue(target), (old) => (old ? fn(old) : old));

    const apply = (event: string, data: unknown) => {
      if (event === 'state') {
        const state = data as PlaytestState | null;
        patch((old) => ({ ...old, playtest: state }));
        if (state?.stage === 'launch') {
          lastSeq.current = 0;
          setLog([]);
        }
      } else if (event === 'feed') {
        const entry = data as FeedEntry;
        patch((old) =>
          old.feed.some((f) => f.id === entry.id) ? old : { ...old, feed: [...old.feed, entry] },
        );
      } else if (event === 'approvals') {
        patch((old) => ({ ...old, approvals: data as Review[] }));
      } else if (event === 'metrics') {
        patch((old) =>
          old.playtest ? { ...old, playtest: { ...old.playtest, metrics: data as Metrics } } : old,
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
          const res = await playtestApi.events(target, lastSeq.current, reveal, abort.signal);
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
  }, [streaming, target, reveal, qc]);

  return { ...query, log };
}
