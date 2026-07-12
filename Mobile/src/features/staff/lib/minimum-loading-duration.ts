export const STAFF_LOADING_MIN_DURATION_MS = 3000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Ensures async work stays in a loading state for at least `minimumMs`. */
export async function withMinimumLoadingDuration<T>(
  task: () => Promise<T>,
  minimumMs = STAFF_LOADING_MIN_DURATION_MS,
): Promise<T> {
  const startedAt = Date.now();
  const result = await task();
  const remaining = minimumMs - (Date.now() - startedAt);
  if (remaining > 0) {
    await sleep(remaining);
  }
  return result;
}
