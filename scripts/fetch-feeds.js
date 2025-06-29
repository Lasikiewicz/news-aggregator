require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- Firebase and RSS Parser Setup ---
const serviceAccount = require('./serviceAccountKey.json');
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
// The feeds array now only contains GamesIndustry.biz
const feeds = [
    { 
        url: 'https://www.gamesindustry.biz/feed/news', 
        source: 'GamesIndustry.biz', 
        category: 'Industry News', 
        articleSelector: '.article_body_content', 
        imageSelector: 'figure.picture img' 
    }
];

/**
 * A more robust function to fetch article content and image.
 * It first tries to find the Open Graph image and falls back to a CSS selector.
 * @param {string} url - The URL of the article to scrape.
 * @param {string} articleSelector - The CSS selector for the main article content container.
 * @param {string} imageSelector - The fallback CSS selector for the main article image.
 * @returns {Promise<{textContent: string, imageUrl: string | null}>}
 */
async function scrapeArticleContent(url, articleSelector, imageSelector) {
    try {
        const { data: html } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(html);

        // 1. Prioritize Open Graph image tag for reliability
        let imageUrl = $('meta[property="og:image"]').attr('content') || null;

        // 2. If no OG image, fall back to the specific CSS selector
        if (!imageUrl) {
            imageUrl = $(imageSelector).first().attr('src') || null;
        }

        // 3. Scrape article text
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
        console.log('Text too short for AI rewrite, skipping.');
        return null;
    }
    
    const prompt = `Act as a professional gaming journalist with a casual, witty, and comedic tone.
    Based on the topic from the following article text, write an original, engaging blog post. Do not directly summarize or quote the text. Make it your own.
    The output MUST be pure HTML.
    Structure the article with paragraphs.
    Crucially, break up the text by inserting placeholder divs for images where they would enhance the story. Use the format <div data-image-placeholder="A descriptive caption of the image that should be here"></div>. For example, if discussing a character, you might add: <div data-image-placeholder="Close-up screenshot of the character's new armor"></div>. Include at least two or three of these image placeholders.

    Original Text Topic: "${text.substring(0, 6000)}"`;

    try {
        const model = genAI.getGenerativeModel({ model: AI_MODEL_NAME });
        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text();
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
            
            const latestItems = feed.items.slice(0, 10); // Fetching 10 for a single source

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
                    
                    const plainContent = rewrittenContent.replace(/<[^>]*>?/gm, '');
                    const contentSnippet = plainContent.substring(0, 150) + '...';

                    const newArticle = {
                        title: item.title || 'No Title',
                        link: item.link,
                        published: item.isoDate ? admin.firestore.Timestamp.fromDate(new Date(item.isoDate)) : admin.firestore.Timestamp.now(),
                        source: feedConfig.source,
                        category: feedConfig.category,
                        imageUrl: imageUrl,
                        content: rewrittenContent,
                        contentSnippet: contentSnippet,
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