import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Loading, Error } from './components';

export const ArticlePage = () => {
  const { articleId } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchArticle = async () => {
      if (!articleId) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'articles', articleId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setArticle({ 
            id: docSnap.id, 
            ...data,
            published: data.published?.toDate() || new Date(0)
          });
        } else {
          setError('Article not found.');
        }
      } catch (err) {
        setError(`Error fetching article: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [articleId]);

  if (loading) return <Loading />;
  if (error) return <Error message={error} />;
  if (!article) return <div className="text-center p-8">No article data to display.</div>;

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-lg border border-slate-200">
      <h1 className="text-3xl lg:text-4xl font-bold mb-4 text-slate-800 leading-tight">{article.title}</h1>
      <div className="text-sm text-slate-500 mb-6 pb-6 border-b border-slate-200">
        <span className="font-semibold">Source:</span> <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{article.source}</a>
        <span className="mx-2">|</span>
        <span className="font-semibold">Published:</span> {article.published.toLocaleString()}
      </div>
      {article.imageUrl && (
        <img 
            src={article.imageUrl} 
            alt={article.title} 
            className="w-full h-auto mb-6 rounded-lg shadow-md" 
        />
      )}
      
      {/* Ensure the 'prose' class from @tailwindcss/typography is applied for styling */}
      <div 
        className="prose max-w-none prose-slate" 
        dangerouslySetInnerHTML={{ __html: article.content }} 
      />

       <div className="mt-8 pt-6 border-t border-slate-200">
          <Link to="/" className="text-blue-600 hover:underline">&larr; Back to all articles</Link>
       </div>
    </div>
  );
};