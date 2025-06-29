import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Loading, Error, ImageGallery } from './components';
import parse, { domToReact } from 'html-react-parser';

export const ArticlePage = () => {
  const { articleId } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // This function will find the special parallax image and separate it from the rest.
  const parseOptions = {
    replace: (domNode) => {
      // Find the special full-width parallax image
      if (domNode.attribs && domNode.attribs.class === 'full-width-parallax') {
        return (
            <div className="full-width-parallax-container">
                <div 
                    className="parallax-image"
                    style={{ backgroundImage: `url(${domNode.attribs.src})`}}
                ></div>
            </div>
        );
      }
      // Find image galleries
      if (domNode.attribs && domNode.attribs.class === 'image-gallery') {
        const images = domToReact(domNode.children).filter(child => child.type === 'img');
        return <ImageGallery images={images} />;
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
    // The main container is simplified as the new CSS handles the layout.
    <div className="article-page-container">
      <header 
        className="main-parallax-header"
        style={{ backgroundImage: `url(${article.imageUrl})`}}
      >
        <div className="header-overlay">
            <div className="header-content">
                <span className="category-tag">{article.category}</span>
                <h1>{article.title}</h1>
                <p className="published-date">Published on {article.published.toLocaleDateString()}</p>
            </div>
        </div>
      </header>
      
      <main className="article-body-wrapper">
        <div className="prose prose-lg max-w-none prose-slate article-content">
            {article.content && parse(article.content, parseOptions)}
        </div>
        <div className="mt-12 pt-6 border-t border-slate-200">
            <Link to="/" className="text-blue-600 hover:underline">&larr; Back to all articles</Link>
        </div>
      </main>
    </div>
  );
};
