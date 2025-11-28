#!/bin/bash

echo "Testing Chat API..."
echo ""

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "parts": [
          {
            "type": "text",
            "text": "What is this website about?"
          }
        ]
      }
    ]
  }' \
  --no-buffer

echo ""
echo ""
echo "Test complete!"
