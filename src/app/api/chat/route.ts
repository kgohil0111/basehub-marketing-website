import { groq } from '@ai-sdk/groq';
import { convertToModelMessages, streamText, tool, type UIMessage } from 'ai';
import { z } from 'zod';
import { searchWebsite, getPageContent } from '@/lib/website-search';

const WEBSITE_DOMAIN = 'https://basehub-marketing-website-one-sooty.vercel.app';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  console.log(messages, 'messages');

  const result = streamText({
    model: groq('openai/gpt-oss-120b'),
    system: `You are a helpful assistant for the website ${WEBSITE_DOMAIN}.

IMPORTANT RULES:
1. You can ONLY answer questions about content from ${WEBSITE_DOMAIN}
2. You MUST use the search_website tool to find relevant information before answering
3. If the information is not found on the website, politely say you can only help with questions about this website
4. Always cite the page URL when providing information from the website
5. For general greetings and small talk, you can respond naturally, but remind users you specialize in helping with ${WEBSITE_DOMAIN}
6. Never make up information - only use what's found through the search tool

When a user asks a question:
- First, use the search_website tool to find relevant content
- Base your answer ONLY on the search results
- Include the source URL in your response
- If no relevant information is found, explain you couldn't find that information on the website`,
    messages: convertToModelMessages(messages),
    tools: {
      search_website: tool({
        description: `Search the website ${WEBSITE_DOMAIN} for relevant content. Use this tool whenever you need to answer a question about the website.`,
        parameters: z.object({
          query: z.string().describe('The search query to find relevant content on the website'),
          maxPages: z.number().optional().describe('Maximum number of pages to search (default: 5)'),
        }),
        // @ts-expect-error - Tool typing issue with AI SDK version
        execute: async ({ query, maxPages }) => {
          console.log(`Searching website for: "${query}"`);
          const results = await searchWebsite(query, maxPages || 5);
          
          if (results.length === 0) {
            return {
              found: false,
              message: 'No relevant content found on the website for this query.',
            };
          }

          return {
            found: true,
            results: results.map(r => ({
              url: r.url,
              title: r.title,
              content: r.content,
              relevance: r.relevance,
            })),
          };
        },
      }),
      get_page: tool({
        description: `Get the full content of a specific page from ${WEBSITE_DOMAIN}`,
        parameters: z.object({
          url: z.string().describe('The full URL of the page to retrieve'),
        }),
        // @ts-expect-error - Tool typing issue with AI SDK version
        execute: async ({ url }) => {
          console.log(`Fetching page: ${url}`);
          
          if (!url.startsWith(WEBSITE_DOMAIN)) {
            return {
              success: false,
              message: 'URL must be from the allowed domain',
            };
          }

          const content = await getPageContent(url);
          
          if (!content) {
            return {
              success: false,
              message: 'Failed to fetch page content',
            };
          }

          return {
            success: true,
            title: content.title,
            content: content.content,
            url,
          };
        },
      }),
    }
  });

  return result.toUIMessageStreamResponse();
}