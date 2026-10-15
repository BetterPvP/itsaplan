import { projectPath } from '@/utils/paths';

export const playtestsPath = (projectRef: string) => `${projectPath(projectRef)}/playtests`;

export const playtestPath = (projectRef: string, identifier: string) =>
  `${playtestsPath(projectRef)}/${encodeURIComponent(identifier)}`;
