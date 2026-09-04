import React from 'react';
import { DatasetProfile } from '../../types/dataset';
import { AnalyticsWorkspace } from '../analytics/AnalyticsWorkspace';

interface DatasetAnalyticsExplorerProps {
  profile: DatasetProfile;
  onBack?: () => void;
}

export function DatasetAnalyticsExplorer({ profile, onBack }: DatasetAnalyticsExplorerProps) {
  return <AnalyticsWorkspace profile={profile} onBack={onBack} />;
}
