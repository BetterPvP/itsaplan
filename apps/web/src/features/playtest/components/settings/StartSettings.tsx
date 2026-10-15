import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import SettingsCard from '@/components/common/page/SettingsCard';
import SettingsSection from '@/components/common/page/SettingsSection';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PlaytestConfig } from '../../services/playtestApi';
import SettingsField from './SettingsField';

const NONE = 'none';

// When playtests start, how many may run at once, and how many approvals a build needs.
export default function StartSettings({
  project,
  config,
  set,
  disabled,
}: {
  project: ProjectDetail;
  config: PlaytestConfig;
  set: (patch: Partial<PlaytestConfig>) => void;
  disabled: boolean;
}) {
  return (
    <SettingsSection
      title="Starting playtests"
      description="What starts a server and how many may run."
    >
      <SettingsCard className="space-y-5 p-4">
        <SettingsField
          label="Start a playtest when an issue enters"
          hint="The issue needs a branch or pull request linked in BetterPvP/BetterPvP, and the person who moves it needs the permission to start playtests. A completed or canceled column ends the server."
        >
          <Select
            value={config.autoStartColumnId == null ? NONE : String(config.autoStartColumnId)}
            onValueChange={(v) => set({ autoStartColumnId: v === NONE ? null : Number(v) })}
            disabled={disabled}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No column, start by hand</SelectItem>
              {project.columns.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsField>
        <SettingsField
          id="pt-concurrent"
          label="Servers at once"
          hint="Empty means no limit. A playtest started beyond the limit waits and starts when another one ends."
        >
          <Input
            id="pt-concurrent"
            type="number"
            min={1}
            max={50}
            className="w-28"
            value={config.maxConcurrent ?? ''}
            onChange={(e) =>
              set({ maxConcurrent: e.target.value === '' ? null : Number(e.target.value) })
            }
            disabled={disabled}
          />
        </SettingsField>
        <SettingsField
          id="pt-approvals"
          label="Approvals a build needs"
          hint="Shown on the cards, the playtest page and the issue. A redeploy starts the count again."
        >
          <Input
            id="pt-approvals"
            type="number"
            min={0}
            max={20}
            className="w-28"
            value={config.requiredApprovals}
            onChange={(e) => set({ requiredApprovals: Number(e.target.value) })}
            disabled={disabled}
          />
        </SettingsField>
      </SettingsCard>
    </SettingsSection>
  );
}
