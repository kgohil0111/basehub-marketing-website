import { groq } from "@ai-sdk/groq";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { searchWebsite } from "@/lib/website-search";

const WEBSITE_DOMAIN = "https://basehub-marketing-website-one-sooty.vercel.app";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  console.log(messages, "messages");

  // Get the last user message to search for relevant content
  const lastMessage = messages[messages.length - 1];
  let userQuery = "";
  if (lastMessage?.parts) {
    for (const part of lastMessage.parts) {
      if ("text" in part) {
        userQuery = part.text;
        break;
      }
    }
  }

  // Search the website for relevant content
  let websiteContext = "";
  const isGreeting = /^(hi|hello|hey|sup|yo|greetings|howdy)\s*$/i.test(userQuery.trim());

  if (userQuery && userQuery.length > 3 && !isGreeting) {
    console.log(`Searching website for: "${userQuery}"`);
    try {
      // Add timeout to prevent hanging
      const searchPromise = searchWebsite(userQuery, 3); // Reduced to 3 pages for speed
      const timeoutPromise = new Promise<[]>(
        (resolve) => setTimeout(() => resolve([]), 10000), // 10 second timeout
      );

      const searchResults = await Promise.race([searchPromise, timeoutPromise]);

      if (searchResults.length > 0) {
        websiteContext =
          "\n\nRELEVANT WEBSITE CONTENT:\n" +
          searchResults
            .map(
              (result) =>
                `\n---\nPage: ${result.title}\nURL: ${result.url}\nContent: ${result.content}\n---`,
            )
            .join("\n");
        console.log(`Found ${searchResults.length} relevant results`);
      } else {
        console.log("No relevant results found");
      }
    } catch (error) {
      console.error("Error searching website:", error);
      websiteContext = "\n\n[Website search temporarily unavailable]";
    }
  } else if (isGreeting) {
    console.log("Greeting detected, skipping search");
  }

  const result = streamText({
    model: groq("openai/gpt-oss-120b"),
    system: `You are a helpful assistant for the website ${WEBSITE_DOMAIN}.

IMPORTANT RULES:
1. You can ONLY answer questions about content from ${WEBSITE_DOMAIN}
2. Base your answers ONLY on the "RELEVANT WEBSITE CONTENT" provided to you
3. If no relevant content is provided, politely say you can only help with questions about this website
4. Always cite the page URL when providing information (use the URLs from the context)
5. For general greetings ("hi", "hello", "hey"), you can respond naturally and introduce yourself as the website assistant
6. Never make up information - only use what's provided in the context

When answering:
- Use the RELEVANT WEBSITE CONTENT provided below
- IMPORTANT: Format ALL links as standard Markdown: [clickable text](url)
- Example: "Check our [Pricing page](https://basehub-marketing-website-one-sooty.vercel.app/pricing) for details"
- DO NOT use brackets like 【】or [] around bare URLs
- DO NOT write URLs without making them clickable links
- Always write links as: [descriptive text](https://full-url-here)
- If you mention a page, make it a clickable link
- If the content doesn't contain the answer, say "I couldn't find that information on the website"
- Be conversational and helpful${websiteContext}`,
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
