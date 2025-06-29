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
          // Ensure published date exists before calling toDate()
          const publishedDate = data.published ? data.published.toDate() : new Date();
          setArticle({ id: docSnap.id, ...data, published: publishedDate });
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
  if (!article) return null;

  return (
    <>
      <header className="relative h-[50vh] md:h-[60vh]">
        <img src={article.imageUrl} alt={article.title} className="absolute w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative h-full flex flex-col justify-end text-white p-8 md:p-12">
            <div className="w-full max-w-5xl mx-auto">
                <span className="text-sm font-bold bg-blue-500 text-white px-3 py-1 rounded-full mb-4 inline-block">{article.category}</span>
                <h1 className="text-3xl md:text-5xl font-bold leading-tight drop-shadow-lg">{article.title}</h1>
                <p className="text-slate-300 mt-4">Published on {article.published.toLocaleDateString()}</p>
            </div>
        </div>
      </header>
      
      <div className="bg-white py-12 md:py-16">
        {/* This container sets the article width to 80% and centers it */}
        <div className="w-4/5 max-w-5xl mx-auto px-4">
            <div 
                className="prose prose-lg max-w-none prose-slate" 
                dangerouslySetInnerHTML={{ __html: article.content }} 
            />
            <div className="mt-12 pt-6 border-t border-slate-200">
                <Link to="/" className="text-blue-600 hover:underline">&larr; Back to all articles</Link>
            </div>
        </div>
      </div>
    </>
  );
};