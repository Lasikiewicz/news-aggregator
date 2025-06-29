require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- Environment Variable Check ---
if (!process.env.GEMINI_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not defined in your .env.local file.");
    process.exit(1);
}

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
const feeds = [
    { url: 'https://blog.playstation.com/feed/', source: 'PlayStation Blog', category: 'PlayStation', articleSelector: '.entry-content', imageSelector: 'img' },
    { url: 'https://news.xbox.com/en-us/feed/', source: 'Xbox Wire', category: 'Xbox', articleSelector: '.entry-content', imageSelector: 'img' },
    { url: 'https://www.pcgamer.com/rss/', source: 'PC Gamer', category: 'PC', articleSelector: '#article-body', imageSelector: 'img' },
    { url: 'https://www.gamesindustry.biz/feed/news', source: 'GamesIndustry.biz', category: 'Industry', articleSelector: '.article_body_content', imageSelector: 'figure.picture img' }
];

/**
 * --- NEW, MORE ROBUST IMAGE SCRAPER ---
 * This function is upgraded to handle modern image loading techniques.
 */
async function scrapeArticleContent(url, articleSelector, imageSelector) {
    try {
        const { data: html } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(html);
        const articleBody = $(articleSelector);
        if (!articleBody.length) return { textContent: null, imageUrls: [] };

        const imageUrls = new Set(); // Use a Set to avoid duplicate images

        articleBody.find(imageSelector).each((i, elem) => {
            const img = $(elem);
            let src = img.attr('src');
            const srcset = img.attr('srcset');
            const dataSrc = img.attr('data-src');

            let bestUrl = null;

            // 1. Prioritize data-src for lazy-loaded images
            if (dataSrc && dataSrc.startsWith('http')) {
                bestUrl = dataSrc;
            } 
            // 2. Parse srcset to find the largest image
            else if (srcset) {
                const sources = srcset.split(',').map(s => {
                    const parts = s.trim().split(/\s+/);
                    return { url: parts[0], width: parseInt(parts[1], 10) || 0 };
                });
                const largestImage = sources.reduce((largest, current) => {
                    return current.width > largest.width ? current : largest;
                }, { url: null, width: 0 });
                if (largestImage.url && largestImage.url.startsWith('http')) {
                    bestUrl = largestImage.url;
                }
            }
            // 3. Fallback to the standard src attribute
            else if (src && src.startsWith('http')) {
                bestUrl = src;
            }
            
            // 4. Final filter to exclude tiny icons and logos
            if (bestUrl && !bestUrl.includes('.svg') && !bestUrl.includes('avatar') && !bestUrl.includes('logo')) {
                imageUrls.add(bestUrl);
            }
        });
        
        articleBody.find('script, style').remove();
        const textContent = articleBody.text().trim().replace(/\s\s+/g, ' ');

        return { textContent, imageUrls: Array.from(imageUrls) };
    } catch (error) {
        console.error(`Scraping failed for ${url}: ${error.message}`);
        return { textContent: null, imageUrls: [] };
    }
}

async function rewriteArticleWithAI(text, imageUrls) {
    if (!text) return null;
    const imageList = imageUrls.map((url, i) => `Image ${i + 1}: ${url}`).join('\n');
    const prompt = `Act as a professional gaming journalist and web layout editor.
    TASK: Rewrite the following article text into an original, engaging blog post. Intelligently embed all the provided image URLs into the article content.
    RULES:
    1. The final output must be pure, well-structured HTML. Do not use markdown.
    2. Weave the images into the article where they make sense. Use standard <img> tags with the class="article-image".
    3. If you place more than one image together, you MUST wrap them in a single <div class="image-gallery">.
    4. Pick ONE image from the middle of the list and give it the class "full-width-parallax" instead.
    5. Use all the images provided.
    PROVIDED IMAGE URLS:
    ${imageList}
    ARTICLE TEXT:
    "${text.substring(0, 5000)}"`;
    try {
        const model = genAI.getGenerativeModel({ model: AI_MODEL_NAME });
        const result = await model.generateContent(prompt);
        let rewrittenContent = result.response.text();
        rewrittenContent = rewrittenContent.replace(/^```(html)?\s*/, '').replace(/\s*```$/, '');
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
            for (const item of feed.items.slice(0, 5)) {
                if (!item.link) continue;
                const q = articlesRef.where('link', '==', item.link);
                const querySnapshot = await q.get();
                if (querySnapshot.empty) {
                    console.log(`Processing new article: "${item.title}"`);
                    const { textContent, imageUrls } = await scrapeArticleContent(item.link, feedConfig.articleSelector, feedConfig.imageSelector);
                    if (!imageUrls || imageUrls.length === 0) {
                        console.log(`Skipped "${item.title}" due to no images found after advanced check.`);
                        continue;
                    }
                    const rewrittenContent = await rewriteArticleWithAI(textContent, imageUrls);
                    if (!rewrittenContent) continue;
                    const plainContent = rewrittenContent.replace(/<[^>]*>?/gm, '');
                    await articlesRef.add({
                        title: item.title || 'No Title',
                        link: item.link,
                        published: item.isoDate ? admin.firestore.Timestamp.fromDate(new Date(item.isoDate)) : admin.firestore.Timestamp.now(),
                        source: feedConfig.source,
                        category: feedConfig.category,
                        imageUrl: imageUrls[0],
                        content: rewrittenContent,
                        contentSnippet: plainContent.substring(0, 150) + '...',
                    });
                    console.log(`Successfully added AI-rewritten article: "${item.title}"`);
                } else {
                    console.log(`Skipped existing article: "${item.title}"`);
                }
            }
        } catch (error) {
            console.error(`Error processing feed from ${feedConfig.url}:`, error);
        }
    }
}

main().then(() => console.log('\nFeed fetch process completed.'));
