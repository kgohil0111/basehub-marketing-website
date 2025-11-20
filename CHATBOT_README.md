# Website-Specific Chatbot Implementation

## Overview
This chatbot is configured to search and answer questions **ONLY** from your website: `https://basehub-marketing-website-one-sooty.vercel.app/`

## Features
- 🔍 **Website Search**: Automatically searches your website for relevant content
- 🎯 **Domain-Restricted**: Only provides answers from your website domain
- 🤖 **AI-Powered**: Uses Groq LLM with AI SDK for natural conversations
- 💰 **100% Free**: No Vercel AI Gateway or paid services required
- 🔧 **Tool Calling**: Leverages AI SDK's tool feature for dynamic content retrieval

## How It Works

### 1. Search Utility (`src/lib/website-search.ts`)
- Crawls your website pages on-demand
- Extracts and caches page content (30-minute cache)
- Calculates relevance scores for search queries
- Returns top 3 most relevant results

### 2. Chat API (`src/app/api/chat/route.ts`)
- Receives user messages
- Uses AI SDK's `tool` feature to enable the LLM to search your website
- Provides two tools to the LLM:
  - `search_website`: Search for relevant content
  - `get_page`: Get specific page content
- Enforces strict rules to only answer from website content

### 3. System Prompt Rules
The chatbot follows strict guidelines:
1. ONLY answers questions about content from your website
2. MUST use the search tool before answering
3. Always cites source URLs
4. Politely declines questions outside website scope
5. Never makes up information

## Usage

### Starting the Chat
Users can ask questions like:
- "What services do you offer?"
- "Tell me about your pricing"
- "How do I get started?"
- "What is your company about?"

### Chatbot Behavior
1. **For website-related questions**: 
   - Searches your website
   - Provides answers with source citations
   - Shows relevant page URLs

2. **For general greetings**:
   - Responds naturally
   - Reminds users it specializes in your website

3. **For off-topic questions**:
   - Politely explains it can only help with website content
   - Suggests asking about your website instead

## Technical Stack
- **Framework**: Next.js 15 (App Router)
- **AI SDK**: Vercel AI SDK v5.0.92
- **LLM Provider**: Groq (openai/gpt-oss-120b model)
- **HTML Parsing**: Cheerio 1.1.2
- **Validation**: Zod 3.25.1
- **Cost**: $0 (all free tiers)

## API Endpoint
```
POST /api/chat
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "What is your website about?"
    }
  ]
}
```

## Configuration

### Changing the Domain
Update the `WEBSITE_DOMAIN` constant in:
- `/src/app/api/chat/route.ts`
- `/src/lib/website-search.ts`

### Adjusting Cache Duration
In `/src/lib/website-search.ts`:
```typescript
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes (default)
```

### Modifying Search Depth
When calling the search tool, adjust `maxPages`:
```typescript
searchWebsite(query, maxPages); // Default: 5
```

## Performance Optimizations
1. **Caching**: Pages are cached for 30 minutes to reduce fetching
2. **Relevance Scoring**: Only top 3 most relevant results are returned
3. **Content Truncation**: Content is limited to 1000 characters per result
4. **Smart Crawling**: Stops after reaching `maxPages` limit

## Limitations
1. Only searches your deployed website (requires pages to be publicly accessible)
2. Cannot search password-protected pages
3. Depends on website being online
4. Cache means updates may take up to 30 minutes to reflect

## Future Enhancements
- Add vector embeddings for semantic search
- Implement more sophisticated caching (Redis, etc.)
- Add support for sitemap.xml parsing
- Include image and video content detection
- Add analytics for popular queries

## Troubleshooting

### Chatbot Not Searching
- Check server logs for `Searching website for:` messages
- Verify website is accessible publicly
- Check CORS settings if applicable

### Outdated Content
- Clear cache or wait 30 minutes
- Restart the dev server

### TypeScript Errors
- The `@ts-expect-error` comments are intentional
- They suppress version-specific typing issues
- Functionality works correctly at runtime

## Example Queries to Test

1. "What is this website about?"
2. "Tell me about your services"
3. "How much does it cost?"
4. "Do you have a blog?"
5. "What is your contact information?"

All of these will trigger a website search and provide answers based only on your website content.
