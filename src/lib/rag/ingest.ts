import * as cheerio from "cheerio";
import { generateEmbeddings } from "./embeddings";
import { addDocuments, clearDocuments } from "./index";
import type { DocumentChunk } from "./vector-store";

const WEBSITE_DOMAIN = "https://basehub-marketing-website-one-sooty.vercel.app";
const CHUNK_SIZE = 500; // characters per chunk
const CHUNK_OVERLAP = 100; // overlap between chunks

interface PageData {
  url: string;
  title: string;
  content: string;
}

// Split text into overlapping chunks
function splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();

    if (chunk.length > 50) {
      // Only include chunks with meaningful content
      chunks.push(chunk);
    }

    start += chunkSize - overlap;
  }

  return chunks;
}

async function fetchPage(url: string): Promise<PageData | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RAGBot/1.0)",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $("script, style, nav, header, footer, noscript, iframe").remove();

    const title = $("title").text() || $("h1").first().text() || "Untitled";
    const content = $("main, article, body").first().text().replace(/\s+/g, " ").trim();

    return { url, title, content };
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

async function extractLinks(url: string, html?: string): Promise<string[]> {
  try {
    let htmlContent = html;

    if (!htmlContent) {
      const response = await fetch(url);
      if (!response.ok) return [];
      htmlContent = await response.text();
    }

    const $ = cheerio.load(htmlContent);
    const links: string[] = [];

    $("a[href]").each((_, element) => {
      const href = $(element).attr("href");
      if (!href) return;

      let fullUrl: string;
      if (href.startsWith("http")) {
        fullUrl = href;
      } else if (href.startsWith("/")) {
        fullUrl = WEBSITE_DOMAIN + href;
      } else if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      } else {
        fullUrl = new URL(href, url).toString();
      }

      // Only include links from the same domain
      if (fullUrl.startsWith(WEBSITE_DOMAIN) && !links.includes(fullUrl)) {
        // Remove hash fragments
        const cleanUrl = fullUrl.split("#")[0];
        if (cleanUrl && !links.includes(cleanUrl)) {
          links.push(cleanUrl);
        }
      }
    });

    return links;
  } catch (error) {
    console.error(`Error extracting links from ${url}:`, error);
    return [];
  }
}

export async function ingestWebsite(maxPages: number = 20): Promise<number> {
  console.log(`Starting website ingestion from ${WEBSITE_DOMAIN}...`);

  clearDocuments();

  const visitedUrls = new Set<string>();
  const urlsToVisit: string[] = [WEBSITE_DOMAIN];
  const allChunks: Array<{ content: string; url: string; title: string; chunkIndex: number }> = [];

  // Crawl pages
  while (urlsToVisit.length > 0 && visitedUrls.size < maxPages) {
    const url = urlsToVisit.shift()!;
    if (visitedUrls.has(url)) continue;

    visitedUrls.add(url);
    console.log(`Crawling [${visitedUrls.size}/${maxPages}]: ${url}`);

    const pageData = await fetchPage(url);
    if (!pageData || pageData.content.length < 100) continue;

    // Split page content into chunks
    const chunks = splitIntoChunks(pageData.content, CHUNK_SIZE, CHUNK_OVERLAP);

    chunks.forEach((chunk, index) => {
      allChunks.push({
        content: chunk,
        url: pageData.url,
        title: pageData.title,
        chunkIndex: index,
      });
    });

    // Extract more links
    if (visitedUrls.size < maxPages) {
      const links = await extractLinks(url);
      links.forEach((link) => {
        if (!visitedUrls.has(link) && !urlsToVisit.includes(link)) {
          urlsToVisit.push(link);
        }
      });
    }
  }

  console.log(`Found ${allChunks.length} chunks from ${visitedUrls.size} pages`);

  if (allChunks.length === 0) {
    return 0;
  }

  // Generate embeddings in batches
  const BATCH_SIZE = 50;
  const documents: DocumentChunk[] = [];

  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    console.log(
      `Generating embeddings for batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allChunks.length / BATCH_SIZE)}`,
    );

    const embeddings = await generateEmbeddings(batch.map((c) => c.content));

    batch.forEach((chunk, index) => {
      const embedding = embeddings[index];
      if (embedding) {
        documents.push({
          id: `${chunk.url}-${chunk.chunkIndex}`,
          content: chunk.content,
          metadata: {
            url: chunk.url,
            title: chunk.title,
            chunkIndex: chunk.chunkIndex,
          },
          embedding,
        });
      }
    });
  }

  await addDocuments(documents);
  console.log(`Ingestion complete. ${documents.length} documents indexed.`);

  return documents.length;
}

// Re-export for convenience
export { clearDocuments, getDocumentCount } from "./vector-store";
