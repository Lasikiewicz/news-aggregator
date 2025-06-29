import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { Header, Article, Search, Filters, Error, Loading } from './components';
import { filterArticles } from './utils';

// --- DEBUG COMPONENT ---
// This component will render at the top of the page to show us the app's state.
const DebugInfo = ({ currentUser, articles, loading, error }) => (
  <div className="bg-yellow-100 border-2 border-yellow-400 text-yellow-800 p-4 max-w-4xl mx-auto my-4 rounded-lg font-mono text-xs">
    <h2 className="font-bold text-lg mb-2">Diagnostic Information</h2>
    <p><span className="font-bold">Status:</span> {loading ? 'Loading...' : 'Loaded'}</p>
    <p><span className="font-bold">Error:</span> {error ? error : 'None'}</p>
    <p><span className="font-bold">Authenticated User:</span> {currentUser ? `Yes (UID: ${currentUser.uid})` : 'No'}</p>
    <p><span className="font-bold">Articles Fetched:</span> {articles.length}</p>
  </div>
);


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
    if (!currentUser || !db) {
      if (!db) {
        const msg = "Firebase failed to initialize. Check config.";
        console.error(msg);
        setError(msg);
        setLoading(false);
      }
      return;
    }

    console.log('Auth ready. Fetching articles...');
    setLoading(true);

    const q = query(collection(db, 'articles'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log(`Firestore snapshot. Docs found: ${querySnapshot.size}`);
      const fetchedArticles = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        published: doc.data().published?.toDate() || new Date(0),
      }));

      fetchedArticles.sort((a, b) => b.published.getTime() - a.published.getTime());

      setArticles(fetchedArticles);
      setLoading(false);
      setError('');
    }, (err) => {
      console.error('Firestore Snapshot Error:', err);
      setError(`Firestore Error: ${err.message}. Check browser console & security rules.`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const filtered = filterArticles(articles, searchTerm, category, source, type);
    setFilteredArticles(filtered);
  }, [searchTerm, category, source, type, articles]);

  const allCategories = [...new Set(articles.map(a => a.category).filter(Boolean))];
  const allSources = [...new Set(articles.map(a => a.source).filter(Boolean))];
  const allTypes = [...new Set(articles.map(a => a.type).filter(Boolean))];

  const renderContent = () => {
    if (loading) return <Loading />;
    if (error && articles.length === 0) return <Error message={error} />;

    if (articles.length === 0 && !loading) {
      return (
        <div className="text-center text-slate-500 p-8 bg-white rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-2">No Articles Found</h3>
          <p>This could be because the database is empty or a connection issue occurred.</p>
        </div>
      );
    }
    
    if (filteredArticles.length === 0 && articles.length > 0) {
      return <p className="text-center text-slate-500 p-8">No articles match your current filters.</p>;
    }

    return (
      <div className="space-y-6">
        {filteredArticles.map((article) => <Article key={article.id} article={article} />)}
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      <DebugInfo currentUser={currentUser} articles={articles} loading={loading} error={error} />
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
