import { describe, it, expect } from 'vitest';
import { pageTitle } from './pageTitle';

describe('pageTitle', () => {
  it('names the algorithm on its page', () => {
    expect(pageTitle('/algorithms/bubble-sort')).toBe('Bubble Sort · Algorithm Studio');
  });

  it('says when an algorithm does not exist', () => {
    expect(pageTitle('/algorithms/nope')).toBe('Algorithm not found · Algorithm Studio');
  });

  it('titles the other pages', () => {
    expect(pageTitle('/dashboard')).toBe('Dashboard · Algorithm Studio');
    expect(pageTitle('/login')).toBe('Sign in · Algorithm Studio');
    expect(pageTitle('/register')).toBe('Create account · Algorithm Studio');
  });

  it('describes the site on the catalog and unknown routes', () => {
    expect(pageTitle('/')).toBe('Algorithm Studio · Interactive Algorithm Visualizer');
    expect(pageTitle('/somewhere')).toBe('Algorithm Studio · Interactive Algorithm Visualizer');
  });
});
