import Link from 'next/link';
import { Server } from 'lucide-react';
import type { IssueDetail } from '@/lib/api/endpoints/issues';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import { useSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { buildIssueBranchName } from '@/utils/branchName';
import { issuePath } from '@/utils/paths';
import AgentPromptCard from './components/issue/AgentPromptCard';
import ApprovalStack from './components/ApprovalStack';
import { usePlaytest } from './hooks/usePlaytest';
import { buildAgentPrompt } from './utils/agentPrompt';
import { playtestPath } from './utils/paths';

const REPOSITORY = 'BetterPvP/BetterPvP';
const BASE_BRANCH = 'camps/main';

// The top of the issue panel: the prompt for an AI agent and, once the issue has a
// branch in the playtest repository, its playtest's approvals with a link to the
// playtest page, where everything else about the server lives.
export default function PlaytestSection({
  issue,
  project,
}: {
  issue: IssueDetail;
  project: ProjectDetail;
}) {
  const { data: session } = useSession();
  const { data } = usePlaytest(issue.id, false);
  const ref = project.project.ref;
  const p = data?.playtest;

  const prompt = () =>
    buildAgentPrompt({
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description,
      issueUrl: `${window.location.origin}${issuePath(ref, issue.sequenceNumber)}`,
      playtestUrl: `${window.location.origin}${playtestPath(ref, issue.identifier)}`,
      branch: buildIssueBranchName(issue, session?.user, project.branchNameTemplate),
      baseBranch: BASE_BRANCH,
      repository: REPOSITORY,
      columns: project.columns,
      startColumnId: data?.settings?.autoStartColumnId ?? null,
      worldChangeLabel: data?.settings?.worldChangeLabel ?? 'World change',
    });

  return (
    <div className="mb-5 space-y-3 border-b pb-4">
      {data?.configured && data.eligible && data.permissions.view && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Playtest
            </span>
            {p && (
              <ApprovalStack
                reviews={p.reviews}
                approved={p.approved}
                required={p.requiredApprovals}
              />
            )}
          </div>
          <Button asChild size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
            <Link href={playtestPath(ref, issue.identifier)}>
              <Server className="size-3.5" /> Open server
            </Link>
          </Button>
        </div>
      )}
      <AgentPromptCard prompt={prompt} />
    </div>
  );
}
