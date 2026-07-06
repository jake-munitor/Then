import fs from 'fs';
import path from 'path';

import { PHOTO_FILTER_VALUES } from '../../src/utils/photoFilters';

/**
 * Guards the client<->rules contract that broke in June 2026: the client
 * renamed a photo filter ('classic' -> 'film') but the deployed Firestore
 * rules still only allowed the old names, so every default-filter post was
 * rejected with "Missing or insufficient permissions". This test fails the
 * moment a client filter value is not in the rules allowlist, so the drift
 * is caught before it ships. (Deploying the rules is still a manual step -
 * see DEPLOYMENT.md.)
 */
describe('photo filter contract', () => {
  it('every client filter value is allowed by firestore.rules', () => {
    const rules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8');
    const match = rules.match(/photoFilter in \[([^\]]+)\]/);
    expect(match).not.toBeNull();

    const allowed = match![1]
      .split(',')
      .map((value) => value.trim().replace(/^'|'$/g, ''));

    for (const value of PHOTO_FILTER_VALUES) {
      expect(allowed).toContain(value);
    }
  });
});
