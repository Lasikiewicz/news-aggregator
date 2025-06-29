import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { Header, Error, Loading, Hero, ArticleList, LeftSidebar, RightSidebar } from './components';
import { BrowserRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom';
import { ArticlePage } from './ArticlePage';

/**
 * This component contains all the page logic.
 * Because it's rendered inside <Router>, it can safely use router hooks.
 */
const AppContent = () => {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  // All filters are now driven by URL Search Params for shareable links
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || 'All';
  const activeSubCategory = searchParams.get('subCategory');

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

  // Memoized calculations for categories and sub-categories
  const categories = useMemo(() => ['All', ...new Set(articles.map(a => a.category))], [articles]);
  
  const subCategories = useMemo(() => {
    if (activeCategory === 'All') return [];
    return [...new Set(articles
        .filter(a => a.category === activeCategory && a.subCategory)
        .map(a => a.subCategory))]
  }, [articles, activeCategory]);

  // Filter articles based on the active URL params
  const filteredArticles = useMemo(() => {
    let result = articles;
    if (activeCategory !== 'All') {
        result = result.filter(a => a.category === activeCategory);
    }
    if (activeSubCategory) {
        result = result.filter(a => a.subCategory === activeSubCategory);
    }
    return result;
  }, [articles, activeCategory, activeSubCategory]);
  
  // Handlers to update the URL search params, which triggers a re-render
  const handleCategorySelect = (category) => {
      const newParams = category === 'All' ? {} : { category };
      setSearchParams(newParams);
  };
  
  const handleSubCategorySelect = (subCategory) => {
    const params = new URLSearchParams(searchParams);
    if(subCategory) {
        params.set('subCategory', subCategory);
    } else {
        params.delete('subCategory');
    }
    setSearchParams(params);
  }

  // The main page content
  const HomePage = () => {
    if (loading) return <Loading />;
    if (error) return <Error message={error} />;

    const heroArticles = filteredArticles.slice(0, 5);
    const trendingArticles = filteredArticles.slice(5, 9);
    const topStories = filteredArticles.slice(9, 13);
    const mainArticles = filteredArticles.slice(5);

    return (
      <div className="w-full max-w-screen-xl mx-auto">
        <Hero articles={heroArticles} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
            <div className="lg:col-span-3">
                <LeftSidebar trending={trendingArticles} topStories={topStories} />
            </div>
            <div className="lg:col-span-6">
                 <h2 className="text-3xl font-bold text-slate-800 mb-6 border-b-2 border-slate-200 pb-2">
                    {activeSubCategory || activeCategory} News
                </h2>
                 <ArticleList articles={mainArticles} />
            </div>
            <div className="lg:col-span-3">
                 <RightSidebar
                    categories={categories}
                    activeCategory={activeCategory}
                    onCategorySelect={handleCategorySelect}
                 />
            </div>
        </div>
      </div>
    );
  };
    
  return (
    <div className="bg-slate-100 min-h-screen font-sans">
      <Header 
          categories={categories} 
          activeCategory={activeCategory}
          onCategorySelect={handleCategorySelect}
          subCategories={subCategories}
          activeSubCategory={activeSubCategory}
          onSubCategorySelect={handleSubCategorySelect}
      />
      <main className="p-4 md:p-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/article/:articleId" element={<ArticlePage />} />
        </Routes>
      </main>
    </div>
  );
}

/**
 * The main App component now only handles the Router setup.
 */
function App() {
  return (
    <Router basename="/news-aggregator">
      <AppContent />
    </Router>
  );
}

export default App;
