// src/utils.js

export const getCategoryMap = (articles) => {
    const categoryMap = {};
    articles.forEach(article => {
        if (!categoryMap[article.category]) {
            categoryMap[article.category] = [];
        }
        if (article.subCategory && !categoryMap[article.category].includes(article.subCategory)) {
            categoryMap[article.category].push(article.subCategory);
        }
    });
    return categoryMap;
};

export const getTrendingArticles = (articles) => {
    // For now, just return the 5 most recent articles
    return articles.slice(0, 5);
}

export const getTopStories = (articles) => {
    // For now, just return the next 5 most recent articles
    return articles.slice(5, 10);
}

export const getAllTags = (articles) => {
    const tags = new Set();
    articles.forEach(article => {
        if(article.tags) {
            article.tags.forEach(tag => tags.add(tag));
        }
    });
    return Array.from(tags);
}

// FIX: Added the missing formatDate function
export const formatDate = (timestamp) => {
  if (!timestamp) {
    return 'Date not available';
  }
  // Convert Firestore Timestamp to JavaScript Date object
  const date = timestamp.toDate();
  // Format the date into a readable string, e.g., "June 30, 2025"
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};
