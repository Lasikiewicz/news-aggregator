import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { Header, Article, Search, Filters, Error, Loading } from './components';
import { filterArticles } from './utils';

function App() {
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [type, setType] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    // We will still wait for authentication to be resolved before fetching
    if (!currentUser) {
      // If auth is still initializing, we show the loader.
      // If it fails, the AuthContext will log an error.
      return;
    }

    const q = query(collection(db, "articles"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedArticles = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            published: doc.data().published?.toDate() || new Date(0),
        }));

        fetchedArticles.sort((a, b) => b.published.getTime() - a.published.getTime());

        setArticles(fetchedArticles);
        setError('');
        setLoading(false);
    }, (err) => {
        console.error("Firestore Snapshot Error:", err);
        setError(`Firestore Error: ${err.message}`);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]); // The fetch is dependent on currentUser being ready.

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
    if (articles.length === 0 && !loading) {
      return (
        <div className="text-center text-slate-500 p-8 bg-white rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-2">No Articles Found</h3>
          <p>The backend script might still be populating the database. Articles will appear here shortly.</p>
        </div>
      );
    }
    if (filteredArticles.length === 0 && articles.length > 0) {
      return <p className="text-center text-slate-500 p-8">No articles match your filters.</p>;
    }
    return (
      <div className="space-y-6">
        {filteredArticles.map((article) => <Article key={article.id} article={article} />)}
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      <Header />
      <main className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
            <Search searchTerm={searchTerm} onSearch={setSearchTerm} />
            <Filters categories={allCategories} sources={allSources} types={allTypes} onCategoryChange={setCategory} onSourceChange={setSource} onTypeChange={setType} />
          </div>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
