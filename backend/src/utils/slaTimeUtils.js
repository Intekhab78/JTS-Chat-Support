/**
 * Computes elapsed hours between startDate and endDate.
 * When businessHoursOnly is true, only counts Mon-Fri 09:00-18:00 (9h/day).
 */
export function computeElapsedSlaHours(startDate, endDate = new Date(), businessHoursOnly = false) {
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }

  if (!businessHoursOnly) {
    return (endMs - startMs) / 3600000;
  }

  const WORK_START_HR = 9;
  const WORK_END_HR = 18;
  const cursor = new Date(startMs);
  cursor.setHours(0, 0, 0, 0);

  const endDay = new Date(endMs);
  endDay.setHours(0, 0, 0, 0);

  let totalMs = 0;
  while (cursor.getTime() <= endDay.getTime()) {
    const day = cursor.getDay(); // 0 = Sun, 6 = Sat
    if (day >= 1 && day <= 5) {
      const workStart = new Date(cursor);
      workStart.setHours(WORK_START_HR, 0, 0, 0);
      const workEnd = new Date(cursor);
      workEnd.setHours(WORK_END_HR, 0, 0, 0);

      const overlapStart = Math.max(startMs, workStart.getTime());
      const overlapEnd = Math.min(endMs, workEnd.getTime());
      if (overlapEnd > overlapStart) {
        totalMs += overlapEnd - overlapStart;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return totalMs / 3600000;
}

