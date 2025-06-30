import React, { useState, useEffect } from 'react';
import { auth } from './firebase'; // FIX: Removed unused 'db' import
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
// FIX: Removed all unused imports from 'firebase/firestore'
// We will add these back as we implement the features for each tab.

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
            if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/wrong-password') {
                try {
                    await createUserWithEmailAndPassword(auth, email, password);
                    onLogin();
                } catch (createError) {
                    setError(`Failed to create admin account: ${createError.message}`);
                }
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
                        <label className="block text-slate-700 text-sm font-bold mb-2" htmlFor="email">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-slate-700 leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="lasikie@hotmail.co.uk"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-slate-700 text-sm font-bold mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-slate-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="******************"
                            required
                        />
                        <p className="text-xs text-slate-500">If this is your first time, the password you enter will be set as your new admin password.</p>
                    </div>
                    {error && <p className="bg-red-100 text-red-700 text-sm p-3 rounded mb-4">{error}</p>}
                    <div className="flex items-center justify-between">
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                        >
                            Sign In
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Main Admin Dashboard Component ---
const AdminDashboard = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState('articles');
    
    return (
        <div className="bg-slate-50 min-h-screen">
            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                    <button
                        onClick={onLogout}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                        Logout
                    </button>
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
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-xl font-semibold mb-4 capitalize">{activeTab} Management</h2>
                            <p>Functionality for the {activeTab} section will be implemented here.</p>
                        </div>
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

    const handleLogin = () => {
        setIsAdmin(true);
    };

    const handleLogout = async () => {
        await signOut(auth);
        setIsAdmin(false);
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return isAdmin ? <AdminDashboard onLogout={handleLogout} /> : <AdminLogin onLogin={handleLogin} />;
};
