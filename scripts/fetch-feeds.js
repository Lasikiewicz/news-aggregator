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
    { url: 'https://www.pushsquare.com/feeds/latest', source: 'Push Square', category: 'PlayStation', articleSelector: '.text', imageSelector: 'img' },
    { url: 'https://news.xbox.com/en-us/feed/', source: 'Xbox Wire', category: 'Xbox', articleSelector: '.entry-content', imageSelector: 'img' },
    { url: 'https://www.purexbox.com/feeds/latest', source: 'Pure Xbox', category: 'Xbox', articleSelector: '.text', imageSelector: 'img' },
    { url: 'https://www.pcgamer.com/rss/', source: 'PC Gamer', category: 'PC', articleSelector: '#article-body', imageSelector: 'img' },
    { url: 'https://www.rockpapershotgun.com/feed', source: 'Rock Paper Shotgun', category: 'PC', articleSelector: '.article_body_content', imageSelector: 'img' },
    { url: 'https://www.nintendolife.com/feeds/latest', source: 'Nintendo Life', category: 'Nintendo', articleSelector: '.text', imageSelector: 'img' },
    { url: 'https://gonintendo.com/feed', source: 'GoNintendo', category: 'Nintendo', articleSelector: '.post-content', imageSelector: 'img' },
    { url: 'https://www.pocketgamer.com/rss/', source: 'Pocket Gamer', category: 'Mobile', articleSelector: '.acontent', imageSelector: 'img' },
    { url: 'https://toucharcade.com/feed', source: 'TouchArcade', category: 'Mobile', articleSelector: '.entry-content', imageSelector: 'img' },
];

async function scrapeArticleContent(url, articleSelector, imageSelector) {
    try {
        // --- PROXY FIX --- This tells axios to ignore any system proxy
        const { data: html } = await axios.get(url, { 
            headers: { 'User-Agent': 'Mozilla/5.0' },
            proxy: false 
        });
        const $ = cheerio.load(html);
        const articleBody = $(articleSelector);
        if (!articleBody.length) return { textContent: null, imageUrls: [] };

        const imageUrls = new Set();
        articleBody.find(imageSelector).each((i, elem) => {
            const img = $(elem);
            let src = img.attr('data-src') || img.attr('src');
            const srcset = img.attr('srcset');
            
            if (srcset) {
                const sources = srcset.split(',').map(s => s.trim().split(/\s+/)[0]);
                src = sources[sources.length - 1]; // pick the highest res
            }
            
            if (src && src.startsWith('http') && !src.includes('.svg') && !src.includes('avatar')) {
                imageUrls.add(src);
            }
        });
        
        articleBody.find('script, style').remove();
        const textContent = articleBody.text().trim().replace(/\s\s+/g, ' ');
        return { textContent, imageUrls: Array.from(imageUrls) };
    } catch (error) {
        // We will log the error, but the script will continue with other feeds.
        console.error(`Scraping failed for ${url}: ${error.message}`);
        return { textContent: null, imageUrls: [] };
    }
}

async function processArticle(text, imageUrls) {
    const imageList = imageUrls.map((url, i) => `Image ${i + 1}: ${url}`).join('\n');
    const prompt = `Act as a professional gaming journalist and web layout editor.
    TASK:
    1. Rewrite the following article text into an original, engaging blog post.
    2. Intelligently embed all the provided image URLs into the article content. Use standard <img> tags with class="article-image".
    3. Generate a list of relevant tags for the article.

    RULES:
    1. The final output must be pure, well-structured HTML.
    2. Do NOT use markdown. Do not wrap the output in \`\`\`html or end with \`\`\`.
    3. At the very end of your response, after all the HTML, add the tags formatted like this: ###TAGS### tag one, tag two, tag three ###/TAGS###

    PROVIDED IMAGE URLS:
    ${imageList}
    ARTICLE TEXT:
    "${text.substring(0, 5000)}"`;

    try {
        const model = genAI.getGenerativeModel({ model: AI_MODEL_NAME });
        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();
        
        responseText = responseText.replace(/^```(html)?/gm, '').replace(/```$/gm, '').trim();

        const tagRegex = /###TAGS###(.*?)###\/TAGS###/;
        const tagMatch = responseText.match(tagRegex);
        const tags = tagMatch ? tagMatch[1].split(',').map(tag => tag.trim()) : [];
        const content = responseText.replace(tagRegex, '').trim();

        return { content, tags };
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
            for (const item of feed.items.slice(0, 10)) {
                if (!item.link) continue;
                const q = articlesRef.where('link', '==', item.link);
                const querySnapshot = await q.get();
                if (querySnapshot.empty) {
                    console.log(`Processing new article: "${item.title}"`);
                    const { textContent, imageUrls } = await scrapeArticleContent(item.link, feedConfig.articleSelector, feedConfig.imageSelector);
                    if (!imageUrls || imageUrls.length === 0) {
                        console.log(`Skipped "${item.title}" due to no images found.`);
                        continue;
                    }
                    const processedData = await processArticle(textContent, imageUrls);
                    if (!processedData || !processedData.content) continue;
                    
                    const plainContent = processedData.content.replace(/<[^>]*>?/gm, '');
                    
                    await articlesRef.add({
                        title: item.title || 'No Title',
                        link: item.link,
                        published: item.isoDate ? admin.firestore.Timestamp.fromDate(new Date(item.isoDate)) : admin.firestore.Timestamp.now(),
                        source: feedConfig.source,
                        category: feedConfig.category,
                        imageUrl: imageUrls[0],
                        content: processedData.content,
                        tags: processedData.tags,
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
