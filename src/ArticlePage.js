import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Loading, Error, Layout } from './components';
import { formatDate } from './utils';

const ArticleHero = ({ article }) => {
    if (!article) return null;
    const imageUrl = article.imageUrl || `https://placehold.co/1920x1080/334155/ffffff?text=Image+Not+Available`;

    return (
        <div className="main-parallax-header" style={{ backgroundImage: `url(${imageUrl})` }}>
            <div className="header-overlay">
                <div className="header-content">
                    {article.category && <span className="category-tag">{article.category}</span>}
                    {/* FIX: Use title_short if available, otherwise fallback to the long title */}
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { articleId } = useParams();

  useEffect(() => {
    window.scrollTo(0, 0);
    const getArticle = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, 'articles', articleId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setArticle(docSnap.data());
        } else {
          setError('Article not found.');
        }
      } catch (err) {
        setError('Failed to fetch article.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (articleId) getArticle();
  }, [articleId]);

  if (loading) return <Layout><Loading /></Layout>;
  if (error) return <Layout><Error message={error} /></Layout>;
  if (!article) return <Layout><p className="text-center">No article to display.</p></Layout>;

  return (
    <div className="bg-slate-50">
      <ArticleHero article={article} />
      <div className="article-body-wrapper">
        {/* FIX: The bodyImages are now part of the content HTML, so no separate gallery is needed. */}
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
  );
}
