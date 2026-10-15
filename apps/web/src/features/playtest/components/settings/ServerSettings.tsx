import SettingsCard from '@/components/common/page/SettingsCard';
import SettingsSection from '@/components/common/page/SettingsSection';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { PlaytestConfig } from '../../services/playtestApi';
import SettingsField from './SettingsField';

const lines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

// What every server applies: operators, editable files, when it shuts itself down,
// and the label that saves it as the base.
export default function ServerSettings({
  config,
  set,
  disabled,
}: {
  config: PlaytestConfig;
  set: (patch: Partial<PlaytestConfig>) => void;
  disabled: boolean;
}) {
  const number = (key: keyof PlaytestConfig, id: string, min: number, max: number, step = 1) => (
    <Input
      id={id}
      type="number"
      min={min}
      max={max}
      step={step}
      className="w-28"
      value={config[key] as number}
      onChange={(e) => set({ [key]: Number(e.target.value) })}
      disabled={disabled}
    />
  );
  return (
    <SettingsSection title="Servers" description="Applied by every playtest server of the project.">
      <SettingsCard className="space-y-5 p-4">
        <SettingsField
          id="pt-ops"
          label="Default operators"
          hint="Minecraft names, one per line. They are made op when a server is ready."
        >
          <Textarea
            id="pt-ops"
            rows={3}
            className="max-w-sm font-mono text-xs"
            defaultValue={config.defaultOps.join('\n')}
            onBlur={(e) => set({ defaultOps: lines(e.target.value) })}
            disabled={disabled}
          />
        </SettingsField>
        <SettingsField
          id="pt-patterns"
          label="Editable files"
          hint="Glob patterns relative to the server folder, one per line, such as plugins/*/config.yml."
        >
          <Textarea
            id="pt-patterns"
            rows={5}
            className="max-w-xl font-mono text-xs"
            defaultValue={config.filePatterns.join('\n')}
            onBlur={(e) => set({ filePatterns: lines(e.target.value) })}
            disabled={disabled}
          />
        </SettingsField>
        <div className="grid gap-5 sm:grid-cols-3">
          <SettingsField id="pt-nojoin" label="Shut down if nobody joins (min)">
            {number('idleNoJoinMinutes', 'pt-nojoin', 5, 720)}
          </SettingsField>
          <SettingsField id="pt-empty" label="Shut down when empty (min)">
            {number('idleEmptyMinutes', 'pt-empty', 5, 720)}
          </SettingsField>
          <SettingsField id="pt-life" label="Longest a server runs (h)">
            {number('maxLifetimeHours', 'pt-life', 1, 24)}
          </SettingsField>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <SettingsField
            id="pt-label"
            label="Save-as-base label"
            hint="An issue with this label saves its server as the base when it moves to a completed column."
          >
            <Input
              id="pt-label"
              className="max-w-xs"
              value={config.worldChangeLabel}
              onChange={(e) => set({ worldChangeLabel: e.target.value })}
              disabled={disabled}
            />
          </SettingsField>
          <SettingsField
            id="pt-price"
            label="On-demand price per hour (USD)"
            hint="For the cost of a server that got no spot capacity. Spot prices are read from AWS."
          >
            {number('onDemandHourlyPrice', 'pt-price', 0, 100, 0.0001)}
          </SettingsField>
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}
