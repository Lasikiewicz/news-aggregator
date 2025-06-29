require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');
const Parser = require('rss-parser');

const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const parser = new Parser();

const feeds = [
    { url: 'https://blog.playstation.com/feed/', source: 'PlayStation Blog', category: 'PlayStation' },
    { url: 'https://www.pushsquare.com/feeds/latest', source: 'Push Square', category: 'PlayStation' },
    { url: 'https://news.xbox.com/en-us/feed/', source: 'Xbox Wire', category: 'Xbox' },
    { url: 'https://www.purexbox.com/feeds/latest', source: 'Pure Xbox', category: 'Xbox' },
    { url: 'https://www.pcgamer.com/rss/', source: 'PC Gamer', category: 'PC' },
    { url: 'https://www.rockpapershotgun.com/feed', source: 'Rock Paper Shotgun', category: 'PC' },
    { url: 'https://www.pocketgamer.com/rss/', source: 'Pocket Gamer', category: 'Mobile' },
    { url: 'https://toucharcade.com/feed', source: 'TouchArcade', category: 'Mobile' },
    { url: 'https://www.roadtovr.com/feed/', source: 'Road to VR', category: 'VR', type: 'VR' },
    { url: 'https://uploadvr.com/feed/', source: 'UploadVR', category: 'VR', type: 'VR' },
    { url: 'https://corp.ign.com/feeds/articles/games', source: 'IGN', category: 'General' },
    { url: 'https://www.gamespot.com/feeds/game-news', source: 'GameSpot', category: 'General' },
];

async function main() {
    console.log('Starting feed fetch process...');
    const articlesRef = db.collection('articles');

    for (const feedConfig of feeds) {
        try {
            console.log(`Fetching: ${feedConfig.url}`);
            const feed = await parser.parseURL(feedConfig.url);

            for (const item of feed.items) {
                if (!item.link) {
                    console.warn(`Skipped article with no link: "${item.title}"`);
                    continue;
                }

                const q = articlesRef.where('link', '==', item.link);
                const querySnapshot = await q.get();

                if (querySnapshot.empty) {
                    const newArticle = {
                        title: item.title || 'No Title',
                        link: item.link,
                        published: item.isoDate ? admin.firestore.Timestamp.fromDate(new Date(item.isoDate)) : admin.firestore.Timestamp.now(),
                        contentSnippet: item.contentSnippet?.substring(0, 250) || '',
                        source: feedConfig.source,
                        category: feedConfig.category,
                        type: feedConfig.type || null,
                    };
                    await articlesRef.add(newArticle);
                    console.log(`Added: "${item.title}"`);
                }
            }
        } catch (error) {
            console.error(`Failed for ${feedConfig.url}:`, error.message);
        }
    }
}

main()
  .then(() => {
    console.log('Feed fetch process completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('An unexpected error occurred:', error);
    process.exit(1);
  });
