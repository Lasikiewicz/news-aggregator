import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { Header, Article, FilterBar, Error, Loading, HeroSection } from './components';
import { filterArticles } from './utils';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ArticlePage } from './ArticlePage';

function App() {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');

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

  // Separate articles for hero and the main list
  const heroArticles = articles.slice(0, 3);
  const mainArticles = articles.slice(3);

  // Apply filters only to the main list of articles
  const filteredMainArticles = filterArticles(mainArticles, searchTerm, category, source, '');
  
  const allCategories = [...new Set(mainArticles.map(a => a.category).filter(Boolean))];
  const allSources = [...new Set(mainArticles.map(a => a.source).filter(Boolean))];

  const HomePage = () => {
    if (loading) return <Loading />;
    if (error) return <Error message={error} />;

    return (
      // Set main container to 80% width and centered
      <div className="w-4/5 mx-auto">
        <HeroSection articles={heroArticles} />
        
        <FilterBar 
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          categories={allCategories}
          sources={allSources}
          onCategoryChange={setCategory}
          onSourceChange={setSource}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredMainArticles.map((article) => <Article key={article.id} article={article} />)}
        </div>
      </div>
    );
  };

  return (
    <Router basename="/news-aggregator">
      <div className="bg-slate-50 min-h-screen font-sans">
        <Header />
        <main className="py-8">
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