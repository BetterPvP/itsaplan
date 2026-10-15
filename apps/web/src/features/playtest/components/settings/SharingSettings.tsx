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
import type { PlaytestConfig, SharedProvider } from '../../services/playtestApi';
import SettingsField from './SettingsField';

const FASTBIN = {
  url: 'https://paste.brauw.dev/api/documents',
  body: 'text' as const,
  responseField: 'key',
  linkTemplate: 'https://paste.brauw.dev/{value}',
};

// Where testers are asked for, and where shared logs go. Shared logs are always masked.
export default function SharingSettings({
  config,
  set,
  disabled,
}: {
  config: PlaytestConfig;
  set: (patch: Partial<PlaytestConfig>) => void;
  disabled: boolean;
}) {
  const custom = config.share.custom;
  const setCustom = (patch: Partial<typeof custom>) =>
    set({ share: { ...config.share, custom: { ...custom, ...patch } } });
  return (
    <SettingsSection
      title="Testers and logs"
      description="Where Request testers posts, and where Share log uploads."
    >
      <SettingsCard className="space-y-5 p-4">
        <SettingsField
          id="pt-discord"
          label="Discord webhook for testers"
          hint="A channel webhook URL. Without one, Request testers is off."
        >
          <Input
            id="pt-discord"
            className="max-w-xl font-mono text-xs"
            placeholder="https://discord.com/api/webhooks/…"
            value={config.testersWebhook}
            onChange={(e) => set({ testersWebhook: e.target.value })}
            disabled={disabled}
          />
        </SettingsField>
        <SettingsField
          label="Share logs with"
          hint="IP addresses, emails and secrets are hidden in every shared log."
        >
          <Select
            value={config.share.provider}
            onValueChange={(v) =>
              set({ share: { ...config.share, provider: v as SharedProvider } })
            }
            disabled={disabled}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mclogs">mclo.gs</SelectItem>
              <SelectItem value="s3">Private link, 7 days</SelectItem>
              <SelectItem value="custom">Custom service</SelectItem>
            </SelectContent>
          </Select>
        </SettingsField>
        {config.share.provider === 'custom' && (
          <div className="grid gap-4 rounded-md border p-3 sm:grid-cols-2">
            <SettingsField id="pt-c-url" label="Upload URL" hint="The log is sent with POST.">
              <Input
                id="pt-c-url"
                className="font-mono text-xs"
                value={custom.url}
                onChange={(e) => setCustom({ url: e.target.value })}
                disabled={disabled}
              />
            </SettingsField>
            <SettingsField label="Body">
              <Select
                value={custom.body}
                onValueChange={(v) => setCustom({ body: v as 'text' | 'json' })}
                disabled={disabled}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Plain text</SelectItem>
                  <SelectItem value="json">JSON {'{ content }'}</SelectItem>
                </SelectContent>
              </Select>
            </SettingsField>
            <SettingsField
              id="pt-c-field"
              label="Response field"
              hint="Where the answer holds the link or its key, e.g. url or data.key."
            >
              <Input
                id="pt-c-field"
                className="font-mono text-xs"
                value={custom.responseField}
                onChange={(e) => setCustom({ responseField: e.target.value })}
                disabled={disabled}
              />
            </SettingsField>
            <SettingsField id="pt-c-link" label="Link" hint="{value} is the response field.">
              <Input
                id="pt-c-link"
                className="font-mono text-xs"
                value={custom.linkTemplate}
                onChange={(e) => setCustom({ linkTemplate: e.target.value })}
                disabled={disabled}
              />
            </SettingsField>
            <button
              type="button"
              className="justify-self-start text-xs text-muted-foreground underline hover:text-foreground disabled:opacity-50"
              onClick={() => setCustom(FASTBIN)}
              disabled={disabled}
            >
              Fill in paste.brauw.dev
            </button>
          </div>
        )}
      </SettingsCard>
    </SettingsSection>
  );
}
