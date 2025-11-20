import * as cheerio from 'cheerio';

const WEBSITE_DOMAIN = 'https://basehub-marketing-website-one-sooty.vercel.app';

// Cache for fetched pages (in-memory for simplicity)
const pageCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

interface SearchResult {
  url: string;
  title: string;
  content: string;
  relevance: number;
}

/**
 * Fetch and parse a webpage
 */
async function fetchPage(url: string): Promise<{ title: string; content: string } | null> {
  try {
    // Check cache first
    const cached = pageCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return JSON.parse(cached.content);
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebsiteSearchBot/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script, style, and nav elements
    $('script, style, nav, header, footer').remove();

    // Extract title
    const title = $('title').text() || $('h1').first().text() || 'Untitled';

    // Extract main content
    const content = $('main, article, body')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    const result = { title, content };

    // Cache the result
    pageCache.set(url, {
      content: JSON.stringify(result),
      timestamp: Date.now(),
    });

    return result;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

/**
 * Extract links from a webpage
 */
async function extractLinks(url: string): Promise<string[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const links: string[] = [];

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      let fullUrl: string;
      if (href.startsWith('http')) {
        fullUrl = href;
      } else if (href.startsWith('/')) {
        fullUrl = WEBSITE_DOMAIN + href;
      } else if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return; // Skip anchors and special links
      } else {
        fullUrl = new URL(href, url).toString();
      }

      // Only include links from the same domain
      if (fullUrl.startsWith(WEBSITE_DOMAIN) && !links.includes(fullUrl)) {
        links.push(fullUrl);
      }
    });

    return links;
  } catch (error) {
    console.error(`Error extracting links from ${url}:`, error);
    return [];
  }
}

/**
 * Calculate relevance score for a piece of content
 */
function calculateRelevance(content: string, query: string): number {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const queryTerms = lowerQuery.split(/\s+/).filter(term => term.length > 2);

  let score = 0;

  // Check for exact phrase match
  if (lowerContent.includes(lowerQuery)) {
    score += 10;
  }

  // Check for individual term matches
  queryTerms.forEach(term => {
    const regex = new RegExp(term, 'gi');
    const matches = lowerContent.match(regex);
    if (matches) {
      score += matches.length;
    }
  });

  return score;
}

/**
 * Search the website for relevant content
 */
export async function searchWebsite(query: string, maxPages: number = 5): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const visitedUrls = new Set<string>();
  const urlsToVisit: string[] = [WEBSITE_DOMAIN];

  // Crawl pages
  while (urlsToVisit.length > 0 && visitedUrls.size < maxPages) {
    const url = urlsToVisit.shift()!;
    if (visitedUrls.has(url)) continue;

    visitedUrls.add(url);

    const pageData = await fetchPage(url);
    if (!pageData) continue;

    const relevance = calculateRelevance(
      `${pageData.title} ${pageData.content}`,
      query
    );

    if (relevance > 0) {
      results.push({
        url,
        title: pageData.title,
        content: pageData.content.slice(0, 1000), // Limit content length
        relevance,
      });
    }

    // Extract more links to visit (but don't exceed maxPages)
    if (visitedUrls.size < maxPages) {
      const links = await extractLinks(url);
      links.forEach(link => {
        if (!visitedUrls.has(link) && !urlsToVisit.includes(link)) {
          urlsToVisit.push(link);
        }
      });
    }
  }

  // Sort by relevance
  results.sort((a, b) => b.relevance - a.relevance);

  return results.slice(0, 3); // Return top 3 most relevant results
}

/**
 * Get a specific page content
 */
export async function getPageContent(url: string): Promise<{ title: string; content: string } | null> {
  // Ensure URL is from the allowed domain
  if (!url.startsWith(WEBSITE_DOMAIN)) {
    return null;
  }

  return fetchPage(url);
}
