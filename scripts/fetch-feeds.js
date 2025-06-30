const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');

const serviceAccount = require("../serviceAccountKey.json");

// --- CONFIGURATION ---
const MAIN_CATEGORIES = {
    XBOX: 'Xbox',
    PLAYSTATION: 'PlayStation',
    NINTENDO: 'Nintendo',
    PC: 'PC Gaming',
    MOBILE: 'Mobile'
};

const feeds = [
    // PlayStation
    { url: 'http://www.pushsquare.com/feeds/latest', category: MAIN_CATEGORIES.PLAYSTATION },
    { url: 'https://blog.playstation.com/feed/', category: MAIN_CATEGORIES.PLAYSTATION },
    { url: 'https://www.gematsu.com/c/playstation-5/feed', category: MAIN_CATEGORIES.PLAYSTATION },

    // Xbox
    { url: 'https://www.purexbox.com/feeds/latest', category: MAIN_CATEGORIES.XBOX },
    { url: 'https://news.xbox.com/en-us/feed/', category: MAIN_CATEGORIES.XBOX },
    { url: 'https://www.windowscentral.com/gaming/xbox/rss', category: MAIN_CATEGORIES.XBOX},

    // Nintendo
    { url: 'https://www.nintendolife.com/feeds/latest', category: MAIN_CATEGORIES.NINTENDO },
    { url: 'https://gonintendo.com/feeds/posts', category: MAIN_CATEGORIES.NINTENDO },

    // PC Gaming
    { url: 'https://www.rockpapershotgun.com/feed', category: MAIN_CATEGORIES.PC },
    { url: 'https://www.pcgamer.com/rss/', category: MAIN_CATEGORIES.PC },
    { url: 'https://www.dsogaming.com/feed/', category: MAIN_CATEGORIES.PC},

    // Mobile
    { url: 'https://toucharcade.com/feed', category: MAIN_CATEGORIES.MOBILE },
    { url: 'https://www.droidgamers.com/feed/', category: MAIN_CATEGORIES.MOBILE },
    { url: 'https://www.pocketgamer.com/rss/', category: MAIN_CATEGORIES.MOBILE },

    // Multi-platform (will be categorized by keywords)
    { url: 'https://www.videogameschronicle.com/feed/', category: 'Multi-platform' },
    { url: 'https://www.eurogamer.net/feed/news', category: 'Multi-platform' },
    { url: 'https://www.gamespot.com/feeds/news/', category: 'Multi-platform' },
];

const subCategoryKeywords = {
    [MAIN_CATEGORIES.PLAYSTATION]: {
        'PS5': ['PS5', 'PlayStation 5'], 'PS4': ['PS4', 'PlayStation 4'], 'PS3': ['PS3', 'PlayStation 3'],
        'PS2': ['PS2', 'PlayStation 2'], 'PS1': ['PS1', 'PlayStation 1'], 'PS Plus': ['PS Plus', 'PlayStation Plus'],
        'PS VR': ['PS VR', 'PSVR', 'PlayStation VR'], 'PS Vita': ['PS Vita', 'Vita'], 'PSP': ['PSP']
    },
    [MAIN_CATEGORIES.XBOX]: {
        'Xbox Series X': ['Xbox Series X', 'Series X'], 'Xbox Series S': ['Xbox Series S', 'Series S'],
        'Xbox 360': ['Xbox 360'], 'Gamepass': ['Game Pass']
    },
    [MAIN_CATEGORIES.NINTENDO]: {
        'Switch 2': ['Switch 2'], 'Switch': ['Switch'],
        'Wii U': ['Wii U'], '3DS': ['3DS'], 'DS': ['DS'], 'GBA': ['GBA', 'Game Boy Advance'],
        'Game Boy': ['Game Boy'], 'NES': ['NES']
    },
    [MAIN_CATEGORIES.PC]: {
        'PC Gamepass': ['PC Game Pass'], 'PCVR': ['PCVR', 'PC VR']
    },
    [MAIN_CATEGORIES.MOBILE]: {
        'iOS': ['iOS', 'iPhone'], 'Android': ['Android']
    }
};

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const rssParser = new Parser();
const articlesRef = db.collection("articles");

