export async function withinDeadline<T>(pending: Promise<T>, durationMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([pending, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Host shutdown timed out; cleanup continues without force-closing storage.")), durationMs);
    })]);
  } finally { clearTimeout(timer); }
}
