"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Clean inputs to prevent accidental spaces
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();
    
    // If user typed the full email, use it. Otherwise append the domain.
    const email = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@myassets.local`;
    
    const { error } = await supabase.auth.signInWithPassword({ 
      email, 
      password: cleanPassword 
    });

    setLoading(false);

    if (error) {
      // Give a clearer error message for the most common issue
      if (error.message.includes('Email not confirmed')) {
        setError('Email not confirmed. Please disable "Confirm email" in Supabase Auth settings.');
      } else {
        setError(`Login failed: ${error.message}`);
      }
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">AssetTracker Login</h1>
        {error && <p className="text-red-500 text-sm text-center mb-4 bg-red-50 p-2 rounded">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black" placeholder="Winny" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black" placeholder="••••••" required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-black text-white p-2 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50">
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}