import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// A server address with a button that copies it.
export default function CopyAddress({
  address,
  className,
}: {
  address: string;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="font-mono text-xs select-all">{address}</span>
      <Button
        variant="ghost"
        size="icon"
        className="size-6"
        aria-label="Copy the server address"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void navigator.clipboard.writeText(address).then(() => toast.success('Address copied'));
        }}
      >
        <Copy className="size-3" />
      </Button>
    </span>
  );
}
