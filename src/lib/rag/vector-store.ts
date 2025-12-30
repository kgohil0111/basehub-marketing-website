import { cosineSimilarity, generateEmbedding } from "./embeddings";
import { promises as fs } from "fs";
import path from "path";

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

// File path for persistence
const STORE_PATH = path.join(process.cwd(), ".rag-store.json");

// In-memory vector store
let documents: DocumentChunk[] = [];
let isLoaded = false;

// Load documents from file on startup
async function loadFromFile(): Promise<void> {
  if (isLoaded) return;
  try {
    const data = await fs.readFile(STORE_PATH, "utf-8");
    documents = JSON.parse(data);
    console.log(`Loaded ${documents.length} documents from ${STORE_PATH}`);
  } catch {
    // File doesn't exist yet, start fresh
    documents = [];
  }
  isLoaded = true;
}

// Save documents to file
async function saveToFile(): Promise<void> {
  try {
    await fs.writeFile(STORE_PATH, JSON.stringify(documents), "utf-8");
    console.log(`Saved ${documents.length} documents to ${STORE_PATH}`);
  } catch (error) {
    console.error("Failed to save documents:", error);
  }
}

export async function addDocuments(docs: DocumentChunk[]): Promise<void> {
  await loadFromFile();
  documents = [...documents, ...docs];
  await saveToFile();
}

export async function clearDocuments(): Promise<void> {
  documents = [];
  isLoaded = true;
  await saveToFile();
}

export async function getDocumentCount(): Promise<number> {
  await loadFromFile();
  return documents.length;
}

export async function searchSimilarDocuments(
  query: string,
  topK: number = 5,
  similarityThreshold: number = 0.05,
): Promise<Array<DocumentChunk & { similarity: number }>> {
  await loadFromFile();
  if (documents.length === 0) {
    return [];
  }

  const queryEmbedding = await generateEmbedding(query);
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

  const results = documents
    .map((doc) => {
      const embeddingSimilarity = cosineSimilarity(queryEmbedding, doc.embedding);

      // Keyword boost for better matching
      const contentLower = doc.content.toLowerCase();
      let keywordBoost = 0;
      for (const word of queryWords) {
        if (contentLower.includes(word)) {
          keywordBoost += 0.1;
        }
        // Check for partial matches (e.g., "price" matches "pricing")
        const variations = [word + "s", word + "ing", word + "ed", word.slice(0, -1)];
        for (const variant of variations) {
          if (variant.length > 2 && contentLower.includes(variant)) {
            keywordBoost += 0.05;
          }
        }
      }

      return {
        ...doc,
        similarity: embeddingSimilarity + Math.min(keywordBoost, 0.3),
      };
    })
    .filter((doc) => doc.similarity >= similarityThreshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return results;
}

// Export documents for persistence
export function exportDocuments(): DocumentChunk[] {
  return documents;
}

// Import documents (for loading from persistence)
export function importDocuments(docs: DocumentChunk[]): void {
  documents = docs;
}
