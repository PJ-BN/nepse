import { NextRequest, NextResponse } from "next/server";
import { evaluateNewsWithAgy } from "@/features/ai/agyRunner";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = req.nextUrl.searchParams;
    const forceRefresh = searchParams.get("refresh") === "true";

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
    return NextResponse.json(evaluation);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("AI news evaluation route error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
