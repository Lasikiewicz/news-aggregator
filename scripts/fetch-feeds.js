const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');

const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const rssParser = new Parser();
const articlesRef = db.collection("articles");

let feeds = [];
let prompts = { relevance: '', article: '' };
const subCategoryKeywords = {
    'PlayStation': { 'PS5': ['PS5', 'PlayStation 5'], 'PS4': ['PS4', 'PlayStation 4'], 'PS VR': ['PS VR', 'PSVR'], 'PS Plus': ['PS Plus'] },
    'Xbox': { 'Xbox Series X': ['Xbox Series X', 'Series X'], 'Xbox Series S': ['Xbox Series S', 'Series S'], 'Gamepass': ['Game Pass'] },
    'Nintendo': { 'Switch': ['Switch', 'Nintendo Switch'], 'Switch 2': ['Switch 2'] },
    'PC Gaming': { 'PC Gamepass': ['PC Game Pass'], 'PCVR': ['PCVR'] },
    'Mobile': { 'iOS': ['iOS', 'iPhone'], 'Android': ['Android'] }
};

const loadConfigFromFirestore = async () => {
    try {
        const feedsDoc = await db.collection('config').doc('feeds').get();
        if (feedsDoc.exists) feeds = feedsDoc.data().urls || [];
        else { console.error("FATAL: 'feeds' document not found."); process.exit(1); }

        const promptsDoc = await db.collection('config').doc('prompts').get();
        if (promptsDoc.exists) prompts = promptsDoc.data();
        else { console.error("FATAL: 'prompts' document not found."); process.exit(1); }
    } catch (error) {
        console.error("FATAL: Could not load configuration from Firestore.", error);
        process.exit(1);
    }
};

const isArticleGamingRelated = async (title, snippet) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = prompts.relevance.replace('${title}', title).replace('${snippet}', snippet || '');
        const result = await model.generateContent(prompt);
        return result.response.text().trim().toUpperCase() === 'YES';
    } catch (error) {
        console.error(`[AI Relevance Check Error] for "${title}":`, error.message);
        return false;
    }
};

const scrapeArticleContent = async (articleUrl) => {
    if (!articleUrl) return { heroImage: null, bodyImages: [] };
    try {
        const { data } = await axios.get(articleUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }, timeout: 10000 });
        const $ = cheerio.load(data);
        const seenUrls = new Set();
        const bodyImages = [];
        let heroImage = $('meta[property="og:image"]').attr('content') || null;

        $('article img, .post-content img, .entry-content img, .article-body img').each((i, elem) => {
            const src = $(elem).attr('src');
            if (!src) return;
            // FIX: More robust URL resolution
            let absoluteSrc;
            try {
                absoluteSrc = new URL(src, articleUrl).href;
            } catch (e) {
                // Ignore invalid URLs
                return;
            }
            if (!seenUrls.has(absoluteSrc) && !absoluteSrc.includes('avatar') && !absoluteSrc.includes('data:image') && !absoluteSrc.endsWith('.svg')) {
                bodyImages.push(absoluteSrc);
                seenUrls.add(absoluteSrc);
            }
        });

        if (!heroImage && bodyImages.length > 0) heroImage = bodyImages.shift();
        if(heroImage) seenUrls.add(heroImage);

        return { heroImage, bodyImages: bodyImages.filter(img => !seenUrls.has(img)) };
    } catch (error) {
        console.error(`[Image Scrape Error] for ${articleUrl}: ${error.message}`);
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

    if (!await isArticleGamingRelated(item.title, item.contentSnippet || item.content)) {
        console.log(`[Skip] Article not relevant: ${item.title}`);
        return;
    }
    
    console.log(`[Relevant] Processing article: ${item.title}`);

    const { heroImage, bodyImages } = await scrapeArticleContent(item.link);
    if (!heroImage) {
        console.log(`[Skip] No hero image for article: ${item.title}`);
        return;
    }

    const { category, subCategory } = determineCategories(item.title, feedInfo.category);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    // FIX: Updated prompt to be more explicit about using the images.
    const prompt = prompts.article
        .replace('${title}', item.title)
        .replace('${snippet}', item.contentSnippet || item.content || '')
        .replace('${imageList}', JSON.stringify(bodyImages));

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().replace(/^```json\s*|```\s*$/g, '').trim();
        const { title_short, content, tags } = JSON.parse(responseText);

        const newArticle = {
            guid, title: item.title, title_short, link: item.link, content,
            contentSnippet: item.contentSnippet || 'Read more...',
            published: item.isoDate ? admin.firestore.Timestamp.fromDate(new Date(item.isoDate)) : admin.firestore.FieldValue.serverTimestamp(),
            category, subCategory, tags: tags || [], imageUrl: heroImage, bodyImages, source: feedInfo.source,
        };

        await articlesRef.doc(guid).set(newArticle);
        console.log(`[Success] Added '${title_short}'`);
    } catch (aiError) {
        console.error(`[AI Error] Failed for "${item.title}":`, aiError.message);
    }
};

const fetchAllFeedsConcurrently = async () => {
    console.log(`--- Starting fetch at ${new Date().toISOString()} ---`);
    await loadConfigFromFirestore();
    console.log(`Loaded ${feeds.length} feeds and prompts from Firestore.`);

    const feedPromises = feeds.map(async (feedConfig) => {
        try {
            const parsedFeed = await rssParser.parseURL(feedConfig.url);
            console.log(`[Processing Feed] ${parsedFeed.title} (${parsedFeed.items.length} items)`);
            const articlePromises = parsedFeed.items.map(item => processArticle(item, { category: feedConfig.category, source: parsedFeed.title }));
            await Promise.allSettled(articlePromises);
        } catch (error) {
            console.error(`[Feed Error] Failed for ${feedConfig.url}: ${error.message}`);
        }
    });

    await Promise.allSettled(feedPromises);
    console.log(`--- Finished all processing at ${new Date().toISOString()} ---`);
    await admin.app().delete();
    console.log('--- Firebase connection closed. ---');
    process.exit(0);
};

function determineCategories(title, feedCategory) {
    const searchTitle = title.toLowerCase();
    if (feedCategory !== 'Multi-platform') return { category: feedCategory, subCategory: findSubCategory(searchTitle, feedCategory) };
    for (const mainCategory of Object.keys(subCategoryKeywords)) {
        const subCat = findSubCategory(searchTitle, mainCategory);
        if (subCat !== 'General') return { category: mainCategory, subCategory: subCat };
    }
    return { category: 'General News', subCategory: 'General' };
}

function findSubCategory(searchTitle, mainCategory) {
    const keywords = subCategoryKeywords[mainCategory];
    if (!keywords) return 'General';
    const sortedSubCats = Object.keys(keywords).sort((a, b) => b.length - a.length);
    for (const subCat of sortedSubCats) {
        if (keywords[subCat].some(keyword => searchTitle.includes(keyword.toLowerCase()))) return subCat;
    }
    return 'General';
}

fetchAllFeedsConcurrently();
