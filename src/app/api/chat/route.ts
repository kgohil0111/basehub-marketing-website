
export async function POST(req: Request) {
  const body = await req.json();
  console.log('Received request body:', body);

  // Get the last message's parts
  const lastMessage = body.messages?.[body.messages.length - 1];
  const query = lastMessage?.parts?.[0]?.text;

  if (!query) {
    return new Response(JSON.stringify({
      error: 'Query is missing',
      messages: [
        {
          role: 'assistant',
          parts: [{ type: 'text', text: 'No query provided.' }],
        },
      ],
    }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  // Call Tavily API
  const tavilyRes = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({ query, siteUrl: "https://basehub-marketing-website-one-sooty.vercel.app/" }),
  });

  const tavilyData = await tavilyRes.json();
  console.log('Tavily API response:', tavilyData);
  const answer = tavilyData?.answer || 'No relevant answer found.';

  return new Response(JSON.stringify({
    messages: [
      {
        role: 'assistant',
        parts: [{ type: 'text', text: answer }],
      },
    ],
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}