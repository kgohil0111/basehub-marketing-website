export { generateEmbedding, generateEmbeddings, cosineSimilarity } from "./embeddings";

// Storage type: "json" (default) or "postgres"
const STORAGE_TYPE = process.env.RAG_STORAGE || "json";

// Dynamically export based on storage type
import * as jsonStore from "./vector-store";
import * as pgStore from "./vector-store-pg";

const store = STORAGE_TYPE === "postgres" ? pgStore : jsonStore;

export const searchSimilarDocuments = store.searchSimilarDocuments;
export const addDocuments = store.addDocuments;
export const clearDocuments = store.clearDocuments;
export const getDocumentCount = store.getDocumentCount;
export const exportDocuments = store.exportDocuments;
export const importDocuments = store.importDocuments;
export type { DocumentChunk } from "./vector-store";

// PostgreSQL specific exports
export { initDatabase } from "./vector-store-pg";

export { ingestWebsite } from "./ingest";

// Export storage type for debugging
export const storageType = STORAGE_TYPE;
