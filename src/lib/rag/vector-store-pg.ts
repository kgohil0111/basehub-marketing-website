import { neon } from "@neondatabase/serverless";
import { cosineSimilarity, generateEmbedding } from "./embeddings";

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    url: string;
    title: string;
    chunkIndex: number;
  };
  embedding: number[];
}

// Get database connection
function getDb() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL or POSTGRES_URL environment variable is required");
  }
  return neon(databaseUrl);
}

// Initialize the database table
export async function initDatabase(): Promise<void> {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS rag_documents (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      embedding TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  console.log("PostgreSQL RAG table initialized");
}

export async function addDocuments(docs: DocumentChunk[]): Promise<void> {
  if (docs.length === 0) return;

  const sql = getDb();

  // Insert in batches
  for (const doc of docs) {
    await sql`
      INSERT INTO rag_documents (id, content, url, title, chunk_index, embedding)
      VALUES (
        ${doc.id},
        ${doc.content},
        ${doc.metadata.url},
        ${doc.metadata.title},
        ${doc.metadata.chunkIndex},
        ${JSON.stringify(doc.embedding)}
      )
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        embedding = EXCLUDED.embedding
    `;
  }
  console.log(`Added ${docs.length} documents to PostgreSQL`);
}

export async function clearDocuments(): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM rag_documents`;
  console.log("Cleared all documents from PostgreSQL");
}

export async function getDocumentCount(): Promise<number> {
  const sql = getDb();
  const result = await sql`SELECT COUNT(*) as count FROM rag_documents`;
  return parseInt(result[0]?.count || "0", 10);
}

export async function searchSimilarDocuments(
  query: string,
  topK: number = 5,
  similarityThreshold: number = 0.05,
): Promise<Array<DocumentChunk & { similarity: number }>> {
  const sql = getDb();

  // Get all documents (for small datasets, this is fine)
  const rows = await sql`SELECT * FROM rag_documents`;

  if (rows.length === 0) {
    return [];
  }

  const queryEmbedding = await generateEmbedding(query);
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

  const results = rows
    .map((row) => {
      const embedding = JSON.parse(row.embedding as string) as number[];
      const embeddingSimilarity = cosineSimilarity(queryEmbedding, embedding);

      // Keyword boost for better matching
      const contentLower = (row.content as string).toLowerCase();
      let keywordBoost = 0;
      for (const word of queryWords) {
        if (contentLower.includes(word)) {
          keywordBoost += 0.1;
        }
        // Check for partial matches (e.g., "price" matches "pricing")
        const variations = [word, word + "s", word + "ing", word + "ed", word.slice(0, -1)];
        for (const variant of variations) {
          if (variant.length > 2 && contentLower.includes(variant)) {
            keywordBoost += 0.05;
          }
        }
      }

      return {
        id: row.id as string,
        content: row.content as string,
        metadata: {
          url: row.url as string,
          title: row.title as string,
          chunkIndex: row.chunk_index as number,
        },
        embedding,
        similarity: embeddingSimilarity + Math.min(keywordBoost, 0.3),
      };
    })
    .filter((doc) => doc.similarity >= similarityThreshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return results;
}

export function exportDocuments(): DocumentChunk[] {
  console.warn("exportDocuments not supported for PostgreSQL store");
  return [];
}

export function importDocuments(docs: DocumentChunk[]): void {
  void docs;
  console.warn("Use addDocuments instead for PostgreSQL store");
}
