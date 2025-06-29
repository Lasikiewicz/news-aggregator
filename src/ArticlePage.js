import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Loading, Error, SocialShare, ImageGallery } from './components';
import parse, { domToReact } from 'html-react-parser';

export const ArticlePage = () => {
  const { articleId } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    // Get the current URL only on the client-side
    setCurrentUrl(window.location.href);
  }, []);

  const parseOptions = {
    replace: (domNode) => {
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
    <div className="bg-white pt-8 pb-16">
      <main className="w-4/5 max-w-6xl mx-auto">
        
        {/* Article Header */}
        <div className="mb-8 text-center">
            <p className="text-sm font-bold text-blue-600 uppercase mb-2">{article.category}</p>
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 leading-tight">{article.title}</h1>
            <p className="text-slate-500 mt-4">
                {/* Updated Author Name */}
                By <span className="font-semibold text-slate-700">Gilga</span> on {article.published.toLocaleDateString()}
            </p>
        </div>

        {/* Main Image */}
        <img src={article.imageUrl} alt={article.title} className="w-full rounded-xl shadow-lg mb-12" />

        <div className="flex gap-12">
            {/* Social Share (sticky) */}
            <aside className="w-20 hidden md:block">
                <div className="sticky top-28">
                     <SocialShare articleUrl={currentUrl} title={article.title} />
                </div>
            </aside>
            
            {/* Article Body */}
            <article className="flex-grow">
                <div className="prose prose-lg max-w-none prose-slate article-content">
                    {article.content && parse(article.content, parseOptions)}
                </div>
            </article>
        </div>

        {/* Tags and Back Link Section */}
        <div className="mt-12 pt-8 border-t border-slate-200">
             {article.tags && article.tags.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                        {article.tags.map(tag => (
                            <span key={tag} className="bg-slate-100 text-slate-700 text-sm font-medium px-3 py-1 rounded-full">{tag}</span>
                        ))}
                    </div>
                </div>
            )}
             <Link to="/" className="text-blue-600 hover:underline">&larr; Back to all articles</Link>
        </div>

      </main>
    </div>
  );
};
