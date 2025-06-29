const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');

const serviceAccount = require("../serviceAccountKey.json");

// --- CONFIGURATION ---
const feeds = [
    { url: 'https://www.gematsu.com/feed', category: 'Playstation' },
    { url: 'http://www.pushsquare.com/feeds/latest', category: 'Playstation' },
    { url: 'https://www.videogameschronicle.com/platforms/playstation/feed/', category: 'Playstation' },
    { url: 'https://www.purexbox.com/feeds/latest', category: 'Xbox' },
    { url: 'https://www.videogameschronicle.com/platforms/xbox/feed/', category: 'Xbox' },
    { url: 'https://www.nintendolife.com/feeds/latest', category: 'Nintendo' },
    { url: 'https://www.videogameschronicle.com/platforms/nintendo/feed/', category: 'Nintendo' },
    { url: 'https://www.rockpapershotgun.com/feed', category: 'PC' },
    { url: 'https://www.pcgamer.com/rss/', category: 'PC' },
    { url: 'https://www.videogameschronicle.com/platforms/pc/feed/', category: 'PC' }
];

// --- INITIALIZATION ---
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const rssParser = new Parser();
const articlesRef = db.collection("articles");

const articleExists = async (guid) => {
    const querySnapshot = await articlesRef.where("guid", "==", guid).get();
    return !querySnapshot.empty;
};

/**
 * Extracts the main image URL by visiting the article page and finding the 'og:image' meta tag.
 * @param {string} articleUrl The URL of the article to scrape.
 * @returns {Promise<string|null>} The image URL or null if not found.
 */
const extractImageUrl = async (articleUrl) => {
    if (!articleUrl) {
        return null;
    }
    try {
        const { data } = await axios.get(articleUrl, {
            // Use a common user-agent to avoid being blocked
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const $ = cheerio.load(data);
        const imageUrl = $('meta[property="og:image"]').attr('content');
        
        if (imageUrl) {
            console.log(`Image found for ${articleUrl}`);
            return imageUrl;
        } else {
            console.log(`No 'og:image' tag found for ${articleUrl}`);
            return null;
        }
    } catch (error) {
        console.error(`Failed to fetch or parse article URL ${articleUrl}:`, error.message);
        return null;
    }
};

const fetchFeeds = async () => {
    console.log(`Starting feed fetch at ${new Date().toISOString()}`);

    for (const feed of feeds) {
        try {
            const parsedFeed = await rssParser.parseURL(feed.url);
            console.log(`\nProcessing feed: ${parsedFeed.title} (${parsedFeed.items.length} items)`);

            for (const item of parsedFeed.items) {
                const guid = item.guid || item.link;
                if (!guid) {
                    console.log(`Skipping article with no guid: ${item.title}`);
                    continue;
                }

                if (await articleExists(guid)) {
                    continue;
                }

                const imageUrl = await extractImageUrl(item.link);
                if (!imageUrl) {
                    console.log(`Skipping article with no suitable image: ${item.title}`);
                    continue;
                }

                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                const prompt = `
                    1. Rewrite the following article text into an original, engaging blog post, formatted in HTML. Use tags like <p>, <h2>, <h3>, <ul>, and <li> for structure. The tone should be neutral and informative.
                    2. In the generated HTML, include the provided image URL at a suitable point in the article, using an <img> tag with a "style" attribute for basic responsiveness (e.g., style="width: 100%; height: auto; border-radius: 0.75rem;").
                    3. Generate a list of relevant tags for the article (e.g., "Xbox", "Gamepass", "RPG").
                    4. Generate a sub-category for the article (e.g., "Gamepass", "Hardware", "PS5").
                    5. Output the result as a JSON object with keys: "content", "tags", "subCategory". Do not include any other text or markdown formatting in your response.
                    
                    Article Text:
                    ${item.title}\n\n${item.contentSnippet || ''}

                    Image URL:
                    ${imageUrl}
                `;

                try {
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const text = await response.text();

                    const cleanedText = text.replace(/^```json\s*|```\s*$/g, '').trim();
                    const jsonResponse = JSON.parse(cleanedText);
                    const { content, tags, subCategory } = jsonResponse;

                    const newArticle = {
                        guid: guid,
                        title: item.title,
                        link: item.link,
                        content: content,
                        contentSnippet: item.contentSnippet || 'Read more...',
                        published: item.isoDate ? admin.firestore.Timestamp.fromDate(new Date(item.isoDate)) : admin.firestore.FieldValue.serverTimestamp(),
                        category: feed.category,
                        subCategory: subCategory || null,
                        tags: tags || [],
                        imageUrl: imageUrl,
                        source: parsedFeed.title,
                    };

                    await articlesRef.add(newArticle);
                    console.log(`>>> Successfully added article: ${item.title}`);
                } catch (aiError) {
                    console.error(`AI generation or JSON parsing failed for "${item.title}":`, aiError.message);
                }
            }
        } catch (error) {
            console.error(`Failed to process feed ${feed.url}:`, error.message);
        }
    }
    console.log('Finished feed fetch.');
};

fetchFeeds();