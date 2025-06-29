import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { Header, Error, Loading, HeroPost, FeaturedGrid, ArticleList, Sidebar } from './components';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ArticlePage } from './ArticlePage';
import { filterArticles } from './utils'; // Assuming utils.js still exists

function App() {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  // State for filters
  const [category, setCategory] = useState('');

  useEffect(() => {
    const q = query(collection(db, "articles"), orderBy("published", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedArticles = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        setArticles(fetchedArticles);
        setError('');
        setLoading(false);
    }, (err) => {
        setError(`Firestore Error: ${err.message}. Check browser console.`);
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Apply filters
  const filteredArticles = category 
    ? articles.filter(article => article.category === category)
    : articles;

  const heroArticle = filteredArticles[0];
  const featuredArticles = filteredArticles.slice(1, 5);
  const mainArticles = filteredArticles.slice(5);
  const mostReadArticles = articles.slice(0, 5); // Most read isn't filtered
  
  const allCategories = [...new Set(articles.map(a => a.category).filter(Boolean))];

  const HomePage = () => {
    if (loading) return <Loading />;
    if (error) return <Error message={error} />;

    return (
      <div className="w-full max-w-screen-xl mx-auto">
        {heroArticle && <HeroPost article={heroArticle} />}
        {featuredArticles.length > 0 && <FeaturedGrid articles={featuredArticles} />}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-bold text-slate-800 mb-6 border-b-2 border-blue-500 pb-2">
              {category || 'The Latest'}
            </h2>
            <ArticleList articles={mainArticles} />
          </div>
          <div className="lg:col-span-1">
             <Sidebar 
                popularArticles={mostReadArticles} 
                categories={allCategories}
                activeCategory={category}
                onCategorySelect={setCategory}
             />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Router basename="/news-aggregator">
      <div className="bg-slate-50 min-h-screen font-sans">
        <Header />
        <main className="p-4 md:p-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/article/:articleId" element={<ArticlePage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;