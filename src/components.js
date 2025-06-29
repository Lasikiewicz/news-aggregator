import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export const Header = ({ categories, activeCategory, onCategorySelect, subCategories, activeSubCategory, onSubCategorySelect }) => (
    <header className="bg-white sticky top-0 z-40 border-b border-slate-200">
        {/* Main Header */}
        <div className="max-w-screen-xl mx-auto py-3 px-8 flex justify-between items-center">
            <div>
                <Link to="/">
                    <div className="text-2xl font-bold text-slate-900 tracking-tighter">
                        Gilga<span className="text-blue-600">.</span>co<span className="text-blue-600">.</span>uk
                    </div>
                </Link>
                <p className="text-xs text-slate-500 -mt-1">Your source for gaming news</p>
            </div>
            {/* Main Category Filters */}
            <nav className="hidden md:flex items-center gap-6">
                 {categories.map(cat => (
                    <button key={cat} onClick={() => onCategorySelect(cat)} className={`text-sm font-semibold transition-colors py-2 ${activeCategory === cat ? 'text-blue-600' : 'text-slate-600 hover:text-blue-500'}`}>
                        {cat.toUpperCase()}
                    </button>
                ))}
            </nav>
        </div>
        {/* Sub-Category Bar - Renders only when sub-categories exist */}
        {subCategories.length > 0 && (
            <div className="bg-slate-50 border-t border-slate-200">
                <div className="max-w-screen-xl mx-auto px-8 flex items-center gap-4 py-2">
                    <span className="text-xs font-bold text-slate-500">TOPICS:</span>
                    <button onClick={() => onSubCategorySelect(null)} className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${!activeSubCategory ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                        All
                    </button>
                    {subCategories.map(subCat => (
                            <button key={subCat} onClick={() => onSubCategorySelect(subCat)} className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${activeSubCategory === subCat ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                            {subCat}
                            </button>
                    ))}
                </div>
            </div>
        )}
    </header>
);

export const Hero = ({ articles }) => {
    const [activeArticle, setActiveArticle] = useState(null);

    useEffect(() => {
        if (articles && articles.length > 0) setActiveArticle(articles[0]);
    }, [articles]);

    if (!articles || articles.length === 0) return null;
    if (!activeArticle) return <Loading />;

    const otherArticles = articles.filter(a => a.id !== activeArticle.id).slice(0, 4);

    return (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[50vh] mt-8">
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
            <div key={article.id} className="grid grid-cols-1 md:grid-cols-4 gap-6 group bg-white p-4 rounded-lg shadow-md hover:shadow-xl transition-shadow">
                <div className="md:col-span-1 rounded-lg overflow-hidden">
                    <Link to={`/article/${article.id}`}>
                        <img src={article.imageUrl} alt={article.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"/>
                    </Link>
                </div>
                <div className="md:col-span-3">
                    <span className="text-xs font-semibold text-blue-600 uppercase">{article.category}</span>
                    <h2 className="text-xl font-bold text-slate-800 mt-1 mb-2 group-hover:text-blue-600 transition-colors">
                        <Link to={`/article/${article.id}`}>{article.title}</Link>
                    </h2>
                    <p className="text-slate-600 text-sm leading-relaxed">{article.contentSnippet}</p>
                </div>
            </div>
        ))}
    </div>
);

export const SocialShare = ({ articleUrl, title }) => {
    const encodedUrl = encodeURIComponent(articleUrl);
    const encodedTitle = encodeURIComponent(title);

    const shareLinks = {
        twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
        linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
    };

    const Icon = ({ path }) => (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d={path} />
        </svg>
    );

    const icons = {
        twitter: "M22.46,6C21.7,6.35,20.86,6.58,20,6.69C20.88,6.16,21.56,5.32,21.88,4.31C21.05,4.81,20.13,5.16,19.16,5.36C18.37,4.5,17.26,4,16,4C13.65,4,11.73,5.92,11.73,8.26C11.73,8.6,11.77,8.92,11.84,9.22C8.28,9.06,5.1,7.38,3,4.79C2.63,5.42,2.42,6.16,2.42,6.94C2.42,8.43,3.17,9.75,4.33,10.5C3.62,10.5,2.96,10.3,2.38,10C2.38,10,2.38,10,2.38,10.03C2.38,12.11,3.86,13.85,5.82,14.24C5.46,14.34,5.08,14.39,4.69,14.39C4.42,14.39,4.15,14.36,3.89,14.31C4.43,16,6.1,17.26,8.12,17.29C6.67,18.45,4.81,19.11,2.83,19.11C2.5,19.11,2.17,19.09,1.85,19.05C3.36,20.06,5.26,20.63,7.34,20.63C16,20.63,20.44,13.33,20.44,8.74C20.44,8.56,20.44,8.37,20.43,8.19C21.32,7.57,22,6.84,22.46,6Z",
        facebook: "M18.77,0H5.23C2.34,0,0,2.34,0,5.23V18.77C0,21.66,2.34,24,5.23,24H12v-9H9V12h3V9c0-3,2-4,4-4h3v3h-2c-1,0-1,1-1,1v2h3v3h-3v9h4.77C21.66,24,24,21.66,24,18.77V5.23C24,2.34,21.66,0,18.77,0Z",
        reddit: "M12,0C5.38,0,0,5.38,0,12s5.38,12,12,12,12-5.38,12-12S18.62,0,12,0Zm5.5,13.5c0,1.1-0.9,2-2,2s-2-0.9-2-2,0.9-2,2-2S17.5,12.4,17.5,13.5Zm-7,0c0,1.1-0.9,2-2,2s-2-0.9-2-2,0.9-2,2-2S10.5,12.4,10.5,13.5ZM12,18c-2.76,0-5-2.24-5-5h10C17,15.76,14.76,18,12,18Z",
        linkedin: "M19,0H5C2.24,0,0,2.24,0,5v14c0,2.76,2.24,5,5,5h14c2.76,0,5-2.24,5-5V5C24,2.24,21.76,0,19,0ZM8,19H5V8h3V19ZM6.5,6.73C5.52,6.73,4.75,5.96,4.75,5S5.52,3.27,6.5,3.27,8.25,4.04,8.25,5,7.48,6.73,6.5,6.73ZM20,19h-3V13.3c0-1.4-0.49-2.37-1.87-2.37-1,0-1.63,0.67-1.87,1.32C13.25,12.39,13,13.1,13,13.88V19h-3V8h3v1.32c0.44-0.66,1.43-1.6,3.13-1.6,2.26,0,3.87,1.48,3.87,4.64V19Z"
    };

    return (
        <div className="flex flex-col gap-2">
            {Object.entries(shareLinks).map(([name, url]) => (
                 <a href={url} key={name} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-200 rounded-full text-slate-600 hover:bg-slate-300 transition-colors">
                    <Icon path={icons[name]} />
                 </a>
            ))}
        </div>
    );
};


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
                <div key={index} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}>
                    {React.cloneElement(image, { className: 'w-full h-full object-cover' })}
                </div>
            ))}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, index) => (
                    <button key={index} onClick={() => setCurrentIndex(index)} className={`w-3 h-3 rounded-full transition-colors ${index === currentIndex ? 'bg-white' : 'bg-white/50 hover:bg-white'}`} />
                ))}
            </div>
        </div>
    );
};

export const Loading = () => <div className="text-center p-16 font-semibold text-slate-500">Loading...</div>;
export const Error = ({ message }) => <div className="text-center p-16 text-red-600 font-bold">{message}</div>;
