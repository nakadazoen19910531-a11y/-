import React, { useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { User, Mail, Loader, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  plansGenerated: number;
  role: string;
}

const ProfilePage: NextPage = () => {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [isLoading, user, router]);

  // Fetch profile
  React.useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);

        // TODO: Replace with actual API call
        // const response = await fetch('/api/profile', {
        //   headers: {
        //     'Authorization': `Bearer ${token}`
        //   }
        // });

        // Mock profile data
        const mockProfile: UserProfile = {
          id: user.id || '1',
          name: user.name || 'ユーザー',
          email: user.email || 'user@example.com',
          createdAt: '2026-05-01',
          plansGenerated: 12,
          role: 'user',
        };

        setProfile(mockProfile);
        setNewName(mockProfile.name);
      } catch (err) {
        setMessage({
          type: 'error',
          text: 'プロフィールの読み込みに失敗しました',
        });
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleUpdateName = async () => {
    if (!newName.trim() || newName === profile?.name) {
      setIsEditingName(false);
      return;
    }

    try {
      setIsUpdating(true);
      setMessage(null);

      // TODO: Replace with actual API call
      // await fetch('/api/profile', {
      //   method: 'PATCH',
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({ name: newName })
      // });

      if (profile) {
        setProfile({ ...profile, name: newName });
      }

      setIsEditingName(false);
      setMessage({
        type: 'success',
        text: 'お名前を更新しました',
      });

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: '更新に失敗しました',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>プロフィール | 施工計画書自動作成システム</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900">プロフィール</h1>
            <p className="mt-2 text-sm text-gray-600">アカウント情報を表示・管理します</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          {isLoadingProfile ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Avatar Section */}
              <div className="rounded-lg border border-gray-200 bg-white p-8">
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                    <User className="h-12 w-12 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">ID: {profile.id}</p>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div className="rounded-lg border border-gray-200 bg-white p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">基本情報</h3>

                <div className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      お名前
                    </label>
                    {isEditingName ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          disabled={isUpdating}
                          autoFocus
                        />
                        <button
                          onClick={handleUpdateName}
                          disabled={isUpdating}
                          className="px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {isUpdating && <Loader className="h-4 w-4 animate-spin" />}
                          保存
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingName(false);
                            setNewName(profile.name);
                          }}
                          className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5">
                        <span className="text-gray-900">{profile.name}</span>
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          編集
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      メールアドレス
                    </label>
                    <div className="flex items-center gap-3 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-900">{profile.email}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      ※メールアドレスの変更についてはサポートにお問い合わせください
                    </p>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ユーザータイプ
                    </label>
                    <div className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        {profile.role === 'admin' ? '管理者' : 'ユーザー'}
                      </span>
                    </div>
                  </div>

                  {/* Account Created Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      アカウント作成日
                    </label>
                    <div className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5">
                      <span className="text-gray-900">{profile.createdAt}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage Statistics */}
              <div className="rounded-lg border border-gray-200 bg-white p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">利用統計</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-gray-200 p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                    <p className="text-sm text-gray-600">生成した施工計画書</p>
                    <p className="text-3xl font-bold text-primary-600 mt-2">{profile.plansGenerated}</p>
                    <p className="text-xs text-gray-600 mt-1">件</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4 bg-gradient-to-br from-green-50 to-emerald-50">
                    <p className="text-sm text-gray-600">アカウント有効期間</p>
                    <p className="text-xl font-bold text-green-600 mt-2">無制限</p>
                    <p className="text-xs text-gray-600 mt-1">プレミアムプラン</p>
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="rounded-lg border border-gray-200 bg-white p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">セキュリティ</h3>

                <div className="space-y-4">
                  <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium text-gray-900 text-sm">
                    パスワードを変更
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium text-gray-900 text-sm">
                    2段階認証を設定
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium text-gray-900 text-sm">
                    ログイン履歴を表示
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="rounded-lg border border-red-200 bg-red-50 p-8">
                <h3 className="text-lg font-semibold text-red-900 mb-6">危険な操作</h3>

                <button className="w-full text-left px-4 py-3 rounded-lg border border-red-300 bg-white hover:bg-red-50 transition-colors font-medium text-red-600 text-sm">
                  アカウントを削除
                </button>
                <p className="text-xs text-red-700 mt-2">
                  ※この操作は取り消せません。アカウント削除前にすべての重要なデータをダウンロードしてください。
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
