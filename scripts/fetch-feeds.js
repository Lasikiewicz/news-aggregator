const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');

// It's recommended to store your service account key securely and not directly in the project folder
const serviceAccount = require("../serviceAccountKey.json");

// --- CONFIGURATION ---
// Corrected and expanded the list of feed sources.
const feeds = [
    // Playstation
    { url: 'https://www.gematsu.com/feed', category: 'Playstation' },
    { url: 'http://www.pushsquare.com/feeds/latest', category: 'Playstation' },
    { url: 'https://blog.playstation.com/feed/', category: 'Playstation' },

    // Xbox
    { url: 'https://www.purexbox.com/feeds/latest', category: 'Xbox' },
    { url: 'https://news.xbox.com/en-us/feed/', category: 'Xbox' },

    // Nintendo
    { url: 'https://www.nintendolife.com/feeds/latest', category: 'Nintendo' },
    { url: 'https://www.nintendo.com/us/whatsnew/feed/', category: 'Nintendo' },

    // PC
    { url: 'https://www.rockpapershotgun.com/feed', category: 'PC' },
    { url: 'https://www.pcgamer.com/rss/', category: 'PC' },

    // Multi-platform
    { url: 'https://www.videogameschronicle.com/feed/', category: 'Multi-platform' },
    { url: 'https://www.eurogamer.net/feed/news', category: 'Multi-platform' },
    { url: 'https://www.gamespot.com/feeds/news/', category: 'Multi-platform' },
    { url: 'https://feeds.feedburner.com/ign/all', category: 'Multi-platform' },
    { url: 'https://kotaku.com/rss', category: 'Multi-platform' },
];


// --- INITIALIZATION ---
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const rssParser = new Parser();
const articlesRef = db.collection("articles");

/**
 * Checks if an article with the given GUID already exists in Firestore.
 * @param {string} guid The unique identifier for the article.
 * @returns {Promise<boolean>} True if the article exists, false otherwise.
 */
const articleExists = async (guid) => {
    const docRef = articlesRef.doc(guid);
    const doc = await docRef.get();
    return doc.exists;
};

/**
 * Extracts the main image URL by visiting the article page and finding the 'og:image' meta tag.
 * @param {string} articleUrl The URL of the article to scrape.
 * @returns {Promise<string|null>} The image URL or null if not found.
 */
const extractImageUrl = async (articleUrl) => {
    if (!articleUrl) return null;
    try {
        const { data } = await axios.get(articleUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
            timeout: 10000 // 10-second timeout
        });
        const $ = cheerio.load(data);
        return $('meta[property="og:image"]').attr('content') || null;
    } catch (error) {
        console.error(`[Image Scrape Error] Failed for ${articleUrl}: ${error.message}`);
        return null;
    }
};

/**
 * Processes a single article item from an RSS feed.
 * @param {object} item The article item from the RSS feed.
 * @param {object} feedInfo Contains metadata about the feed (category, source title).
 */
const processArticle = async (item, feedInfo) => {
    const guid = item.guid || item.link;
    if (!guid) {
        console.log(`[Skip] No GUID for article: ${item.title}`);
        return;
    }

    if (await articleExists(guid)) {
        // console.log(`[Skip] Article already exists: ${item.title}`);
        return;
    }

    const imageUrl = await extractImageUrl(item.link);
    if (!imageUrl) {
        console.log(`[Skip] No image for article: ${item.title}`);
        return;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
        1. Rewrite the following article text into an original, engaging blog post of at least 200 words, formatted in HTML. Use tags like <p>, <h2>, <h3>, <ul>, and <li>. The tone should be neutral and informative.
        2. In the generated HTML, include this image URL at a suitable point: ${imageUrl}. Use an <img> tag with the class "article-image" and style for responsiveness (e.g., style="width: 100%; height: auto; border-radius: 0.75rem;").
        3. Generate a list of 3-5 relevant string tags for the article (e.g., ["Xbox", "Gamepass", "RPG"]).
        4. Generate a single, specific sub-category string for the article based on its content (e.g., "Game Pass", "PS5 Update", "Indie Showcase").
        5. Output ONLY the result as a single, valid JSON object with keys: "content", "tags", "subCategory". Do not include any other text, backticks, or markdown formatting in your response.

        Article Text:
        Title: ${item.title}
        Snippet: ${item.contentSnippet || item.content || ''}
    `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().replace(/^```json\s*|```\s*$/g, '').trim();
        const { content, tags, subCategory } = JSON.parse(responseText);

        const newArticle = {
            guid: guid,
            title: item.title,
            link: item.link,
            content: content,
            contentSnippet: item.contentSnippet || 'Read more...',
            published: item.isoDate ? admin.firestore.Timestamp.fromDate(new Date(item.isoDate)) : admin.firestore.FieldValue.serverTimestamp(),
            category: feedInfo.category,
            subCategory: subCategory || 'General',
            tags: tags || [],
            imageUrl: imageUrl,
            source: feedInfo.source,
        };

        await articlesRef.doc(guid).set(newArticle);
        console.log(`[Success] Added article: ${item.title}`);
    } catch (aiError) {
        console.error(`[AI Error] Failed for "${item.title}":`, aiError.message);
    }
};


/**
 * Main function to fetch all feeds concurrently.
 */
const fetchAllFeedsConcurrently = async () => {
    console.log(`--- Starting concurrent feed fetch at ${new Date().toISOString()} ---`);
    
    // Create an array of promises, one for each feed to be processed.
    const feedPromises = feeds.map(async (feedConfig) => {
        try {
            const parsedFeed = await rssParser.parseURL(feedConfig.url);
            console.log(`[Processing Feed] ${parsedFeed.title} (${parsedFeed.items.length} items)`);
            
            // For each feed, create an array of promises to process its articles concurrently.
            const articlePromises = parsedFeed.items.map(item => {
                const feedInfo = { category: feedConfig.category, source: parsedFeed.title };
                return processArticle(item, feedInfo);
            });
            
            // Wait for all articles in the current feed to be processed.
            await Promise.allSettled(articlePromises);

        } catch (error) {
            console.error(`[Feed Error] Failed to process feed ${feedConfig.url}: ${error.message}`);
        }
    });

    // Wait for all feed processing promises to complete.
    await Promise.allSettled(feedPromises);

    console.log(`--- Finished all feed processing at ${new Date().toISOString()} ---`);
};

fetchAllFeedsConcurrently();
