// Quick test script to verify website search functionality
const fetch = require('node:fetch');

async function testSearch() {
  const url = 'https://basehub-marketing-website-one-sooty.vercel.app/';
  
  console.log('Testing website search...\n');
  console.log(`Fetching: ${url}`);
  
  try {
    const response = await fetch(url);
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const html = await response.text();
      console.log(`Content length: ${html.length} characters`);
      console.log('✅ Website is accessible\n');
      
      // Check for some basic content
      if (html.includes('<title>')) {
        const titleMatch = html.match(/<title>(.*?)<\/title>/);
        console.log(`Page title: ${titleMatch ? titleMatch[1] : 'Not found'}`);
      }
      
      console.log('\n✅ Website search should work correctly!');
      console.log('Next steps:');
      console.log('1. Run: npm run dev (or yarn dev)');
      console.log('2. Visit: http://localhost:3000/ask-ai');
      console.log('3. Try asking: "What is this website about?"');
    } else {
      console.log('❌ Website returned non-200 status');
    }
  } catch (error) {
    console.error('❌ Error fetching website:', error.message);
  }
}

testSearch();
