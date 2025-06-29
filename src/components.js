import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// --- Header, SubNav, Hero, and ArticleList are unchanged from the last complete version. ---
export const Header = () => (
    <header className="bg-white sticky top-0 z-40 border-b border-slate-200">
      <div className="max-w-screen-xl mx-auto py-3 px-8 flex justify-between items-center">
        <Link to="/">
          <div className="text-2xl font-bold text-slate-900 tracking-tighter">
            Gilga<span className="text-blue-600">.</span>
          </div>
        </Link>
      </div>
    </header>
  );
  
  export const SubNav = ({ categories, activeCategory, onCategorySelect, subCategories, activeSubCategory, onSubCategorySelect }) => (
      <nav className="bg-white shadow-md sticky top-[61px] z-30 mb-8 rounded-b-lg">
          <div className="max-w-screen-xl mx-auto px-8">
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-6">
                      {categories.map(cat => (
                          <button key={cat} onClick={() => onCategorySelect(cat)} className={`py-4 text-sm font-semibold border-b-2 transition-all ${activeCategory === cat ? 'text-blue-600 border-blue-600' : 'text-slate-600 border-transparent hover:text-blue-500'}`}>
                              {cat.toUpperCase()}
                          </button>
                      ))}
                  </div>
                  {subCategories.length > 0 && (
                      <div className="flex items-center gap-4">
                          <button onClick={() => onSubCategorySelect(null)} className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${!activeSubCategory ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                             All
                          </button>
                          {subCategories.map(subCat => (
                               <button key={subCat} onClick={() => onSubCategorySelect(subCat)} className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${activeSubCategory === subCat ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                                  {subCat}
                               </button>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      </nav>
  );
  
  export const Hero = ({ articles }) => {
      const [activeArticle, setActiveArticle] = useState(null);
  
      useEffect(() => {
          if (articles && articles.length > 0) {
              setActiveArticle(articles[0]);
          }
      }, [articles]);
  
      if (!articles || articles.length === 0) return null;
      if (!activeArticle) return <Loading />;
  
      const otherArticles = articles.filter(a => a.id !== activeArticle.id);
  
      return (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[50vh]">
              <div className="lg:col-span-2 relative h-full rounded-2xl overflow-hidden shadow-xl group">
                  <Link to={`/article/${activeArticle.id}`} className="absolute inset-0">
                      <img src={activeArticle.imageUrl} alt={activeArticle.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 p-8">
                          <span className="text-sm font-bold bg-blue-500 text-white px-3 py-1 rounded-full mb-4 inline-block">{activeArticle.category}</span>
                          <h2 className="text-3xl font-bold text-white leading-tight drop-shadow-lg">{activeArticle.title}</h2>
                      </div>
                  </Link>
              </div>
              <div className="lg:col-span-1 h-full flex flex-col gap-4">
                  {otherArticles.map(article => (
                      <div key={article.id} onClick={() => setActiveArticle(article)} className="relative h-1/4 rounded-xl overflow-hidden shadow-lg cursor-pointer group">
                           <img src={article.imageUrl} alt={article.title} className="absolute w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"/>
                           <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors"></div>
                           <h3 className="absolute bottom-0 left-0 p-3 text-sm font-bold text-white leading-tight drop-shadow-md">{article.title}</h3>
                      </div>
                  ))}
              </div>
          </section>
      );
  };
  
  export const ArticleList = ({ articles }) => (
      <div className="space-y-8">
          {articles.map(article => (
              <div key={article.id} className="grid grid-cols-1 md:grid-cols-3 gap-6 group bg-white p-4 rounded-lg shadow-md hover:shadow-xl transition-shadow">
                  <div className="md:col-span-1 rounded-lg overflow-hidden">
                      <Link to={`/article/${article.id}`}>
                          <img src={article.imageUrl} alt={article.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"/>
                      </Link>
                  </div>
                  <div className="md:col-span-2">
                      <span className="text-xs font-semibold text-blue-600 uppercase">{article.category}</span>
                      <h2 className="text-2xl font-bold text-slate-800 mt-1 mb-2 group-hover:text-blue-600 transition-colors">
                          <Link to={`/article/${article.id}`}>{article.title}</Link>
                      </h2>
                      <p className="text-slate-600 text-sm leading-relaxed">{article.contentSnippet}</p>
                  </div>
              </div>
          ))}
      </div>
  );

// --- UPDATED: Image Gallery Component ---
export const ImageGallery = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (images.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex(prevIndex => (prevIndex + 1) % images.length);
        }, 3000);

        return () => clearInterval(timer);
    }, [images.length]);

    if (!images || images.length === 0) return null;

    return (
        <div className="relative w-full h-96 my-8 rounded-lg shadow-xl overflow-hidden bg-slate-800">
            {images.map((image, index) => (
                <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
                >
                    {/* UPDATED to object-cover to fill the box */}
                    {React.cloneElement(image, {
                        className: 'w-full h-full object-cover'
                    })}
                </div>
            ))}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, index) => (
                    <button 
                        key={index} 
                        onClick={() => setCurrentIndex(index)}
                        className={`w-3 h-3 rounded-full transition-colors ${index === currentIndex ? 'bg-white' : 'bg-white/50 hover:bg-white'}`}
                    />
                ))}
            </div>
        </div>
    );
};

export const Loading = () => <div className="text-center p-16 font-semibold text-slate-500">Loading...</div>;
export const Error = ({ message }) => <div className="text-center p-16 text-red-600 font-bold">{message}</div>;
