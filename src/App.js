import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { Header, Error, Loading, ArticleList, LeftSidebar, RightSidebar, SubNav, Hero } from './components';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ArticlePage } from './ArticlePage';

function App() {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const q = query(collection(db, "articles"), orderBy("published", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        setArticles(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setError('');
        setLoading(false);
    }, (err) => {
        setError(`Firestore Error: ${err.message}.`);
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const categories = useMemo(() => ['All', ...new Set(articles.map(a => a.category))], [articles]);
  
  const filteredArticles = useMemo(() => {
    if (activeCategory === 'All') return articles;
    return articles.filter(a => a.category === activeCategory);
  }, [articles, activeCategory]);
  
  const HomePage = () => {
    if (loading) return <Loading />;
    if (error) return <Error message={error} />;

    // Slicing articles for the new layout with the restored Hero
    const heroArticles = filteredArticles.slice(0, 5);
    const trendingArticles = filteredArticles.slice(5, 9);
    const topStories = filteredArticles.slice(9, 13);
    const mainArticles = filteredArticles.slice(13);

    return (
      <div className="w-full max-w-screen-xl mx-auto">
        <SubNav 
            categories={categories} 
            activeCategory={activeCategory}
            onCategorySelect={setActiveCategory}
        />

        {/* --- HERO SECTION RESTORED HERE --- */}
        <Hero articles={heroArticles} />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
            {/* Left Sidebar */}
            <div className="lg:col-span-3">
                <LeftSidebar trending={trendingArticles} topStories={topStories} />
            </div>
            {/* Main Content */}
            <div className="lg:col-span-6">
                 <h2 className="text-3xl font-bold text-slate-800 mb-6 border-b-2 border-slate-200 pb-2">
                    All News
                </h2>
                 <ArticleList articles={mainArticles} />
            </div>
            {/* Right Sidebar */}
            <div className="lg:col-span-3">
                 <RightSidebar
                    categories={categories}
                    activeCategory={activeCategory}
                    onCategorySelect={setActiveCategory}
                 />
            </div>
        </div>
      </div>
    );
  };

  return (
    <Router basename="/news-aggregator">
      <div className="bg-slate-100 min-h-screen font-sans">
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
