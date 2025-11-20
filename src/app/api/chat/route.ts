// app/api/chat/route.ts

import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages as UIMessage[];

    // convert frontend messages to model format
    const modelMessages = convertToModelMessages(messages);

    const result = await streamText({
      model: openai("gpt-5"),
      messages: modelMessages,
      providerOptions: {
        openai: {
          web: {
            search: false, // disable global web search
            scraping: {
              urls: ["https://basehub-marketing-website-one-sooty.vercel.app"],
            },
          },
        },
      },
      system: "Answer only using content from the provided website.",
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Something went wrong" }),
      { status: 500 }
    );
  }
}
