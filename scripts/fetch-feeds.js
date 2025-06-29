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
const feeds = [
    { url: 'https://blog.playstation.com/feed/', source: 'PlayStation Blog', category: 'PlayStation', articleSelector: '.entry-content', imageSelector: 'img' },
    { url: 'https://news.xbox.com/en-us/feed/', source: 'Xbox Wire', category: 'Xbox', articleSelector: '.entry-content', imageSelector: 'img' },
    { url: 'https://www.pcgamer.com/rss/', source: 'PC Gamer', category: 'PC', articleSelector: '#article-body', imageSelector: 'img' },
];

async function scrapeArticleContent(url, articleSelector, imageSelector) {
    try {
        const { data: html } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(html);

        const articleBody = $(articleSelector);
        if (!articleBody.length) {
            return { textContent: null, imageUrls: [] };
        }

        // Find all images within the article body and get their src
        const imageUrls = [];
        articleBody.find(imageSelector).each((i, elem) => {
            const src = $(elem).attr('src');
            if (src && src.startsWith('http')) {
                imageUrls.push(src);
            }
        });
        
        articleBody.find('script, style, .ad-container').remove();
        const textContent = articleBody.text().trim().replace(/\s\s+/g, ' ');

        return { textContent, imageUrls };
    } catch (error) {
        console.error(`Scraping failed for ${url}: ${error.message}`);
        return { textContent: null, imageUrls: [] };
    }
}

async function rewriteArticleWithAI(text, imageUrls) {
    if (!text) return null;
    
    // Convert the array of image URLs to a string list for the prompt
    const imageList = imageUrls.map((url, i) => `Image ${i + 1}: ${url}`).join('\n');

    const prompt = `Act as a professional gaming journalist and web layout editor.
    TASK: Rewrite the following article text into an original, engaging blog post. Then, intelligently embed all the provided image URLs into the article content.
    
    RULES:
    1. The final output must be pure, well-structured HTML.
    2. Do NOT use markdown. Do not wrap the output in \`\`\`html.
    3. Weave the images into the article where they make the most sense contextually. Use standard <img> tags.
    4. For each image, add the class="article-image" attribute to the <img> tag.
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
            const latestItems = feed.items.slice(0, 5);

            for (const item of latestItems) {
                if (!item.link) continue;
                const q = articlesRef.where('link', '==', item.link);
                const querySnapshot = await q.get();

                if (querySnapshot.empty) {
                    console.log(`Processing new article: "${item.title}"`);
                    let { textContent, imageUrls } = await scrapeArticleContent(item.link, feedConfig.articleSelector, feedConfig.imageSelector);
                    
                    // If no images are found in the article, skip it entirely.
                    if (!imageUrls || imageUrls.length === 0) {
                        console.log(`Skipped "${item.title}" due to no images found.`);
                        continue;
                    }

                    const rewrittenContent = await rewriteArticleWithAI(textContent, imageUrls);
                    if (!rewrittenContent) continue;
                    
                    const plainContent = rewrittenContent.replace(/<[^>]*>?/gm, '');
                    const contentSnippet = plainContent.substring(0, 150) + '...';

                    await articlesRef.add({
                        title: item.title || 'No Title',
                        link: item.link,
                        published: item.isoDate ? admin.firestore.Timestamp.fromDate(new Date(item.isoDate)) : admin.firestore.Timestamp.now(),
                        source: feedConfig.source,
                        category: feedConfig.category,
                        imageUrl: imageUrls[0], // Use the first image as the main hero image
                        content: rewrittenContent, // Content now includes all <img> tags
                        contentSnippet: contentSnippet,
                    });
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

main().then(() => console.log('\nFeed fetch process completed.'));