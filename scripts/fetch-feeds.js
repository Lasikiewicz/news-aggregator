require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const { getGenerativeModel } = require('@google/generative-ai');

// --- Firebase and RSS Parser Setup ---
const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const parser = new Parser();

// --- AI Model Setup ---
const AI_MODEL_NAME = "gemini-1.5-flash"; // A powerful and fast model

// --- Feed Configuration ---
// NOTE: Website layouts change. These CSS selectors for scraping might need periodic updates.
const feeds = [
    { url: 'https://blog.playstation.com/feed/', source: 'PlayStation Blog', category: 'PlayStation', articleSelector: '.entry-content', imageSelector: '.featured-asset-thumbnail img' },
    { url: 'https://www.pushsquare.com/feeds/latest', source: 'Push Square', category: 'PlayStation', articleSelector: '.text', imageSelector: '.img' },
    { url: 'https://news.xbox.com/en-us/feed/', source: 'Xbox Wire', category: 'Xbox', articleSelector: '.entry-content', imageSelector: 'article .wp-post-image' },
    { url: 'https://www.pcgamer.com/rss/', source: 'PC Gamer', category: 'PC', articleSelector: '#article-body', imageSelector: 'figure.frame-default img' },
    { url: 'https://www.rockpapershotgun.com/feed', source: 'Rock Paper Shotgun', category: 'PC', articleSelector: '.article_body_content', imageSelector: '.article_image_wrapper img' },
    { url: 'https://toucharcade.com/feed', source: 'TouchArcade', category: 'Mobile', articleSelector: '.entry-content', imageSelector: '.entry-content img' },
    { url: 'https://www.droidgamers.com/feed/', source: 'Droid Gamers', category: 'Mobile', articleSelector: '.entry-content', imageSelector: '.entry-content img' },
    { url: 'http://www.pocketgamer.biz/rss/', source: 'PocketGamer.biz', category: 'Mobile', articleSelector: '.acontent', imageSelector: '.acontent img' }
];


/**
 * Strips HTML tags from a string.
 * @param {string} html - The HTML string.
 * @returns {string} The plain text.
 */
function stripHtml(html) {
    if(!html) return '';
    return html.replace(/<[^>]*>?/gm, '');
}


/**
 * Fetches the HTML of a webpage and extracts the main article text and a hero image.
 * @param {string} url - The URL of the article to scrape.
 * @param {string} articleSelector - The CSS selector for the main article content container.
 * @param {string} imageSelector - The CSS selector for the main article image.
 * @returns {Promise<{textContent: string, imageUrl: string | null}>}
 */
async function scrapeArticleContent(url, articleSelector, imageSelector) {
    try {
        const { data: html } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(html);

        // Remove unwanted elements like scripts, ads, related posts etc.
        $(`${articleSelector} script, ${articleSelector} style, ${articleSelector} .related-posts, ${articleSelector} .ad-container`).remove();
        
        const textContent = $(articleSelector).text().trim().replace(/\s\s+/g, ' ');
        const imageUrl = $(imageSelector).first().attr('src') || null;

        return { textContent, imageUrl };
    } catch (error) {
        console.error(`Scraping failed for ${url}: ${error.message}`);
        return { textContent: null, imageUrl: null };
    }
}

/**
 * Uses the Gemini API to rewrite article text.
 * @param {string} text - The original article text.
 * @returns {Promise<string | null>}
 */
async function rewriteArticleWithAI(text) {
    if (!text || text.length < 100) {
        console.log('Text too short for AI rewrite, skipping.');
        return null;
    }
    
    const prompt = `You are a professional gaming journalist with a casual, witty, and slightly comedic tone.
    Rewrite the following article text into an engaging blog post. Ensure it is well-structured with paragraphs.
    Do not use markdown like '#' for titles. The output should be pure HTML.
    
    Original Text: "${text.substring(0, 8000)}"`; // Limit text to avoid exceeding token limits

    try {
        const model = getGenerativeModel({ model: AI_MODEL_NAME });
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

                    // Create a plain text snippet for previews
                    const plainContent = stripHtml(rewrittenContent);
                    const contentSnippet = plainContent.substring(0, 150) + '...';

                    const newArticle = {
                        title: item.title || 'No Title',
                        link: item.link,
                        published: item.isoDate ? admin.firestore.Timestamp.fromDate(new Date(item.isoDate)) : admin.firestore.Timestamp.now(),
                        source: feedConfig.source,
                        category: feedConfig.category,
                        type: feedConfig.type || null,
                        imageUrl: imageUrl || null,
                        content: rewrittenContent,
                        contentSnippet: contentSnippet, // Add the snippet here
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