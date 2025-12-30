// Free TF-IDF based embeddings with bigrams - no API required

// Stopwords to filter out
const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "can",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "as",
  "if",
  "then",
  "than",
  "so",
  "such",
  "no",
  "not",
  "only",
  "own",
  "same",
  "too",
  "very",
  "just",
  "also",
  "now",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "any",
  "our",
  "your",
  "his",
  "her",
  "their",
  "what",
  "which",
  "who",
]);

// Tokenizer with bigrams
function tokenize(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

  // Add bigrams for better semantic matching
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]}_${words[i + 1]}`);
  }

  return [...words, ...bigrams];
}

// Calculate term frequency with sublinear scaling
function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  // Sublinear TF scaling: 1 + log(count)
  for (const [token, count] of tf) {
    tf.set(token, 1 + Math.log(count));
  }
  return tf;
}

// Convert to fixed-size vector using multiple hash functions
const VECTOR_SIZE = 512;

function hashToken(token: string, seed: number = 0): number {
  let hash = seed;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash) % VECTOR_SIZE;
}

function textToVector(text: string): number[] {
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return new Array(VECTOR_SIZE).fill(0);
  }

  const tf = termFrequency(tokens);
  const vector = new Array(VECTOR_SIZE).fill(0);

  // Use multiple hash functions to reduce collisions
  for (const [token, freq] of tf) {
    const idx1 = hashToken(token, 0);
    const idx2 = hashToken(token, 31);
    const sign = token.charCodeAt(0) % 2 === 0 ? 1 : -1;
    vector[idx1] += freq * sign;
    vector[idx2] += freq * sign * 0.5;
  }

  // L2 normalize
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= norm;
    }
  }

  return vector;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  return textToVector(text);
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  return texts.map((text) => textToVector(text));
}

// Cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
