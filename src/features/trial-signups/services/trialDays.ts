const dayMs = 24 * 60 * 60 * 1000;

/** Whole days left before the trial ends, counting a partial day as one; 0 once it ended. */
export function trialDaysLeft(trialEndsAtUtc: string, now = new Date()) {
  const remaining = new Date(trialEndsAtUtc).getTime() - now.getTime();
  return remaining > 0 ? Math.ceil(remaining / dayMs) : 0;
}

export function trialDaysLeftLabel(days: number) {
  if (days <= 0) return "Tu prueba gratuita terminó.";
  if (days === 1) return "Te queda 1 día de prueba gratuita.";
  return `Te quedan ${days} días de prueba gratuita.`;
}
