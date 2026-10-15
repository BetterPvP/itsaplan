import { useState } from 'react';
import { Bot, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

// Copies the prompt that lets an AI agent take the issue through the board.
export default function AgentPromptCard({ prompt }: { prompt: () => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
      <Bot className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">Agent prompt</div>
        <div className="text-xs text-muted-foreground">
          The issue, its branch, the pull request and the playtest steps, for an AI agent.
        </div>
      </div>
      <Button
        size="sm"
        className="gap-1.5"
        onClick={() =>
          void navigator.clipboard.writeText(prompt()).then(() => {
            setCopied(true);
            toast.success('Agent prompt copied');
            setTimeout(() => setCopied(false), 1500);
          })
        }
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        Copy agent prompt
      </Button>
    </div>
  );
}
