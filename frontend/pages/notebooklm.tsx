import React, { useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Copy, ExternalLink, Loader, AlertCircle, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NotebookLMSession {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  lastModified: string;
  shareLink: string;
  accessLevel: 'private' | 'shared' | 'public';
  documentCount: number;
}

const NotebookLMPage: NextPage = () => {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [sessions, setSessions] = useState<NotebookLMSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionDescription, setNewSessionDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sessions' | 'create'>('sessions');

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [isLoading, user, router]);

  // Fetch sessions
  React.useEffect(() => {
    if (!user) return;

    const fetchSessions = async () => {
      try {
        setIsLoadingSessions(true);
        setError(null);

        // TODO: Replace with actual API call
        // const response = await fetch('/api/notebooklm/sessions', {
        //   headers: {
        //     'Authorization': `Bearer ${token}`
        //   }
        // });

        // Mock data for demonstration
        const mockSessions: NotebookLMSession[] = [
          {
            id: '1',
            title: '公園樹木せん定工事 - 施工計画書',
            description: '公園樹木せん定等委託工事の施工計画書作成用ノートブック',
            createdAt: '2026-05-23 08:30:00',
            lastModified: '2026-05-23 14:45:22',
            shareLink: 'https://notebooklm.google.com/notebooks/share/abc123xyz789',
            accessLevel: 'shared',
            documentCount: 3,
          },
          {
            id: '2',
            title: '河川護岸工事 - 設計検討',
            description: '河川護岸工事の設計・施工検討資料',
            createdAt: '2026-05-20 10:15:00',
            lastModified: '2026-05-22 16:20:45',
            shareLink: 'https://notebooklm.google.com/notebooks/share/def456uvw012',
            accessLevel: 'shared',
            documentCount: 5,
          },
        ];

        setSessions(mockSessions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'セッションの読み込みに失敗しました');
      } finally {
        setIsLoadingSessions(false);
      }
    };

    fetchSessions();
  }, [user]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSessionTitle.trim()) {
      setError('タイトルを入力してください');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      // TODO: Replace with actual API call
      // const response = await fetch('/api/notebooklm/sessions', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     title: newSessionTitle,
      //     description: newSessionDescription
      //   })
      // });

      // Mock new session
      const newSession: NotebookLMSession = {
        id: String(sessions.length + 1),
        title: newSessionTitle,
        description: newSessionDescription,
        createdAt: new Date().toLocaleString('ja-JP'),
        lastModified: new Date().toLocaleString('ja-JP'),
        shareLink: `https://notebooklm.google.com/notebooks/share/new${Math.random().toString(36).substr(2, 9)}`,
        accessLevel: 'private',
        documentCount: 0,
      };

      setSessions((prev) => [newSession, ...prev]);
      setNewSessionTitle('');
      setNewSessionDescription('');
      setActiveTab('sessions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'セッションの作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = (sessionId: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(sessionId);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleChangeAccessLevel = async (sessionId: string, newLevel: 'private' | 'shared' | 'public') => {
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/notebooklm/sessions/${sessionId}`, {
      //   method: 'PATCH',
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({ accessLevel: newLevel })
      // });

      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, accessLevel: newLevel } : session
        )
      );
    } catch (err) {
      setError('アクセスレベルの変更に失敗しました');
    }
  };

  const getAccessLevelBadge = (level: string) => {
    switch (level) {
      case 'private':
        return <span className="px-2.5 py-0.5 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">プライベート</span>;
      case 'shared':
        return <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">共有中</span>;
      case 'public':
        return <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">公開</span>;
      default:
        return null;
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
        <title>NotebookLM連携 | 施工計画書自動作成システム</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-3 mb-2">
              <LinkIcon className="h-8 w-8 text-primary-500" />
              <h1 className="text-3xl font-bold text-gray-900">NotebookLM 連携</h1>
            </div>
            <p className="text-sm text-gray-600">NotebookLMを使用して、設計図書や施工仕様書を分析し、施工計画書作成に活用します</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Info Box */}
          <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">NotebookLMについて</p>
                <p>
                  NotebookLMはGoogleが提供するAI分析ツールです。設計図書や要件書をアップロードすることで、
                  自動的に要点の整理や質問応答を行うことができます。施工計画書作成時の参考資料として活用できます。
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 text-sm flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('sessions')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'sessions'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                セッション一覧
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'create'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                新規作成
              </button>
            </div>
          </div>

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div>
              {isLoadingSessions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="h-8 w-8 animate-spin text-primary-500" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12">
                  <LinkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">まだセッションが作成されていません</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
                  >
                    新規作成
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-lg border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{session.title}</h3>
                          <p className="text-sm text-gray-600">{session.description}</p>
                        </div>
                        <div>{getAccessLevelBadge(session.accessLevel)}</div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-gray-600">作成日時</p>
                          <p className="font-medium text-gray-900">{session.createdAt}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">最終更新</p>
                          <p className="font-medium text-gray-900">{session.lastModified}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">ドキュメント数</p>
                          <p className="font-medium text-gray-900">{session.documentCount}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">共有リンク</p>
                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                          <input
                            type="text"
                            value={session.shareLink}
                            readOnly
                            className="flex-1 bg-transparent text-sm text-gray-600 outline-none"
                          />
                          <button
                            onClick={() => handleCopyLink(session.id, session.shareLink)}
                            className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            title="コピー"
                          >
                            {copied === session.id ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <Copy className="h-5 w-5" />
                            )}
                          </button>
                          <a
                            href={session.shareLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            title="外部ページを開く"
                          >
                            <ExternalLink className="h-5 w-5" />
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700">
                          アクセスレベル:
                        </label>
                        <select
                          value={session.accessLevel}
                          onChange={(e) =>
                            handleChangeAccessLevel(session.id, e.target.value as 'private' | 'shared' | 'public')
                          }
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                        >
                          <option value="private">プライベート</option>
                          <option value="shared">共有</option>
                          <option value="public">公開</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create Tab */}
          {activeTab === 'create' && (
            <div className="max-w-2xl">
              <div className="rounded-lg border border-gray-200 bg-white p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">新規NotebookLMセッション</h2>

                <form onSubmit={handleCreateSession} className="space-y-5">
                  {/* Title */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      セッションタイトル *
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={newSessionTitle}
                      onChange={(e) => setNewSessionTitle(e.target.value)}
                      placeholder="例: 公園樹木せん定工事 - 施工計画書"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      disabled={isCreating}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      説明
                    </label>
                    <textarea
                      id="description"
                      value={newSessionDescription}
                      onChange={(e) => setNewSessionDescription(e.target.value)}
                      placeholder="このセッションの目的や内容を説明してください"
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 resize-none"
                      disabled={isCreating}
                    />
                  </div>

                  {/* Info */}
                  <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                    <p className="text-xs text-blue-800">
                      セッションを作成した後、NotebookLM公式サイト（https://notebooklm.google.com）で設計図書や
                      要件書をアップロードしてください。
                    </p>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isCreating || !newSessionTitle.trim()}
                    className="w-full rounded-lg bg-primary-500 px-4 py-2.5 text-white font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCreating && <Loader className="h-4 w-4 animate-spin" />}
                    <span>{isCreating ? '作成中...' : 'セッションを作成'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotebookLMPage;
