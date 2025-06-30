const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');

// It's recommended to store your service account key securely and not directly in the project folder
const serviceAccount = require("../serviceAccountKey.json");

// --- CONFIGURATION ---
// Revised and categorized feeds to match the desired front-end structure.
const feeds = [
    // PlayStation
    { url: 'https://www.gematsu.com/c/playstation-5/feed', category: 'PlayStation' },
    { url: 'http://www.pushsquare.com/feeds/latest', category: 'PlayStation' },
    { url: 'https://blog.playstation.com/feed/', category: 'PlayStation' },

    // Xbox
    { url: 'https://www.purexbox.com/feeds/latest', category: 'Xbox' },
    { url: 'https://news.xbox.com/en-us/feed/', category: 'Xbox' },
    { url: 'https://www.windowscentral.com/gaming/xbox/rss', category: 'Xbox'},

    // Nintendo
    { url: 'https://www.nintendolife.com/feeds/latest', category: 'Nintendo' },
    { url: 'https://www.nintendo.com/us/whatsnew/feed/', category: 'Nintendo' },
    { url: 'https://gonintendo.com/feeds/posts', category: 'Nintendo' },

    // PC Gaming
    { url: 'https://www.rockpapershotgun.com/feed', category: 'PC Gaming' },
    { url: 'https://www.pcgamer.com/rss/', category: 'PC Gaming' },
    { url: 'https://www.dsogaming.com/feed/', category: 'PC Gaming'},

    // Mobile
    { url: 'https://toucharcade.com/feed', category: 'Mobile' },
    { url: 'https://www.droidgamers.com/feed/', category: 'Mobile'},
    { url: 'https://www.pocketgamer.com/rss/', category: 'Mobile' },

    // General sources that the AI will categorize
    { url: 'https://www.videogameschronicle.com/feed/', category: 'Multi-platform' },
    { url: 'https://www.eurogamer.net/feed/news', category: 'Multi-platform' },
    { url: 'https://www.gamespot.com/feeds/news/', category: 'Multi-platform' },
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
 * Creates a dynamic prompt for the AI based on the article's main category.
 * @param {string} category The main category of the article (e.g., "PlayStation").
 * @returns {string} The contextual prompt for the AI.
 */
const getSubCategoryPrompt = (category) => {
    switch (category) {
        case 'PlayStation':
            return "Generate a sub-category from this list if relevant: 'PS5', 'PS4', 'PS Plus', 'PS VR', 'Deals'. Otherwise, generate a suitable, specific sub-category.";
        case 'Xbox':
            return "Generate a sub-category from this list if relevant: 'Xbox Series X', 'Xbox Series S', 'Game Pass', 'Deals'. Otherwise, generate a suitable, specific sub-category.";
        case 'Nintendo':
            return "Generate a sub-category from this list if relevant: 'Switch', 'Switch 2', 'eShop', 'Deals'. Otherwise, generate a suitable, specific sub-category.";
        case 'PC Gaming':
             return "Generate a sub-category from this list if relevant: 'Hardware', 'Steam', 'Epic Games Store', 'Free Games'. Otherwise, generate a suitable, specific sub-category.";
        case 'Mobile':
            return "Generate a sub-category from this list if relevant: 'iOS', 'Android', 'Apple Arcade'. Otherwise, generate a suitable, specific sub-category.";
        default:
            return "Generate a suitable, specific sub-category for this article (e.g., 'Game Review', 'Industry News').";
    }
}


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
        return;
    }

    const imageUrl = await extractImageUrl(item.link);
    if (!imageUrl) {
        console.log(`[Skip] No image for article: ${item.title}`);
        return;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Get the dynamic sub-category instruction for the prompt
    const subCategoryInstruction = getSubCategoryPrompt(feedInfo.category);

    const prompt = `
        You are an expert gaming news editor. Your task is to process an article and return a clean JSON object.
        
        Instructions:
        1.  **Rewrite Content:** Rewrite the provided article text into an original, engaging blog post of at least 200 words. Format it in clean HTML using tags like <p>, <h2>, <h3>, <ul>, and <li>. The tone must be neutral and informative.
        2.  **Include Image:** In the generated HTML, include this image URL at a suitable point: ${imageUrl}. Use an <img> tag with class="article-image".
        3.  **Generate Tags:** Create a list of 3-5 relevant string tags for the article (e.g., ["Xbox", "Gamepass", "RPG"]).
        4.  **Generate Sub-Category:** ${subCategoryInstruction}
        5.  **Determine Main Category**: If the provided category is 'Multi-platform', determine the most appropriate main category from this list: "PlayStation", "Xbox", "Nintendo", "PC Gaming". Otherwise, use the provided category.
        6.  **JSON Output:** Output ONLY the result as a single, valid JSON object with keys: "content", "tags", "subCategory", "mainCategory". Do not include any text, backticks, or markdown formatting in your response.

        Article Text:
        Title: ${item.title}
        Snippet: ${item.contentSnippet || item.content || ''}
        Provided Category: ${feedInfo.category}
    `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().replace(/^```json\s*|```\s*$/g, '').trim();
        const { content, tags, subCategory, mainCategory } = JSON.parse(responseText);

        const newArticle = {
            guid: guid,
            title: item.title,
            link: item.link,
            content: content,
            contentSnippet: item.contentSnippet || 'Read more...',
            published: item.isoDate ? admin.firestore.Timestamp.fromDate(new Date(item.isoDate)) : admin.firestore.FieldValue.serverTimestamp(),
            category: mainCategory || feedInfo.category, // Use the AI's category, or fall back to the feed's
            subCategory: subCategory || 'General',
            tags: tags || [],
            imageUrl: imageUrl,
            source: feedInfo.source,
        };

        await articlesRef.doc(guid).set(newArticle);
        console.log(`[Success] Added '${item.title}' to category: ${newArticle.category}`);
    } catch (aiError) {
        console.error(`[AI Error] Failed for "${item.title}":`, aiError.message);
    }
};


/**
 * Main function to fetch all feeds concurrently.
 */
const fetchAllFeedsConcurrently = async () => {
    console.log(`--- Starting concurrent feed fetch at ${new Date().toISOString()} ---`);
    
    const feedPromises = feeds.map(async (feedConfig) => {
        try {
            const parsedFeed = await rssParser.parseURL(feedConfig.url);
            console.log(`[Processing Feed] ${parsedFeed.title} (${parsedFeed.items.length} items)`);
            
            const articlePromises = parsedFeed.items.map(item => {
                const feedInfo = { category: feedConfig.category, source: parsedFeed.title };
                return processArticle(item, feedInfo);
            });
            
            await Promise.allSettled(articlePromises);

        } catch (error) {
            console.error(`[Feed Error] Failed to process feed ${feedConfig.url}: ${error.message}`);
        }
    });

    await Promise.allSettled(feedPromises);

    console.log(`--- Finished all feed processing at ${new Date().toISOString()} ---`);
    
    await admin.app().delete();
    console.log('--- Firebase connection closed. Script finished. ---');
};

fetchAllFeedsConcurrently();
