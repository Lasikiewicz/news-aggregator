import React from 'react';

export const Header = () => (
  <header className="bg-white shadow-md">
    <div className="max-w-4xl mx-auto py-4 px-8">
      <h1 className="text-2xl font-bold text-slate-800">Gaming News Aggregator</h1>
    </div>
  </header>
);

export const Article = ({ article }) => (
  <article className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-300">
    <h2 className="text-xl font-bold mb-2 text-slate-800">
      <a href={article.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
        {article.title}
      </a>
    </h2>
    <p className="text-slate-600 mb-4">{article.contentSnippet}</p>
    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md">Source: {article.source}</span>
      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md">Platform: {article.category}</span>
      {article.type && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md">Type: {article.type}</span>}
      <span className="text-slate-400">Published: {new Date(article.published).toLocaleString()}</span>
    </div>
  </article>
);

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
