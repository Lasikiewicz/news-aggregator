import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { Header, Error, Loading, Hero, ArticleList, LeftSidebar, RightSidebar } from './components';
import { BrowserRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom';
import { ArticlePage } from './ArticlePage';

const AppContent = () => {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || 'All';
  const activeSubCategory = searchParams.get('subCategory');
  const activeTag = searchParams.get('tag');

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

  const { categoryMap, allTags } = useMemo(() => {
    const catMap = {};
    const tagCounts = {};
    articles.forEach(article => {
        if (article && article.category) {
            if (!catMap[article.category]) {
                catMap[article.category] = new Set();
            }
            if (article.subCategory) {
                catMap[article.category].add(article.subCategory);
            }
        }
        if (article.tags) {
            article.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });
    const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    Object.keys(catMap).forEach(key => {
        catMap[key] = Array.from(catMap[key]).sort();
    });
    return { categoryMap: catMap, allTags: sortedTags };
  }, [articles]);

  const filteredArticles = useMemo(() => {
    let result = articles;
    if (activeTag) {
        result = result.filter(a => a.tags && a.tags.includes(activeTag));
    } else {
        if (activeCategory !== 'All') {
            result = result.filter(a => a.category === activeCategory);
        }
        if (activeSubCategory) {
            result = result.filter(a => a.subCategory === activeSubCategory);
        }
    }
    return result;
  }, [articles, activeCategory, activeSubCategory, activeTag]);

  const handleCategorySelect = (category, subCategory = null) => {
      const params = new URLSearchParams();
      if (category && category !== 'All') {
          params.set('category', category);
      }
      if (subCategory) {
          params.set('subCategory', subCategory);
      }
      setSearchParams(params);
  };

  const handleTagSelect = (tag) => {
    const params = new URLSearchParams();
    if (tag) {
        params.set('tag', tag);
    }
    setSearchParams(params);
  };

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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
            <div className="lg:col-span-3">
                <LeftSidebar trending={trendingArticles} topStories={topStories} />
            </div>
            <div className="lg:col-span-6">
                 <h2 className="text-3xl font-bold text-slate-800 mb-6 border-b-2 border-slate-200 pb-2">
                    {activeTag || activeSubCategory || activeCategory} News
                </h2>
                 <ArticleList articles={mainArticles} />
            </div>
            <div className="lg:col-span-3">
                 <RightSidebar
                    categories={['All', ...Object.keys(categoryMap)]}
                    activeCategory={activeCategory}
                    onCategorySelect={handleCategorySelect}
                    tags={allTags}
                    onTagSelect={handleTagSelect}
                    activeTag={activeTag}
                 />
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-100 min-h-screen font-sans">
      <Header
          categoryMap={categoryMap}
          activeCategory={activeCategory}
          activeSubCategory={activeSubCategory}
          onCategorySelect={handleCategorySelect}
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

function App() {
  const basename = process.env.NODE_ENV === 'production' ? '/news-aggregator' : '/';

  return (
    <Router basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </Router>
  );
}

export default App;