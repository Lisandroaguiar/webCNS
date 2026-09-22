import "server-only";

export async function measureServerStep<T>(name: string, operation: () => PromiseLike<T>): Promise<T> {
  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    if (process.env.PERF_LOG === "1") {
      console.info(JSON.stringify({ event: "server_timing", name, duration_ms: Math.round((performance.now() - startedAt) * 10) / 10 }));
    }
  }
}
