import { createHash } from "node:crypto";

export async function fetchSource(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "MesitaVirtual-Cronopios/1.0 (+https://www2.fba.unlp.edu.ar/)" }
    });
    if (!response.ok) throw new Error(`La fuente respondió HTTP ${response.status}.`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > 15 * 1024 * 1024) throw new Error("La fuente excede el tamaño máximo permitido.");
    return { buffer, checksum: createHash("sha256").update(buffer).digest("hex") };
  } finally { clearTimeout(timeout); }
}
