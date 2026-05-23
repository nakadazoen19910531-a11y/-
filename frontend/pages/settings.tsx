import React, { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Settings as SettingsIcon,
  Loader,
  CheckCircle2,
  AlertCircle,
  Bell,
  Palette,
  FileText,
  Users,
  UserPlus,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPost, apiDelete } from '@/lib/api';

// ─── 型定義 ────────────────────────────────────────────
interface AppSettings {
  notifications: { planGenerated: boolean; planFailed: boolean; weeklyReport: boolean };
  display: { theme: 'light' | 'dark' | 'auto'; language: 'ja' | 'en'; itemsPerPage: number };
  export: { defaultFormat: 'docx' | 'pdf'; autoBackup: boolean };
}

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  created_at: string;
  is_active: boolean;
}

type Section = 'notifications' | 'display' | 'export' | 'users';

// ─── ページコンポーネント ────────────────────────────────
const SettingsPage: NextPage = () => {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === 'admin';

  // 設定値
  const [settings, setSettings] = useState<AppSettings>({
    notifications: { planGenerated: true, planFailed: true, weeklyReport: false },
    display: { theme: 'auto', language: 'ja', itemsPerPage: 10 },
    export: { defaultFormat: 'docx', autoBackup: false },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('notifications');

  // ユーザー管理
  const [userList, setUserList] = useState<UserRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // 新規ユーザー登録フォーム
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', confirm: '', role: 'user' as 'user' | 'admin' });
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ─── 認証ガード ──────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [isLoading, user, router]);

  // ─── ユーザー一覧取得 ─────────────────────────────────
  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const data = await apiGet<{ users: UserRecord[] }>('/auth/users');
      setUserList(data.users || []);
    } catch {
      setMessage({ type: 'error', text: 'ユーザー一覧の取得に失敗しました' });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'users' && user) fetchUsers();
  }, [activeSection, user]);

  // ─── 設定保存 ─────────────────────────────────────────
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setMessage(null);
      // TODO: API 保存
      await new Promise((r) => setTimeout(r, 500));
      setMessage({ type: 'success', text: '設定を保存しました' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: '設定の保存に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  const updateNotificationSetting = (key: keyof AppSettings['notifications'], value: boolean) =>
    setSettings((p) => ({ ...p, notifications: { ...p.notifications, [key]: value } }));
  const updateDisplaySetting = (key: keyof AppSettings['display'], value: string | number) =>
    setSettings((p) => ({ ...p, display: { ...p.display, [key]: value } }));
  const updateExportSetting = (key: keyof AppSettings['export'], value: string | boolean) =>
    setSettings((p) => ({ ...p, export: { ...p.export, [key]: value } }));

  // ─── ユーザー登録 ─────────────────────────────────────
  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) {
      setFormError('すべての項目を入力してください');
      return;
    }
    if (newUser.password.length < 8) {
      setFormError('パスワードは8文字以上で設定してください');
      return;
    }
    if (newUser.password !== newUser.confirm) {
      setFormError('パスワードと確認用パスワードが一致しません');
      return;
    }

    try {
      setIsRegistering(true);
      await apiPost('/auth/users', {
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        role: newUser.role,
      });
      setMessage({ type: 'success', text: `ユーザー「${newUser.name}」を登録しました` });
      setNewUser({ name: '', email: '', password: '', confirm: '', role: 'user' });
      await fetchUsers();
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'ユーザー登録に失敗しました');
    } finally {
      setIsRegistering(false);
    }
  };

  // ─── ユーザー削除 ─────────────────────────────────────
  const handleDeleteUser = async (target: UserRecord) => {
    if (!confirm(`ユーザー「${target.name}」を削除してもよろしいですか？`)) return;
    try {
      setDeletingUserId(target.id);
      await apiDelete(`/auth/users/${target.id}`);
      setMessage({ type: 'success', text: `ユーザー「${target.name}」を削除しました` });
      await fetchUsers();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '削除に失敗しました' });
    } finally {
      setDeletingUserId(null);
    }
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
    catch { return iso; }
  };

  // ─── ローディング ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }
  if (!user) return null;

  // ─── サイドバーナビ定義 ────────────────────────────────
  const sections: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'notifications', label: '通知設定', icon: <Bell className="h-5 w-5" /> },
    { id: 'display',       label: '表示設定', icon: <Palette className="h-5 w-5" /> },
    { id: 'export',        label: '出力設定', icon: <FileText className="h-5 w-5" /> },
    ...(isAdmin ? [{ id: 'users' as Section, label: 'ユーザー管理', icon: <Users className="h-5 w-5" /> }] : []),
  ];

  // ─── レンダリング ──────────────────────────────────────
  return (
    <>
      <Head>
        <title>設定 | 施工計画書自動作成システム</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-3 mb-2">
              <SettingsIcon className="h-8 w-8 text-primary-500" />
              <h1 className="text-3xl font-bold text-gray-900">設定</h1>
            </div>
            <p className="text-sm text-gray-600">アプリケーションの設定をカスタマイズします</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* グローバルメッセージ */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message.type === 'success'
                ? <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            {/* サイドバー */}
            <div className="lg:w-56">
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden sticky top-4">
                <nav className="divide-y divide-gray-200">
                  {sections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      className={`w-full text-left px-4 py-3 font-medium text-sm transition-colors flex items-center gap-3 ${
                        activeSection === s.id
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {s.icon}
                      {s.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* メインコンテンツ */}
            <div className="flex-1">
              {/* 読み取り専用バナー（管理者以外） */}
              {!isAdmin && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600" />
                  <p className="text-sm text-amber-700">
                    設定の変更は管理者のみ行えます。現在は読み取り専用です。
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-gray-200 bg-white p-8">

                {/* ── 通知設定 ── */}
                {activeSection === 'notifications' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">通知設定</h2>
                    <div className="space-y-4">
                      {[
                        { key: 'planGenerated' as const, label: '施工計画書の生成完了', desc: '施工計画書の生成が完了したときに通知を受け取ります' },
                        { key: 'planFailed' as const,    label: '施工計画書の生成失敗', desc: '施工計画書の生成に失敗したときに通知を受け取ります' },
                        { key: 'weeklyReport' as const,  label: '週間レポート',         desc: '毎週月曜日に使用統計レポートを受け取ります' },
                      ].map(({ key, label, desc }) => (
                        <div key={key} className={`flex items-center justify-between p-4 rounded-lg border border-gray-200 transition-colors ${isAdmin ? 'hover:bg-gray-50' : 'opacity-70'}`}>
                          <div>
                            <p className="font-medium text-gray-900">{label}</p>
                            <p className="text-sm text-gray-600 mt-1">{desc}</p>
                          </div>
                          <label className={`relative inline-flex items-center ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                            <input type="checkbox" checked={settings.notifications[key]}
                              onChange={(e) => isAdmin && updateNotificationSetting(key, e.target.checked)}
                              disabled={!isAdmin}
                              className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── 表示設定 ── */}
                {activeSection === 'display' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">表示設定</h2>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">テーマ</label>
                        <div className="space-y-2">
                          {(['light', 'dark', 'auto'] as const).map((t) => (
                            <label key={t} className={`flex items-center p-3 rounded-lg border border-gray-200 ${isAdmin ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
                              <input type="radio" name="theme" value={t}
                                checked={settings.display.theme === t}
                                onChange={(e) => isAdmin && updateDisplaySetting('theme', e.target.value)}
                                disabled={!isAdmin}
                                className="h-4 w-4 text-primary-600 border-gray-300" />
                              <span className="ml-3 text-gray-900 font-medium">
                                {t === 'light' ? 'ライト' : t === 'dark' ? 'ダーク' : '自動'}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">言語</label>
                        <select value={settings.display.language}
                          onChange={(e) => updateDisplaySetting('language', e.target.value)}
                          disabled={!isAdmin}
                          className={`w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 ${!isAdmin ? 'cursor-not-allowed opacity-70 bg-gray-50' : ''}`}>
                          <option value="ja">日本語</option>
                          <option value="en">English</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">1ページあたりの表示件数</label>
                        <select value={settings.display.itemsPerPage}
                          onChange={(e) => updateDisplaySetting('itemsPerPage', parseInt(e.target.value))}
                          disabled={!isAdmin}
                          className={`w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 ${!isAdmin ? 'cursor-not-allowed opacity-70 bg-gray-50' : ''}`}>
                          {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}件</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── 出力設定 ── */}
                {activeSection === 'export' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">出力設定</h2>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">デフォルト出力形式</label>
                        <div className="space-y-2">
                          {(['docx', 'pdf'] as const).map((f) => (
                            <label key={f} className={`flex items-center p-3 rounded-lg border border-gray-200 ${isAdmin ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
                              <input type="radio" name="format" value={f}
                                checked={settings.export.defaultFormat === f}
                                onChange={(e) => isAdmin && updateExportSetting('defaultFormat', e.target.value)}
                                disabled={!isAdmin}
                                className="h-4 w-4 text-primary-600 border-gray-300" />
                              <span className="ml-3 text-gray-900 font-medium">
                                {f === 'docx' ? 'Word (.docx)' : 'PDF (.pdf)'}
                              </span>
                              <span className="ml-auto text-xs text-gray-600">
                                {f === 'docx' ? '編集可能' : '印刷向け'}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className={`flex items-center justify-between p-4 rounded-lg border border-gray-200 transition-colors ${isAdmin ? 'hover:bg-gray-50' : 'opacity-70'}`}>
                        <div>
                          <p className="font-medium text-gray-900">自動バックアップ</p>
                          <p className="text-sm text-gray-600 mt-1">生成した施工計画書を自動的にバックアップします</p>
                        </div>
                        <label className={`relative inline-flex items-center ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                          <input type="checkbox" checked={settings.export.autoBackup}
                            onChange={(e) => isAdmin && updateExportSetting('autoBackup', e.target.checked)}
                            disabled={!isAdmin}
                            className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── ユーザー管理 ── */}
                {activeSection === 'users' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">ユーザー管理</h2>
                    <p className="text-sm text-gray-500 mb-8">システムにアクセスできるユーザーを管理します</p>

                    {/* ── 新規ユーザー登録フォーム ── */}
                    <div className="mb-10 rounded-xl border border-primary-200 bg-primary-50 p-6">
                      <div className="flex items-center gap-2 mb-5">
                        <UserPlus className="h-5 w-5 text-primary-600" />
                        <h3 className="text-lg font-semibold text-primary-900">新規ユーザーを登録</h3>
                      </div>

                      {formError && (
                        <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
                          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <p className="text-sm">{formError}</p>
                        </div>
                      )}

                      <form onSubmit={handleRegisterUser} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* 氏名 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              氏名 <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newUser.name}
                              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                              placeholder="山田 太郎"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 bg-white"
                            />
                          </div>

                          {/* メールアドレス */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              メールアドレス <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="email"
                              value={newUser.email}
                              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                              placeholder="yamada@example.com"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 bg-white"
                            />
                          </div>

                          {/* パスワード */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              パスワード <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                placeholder="8文字以上"
                                className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          {/* パスワード確認 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              パスワード（確認） <span className="text-red-500">*</span>
                            </label>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={newUser.confirm}
                              onChange={(e) => setNewUser({ ...newUser, confirm: e.target.value })}
                              placeholder="パスワードを再入力"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 bg-white"
                            />
                          </div>
                        </div>

                        {/* 権限 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">権限</label>
                          <div className="flex gap-4">
                            {[
                              { value: 'user', label: '一般ユーザー', desc: '施工計画書の作成・閲覧' },
                              { value: 'admin', label: '管理者', desc: 'すべての機能＋ユーザー管理' },
                            ].map((r) => (
                              <label key={r.value} className="flex items-start gap-3 flex-1 p-3 rounded-lg border bg-white cursor-pointer hover:bg-gray-50 transition-colors">
                                <input
                                  type="radio"
                                  name="new-user-role"
                                  value={r.value}
                                  checked={newUser.role === r.value}
                                  onChange={() => setNewUser({ ...newUser, role: r.value as 'user' | 'admin' })}
                                  className="mt-0.5 h-4 w-4 text-primary-600"
                                />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{r.label}</p>
                                  <p className="text-xs text-gray-500">{r.desc}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="submit"
                            disabled={isRegistering}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
                          >
                            {isRegistering
                              ? <Loader className="h-4 w-4 animate-spin" />
                              : <UserPlus className="h-4 w-4" />}
                            {isRegistering ? '登録中...' : 'ユーザーを登録'}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* ── 既存ユーザー一覧 ── */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          登録済みユーザー
                          {userList.length > 0 && (
                            <span className="ml-2 text-sm font-normal text-gray-500">{userList.length} 名</span>
                          )}
                        </h3>
                        <button
                          onClick={fetchUsers}
                          disabled={isLoadingUsers}
                          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                          {isLoadingUsers && <Loader className="h-3.5 w-3.5 animate-spin" />}
                          更新
                        </button>
                      </div>

                      {isLoadingUsers ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader className="h-6 w-6 animate-spin text-primary-500" />
                        </div>
                      ) : userList.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-10">ユーザーが見つかりません</p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                {['氏名', 'メールアドレス', '権限', '登録日', '操作'].map((h) => (
                                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {userList.map((u) => (
                                <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.id === user?.id ? 'bg-primary-50/30' : ''}`}>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold text-sm flex-shrink-0">
                                        {u.name.charAt(0)}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">{u.name}</p>
                                        {u.id === user?.id && (
                                          <span className="text-xs text-primary-600">（自分）</span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      u.role === 'admin'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {u.role === 'admin' ? '管理者' : '一般'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(u.created_at)}</td>
                                  <td className="px-4 py-3">
                                    <button
                                      onClick={() => handleDeleteUser(u)}
                                      disabled={deletingUserId === u.id || u.id === user?.id}
                                      title={u.id === user?.id ? '自分自身は削除できません' : '削除'}
                                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      {deletingUserId === u.id
                                        ? <Loader className="h-4 w-4 animate-spin" />
                                        : <Trash2 className="h-4 w-4" />}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 保存ボタン（ユーザー管理以外） */}
                {activeSection !== 'users' && (
                  <div className="mt-8 pt-8 border-t border-gray-200 flex items-center justify-end gap-4">
                    {!isAdmin && (
                      <p className="text-sm text-gray-400">管理者のみ設定を変更できます</p>
                    )}
                    <button
                      onClick={handleSaveSettings}
                      disabled={isSaving || !isAdmin}
                      title={!isAdmin ? '管理者のみ設定を変更できます' : undefined}
                      className="px-6 py-2.5 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSaving && <Loader className="h-4 w-4 animate-spin" />}
                      保存
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
