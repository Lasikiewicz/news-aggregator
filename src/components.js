import React from 'react';
import { Link } from 'react-router-dom';

export const Header = ({ categoryMap, activeCategory, activeSubCategory, onCategorySelect }) => {
    const categories = Object.keys(categoryMap);

    return (
        <header className="bg-white sticky top-0 z-50 border-b border-slate-200">
            <div className="max-w-screen-xl mx-auto py-3 px-8 flex justify-between items-center">
                <div>
                    <Link to="/">
                        <div className="text-2xl font-bold text-slate-900 tracking-tighter">
                            Gilga<span className="text-blue-600">.</span>co<span className="text-blue-600">.</span>uk
                        </div>
                    </Link>
                    <p className="text-xs text-slate-500 -mt-1">Your source for gaming news</p>
                </div>
                <nav className="hidden md:flex items-center gap-1">
                    <button onClick={() => onCategorySelect('All')} className={`text-sm font-semibold transition-colors py-2 px-4 rounded-md ${activeCategory === 'All' ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-100'}`}>
                        ALL
                    </button>
                    {categories.map(cat => {
                        const subCats = categoryMap[cat] || [];
                        const hasSubCats = subCats.length > 0;
                        return (
                            <div key={cat} className="relative group">
                                <button onClick={() => onCategorySelect(cat)} className={`text-sm font-semibold transition-colors py-2 px-4 rounded-md flex items-center gap-1 ${activeCategory === cat ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-100'}`}>
                                    {cat.toUpperCase()}
                                    {hasSubCats && <svg className="w-4 h-4 fill-current opacity-60" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>}
                                </button>
                                {hasSubCats && (
                                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 min-w-[200px]">
                                        <div className="p-2">
                                            {subCats.map(subCat => (
                                                <button
                                                    key={subCat}
                                                    onClick={() => onCategorySelect(cat, subCat)}
                                                    className={`w-full text-left text-sm font-medium px-3 py-2 rounded-md block ${activeSubCategory === subCat ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}
                                                >
                                                    {subCat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
};

// ... keep the rest of your components.js file the same
export const Hero = ({ articles }) => {
    // ... same as before
};
export const ArticleList = ({ articles }) => {
    // ... same as before
};
export const LeftSidebar = ({ trending, topStories }) => {
    // ... same as before
};
export const RightSidebar = ({ categories, activeCategory, onCategorySelect, tags, onTagSelect, activeTag }) => {
    // ... same as before
};
export const SocialShare = ({ articleUrl, title }) => {
    // ... same as before
};
export const ImageGallery = ({ images }) => {
    // ... same as before
};
export const Loading = () => <div className="text-center p-16 font-semibold text-slate-500">Loading...</div>;
export const Error = ({ message }) => <div className="text-center p-16 text-red-600 font-bold">{message}</div>;