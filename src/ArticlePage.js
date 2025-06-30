import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Loading, Error, Header } from './components';
import { formatDate, getCategoryMap } from './utils';

const ArticleHero = ({ article }) => {
    if (!article) return null;
    const imageUrl = article.imageUrl || `https://placehold.co/1920x1080/334155/ffffff?text=Image+Not+Available`;

    return (
        <div className="main-parallax-header" style={{ backgroundImage: `url(${imageUrl})` }}>
            <div className="header-overlay">
                <div className="header-content">
                    {article.category && <span className="category-tag">{article.category}</span>}
                    <h1>{article.title_short || article.title}</h1>
                    <p className="published-date">
                        By <span className="font-semibold">{article.source || 'Unknown Source'}</span> on {formatDate(article.published)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export function ArticlePage() {
  const [article, setArticle] = useState(null);
  const [categoryMap, setCategoryMap] = useState({}); // State for the category map
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { articleId } = useParams();

  useEffect(() => {
    window.scrollTo(0, 0);

    const getPageData = async () => {
      try {
        setLoading(true);
        // Fetch the single article
        const articleRef = doc(db, 'articles', articleId);
        const articleSnap = await getDoc(articleRef);

        if (articleSnap.exists()) {
          setArticle(articleSnap.data());
        } else {
          setError('Article not found.');
        }

        // FIX: Fetch the feeds config to build the category map for the header
        const feedsDocRef = doc(db, 'config', 'feeds');
        const feedsDocSnap = await getDoc(feedsDocRef);
        if (feedsDocSnap.exists()) {
            const feedsData = feedsDocSnap.data().urls || [];
            // Create a temporary structure that getCategoryMap can use
            const tempArticlesForMap = feedsData.map(feed => ({ category: feed.category, subCategory: null }));
            setCategoryMap(getCategoryMap(tempArticlesForMap));
        }

      } catch (err) {
        setError('Failed to fetch page data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (articleId) getPageData();
  }, [articleId]);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loading /></div>;
  if (error) return <div className="p-8"><Error message={error} /></div>;
  if (!article) return <div className="p-8 text-center">Article not found.</div>;

  return (
    <>
      {/* FIX: Pass the fetched categoryMap to the Header */}
      <Header categoryMap={categoryMap} />
      <div className="bg-slate-50">
        <ArticleHero article={article} />
        <div className="article-body-wrapper">
          <div
            className="article-content prose lg:prose-xl max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
          <div className="mt-12 pt-8 border-t border-slate-200 text-center">
              <p className="text-gray-600 mb-4">
                  Read the original article on <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">{article.source || 'the original site'}</a>.
              </p>
              <Link to="/" className="inline-flex items-center text-blue-600 hover:underline font-semibold">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Back to Homepage
              </Link>
          </div>
        </div>
      </div>
    </>
  );
}
