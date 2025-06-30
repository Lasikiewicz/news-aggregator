import React, { useState, useEffect, useCallback } from 'react';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, doc, deleteDoc, query, orderBy, writeBatch, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// --- Login Component ---
const AdminLogin = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (email.toLowerCase() !== 'lasikie@hotmail.co.uk') {
            setError('Error: This email address is not authorized for admin access.');
            return;
        }
        try {
            await signInWithEmailAndPassword(auth, email, password);
            onLogin();
        } catch (error) {
            setError(`Login failed: ${error.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-sm w-full">
                <h1 className="text-2xl font-bold text-center text-slate-800 mb-6">Admin Login</h1>
                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <label className="block text-slate-700 text-sm font-bold mb-2" htmlFor="email">Email Address</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-slate-700 leading-tight focus:outline-none focus:shadow-outline" required />
                    </div>
                    <div className="mb-6">
                        <label className="block text-slate-700 text-sm font-bold mb-2" htmlFor="password">Password</label>
                        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-slate-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" required />
                    </div>
                    {error && <p className="bg-red-100 text-red-700 text-sm p-3 rounded mb-4">{error}</p>}
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full">Sign In</button>
                </form>
            </div>
        </div>
    );
};

// --- Edit Article Modal ---
const EditArticleModal = ({ article, onClose, onSave }) => {
    const [editedArticle, setEditedArticle] = useState(article);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditedArticle(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        await onSave(editedArticle);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4">Edit Article</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Title</label>
                            <input type="text" name="title" value={editedArticle.title} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Short Title</label>
                            <input type="text" name="title_short" value={editedArticle.title_short} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Content (HTML)</label>
                            <textarea name="content" value={editedArticle.content} onChange={handleChange} rows="15" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"></textarea>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Cancel</button>
                    <button type="button" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Save Changes</button>
                </div>
            </div>
        </div>
    );
};


// --- Manage Articles Component ---
const ManageArticles = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingArticle, setEditingArticle] = useState(null);

    const fetchArticles = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'articles'), orderBy('published', 'desc'));
            const snapshot = await getDocs(q);
            setArticles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) { setError('Failed to fetch articles: ' + err.message); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchArticles(); }, [fetchArticles]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this article?')) {
            try {
                await deleteDoc(doc(db, 'articles', id));
                setArticles(prev => prev.filter(a => a.id !== id));
            } catch (err) { alert('Failed to delete article: ' + err.message); }
        }
    };
    
    const handleSaveArticle = async (updatedArticle) => {
        try {
            const { id, ...data } = updatedArticle;
            await updateDoc(doc(db, 'articles', id), data);
            setArticles(prev => prev.map(a => a.id === id ? updatedArticle : a));
        } catch (err) {
            alert('Failed to save article: ' + err.message);
        }
    };

    if (loading) return <p>Loading articles...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            {editingArticle && <EditArticleModal article={editingArticle} onClose={() => setEditingArticle(null)} onSave={handleSaveArticle} />}
            <h2 className="text-xl font-semibold mb-4">Manage Articles</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Published</th>
                            <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {articles.map(article => (
                            <tr key={article.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{article.title_short || article.title}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{article.category}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(article.published.seconds * 1000).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                    <button onClick={() => setEditingArticle(article)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                    <button onClick={() => handleDelete(article.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Manage Feeds Component ---
const ManageFeeds = () => {
    const [feeds, setFeeds] = useState([]);
    const [newFeed, setNewFeed] = useState({ url: '', category: 'Multi-platform' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchFeeds = useCallback(async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'config', 'feeds');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setFeeds(docSnap.data().urls || []);
            } else {
                setError("Feeds configuration not found. Please create a 'feeds' document in the 'config' collection.");
            }
        } catch (err) { setError("Failed to fetch feeds: " + err.message); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchFeeds(); }, [fetchFeeds]);

    const handleSaveFeeds = async (updatedFeeds) => {
        try {
            await setDoc(doc(db, 'config', 'feeds'), { urls: updatedFeeds });
            setFeeds(updatedFeeds);
            alert("Feeds saved successfully!");
        } catch (err) {
            alert("Failed to save feeds: " + err.message);
        }
    };

    const handleAddFeed = () => {
        if (!newFeed.url) return;
        handleSaveFeeds([...feeds, newFeed]);
        setNewFeed({ url: '', category: 'Multi-platform' });
    };

    const handleDeleteFeed = (index) => {
        const updatedFeeds = feeds.filter((_, i) => i !== index);
        handleSaveFeeds(updatedFeeds);
    };

    if (loading) return <p>Loading feeds...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Manage RSS Feeds</h2>
            <div className="space-y-2 mb-6">
                {feeds.map((feed, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="text-sm">
                            <p className="font-medium">{feed.url}</p>
                            <p className="text-gray-500">{feed.category}</p>
                        </div>
                        <button onClick={() => handleDeleteFeed(index)} className="text-red-600 hover:text-red-900 font-bold">X</button>
                    </div>
                ))}
            </div>
            <div className="flex gap-4 items-end p-4 border-t">
                <div className="flex-grow">
                    <label className="block text-sm font-medium">Feed URL</label>
                    <input type="url" value={newFeed.url} onChange={e => setNewFeed({...newFeed, url: e.target.value})} placeholder="https://example.com/feed" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Category</label>
                    <select value={newFeed.category} onChange={e => setNewFeed({...newFeed, category: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                        <option>Multi-platform</option>
                        <option>PlayStation</option>
                        <option>Xbox</option>
                        <option>Nintendo</option>
                        <option>PC Gaming</option>
                        <option>Mobile</option>
                    </select>
                </div>
                <button onClick={handleAddFeed} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Add Feed</button>
            </div>
        </div>
    );
};

// --- Manage Prompts Component ---
const ManagePrompts = () => {
    const [prompts, setPrompts] = useState({ relevance: '', article: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchPrompts = useCallback(async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'config', 'prompts');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setPrompts(docSnap.data());
            } else {
                 setError("Prompts configuration not found. Please create a 'prompts' document in the 'config' collection.");
            }
        } catch (err) { setError("Failed to fetch prompts: " + err.message); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

    const handleSavePrompts = async () => {
        try {
            await setDoc(doc(db, 'config', 'prompts'), prompts);
            alert("Prompts saved successfully!");
        } catch (err) {
            alert("Failed to save prompts: " + err.message);
        }
    };

    if (loading) return <p>Loading prompts...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Manage AI Prompts</h2>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Relevance Check Prompt</label>
                    <textarea value={prompts.relevance} onChange={e => setPrompts({...prompts, relevance: e.target.value})} rows="5" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono text-sm"></textarea>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Article Generation Prompt</label>
                    {/* FIX: Replaced the problematic JSX with a safer way to display the placeholders */}
                    <p className="text-xs text-gray-500 mb-1">Use <code>${'{title}'}</code>, <code>${'{snippet}'}</code>, and <code>${'{imageList}'}</code> as placeholders.</p>
                    <textarea value={prompts.article} onChange={e => setPrompts({...prompts, article: e.target.value})} rows="15" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono text-sm"></textarea>
                </div>
            </div>
            <div className="mt-6 text-right">
                <button onClick={handleSavePrompts} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Save Prompts</button>
            </div>
        </div>
    );
};

// --- Database Management Component ---
const ManageDatabase = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleClearDatabase = async () => {
        setMessage('');
        if (window.confirm('DANGER: Are you absolutely sure you want to delete ALL articles? This cannot be undone.')) {
            setLoading(true);
            try {
                const snapshot = await getDocs(collection(db, 'articles'));
                const batch = writeBatch(db);
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                setMessage('Successfully deleted all articles.');
            } catch (err) { setMessage('Error clearing database: ' + err.message); }
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Database Management</h2>
            <div className="p-4 border border-red-300 bg-red-50 rounded-lg">
                <h3 className="text-lg font-bold text-red-800">Danger Zone</h3>
                <p className="text-red-700 mt-2 mb-4">This action will permanently delete all articles.</p>
                <button onClick={handleClearDatabase} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:bg-red-400">{loading ? 'Deleting...' : 'Clear Article Database'}</button>
                {message && <p className="mt-4 text-sm font-medium">{message}</p>}
            </div>
        </div>
    );
};

// --- Main Admin Dashboard Component ---
const AdminDashboard = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState('articles');
    
    const renderTabContent = () => {
        switch (activeTab) {
            case 'articles': return <ManageArticles />;
            case 'feeds': return <ManageFeeds />;
            case 'prompts': return <ManagePrompts />;
            case 'database': return <ManageDatabase />;
            default: return null;
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen">
            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                    <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Logout</button>
                </div>
            </header>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <button onClick={() => setActiveTab('articles')} className={`${activeTab === 'articles' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Manage Articles</button>
                            <button onClick={() => setActiveTab('feeds')} className={`${activeTab === 'feeds' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Manage Feeds</button>
                            <button onClick={() => setActiveTab('prompts')} className={`${activeTab === 'prompts' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>AI Prompts</button>
                            <button onClick={() => setActiveTab('database')} className={`${activeTab === 'database' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Database</button>
                        </nav>
                    </div>
                    <div className="pt-8">{renderTabContent()}</div>
                </div>
            </main>
        </div>
    );
};

// --- Parent AdminPage Component ---
export const AdminPage = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && user.email.toLowerCase() === 'lasikie@hotmail.co.uk') {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = () => setIsAdmin(true);
    const handleLogout = async () => {
        await signOut(auth);
        setIsAdmin(false);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return isAdmin ? <AdminDashboard onLogout={handleLogout} /> : <AdminLogin onLogin={handleLogin} />;
};
