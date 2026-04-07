import { NextResponse } from "next/server";
import { getCanvasList } from "@/lib/braze";
import { getFromCache, setInCache } from "@/lib/cache";
import type {
  CanvasAuditListResponse,
  CanvasAuditListItem,
  CanvasAuditResult,
} from "@/types/canvas-audit";

export const dynamic = "force-dynamic";

const CACHE_KEY = "canvas_audit_list";

export async function GET() {
  const cached = getFromCache<CanvasAuditListResponse>(CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  try {
    const canvases = await getCanvasList(0);

    const items: CanvasAuditListItem[] = canvases.map((c) => {
      // Check if we have a cached audit for this canvas
      const auditCache = getFromCache<CanvasAuditResult>(
        `canvas_audit_${c.id}`
      );
      return {
        id: c.id,
        name: c.name,
        tags: c.tags ?? [],
        lastEdited: c.last_edited,
        healthScore: auditCache?.healthScore ?? -1,
      };
    });

    const response: CanvasAuditListResponse = {
      canvases: items,
      fetchedAt: new Date().toISOString(),
    };

    setInCache(CACHE_KEY, response);

    return NextResponse.json(response, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
