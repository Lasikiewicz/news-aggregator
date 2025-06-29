/**
 * Filters an array of articles based on search term, category, source, and type.
 */
export const filterArticles = (articles, searchTerm, category, source, type) => {
  return articles.filter(article => {
    const searchTermMatch = searchTerm
      ? article.title.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    const categoryMatch = category ? article.category === category : true;
    const sourceMatch = source ? article.source === source : true;
    const typeMatch = type ? article.type === type : true;

    return searchTermMatch && categoryMatch && sourceMatch && typeMatch;
  });
};
