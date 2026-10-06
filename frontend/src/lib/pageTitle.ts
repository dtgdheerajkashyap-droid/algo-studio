/**
 * Browser-tab titles per route: "Bubble Sort · Algorithm Studio", so tabs,
 * bookmarks and browser history say which page they are.
 */

import { matchPath } from 'react-router-dom';
import { getAlgorithm } from '../engine/registry';

export const SITE_NAME = 'Algorithm Studio';
const HOME_TITLE = `${SITE_NAME} · Interactive Algorithm Visualizer`;

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/login': 'Sign in',
  '/register': 'Create account',
};

export function pageTitle(pathname: string): string {
  const algorithm = matchPath('/algorithms/:id', pathname);
  const page = algorithm
    ? (getAlgorithm(algorithm.params.id ?? '')?.name ?? 'Algorithm not found')
    : PAGE_TITLES[pathname];
  return page ? `${page} · ${SITE_NAME}` : HOME_TITLE;
}
