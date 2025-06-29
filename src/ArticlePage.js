import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Loading, Error } from './components';
import parse, { domToReact } from 'html-react-parser';

// A new component for the image placeholders
const ImagePlaceholder = ({ caption }) => (
  <div className="image-placeholder my-8">
    <span className="placeholder-icon">🖼️</span>
    <span className="placeholder-text">Image needed: "{caption}"</span>
  </div>
);

// Options for the HTML parser to replace our custom divs
const parseOptions = {
  replace: domNode => {
    if (domNode.attribs && domNode.attribs['data-image-placeholder']) {
      return <ImagePlaceholder caption={domNode.attribs['data-image-placeholder']} />;
    }
  }
};

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
          setArticle({ id: docSnap.id, ...data });
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
    <div className="article-container">
      {/* Parallax Header */}
      <header 
        className="parallax-header"
        style={{ backgroundImage: `url(${article.imageUrl || ''})` }}
      >
        <div className="parallax-overlay">
          <div className="w-4/5 mx-auto">
            <h1 className="article-title">{article.title}</h1>
          </div>
        </div>
      </header>
      
      {/* Article Content at 80% width */}
      <div className="w-4/5 mx-auto bg-white -mt-20 relative p-8 md:p-12 shadow-2xl rounded-lg">
        <div className="prose max-w-none prose-slate prose-lg">
          {article.content && parse(article.content, parseOptions)}
        </div>
        <div className="mt-12 pt-6 border-t border-slate-200">
          <Link to="/" className="text-blue-600 hover:underline">&larr; Back to all articles</Link>
        </div>
      </div>
    </div>
  );
};