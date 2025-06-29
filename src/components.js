import React from 'react';
import { Link } from 'react-router-dom';

export const Header = () => (
  <header className="bg-white shadow-sm border-b border-slate-200">
    <div className="w-4/5 mx-auto py-4 px-8">
      <Link to="/">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">The Gaming Feed</h1>
      </Link>
    </div>
  </header>
);

export const HeroSection = ({ articles }) => {
  if (!articles || articles.length < 3) return null;

  return (
    <section className="mb-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
        {/* Main Hero Article */}
        <div className="lg:col-span-2 h-full">
            <HeroArticleCard article={articles[0]} />
        </div>
        {/* Side Hero Articles */}
        <div className="lg:col-span-1 h-full flex flex-col gap-6">
            <div className="h-1/2">
                <HeroArticleCard article={articles[1]} />
            </div>
            <div className="h-1/2">
                <HeroArticleCard article={articles[2]} />
            </div>
        </div>
      </div>
    </section>
  );
};

export const HeroArticleCard = ({ article }) => {
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-lg group">
      <Link to={`/article/${article.id}`} className="absolute inset-0">
        <div className="absolute inset-0 bg-slate-200">
          <img 
            src={article.imageUrl || 'https://via.placeholder.com/800x600?text=Image+Not+Found'} 
            alt={article.title} 
            // Use object-contain to see the whole image; bg-slate-200 fills empty space
            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-6">
          <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full mb-2 inline-block">{article.source}</span>
          <h3 className="text-white text-2xl font-bold leading-tight drop-shadow-md">
            {article.title}
          </h3>
        </div>
      </Link>
    </div>
  );
};

export const Article = ({ article }) => {
  return (
    <article className="bg-white rounded-lg shadow-md border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group">
      <Link to={`/article/${article.id}`} className="block h-48 bg-slate-200">
        <img 
          src={article.imageUrl || 'https://via.placeholder.com/400x300?text=Image+Not+Found'} 
          alt={article.title} 
          // Use object-contain to see the whole image; bg-slate-200 fills empty space
          className="w-full h-full object-contain" 
          loading="lazy"
        />
      </Link>
      <div className="p-6 flex-grow flex flex-col">
        <h2 className="text-xl font-bold mb-2 text-slate-800 group-hover:text-blue-600 transition-colors">
          <Link to={`/article/${article.id}`}>{article.title}</Link>
        </h2>
        <p className="text-slate-600 mb-4 flex-grow text-sm">{article.contentSnippet}</p>
        <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap mt-auto pt-4 border-t border-slate-100">
          <span className="font-semibold">{article.source}</span>
          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{article.category}</span>
        </div>
      </div>
    </article>
  );
};

// New compact FilterBar component
export const FilterBar = ({ searchTerm, onSearch, categories, sources, onCategoryChange, onSourceChange }) => (
    <div className="mb-8 p-4 bg-slate-100 rounded-lg border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => onSearch(e.target.value)}
                className="md:col-span-1 w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
            />
            <select onChange={(e) => onCategoryChange(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 transition">
                <option value="">All Platforms</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select onChange={(e) => onSourceChange(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 transition">
                <option value="">All Sources</option>
                {sources.map(src => <option key={src} value={src}>{src}</option>)}
            </select>
        </div>
    </div>
);

export const Error = ({ message }) => (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg" role="alert">
        <p className="font-bold">Error</p>
        <p>{message}</p>
    </div>
);

export const Loading = () => (
    <div className="flex justify-center items-center p-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
);