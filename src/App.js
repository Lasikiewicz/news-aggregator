import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { Header, Article, Search, Filters, Error, Loading, LayoutToggle } from './components';
import { filterArticles } from './utils';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ArticlePage } from './ArticlePage';

function App() {
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [type, setType] = useState('');
  const [layout, setLayout] = useState('list'); // 'list' or 'grid'

  useEffect(() => {
    const q = query(collection(db, "articles"), orderBy("published", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedArticles = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            published: doc.data().published?.toDate() || new Date(0),
        }));
        setArticles(fetchedArticles);
        setError('');
        setLoading(false);
    }, (err) => {
        console.error("Firestore Snapshot Error:", err);
        setError(`Firestore Error: ${err.message}. Check browser console.`);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const filtered = filterArticles(articles, searchTerm, category, source, type);
    setFilteredArticles(filtered);
  }, [searchTerm, category, source, type, articles]);

  const allCategories = [...new Set(articles.map(a => a.category).filter(Boolean))];
  const allSources = [...new Set(articles.map(a => a.source).filter(Boolean))];
  const allTypes = [...new Set(articles.map(a => a.type).filter(Boolean))];

  const renderContent = () => {
    if (loading) return <Loading />;
    if (error) return <Error message={error} />;
    if (filteredArticles.length === 0) {
      return (
        <div className="text-center text-slate-500 p-8">
            <h3 className="text-lg font-semibold mb-2">No Articles Found</h3>
            <p>Either there are no articles matching your filters, or the database is still being populated.</p>
        </div>
      );
    }
    
    // Conditional classes for layout
    const layoutClasses = {
        list: "space-y-6",
        grid: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
    };

    return (
      <div className={layoutClasses[layout]}>
        {filteredArticles.map((article) => <Article key={article.id} article={article} layout={layout} />)}
      </div>
    );
  }
  
  const HomePage = () => (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <Search searchTerm={searchTerm} onSearch={setSearchTerm} />
        <Filters categories={allCategories} sources={allSources} types={allTypes} onCategoryChange={setCategory} onSourceChange={setSource} onTypeChange={setType} />
        <LayoutToggle layout={layout} onLayoutChange={setLayout} />
      </div>
      {renderContent()}
    </div>
  );

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