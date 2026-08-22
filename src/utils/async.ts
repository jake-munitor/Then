/**
 * Resolve `promise`, or `fallback` once `ms` elapses or the promise rejects.
 *
 * Launch-path primitive. Four App Review rejections in a row (2.1.0, "loading
 * indefinitely on launch") came from awaiting things that can neither resolve
 * nor reject on a restricted network - a profile snapshot, a notification
 * response lookup. Nothing on the path to the first screen may await an
 * unbounded promise.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}
