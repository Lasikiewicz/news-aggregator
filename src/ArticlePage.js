import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Loading, Error } from './components';
import parse, { domToReact } from 'html-react-parser';

// Component for the image placeholders
const ImagePlaceholder = ({ caption }) => (
  <div className="image-placeholder my-8">
    <span className="placeholder-icon">🖼️</span>
    <span className="placeholder-text">Image needed: "{caption}"</span>
  </div>
);

export const ArticlePage = () => {
  const { articleId } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const parseOptions = {
    replace: (domNode) => {
      if (domNode.attribs && domNode.attribs['data-image-placeholder']) {
        return <ImagePlaceholder caption={domNode.attribs['data-image-placeholder']} />;
      }
    },
  };

  useEffect(() => {
    const fetchArticle = async () => {
      if (!articleId) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'articles', articleId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setArticle({ id: docSnap.id, ...data, published: data.published.toDate() });
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
      {/* ... (Header section is the same as last version) ... */}
      <div className="bg-slate-50 py-12">
        <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg max-w-none prose-slate">
              {/* Use the parser here */}
              {article.content && parse(article.content, parseOptions)}
            </div>
            <div className="mt-12 pt-6 border-t border-slate-200">
                <Link to="/" className="text-blue-600 hover:underline">&larr; Back to all articles</Link>
            </div>
        </div>
      </div>
    </>
  );
};