import { join } from "path";

const DIST_DIR = join(import.meta.dir, "../../../client/dist");

export async function serveStatic(url: URL): Promise<Response> {
  const filePath = join(DIST_DIR, url.pathname === "/" ? "index.html" : url.pathname);

  const file = Bun.file(filePath);
  if (await file.exists()) {
    return new Response(file);
  }

  // SPA fallback: serve index.html for unmatched paths
  const index = Bun.file(join(DIST_DIR, "index.html"));
  if (await index.exists()) {
    return new Response(index);
  }

  return new Response(
    JSON.stringify({ error: "Client not built. Run 'bun run client:build' first." }),
    { status: 404, headers: { "Content-Type": "application/json" } },
  );
}
