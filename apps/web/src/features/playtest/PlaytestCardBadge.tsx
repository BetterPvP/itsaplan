import StagePill from './components/StagePill';
import { useProjectPlaytests } from './hooks/useProjectPlaytests';

// The playtest stage at the top right of a board card, while the issue has a playtest
// that has not ended. Every card of a board reads the same project query.
export default function PlaytestCardBadge({ identifier }: { identifier: string }) {
  const { data } = useProjectPlaytests(identifier.replace(/-\d+$/, ''));
  const playtest = data?.playtests.find((p) => p.issue === identifier);
  if (!playtest || (playtest.stage === 'ended' && !playtest.failed)) return null;
  return (
    <StagePill
      stage={playtest.stage}
      failed={playtest.failed}
      waiting={playtest.waiting}
      className="float-right ms-1.5 gap-1 px-1.5 py-px text-[10px]"
    />
  );
}
