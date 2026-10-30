import { NextRequest, NextResponse } from "next/server";
import { evaluateNewsWithAgy } from "@/features/ai/agyRunner";
import { getStoredAiEvaluation, saveStoredAiEvaluation } from "@/features/ai/dbStorage";
import type { NewsAiEvaluation } from "@/features/ai/types";
import { checkAiAuth, unauthorizedAiResponse } from "../../authCheck";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAiAuth(req))) {
    return unauthorizedAiResponse();
  }

  try {
    const { id } = await params;
    const searchParams = req.nextUrl.searchParams;
    const forceRefresh = searchParams.get("refresh") === "true";

    const entityKey = String(id).trim();

    // 1. If not forcing refresh, check if we already have this saved in database
    if (!forceRefresh && entityKey) {
      const stored = await getStoredAiEvaluation<NewsAiEvaluation>("news", entityKey);
      if (stored) {
        return NextResponse.json(stored);
      }
    }

    let newsData: Record<string, unknown> = {};
    try {
      newsData = (await req.json()) as Record<string, unknown>;
    } catch {
      // Body might be empty
    }

    if (!newsData.id && id) {
      newsData.id = Number(id);
    }

    const evaluation = await evaluateNewsWithAgy(newsData, forceRefresh);

    // 2. Persist newly generated evaluation into PostgreSQL database
    if (entityKey) {
      await saveStoredAiEvaluation(
        "news",
        entityKey,
        evaluation,
        evaluation.source || "agy",
        evaluation.analyzed_at
      );
    }

    return NextResponse.json(evaluation);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("AI news evaluation route error:", error);

    try {
      const { id } = await params;
      if (id) {
        const stored = await getStoredAiEvaluation<NewsAiEvaluation>("news", String(id));
        if (stored) {
          return NextResponse.json(stored);
        }
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
