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

// FIX: New function to check if an article is relevant to gaming
const isArticleGamingRelated = async (title, snippet) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Based on the title and snippet, is this article about video games, gaming hardware, or the gaming industry? Respond with only "YES" or "NO".\n\nTitle: "${title}"\nSnippet: "${snippet}"`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim().toUpperCase();
        return text === 'YES';
    } catch (error) {
        console.error(`[AI Relevance Check Error] for "${title}":`, error.message);
        return false; // Default to false on error
    }
};

const scrapeArticleContent = async (articleUrl) => {
    if (!articleUrl) return { heroImage: null, bodyImages: [] };
    try {
        const { data } = await axios.get(articleUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
            timeout: 10000
        });
        const $ = cheerio.load(data);
        const seenUrls = new Set();
        const bodyImages = [];
        let heroImage = $('meta[property="og:image"]').attr('content') || null;

        $('article img, .post-content img, .entry-content img').each((i, elem) => {
            const src = $(elem).attr('src');
            if (!src) return;
            const absoluteSrc = new URL(src, articleUrl).href;
            if (!seenUrls.has(absoluteSrc) && !absoluteSrc.includes('avatar') && !absoluteSrc.includes('data:image')) {
                bodyImages.push(absoluteSrc);
                seenUrls.add(absoluteSrc);
            }
        });

        if (!heroImage && bodyImages.length > 0) {
            heroImage = bodyImages.shift();
        }
        if(heroImage) seenUrls.add(heroImage);

        return { heroImage, bodyImages: bodyImages.filter(img => !seenUrls.has(img)) };
    } catch (error) {
        console.error(`[Image Scrape Error] Failed for ${articleUrl}: ${error.message}`);
        return { heroImage: null, bodyImages: [] };
    }
};

const articleExists = async (guid) => {
    const doc = await articlesRef.doc(guid).get();
    return doc.exists;
};

const processArticle = async (item, feedInfo) => {
    const guid = item.guid || item.link;
    if (!guid || await articleExists(guid)) return;

    // FIX: Perform relevance check first
    const isRelevant = await isArticleGamingRelated(item.title, item.contentSnippet || item.content);
    if (!isRelevant) {
        console.log(`[Skip] Article not relevant to gaming: ${item.title}`);
        return;
    }

    const { heroImage, bodyImages } = await scrapeArticleContent(item.link);
    if (!heroImage) {
        console.log(`[Skip] No hero image for article: ${item.title}`);
        return;
    }

    const { category, subCategory } = determineCategories(item.title, feedInfo.category);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
        You are a gaming news editor. Your task is to process an article summary and return a clean JSON object.
        Instructions:
        1.  **Generate Short Title:** Create a catchy, concise headline, 5-8 words long.
        2.  **Rewrite Content:** Rewrite the provided article text into an original, engaging blog post of at least 500 words. Format it in clean HTML using tags like <p>, <h2>, <h3>, <ul>, and <li>. The tone must be neutral and informative.
        3.  **Insert Images:** From the provided imageList, naturally and contextually weave the image URLs into the generated HTML content. Use the format <img src='URL_FROM_LIST' class='article-image' alt='A descriptive alt text based on the context'>.
        4.  **Generate Tags:** Create a JSON array of 3-5 relevant string tags for the article (e.g., ["Review", "RPG", "Square Enix"]).
        5.  **JSON Output:** Output ONLY the result as a single, valid JSON object with the keys: "title_short", "content", and "tags". Do not include any other text, backticks, or markdown formatting.

        Article Text:
        Title: ${item.title}
        Snippet: ${item.contentSnippet || item.content || ''}
        
        imageList: ${JSON.stringify(bodyImages)}
    `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().replace(/^```json\s*|```\s*$/g, '').trim();
        const { title_short, content, tags } = JSON.parse(responseText);

        const newArticle = {
            guid: guid,
            title: item.title,
            title_short: title_short, // Save the new short title
            link: item.link,
            content: content, // Content now includes <img> tags
            contentSnippet: item.contentSnippet || 'Read more...',
            published: item.isoDate ? admin.firestore.Timestamp.fromDate(new Date(item.isoDate)) : admin.firestore.FieldValue.serverTimestamp(),
            category: category,
            subCategory: subCategory,
            tags: tags || [],
            imageUrl: heroImage,
            bodyImages: bodyImages, // Keep for potential future use, but they are now in content
            source: feedInfo.source,
        };

        await articlesRef.doc(guid).set(newArticle);
        console.log(`[Success] Added '${title_short}' to Category: ${category}`);
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
    process.exit(0);
};

fetchAllFeedsConcurrently();
