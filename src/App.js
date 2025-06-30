import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';

import { Header, Hero, ArticleList, LeftSidebar, RightSidebar, Loading, Error } from './components';
import { ArticlePage } from './ArticlePage';
import { AdminPage } from './AdminPage'; // Import the new AdminPage
import { getCategoryMap, getTrendingArticles, getTopStories, getAllTags } from './utils';

const HomePage = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryMap, setCategoryMap] = useState({});
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSubCategory, setActiveSubCategory] = useState(null);
  const [activeTag, setActiveTag] = useState(null);

  const location = useLocation();

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const articlesRef = collection(db, 'articles');
        const q = query(articlesRef, orderBy('published', 'desc'), limit(50));
        const querySnapshot = await getDocs(q);
        const articlesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setArticles(articlesData);
        setCategoryMap(getCategoryMap(articlesData));
      } catch (err) {
        setError('Failed to fetch articles.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  const handleCategorySelect = (category, subCategory = null) => {
    setActiveCategory(category);
    setActiveSubCategory(subCategory);
    setActiveTag(null); // Reset tag filter when category changes
  };

  const handleTagSelect = (tag) => {
    setActiveTag(tag);
    setActiveCategory('All'); // Reset category filter
    setActiveSubCategory(null);
  };

  const filteredArticles = articles.filter(article => {
    if (activeTag) {
      return article.tags && article.tags.includes(activeTag);
    }
    if (activeCategory === 'All') {
      return true;
    }
    if (activeSubCategory) {
      return article.category === activeCategory && article.subCategory === activeSubCategory;
    }
    return article.category === activeCategory;
  });

  if (loading) return <Loading />;
  if (error) return <Error message={error} />;

  const allTags = getAllTags(articles);

  return (
    <>
      <Header categoryMap={categoryMap} activeCategory={activeCategory} activeSubCategory={activeSubCategory} onCategorySelect={handleCategorySelect} />
      <main className="max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-8">
        <Hero articles={articles.slice(0, 5)} />
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-3">
            <LeftSidebar trending={getTrendingArticles(articles)} topStories={getTopStories(articles)} />
          </div>
          <div className="lg:col-span-6">
            <ArticleList articles={filteredArticles} />
          </div>
          <div className="lg:col-span-3">
            <RightSidebar categories={Object.keys(categoryMap)} activeCategory={activeCategory} onCategorySelect={handleCategorySelect} tags={allTags} onTagSelect={handleTagSelect} activeTag={activeTag} />
          </div>
        </div>
      </main>
    </>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/article/:articleId" element={<ArticlePage />} />
        {/* Add the new admin route */}
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}

export default App;
