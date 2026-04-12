'use client';

import AdminView from '@/components/AdminView';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { Lock } from 'lucide-react';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const navigateToKids = () => {
    window.location.href = '/';
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin') {
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">先生用画面</h1>
          <p className="text-slate-500 mb-6 relative">パスワードを入力してください</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="パスワード"
              className={`w-full p-3 border rounded-xl outline-none transition-colors ${error ? 'border-red-500 bg-red-50' : 'focus:border-blue-500'}`}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              autoFocus
            />
            {error && <p className="text-red-500 text-sm">パスワードが違います</p>}
            <Button type="submit" className="w-full">ログイン</Button>
            <div className="pt-4 mt-4 border-t">
              <Button variant="ghost" className="w-full" onClick={navigateToKids}>児童用画面にもどる</Button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative p-4 bg-slate-50">
      <AdminView onNavigateToKids={navigateToKids} />
    </main>
  );
}
