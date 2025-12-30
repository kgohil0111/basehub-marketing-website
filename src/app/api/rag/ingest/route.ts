import {
  ingestWebsite,
  getDocumentCount,
  clearDocuments,
  initDatabase,
  storageType,
} from "@/lib/rag";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const maxPages = body.maxPages || 20;

    // Initialize PostgreSQL table if using postgres storage
    if (storageType === "postgres") {
      console.log("Initializing PostgreSQL database...");
      await initDatabase();
    }

    console.log(`Starting RAG ingestion with maxPages=${maxPages} (storage: ${storageType})`);
    const documentCount = await ingestWebsite(maxPages);

    return Response.json({
      success: true,
      message: `Ingested ${documentCount} document chunks`,
      documentCount,
    });
  } catch (error) {
    console.error("Ingestion error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  const count = await getDocumentCount();
  return Response.json({
    documentCount: count,
    status: count > 0 ? "ready" : "empty",
    storage: storageType,
  });
}

export async function DELETE() {
  await clearDocuments();
  return Response.json({
    success: true,
    message: "RAG index cleared",
  });
}
