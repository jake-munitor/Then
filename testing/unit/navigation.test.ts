import fs from 'fs';
import path from 'path';

import { goBackOrHome } from '../../src/utils/navigation';

const SCREENS_DIR = path.resolve(__dirname, '../../src/screens');

describe('goBackOrHome', () => {
  it('goes back when there is history', () => {
    const navigation = { canGoBack: () => true, goBack: jest.fn(), replace: jest.fn() };
    goBackOrHome(navigation);
    expect(navigation.goBack).toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('falls back to the tabs when the screen is the only stack entry', () => {
    const navigation = { canGoBack: () => false, goBack: jest.fn(), replace: jest.fn() };
    goBackOrHome(navigation);
    expect(navigation.replace).toHaveBeenCalledWith('MainTabs');
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  /**
   * Guards a bug class that shipped twice. A notification tap builds a stack
   * containing only the linked screen (LinkedMoment replace()s itself with
   * MomentDetail or Notes), so a bare navigation.goBack() is a silent no-op and
   * the user is trapped on the screen with no way out - reported from the field
   * on 2026-08-13 against MomentDetail, whose header called goBack() directly
   * even though that same file already imported the helper.
   *
   * Every screen must route "close" through goBackOrHome, which degrades to
   * goBack() whenever history exists.
   */
  it('is used by every screen instead of a bare navigation.goBack()', () => {
    const offenders: string[] = [];
    for (const file of fs.readdirSync(SCREENS_DIR)) {
      if (!file.endsWith('.tsx')) continue;
      const source = fs.readFileSync(path.join(SCREENS_DIR, file), 'utf8');
      source.split('\n').forEach((line, index) => {
        if (line.includes('navigation.goBack()')) offenders.push(`${file}:${index + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
