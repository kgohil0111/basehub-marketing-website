'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

export default function Page() {
  const [input, setInput] = useState('');

  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  return (
    <div>   
      
        <input class="h-9 w-full rounded-full border border-border py-2 pl-4 pr-28 dark:border-dark-border md:h-11 disabled:opacity-50 placeholder:text-sm placeholder:text-text-tertiary dark:placeholder-dark-text-tertiary text-sm text-text-primary dark:text-dark-text-primary outline-hidden focus-visible:ring-2 focus-visible:ring-control" value={input}
        onChange={event => {
          setInput(event.target.value);
        }}
        onKeyDown={async event => {
          if (event.key === 'Enter') {
            sendMessage({
              parts: [{ type: 'text', text: input }],
            });
          }
        }}></input>
      {messages.map((message, index) => (
        <div key={index}>
          {message.parts.map(part => {
            if (part.type === 'text') {
              return <div key={`${message.id}-textkrisha`}>{part.text}</div>;
            }
          })}
        </div>
      ))}
    </div>
  );
}