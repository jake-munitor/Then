import { computeReminderSlots } from '../../src/services/postingReminders';

describe('computeReminderSlots', () => {
  it('schedules two slots per day for a week when nothing was posted', () => {
    const now = new Date(2026, 6, 15, 8, 0); // 8:00am, before both slots
    const slots = computeReminderSlots(now, false);

    expect(slots).toHaveLength(14);
    expect(slots[0].date.getHours()).toBe(11);
    expect(slots[0].date.getMinutes()).toBe(30);
    expect(slots[1].date.getHours()).toBe(19);
    expect(slots.every(({ date }) => date > now)).toBe(true);
  });

  it('skips slots already in the past today', () => {
    const now = new Date(2026, 6, 15, 12, 0); // noon: 11:30 already passed
    const slots = computeReminderSlots(now, false);

    expect(slots).toHaveLength(13);
    expect(slots[0].date.getHours()).toBe(19);
    expect(slots[0].date.getDate()).toBe(15);
  });

  it('silences the rest of today after the user posts', () => {
    const now = new Date(2026, 6, 15, 12, 0);
    const slots = computeReminderSlots(now, true);

    expect(slots).toHaveLength(12);
    expect(slots[0].date.getDate()).toBe(16); // first nudge is tomorrow
  });

  it('uses invitation copy, never streak language', () => {
    const slots = computeReminderSlots(new Date(2026, 6, 15, 8, 0), false);
    for (const { title, body } of slots) {
      expect(`${title} ${body}`).not.toMatch(/streak|don't break|missed|miss out/i);
    }
  });
});
