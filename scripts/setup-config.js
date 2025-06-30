const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

// --- INITIALIZE FIREBASE ADMIN ---
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// --- DEFAULT CONFIGURATION DATA ---

// A default list of RSS feeds to start with
const defaultFeeds = [
    { url: 'http://www.pushsquare.com/feeds/latest', category: 'PlayStation' },
    { url: 'https://blog.playstation.com/feed/', category: 'PlayStation' },
    { url: 'https://www.gematsu.com/c/playstation-5/feed', category: 'PlayStation' },
    { url: 'https://www.purexbox.com/feeds/latest', category: 'Xbox' },
    { url: 'https://news.xbox.com/en-us/feed/', category: 'Xbox' },
    { url: 'https://www.nintendolife.com/feeds/latest', category: 'Nintendo' },
    { url: 'https://www.rockpapershotgun.com/feed', category: 'PC Gaming' },
    { url: 'https://www.pcgamer.com/rss/', category: 'PC Gaming' },
    { url: 'https://www.dsogaming.com/feed/', category: 'PC Gaming'},
    { url: 'https://toucharcade.com/feed', category: 'Mobile' },
    { url: 'https://www.droidgamers.com/feed/', category: 'Mobile' },
    { url: 'https://www.pocketgamer.com/rss/', category: 'Mobile' },
    { url: 'https://www.videogameschronicle.com/feed/', category: 'Multi-platform' },
    { url: 'https://www.eurogamer.net/feed/news', category: 'Multi-platform' },
    { url: 'https://www.gamespot.com/feeds/news/', category: 'Multi-platform' },
];

// Default AI prompts
const defaultPrompts = {
    relevance: `Analyze the following title and snippet. Is the primary subject about video games, gaming hardware (like consoles or PC parts), gaming industry news, or official merchandise/books for a specific game (like "Persona 5 Art Book" or "Bloodborne Strategy Guide")? Respond with only "YES" or "NO". Do not classify general tech news, movie news, or unrelated product deals as "YES".

Title: "\${title}"
Snippet: "\${snippet}"`,
    article: `You are a gaming news editor. Process an article summary and return a clean JSON object.
Instructions:
1.  **Generate Short Title:** Create a catchy, concise headline, 5-8 words long.
2.  **Rewrite Content:** Rewrite the provided text into an original, engaging blog post of at least 500 words. Format it in clean HTML using <p>, <h2>, <h3>, <ul>, and <li> tags.
3.  **Insert Images:** From the provided imageList, naturally and contextually weave the image URLs into the generated HTML content. Use the format <img src='URL_FROM_LIST' class='article-image' alt='A descriptive alt text based on the context'>.
4.  **Generate Tags:** Create a JSON array of 3-5 relevant string tags for the article (e.g., ["Review", "RPG", "Square Enix"]).
5.  **JSON Output:** Output ONLY the result as a single, valid JSON object with the keys: "title_short", "content", and "tags". Do not include any other text, backticks, or markdown formatting.

Article Text:
Title: \${title}
Snippet: \${snippet}
imageList: \${imageList}`
};


// --- SCRIPT TO RUN ---
const setupConfiguration = async () => {
    console.log("Starting configuration setup...");

    try {
        // Set up the feeds document
        const feedsRef = db.collection('config').doc('feeds');
        await feedsRef.set({ urls: defaultFeeds });
        console.log("✅ Successfully created 'feeds' document in 'config' collection.");

        // Set up the prompts document
        const promptsRef = db.collection('config').doc('prompts');
        await promptsRef.set(defaultPrompts);
        console.log("✅ Successfully created 'prompts' document in 'config' collection.");

        console.log("\nConfiguration setup complete!");

    } catch (error) {
        console.error("❌ Error setting up configuration:", error);
    } finally {
        // Close the database connection
        await admin.app().delete();
    }
};

// Run the setup function
setupConfiguration();
