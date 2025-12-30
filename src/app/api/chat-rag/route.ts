import { groq } from "@ai-sdk/groq";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { searchSimilarDocuments, getDocumentCount } from "@/lib/rag";

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

  // Search for relevant content using RAG with embeddings
  let websiteContext = "";
  const isGreeting = /^(hi|hello|hey|sup|yo|greetings|howdy)\s*$/i.test(userQuery.trim());

  const documentCount = await getDocumentCount();
  console.log(`RAG index has ${documentCount} documents`);

  if (userQuery && userQuery.length > 3 && !isGreeting && documentCount > 0) {
    console.log(`Searching RAG index for: "${userQuery}"`);
    try {
      const searchResults = await searchSimilarDocuments(userQuery, 8, 0.05);

      if (searchResults.length > 0) {
        // Group results by URL to avoid duplicate content
        const urlGroups = new Map<
          string,
          { title: string; contents: string[]; similarity: number }
        >();

        for (const result of searchResults) {
          const existing = urlGroups.get(result.metadata.url);
          if (existing) {
            existing.contents.push(result.content);
            existing.similarity = Math.max(existing.similarity, result.similarity);
          } else {
            urlGroups.set(result.metadata.url, {
              title: result.metadata.title,
              contents: [result.content],
              similarity: result.similarity,
            });
          }
        }

        websiteContext =
          "\n\nRELEVANT WEBSITE CONTENT (retrieved via semantic search):\n" +
          Array.from(urlGroups.entries())
            .sort((a, b) => b[1].similarity - a[1].similarity)
            .map(
              ([url, data]) =>
                `\n---\nPage: ${data.title}\nURL: ${url}\nRelevance: ${(data.similarity * 100).toFixed(1)}%\nContent: ${data.contents.join(" ... ")}\n---`,
            )
            .join("\n");
        console.log(`Found ${searchResults.length} relevant chunks from ${urlGroups.size} pages`);
        console.log(
          "Retrieved content preview:",
          searchResults.map((r) => ({
            url: r.metadata.url,
            similarity: r.similarity.toFixed(3),
            content: r.content.slice(0, 100) + "...",
          })),
        );
      } else {
        console.log("No relevant results found in RAG index");
        websiteContext = "\n\n[No relevant content found in the knowledge base]";
      }
    } catch (error) {
      console.error("Error searching RAG index:", error);
      websiteContext = "\n\n[RAG search temporarily unavailable]";
    }
  } else if (documentCount === 0) {
    console.log("RAG index is empty - need to ingest content first");
    websiteContext =
      "\n\n[Knowledge base is empty - content needs to be ingested. Click 'Index Website' button to populate.]";
  } else if (isGreeting) {
    console.log("Greeting detected, skipping search");
  }

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
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
