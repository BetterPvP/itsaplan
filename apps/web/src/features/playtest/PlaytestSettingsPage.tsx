'use client';

import { useShell } from '@/context/shellContext';
import { useSettingsSectionText } from '@/hooks/useSectionLabels';
import SectionPageView from '@/components/common/page/SectionPageView';
import RequirePermission from '@/components/common/permissions/RequirePermission';
import PlaytestSettings from './components/PlaytestSettings';

// The project's playtest settings (/:team/:projectKey/settings/playtest).
export default function PlaytestSettingsPage() {
  const sectionText = useSettingsSectionText()('playtest');
  const { project } = useShell();
  if (!project) return null;
  return (
    <SectionPageView title={sectionText.label} description={sectionText.description}>
      <RequirePermission resource="repositories" action="edit">
        <PlaytestSettings project={project} />
      </RequirePermission>
    </SectionPageView>
  );
}
