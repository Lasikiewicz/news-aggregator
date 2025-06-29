import React from 'react';
import { Link } from 'react-router-dom';

export const Header = () => (
  <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-200">
    <div className="max-w-screen-xl mx-auto py-3 px-8 flex justify-between items-center">
      <Link to="/">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight hover:text-blue-600 transition-colors">The Gaming Feed</h1>
      </Link>
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
        <Link to="/" className="hover:text-blue-600">Home</Link>
        <a href="#" className="hover:text-blue-600">Reviews</a>
        <a href="#" className="hover:text-blue-600">Videos</a>
        <a href="#" className="hover:text-blue-600">About</a>
      </nav>
    </div>
  </header>
);

export const HeroPost = ({ article }) => (
    <div className="relative h-[60vh] rounded-2xl overflow-hidden mb-12 shadow-2xl">
        <Link to={`/article/${article.id}`} className="absolute inset-0 group">
            <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20"></div>
            <div className="absolute bottom-0 left-0 p-8 md:p-12">
                <span className="text-sm font-bold bg-blue-500 text-white px-3 py-1 rounded-full mb-4 inline-block">{article.category}</span>
                <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight drop-shadow-lg">{article.title}</h2>
            </div>
        </Link>
    </div>
);

export const FeaturedGrid = ({ articles }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {articles.map(article => (
            <div key={article.id} className="relative h-80 rounded-xl overflow-hidden shadow-lg group">
                <Link to={`/article/${article.id}`} className="absolute inset-0">
                    <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-4">
                        <h3 className="text-lg font-bold text-white leading-tight drop-shadow-md">{article.title}</h3>
                    </div>
                </Link>
            </div>
        ))}
    </div>
);

export const ArticleList = ({ articles }) => (
    <div className="space-y-8">
        {articles.map(article => (
            <div key={article.id} className="grid grid-cols-1 md:grid-cols-3 gap-6 group">
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

export const Sidebar = ({ popularArticles, categories, activeCategory, onCategorySelect }) => (
    <aside className="sticky top-24 space-y-8">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Most Read</h3>
            <div className="space-y-4">
                {popularArticles.map((article, index) => (
                    <div key={article.id} className="flex items-start gap-4 group">
                        <span className="text-3xl font-bold text-slate-300">0{index + 1}</span>
                        <div>
                            <h4 className="font-bold text-slate-700 leading-tight group-hover:text-blue-600 transition-colors">
                                <Link to={`/article/${article.id}`}>{article.title}</Link>
                            </h4>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Platforms</h3>
            <div className="flex flex-col items-start gap-2">
                <button 
                    onClick={() => onCategorySelect('')}
                    className={`font-semibold transition-colors ${!activeCategory ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}
                >
                    All Platforms
                </button>
                {categories.map(category => (
                     <button 
                        key={category}
                        onClick={() => onCategorySelect(category)}
                        className={`font-semibold transition-colors ${activeCategory === category ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}
                    >
                         {category}
                    </button>
                ))}
            </div>
        </div>
    </aside>
);

export const Error = ({ message }) => (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg" role="alert">
        <p className="font-bold">Error</p><p>{message}</p>
    </div>
);

export const Loading = () => (
    <div className="flex justify-center items-center p-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
);