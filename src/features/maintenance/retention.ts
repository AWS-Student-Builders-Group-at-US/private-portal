const HOUR_MS = 60 * 60 * 1000;

/** Rows created before this instant are past their retention window. */
export function retentionCutoff(now: Date, hours = 24): Date {
  return new Date(now.getTime() - hours * HOUR_MS);
}

/**
 * Waits for every task, but no longer than `budgetMs`. Rejected tasks and tasks
 * still pending at the deadline count as failed. Never throws.
 */
export async function settleWithin(
  tasks: Promise<unknown>[],
  budgetMs: number,
): Promise<{ fulfilled: number; failed: number }> {
  let fulfilled = 0;
  const tracked = tasks.map((task) =>
    task.then(
      () => {
        fulfilled++;
      },
      () => {},
    ),
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, budgetMs);
  });
  await Promise.race([Promise.allSettled(tracked), deadline]);
  clearTimeout(timer);
  return { fulfilled, failed: tasks.length - fulfilled };
}
