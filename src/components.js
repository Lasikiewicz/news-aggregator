import React from 'react';
import { Link } from 'react-router-dom';

export const Header = () => (
  <header className="bg-white shadow-sm border-b border-slate-200">
    <div className="max-w-7xl mx-auto py-4 px-8">
      <Link to="/">
        <h1 className="text-2xl font-bold text-slate-800">Gaming News Aggregator</h1>
      </Link>
    </div>
  </header>
);

export const Article = ({ article, layout }) => {
  const isList = layout === 'list';
  
  return (
    <article className={`bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-300 flex flex-col`}>
      {article.imageUrl && (
        <Link to={`/article/${article.id}`} className="block">
          <img 
            src={article.imageUrl} 
            alt={article.title} 
            className="w-full h-48 object-cover rounded-t-lg" 
            loading="lazy"
          />
        </Link>
      )}
      <div className="p-6 flex-grow flex flex-col">
        <Link to={`/article/${article.id}`}>
          <h2 className="text-xl font-bold mb-2 text-slate-800 hover:text-blue-600 transition-colors">
            {article.title}
          </h2>
        </Link>
        {isList && <p className="text-slate-600 mb-4 flex-grow">{article.contentSnippet}</p>}
        <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap mt-auto pt-4 border-t border-slate-100">
          <span className="font-semibold">{article.source}</span>
          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{article.category}</span>
        </div>
      </div>
    </article>
  );
};


export const Search = ({ searchTerm, onSearch }) => (
  <div className="mb-4">
    <input
      type="text"
      placeholder="Search articles..."
      value={searchTerm}
      onChange={(e) => onSearch(e.target.value)}
      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
    />
  </div>
);

export const Filters = ({ categories, sources, types, onCategoryChange, onSourceChange, onTypeChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <select onChange={(e) => onCategoryChange(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
      <option value="">All Platforms</option>
      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
    </select>
    <select onChange={(e) => onSourceChange(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
      <option value="">All Sources</option>
      {sources.map(src => <option key={src} value={src}>{src}</option>)}
    </select>
    <select onChange={(e) => onTypeChange(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
      <option value="">All Types</option>
      {types.map(typ => <option key={typ} value={typ}>{typ}</option>)}
    </select>
  </div>
);

export const LayoutToggle = ({ layout, onLayoutChange }) => (
    <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end gap-2">
        <button
            onClick={() => onLayoutChange('list')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${layout === 'list' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'}`}
        >
            List
        </button>
        <button
            onClick={() => onLayoutChange('grid')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${layout === 'grid' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'}`}
        >
            Grid
        </button>
    </div>
);


export const Error = ({ message }) => (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg" role="alert">
        <p className="font-bold">Error</p>
        <p>{message}</p>
    </div>
);

export const Loading = () => (
    <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
);