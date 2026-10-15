import { usePathname } from 'next/navigation';
import { FlaskConical } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import SidebarNavItem from '@/components/layout/SidebarNavItem';
import { isLive, useProjectPlaytests } from './hooks/useProjectPlaytests';
import { playtestsPath } from './utils/paths';

// The project sidebar's Playtests entry, counting the servers that are up.
export default function PlaytestsNavItem({
  projectKey,
  disabled,
}: {
  projectKey: string | null;
  disabled?: boolean;
}) {
  const pathname = usePathname();
  const { can } = usePermissions();
  const allowed = can('playtests', 'read');
  const { data } = useProjectPlaytests(allowed ? projectKey : null);
  if (!allowed) return null;
  return (
    <SidebarNavItem
      href={projectKey ? playtestsPath(projectKey) : '#'}
      icon={FlaskConical}
      label="Playtests"
      active={pathname.includes('/playtests')}
      disabled={disabled ?? false}
      badge={data?.playtests.filter(isLive).length}
    />
  );
}
