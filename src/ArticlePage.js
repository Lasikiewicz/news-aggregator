import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
      try {
        const docRef = doc(db, 'articles', articleId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setArticle({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError('Article not found');
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
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-4 text-slate-800">{article.title}</h1>
      <div className="text-sm text-slate-500 mb-4">
        <span>Source: {article.source}</span> | <span>Platform: {article.category}</span>
        {article.type && <span> | Type: {article.type}</span>}
        <span> | Published: {new Date(article.published.seconds * 1000).toLocaleString()}</span>
      </div>
      {article.imageUrl && <img src={article.imageUrl} alt={article.title} className="w-full h-auto mb-6 rounded-lg" />}
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />
    </div>
  );
};