function determineCategories(title, feedCategory) {
    const searchTitle = title.toLowerCase();

    if (feedCategory !== 'Multi-platform') {
        const subCat = findSubCategory(searchTitle, feedCategory);
        return { category: feedCategory, subCategory: subCat };
    }

    for (const mainCategory of Object.values(MAIN_CATEGORIES)) {
        const subCat = findSubCategory(searchTitle, mainCategory);
        if (subCat !== 'General') {
            return { category: mainCategory, subCategory: subCat };
        }
    }
    
    return { category: 'General News', subCategory: 'General' };
}

function findSubCategory(searchTitle, mainCategory) {
    const categoryKeywords = subCategoryKeywords[mainCategory];
    if (!categoryKeywords) return 'General';

    const sortedSubCats = Object.keys(categoryKeywords).sort((a, b) => b.length - a.length);

    for (const subCat of sortedSubCats) {
        if (categoryKeywords[subCat].some(keyword => searchTitle.includes(keyword.toLowerCase()))) {
            return subCat;
        }
    }
    return 'General';
}

const extractImageUrl = async (articleUrl) => {
    if (!articleUrl) return null;
    try {
        const { data } = await axios.get(articleUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
            timeout: 10000
        });
        const $ = cheerio.load(data);
        return $('meta[property="og:image"]').attr('content') || null;
    } catch (error) {
        console.error(`[Image Scrape Error] Failed for ${articleUrl}: ${error.message}`);
        return null;
    }
};

const articleExists = async (guid) => {
    const doc = await articlesRef.doc(guid).get();
    return doc.exists;
};

const processArticle = async (item, feedInfo) => {
    const guid = item.guid || item.link;
    if (!guid || await articleExists(guid)) return;

    const imageUrl = await extractImageUrl(item.link);
    if (!imageUrl) {
        console.log(`[Skip] No image for article: ${item.title}`);
        return;
    }

    const { category, subCategory } = determineCategories(item.title, feedInfo.category);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
        You are a gaming news editor. Your task is to process an article summary and return a clean JSON object.
        Instructions:
        1.  **Rewrite Content:** Rewrite the provided article text into an original, engaging blog post of at least 200 words. Format it in clean HTML using tags like <p>, <h2>, <h3>, <ul>, and <li>. The tone must be neutral and informative.
        2.  **Include Image:** In the generated HTML, include this image URL at a suitable point: ${imageUrl}. Use an <img> tag with class="article-image".
        3.  **Generate Tags:** Create a JSON array of 3-5 relevant string tags for the article (e.g., ["Review", "RPG", "Square Enix"]).
        4.  **JSON Output:** Output ONLY the result as a single, valid JSON object with the keys: "content" and "tags". Do not include any other text, backticks, or markdown formatting in your response.

        Article Text:
        Title: ${item.title}
        Snippet: ${item.contentSnippet || item.content || ''}
    `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().replace(/^```json\s*|```\s*$/g, '').trim();
        const { content, tags } = JSON.parse(responseText);

        const newArticle = {
            guid: guid,
            title: item.title,
            link: item.link,
            content: content,
            contentSnippet: item.contentSnippet || 'Read more...',
            published: item.isoDate ? admin.firestore.Timestamp.fromDate(new Date(item.isoDate)) : admin.firestore.FieldValue.serverTimestamp(),
            category: category,
            subCategory: subCategory,
            tags: tags || [],
            imageUrl: imageUrl,
            source: feedInfo.source,
        };

        await articlesRef.doc(guid).set(newArticle);
        console.log(`[Success] Added '${item.title}' to Category: ${category}, Sub-Category: ${subCategory}`);
    } catch (aiError) {
        console.error(`[AI Error] Failed for "${item.title}":`, aiError.message);
    }
};

const fetchAllFeedsConcurrently = async () => {
    console.log(`--- Starting concurrent feed fetch at ${new Date().toISOString()} ---`);
    
    const feedPromises = feeds.map(async (feedConfig) => {
        try {
            const parsedFeed = await rssParser.parseURL(feedConfig.url);
            console.log(`[Processing Feed] ${parsedFeed.title} (${parsedFeed.items.length} items)`);
            
            const articlePromises = parsedFeed.items.map(item => {
                return processArticle(item, { category: feedConfig.category, source: parsedFeed.title });
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

    // --- FIX ---
    // Forcefully exit the script with a success code (0).
    // This tells the GitHub Action runner that the step is complete.
    process.exit(0);
};

fetchAllFeedsConcurrently();
