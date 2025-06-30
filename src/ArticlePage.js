import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Layout, Loader, Hero } from './components'; // Import Hero
import { formatDate } from './utils';

export function ArticlePage() {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { articleId } = useParams();

  useEffect(() => {
    const getArticle = async () => {
      try {
        setLoading(true);
        // The articleId from the URL is the base64 encoded link.
        // We assume the document ID in Firestore is this encoded link.
        const docRef = doc(db, 'articles', articleId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setArticle(docSnap.data());
        } else {
          setError('Article not found.');
          console.log('No such document!');
        }
      } catch (err) {
        setError('Failed to fetch article.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    getArticle();
  }, [articleId]);

  if (loading) {
    return (
      <Layout>
        <Loader />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <p className="text-center text-red-500">{error}</p>
      </Layout>
    );
  }

  if (!article) {
    return null;
  }

  return (
    // We don't use the main Layout here to allow the hero to be full-width
    <article>
      <Hero title={article.title} imageUrl={article.imageUrl} />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
            <p className="text-gray-500 text-sm mb-2">
                Published on {formatDate(article.pubDate)}
            </p>
            <p className="text-gray-600 mb-8">
                Source: <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{article.link}</a>
            </p>
            <div
              className="article-content prose lg:prose-xl mx-auto"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
        </div>
      </div>
    </article>
  );
}
