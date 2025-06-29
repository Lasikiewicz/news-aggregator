require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- Firebase and RSS Parser Setup ---
const serviceAccount = require('../serviceAccountKey.json');
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  if (!/already exists/u.test(error.message)) {
    console.error('Firebase admin initialization error', error.stack);
  }
}
const db = admin.firestore();
const parser = new Parser();

// --- AI Model Setup ---
const AI_MODEL_NAME = "gemini-1.5-flash";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Feed Configuration ---
// Re-adding multiple feeds to make filtering by platform useful
const feeds = [
    { url: 'https://www.gamesindustry.biz/feed/news', source: 'GamesIndustry.biz', category: 'Industry', articleSelector: '.article_body_content', imageSelector: 'figure.picture img' },
    { url: 'https://blog.playstation.com/feed/', source: 'PlayStation Blog', category: 'PlayStation', articleSelector: '.entry-content', imageSelector: '.featured-asset-thumbnail img' },
    { url: 'https://news.xbox.com/en-us/feed/', source: 'Xbox Wire', category: 'Xbox', articleSelector: '.entry-content', imageSelector: 'article .wp-post-image' },
    { url: 'https://www.pcgamer.com/rss/', source: 'PC Gamer', category: 'PC', articleSelector: '#article-body', imageSelector: 'figure.frame-default img' },
];

function getFallbackImageUrl(title) {
    const formattedTitle = encodeURIComponent(title.substring(0, 50));
    return `https://placehold.co/1200x630/1a1a1a/FFF?text=${formattedTitle}`;
}

async function scrapeArticleContent(url, articleSelector, imageSelector) {
    try {
        const { data: html } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(html);
        let imageUrl = $('meta[property="og:image"]').attr('content') || null;
        if (!imageUrl) {
            imageUrl = $(imageSelector).first().attr('src') || null;
        }
        $(`${articleSelector} script, ${articleSelector} style`).remove();
        const textContent = $(articleSelector).text().trim().replace(/\s\s+/g, ' ');
        return { textContent, imageUrl };
    } catch (error) {
        console.error(`Scraping failed for ${url}: ${error.message}`);
        return { textContent: null, imageUrl: null };
    }
}

async function rewriteArticleWithAI(text) {
    if (!text || text.length < 100) {
        return null;
    }
    
    // Updated prompt to re-introduce placeholders and forbid markdown
    const prompt = `Act as a professional gaming journalist with a sharp, insightful, and engaging tone. 
    Based on the topic from the following article text, write an original, premium blog post.
    The output MUST be pure HTML. Do not wrap the output in markdown code blocks like \`\`\`html.
    Structure the article with paragraphs.
    Crucially, break up the text by inserting placeholder divs for images where they would enhance the story. Use the format <div data-image-placeholder="A descriptive caption of the image that should be here"></div>. Include at least five of these image placeholders.`;

    try {
        const model = genAI.getGenerativeModel({ model: AI_MODEL_NAME });
        const result = await model.generateContent(prompt);
        let rewrittenContent = result.response.text();
        
        // Robust cleanup for markdown fences
        rewrittenContent = rewrittenContent.replace(/^```(html)?\s*/, '').replace(/\s*```$/, '');

        return rewrittenContent;
    } catch (error) {
        console.error(`AI rewrite failed: ${error.message}`);
        return null;
    }
}

async function main() {
    console.log('Starting AI-powered feed fetch process...');
    // ... (The rest of the main function is the same as the last version and should work correctly)
    // ...
}

main().then(() => {
    console.log('\nFeed fetch process completed.');
    process.exit(0);
});