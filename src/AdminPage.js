import React, { useState, useEffect, useCallback } from 'react';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, doc, deleteDoc, query, orderBy, writeBatch } from 'firebase/firestore';

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
        } catch (signInError) {
            if (signInError.code === 'auth/user-not-found') {
                 setError('Admin account does not exist. Please create it in the Firebase console.');
            } else if (signInError.code === 'auth/wrong-password'){
                 setError('Incorrect password.');
            } else {
                setError(`Login failed: ${signInError.message}`);
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-sm w-full">
                <h1 className="text-2xl font-bold text-center text-slate-800 mb-6">Admin Login</h1>
                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <label className="block text-slate-700 text-sm font-bold mb-2" htmlFor="email">Email Address</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-slate-700 leading-tight focus:outline-none focus:shadow-outline" placeholder="lasikie@hotmail.co.uk" required />
                    </div>
                    <div className="mb-6">
                        <label className="block text-slate-700 text-sm font-bold mb-2" htmlFor="password">Password</label>
                        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-slate-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" placeholder="******************" required />
                    </div>
                    {error && <p className="bg-red-100 text-red-700 text-sm p-3 rounded mb-4">{error}</p>}
                    <div className="flex items-center justify-between">
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full">Sign In</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Manage Articles Component ---
const ManageArticles = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchArticles = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const articlesRef = collection(db, 'articles');
            const q = query(articlesRef, orderBy('published', 'desc'));
            const querySnapshot = await getDocs(q);
            const articlesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setArticles(articlesData);
        } catch (err) {
            setError('Failed to fetch articles. ' + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);

    const handleDelete = async (articleId) => {
        if (window.confirm('Are you sure you want to delete this article? This cannot be undone.')) {
            try {
                await deleteDoc(doc(db, 'articles', articleId));
                setArticles(prevArticles => prevArticles.filter(article => article.id !== articleId));
            } catch (err) {
                alert('Failed to delete article: ' + err.message);
            }
        }
    };

    const filteredArticles = articles.filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Manage Articles</h2>
            <div className="mb-4">
                <input type="text" placeholder="Search articles..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-slate-700 leading-tight focus:outline-none focus:shadow-outline" />
            </div>
            {loading && <p>Loading articles...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!loading && !error && (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Published</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredArticles.map(article => (
                                <tr key={article.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{article.title_short || article.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{article.category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(article.published.seconds * 1000).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                        <button className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                        <button onClick={() => handleDelete(article.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// --- Database Management Component ---
const ManageDatabase = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleClearDatabase = async () => {
        setMessage('');
        if (window.confirm('DANGER: Are you absolutely sure you want to delete ALL articles from the database? This action cannot be undone.')) {
            setLoading(true);
            try {
                const articlesRef = collection(db, 'articles');
                const querySnapshot = await getDocs(articlesRef);
                const batch = writeBatch(db);
                querySnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                setMessage('Successfully deleted all articles from the database.');
            } catch (err) {
                setMessage('Error clearing database: ' + err.message);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Database Management</h2>
            <div className="p-4 border border-red-300 bg-red-50 rounded-lg">
                <h3 className="text-lg font-bold text-red-800">Danger Zone</h3>
                <p className="text-red-700 mt-2 mb-4">This action will permanently delete all articles. This is irreversible. Please be certain before proceeding.</p>
                <button
                    onClick={handleClearDatabase}
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-red-400"
                >
                    {loading ? 'Deleting...' : 'Clear Entire Article Database'}
                </button>
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
            case 'articles':
                return <ManageArticles />;
            case 'feeds':
                return <div className="bg-white p-6 rounded-lg shadow"><h2 className="text-xl font-semibold mb-4">Manage Feeds</h2><p>Functionality for this section will be implemented here.</p></div>;
            case 'prompts':
                return <div className="bg-white p-6 rounded-lg shadow"><h2 className="text-xl font-semibold mb-4">AI Prompts</h2><p>Functionality for this section will be implemented here.</p></div>;
            case 'database':
                 return <ManageDatabase />;
            default:
                return null;
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen">
            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                    <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors">Logout</button>
                </div>
            </header>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <button onClick={() => setActiveTab('articles')} className={`${activeTab === 'articles' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Manage Articles</button>
                            <button onClick={() => setActiveTab('feeds')} className={`${activeTab === 'feeds' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Manage Feeds</button>
                            <button onClick={() => setActiveTab('prompts')} className={`${activeTab === 'prompts' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>AI Prompts</button>
                            <button onClick={() => setActiveTab('database')} className={`${activeTab === 'database' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Database</button>
                        </nav>
                    </div>
                    <div className="pt-8">
                        {renderTabContent()}
                    </div>
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

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return isAdmin ? <AdminDashboard onLogout={handleLogout} /> : <AdminLogin onLogin={handleLogin} />;
};
