require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
// Correctly import the main class from the package
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- Firebase and RSS Parser Setup ---
const serviceAccount = require('../serviceAccountKey.json');
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  // A simple check to prevent crashing if the app is already initialized
  if (!/already exists/u.test(error.message)) {
    console.error('Firebase admin initialization error', error.stack);
  }
}
const db = admin.firestore();
const parser = new Parser();

// --- AI Model Setup ---
const AI_MODEL_NAME = "gemini-1.5-flash";
// Initialize the GoogleGenerativeAI class with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Feed Configuration ---
const feeds = [
    { url: 'https://blog.playstation.com/feed/', source: 'PlayStation Blog', category: 'PlayStation', articleSelector: '.entry-content', imageSelector: '.featured-asset-thumbnail img' },
    { url: 'https://www.pushsquare.com/feeds/latest', source: 'Push Square', category: 'PlayStation', articleSelector: '.text', imageSelector: '.img' },
    { url: 'https://news.xbox.com/en-us/feed/', source: 'Xbox Wire', category: 'Xbox', articleSelector: '.entry-content', imageSelector: 'article .wp-post-image' },
    { url: 'https://www.pcgamer.com/rss/', source: 'PC Gamer', category: 'PC', articleSelector: '#article-body', imageSelector: 'figure.frame-default img' },
    { url: 'https://www.rockpapershotgun.com/feed', source: 'Rock Paper Shotgun', category: 'PC', articleSelector: '.article_body_content', imageSelector: '.article_image_wrapper img' },
];

async function scrapeArticleContent(url, articleSelector, imageSelector) {
    try {
        const { data: html } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(html);
        $(`${articleSelector} script, ${articleSelector} style, ${articleSelector} .related-posts, ${articleSelector} .ad-container`).remove();
        const textContent = $(articleSelector).text().trim().replace(/\s\s+/g, ' ');
        const imageUrl = $('meta[property="og:image"]').attr('content') || $(imageSelector).first().attr('src') || null;
        return { textContent, imageUrl };
    } catch (error) {
        console.error(`Scraping failed for ${url}: ${error.message}`);
        return { textContent: null, imageUrl: null };
    }
}

async function rewriteArticleWithAI(text) {
    if (!text || text.length < 100) {
        console.log('Text too short for AI rewrite, skipping.');
        return null;
    }
    
    const prompt = `You are a professional gaming journalist with a casual, witty, and slightly comedic tone. Rewrite the following article text into an engaging blog post. Ensure it is well-structured with paragraphs. Do not use markdown like '#' for titles. The output should be pure HTML.
    Original Text: "${text.substring(0, 8000)}"`;

    try {
        // Get the model from the initialized genAI object
        const model = genAI.getGenerativeModel({ model: AI_MODEL_NAME });
        const result = await model.generateContent(prompt);
        let rewrittenContent = result.response.text();
        // Clean up potential markdown code blocks
        rewrittenContent = rewrittenContent.replace(/^```html\s*/, '').replace(/\s*```$/, '');
        return rewrittenContent;
    } catch (error) {
        console.error(`AI rewrite failed: ${error.message}`);
        return null;
    }
}

async function main() {
    console.log('Starting AI-powered feed fetch process...');
    const articlesRef = db.collection('articles');

    for (const feedConfig of feeds) {
        try {
            console.log(`\n--- Processing Feed: ${feedConfig.source} ---`);
            const feed = await parser.parseURL(feedConfig.url);
            const latestItems = feed.items.slice(0, 5);

            for (const item of latestItems) {
                if (!item.link) {
                    console.warn(`Skipped: No link for "${item.title}"`);
                    continue;
                }

                const q = articlesRef.where('link', '==', item.link);
                const querySnapshot = await q.get();

                if (querySnapshot.empty) {
                    console.log(`Processing new article: "${item.title}"`);
                    const { textContent, imageUrl } = await scrapeArticleContent(item.link, feedConfig.articleSelector, feedConfig.imageSelector);
                    if (!textContent) continue;

                    const rewrittenContent = await rewriteArticleWithAI(textContent);
                    if (!rewrittenContent) continue;

                    const newArticle = {
                        title: item.title || 'No Title',
                        link: item.link,
                        published: item.isoDate ? admin.firestore.Timestamp.fromDate(new Date(item.isoDate)) : admin.firestore.Timestamp.now(),
                        source: feedConfig.source,
                        category: feedConfig.category,
                        type: feedConfig.type || null,
                        imageUrl: imageUrl || null,
                        content: rewrittenContent,
                    };

                    await articlesRef.add(newArticle);
                    console.log(`Successfully added AI-rewritten article: "${item.title}"`);
                } else {
                    console.log(`Skipped existing article: "${item.title}"`);
                }
            }
        } catch (error) {
            console.error(`Failed to process feed from ${feedConfig.url}:`, error.message);
        }
    }
}

main()
  .then(() => {
    console.log('\nFeed fetch process completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('An unexpected error occurred during the main process:', error);
    process.exit(1);
  });