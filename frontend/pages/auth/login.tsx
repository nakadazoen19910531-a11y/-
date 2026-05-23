import React, { useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AlertCircle, Loader, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const LoginPage: NextPage = () => {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!email || !password) {
        setError('メールアドレスとパスワードを入力してください');
        return;
      }

      await login(email, password);
      router.push('/plans/create');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>ログイン | 施工計画書自動作成システム</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Logo Section */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary-500 rounded-lg">
                <FileText className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">施工計画書</h1>
            <p className="text-sm text-gray-600 mt-1">自動作成システム</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">ログイン</h2>

            {/* Error Message */}
            {error && (
              <div className="mb-6 flex items-center space-x-3 rounded-lg bg-red-50 p-4 text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  disabled={isSubmitting}
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  パスワード
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  disabled={isSubmitting}
                />
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 text-primary-500 rounded border-gray-300"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                  このコンピュータでログイン状態を保持
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-primary-500 px-4 py-2.5 text-white font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isSubmitting && <Loader className="h-4 w-4 animate-spin" />}
                <span>{isSubmitting ? 'ログイン中...' : 'ログイン'}</span>
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center space-x-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-500">または</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-gray-600">
              アカウントをお持ちでないですか？{' '}
              <Link
                href="/auth/register"
                className="text-primary-600 font-medium hover:text-primary-700"
              >
                登録する
              </Link>
            </p>
          </div>

          {/* Demo Info */}
          <div className="mt-6 rounded-lg bg-blue-50 p-4 text-center text-sm text-blue-800">
            <p className="font-medium mb-2">デモ用認証情報</p>
            <p>メール: <code className="bg-blue-100 px-2 py-1 rounded">demo@example.com</code></p>
            <p>パスワード: <code className="bg-blue-100 px-2 py-1 rounded">password123</code></p>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
