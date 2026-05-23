import React, { useState, useEffect, useRef } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  LayoutTemplate,
  Upload,
  Trash2,
  Download,
  Loader,
  CheckCircle2,
  AlertCircle,
  FileText,
  Plus,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTemplates,
  uploadTemplate,
  deleteTemplate,
  downloadTemplate,
  type Template,
} from '@/lib/api';

// バイト数を人間が読みやすい文字列に変換
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ISO 日付を日本語形式に変換
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const TemplatesPage: NextPage = () => {
  const router   = useRouter();
  const { user, isLoading } = useAuth();
  const isAdmin  = user?.role === 'admin';
  const fileRef  = useRef<HTMLInputElement>(null);

  const [templates, setTemplates]     = useState<Template[]>([]);
  const [fetching, setFetching]       = useState(true);
  const [fetchError, setFetchError]   = useState<string | null>(null);
  const [message, setMessage]         = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // アップ���ードフォームの状態
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile]         = useState<File | null>(null);
  const [uploadName, setUploadName]         = useState('');
  const [uploadDesc, setUploadDesc]         = useState('');
  const [isUploading, setIsUploading]       = useState(false);
  const [uploadError, setUploadError]       = useState<string | null>(null);
  const [isDragging, setIsDragging]         = useState(false);

  // 削除中のID
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 認証ガード
  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [isLoading, user, router]);

  // テンプレート一覧取得
  const fetchTemplates = async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const res = await getTemplates();
      setTemplates(res.templates);
    } catch {
      setFetchError('テンプレートの取得に失敗しました');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user) fetchTemplates();
  }, [user]);

  // ファイル選択��ドロップ or input）
  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setUploadError('DOCXファイル（.docx）のみアッ��ロード可能です');
      return;
    }
    setUploadFile(file);
    if (!uploadName) setUploadName(file.name.replace(/\.docx$/i, ''));
    setUploadError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  // アップロード実行
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) { setUploadError('ファイルを選択してください'); return; }
    if (!uploadName.trim()) { setUploadError('テンプレート名を入力してください'); return; }

    setIsUploading(true);
    setUploadError(null);
    try {
      await uploadTemplate(uploadFile, uploadName.trim(), uploadDesc.trim());
      setMessage({ type: 'success', text: `「${uploadName}」をアップロードしました` });
      setShowUploadForm(false);
      setUploadFile(null);
      setUploadName('');
      setUploadDesc('');
      await fetchTemplates();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setIsUploading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // 削除
  const handleDelete = async (tmpl: Template) => {
    if (!confirm(`テンプレート「${tmpl.name}」を削��してもよろしいですか？`)) return;
    setDeletingId(tmpl.id);
    try {
      await deleteTemplate(tmpl.id);
      setMessage({ type: 'success', text: `「${tmpl.name}」を削除しました` });
      await fetchTemplates();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '削除に失敗しました' });
    } finally {
      setDeletingId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // ダウンロード
  const handleDownload = async (tmpl: Template) => {
    try {
      await downloadTemplate(tmpl.id, tmpl.original_filename);
    } catch {
      setMessage({ type: 'error', text: 'ダウンロードに失敗しました' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <>
      <Head>
        <title>テンプレート管理 | 施工計画書自動作成システム</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-3 mb-2">
              <LayoutTemplate className="h-8 w-8 text-primary-500" />
              <h1 className="text-3xl font-bold text-gray-900">テンプレート管理</h1>
            </div>
            <p className="text-sm text-gray-600">
              施工計画書生成に使用するDOCXテンプレートを管理します
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* グローバルメッセージ */}
          {message && (
            <div className={`flex items-start gap-3 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.type === 'success'
                ? <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          {/* 管理者以外の警告 */}
          {!isAdmin && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <Lock className="h-4 w-4 flex-shrink-0 text-amber-600" />
              <p className="text-sm text-amber-700">
                テンプレートのアップロード・削除は管理者のみ行���ます。閲覧とダウンロードは可能です。
              </p>
            </div>
          )}

          {/* アップロードボタン／フォーム（管理者のみ） */}
          {isAdmin && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary-500" />
                  <h2 className="text-base font-semibold text-gray-900">新しいテンプレートを追加</h2>
                </div>
                <button
                  onClick={() => { setShowUploadForm(!showUploadForm); setUploadError(null); }}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm text-white font-medium hover:bg-primary-600 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  テンプレー��を追加
                </button>
              </div>

              {showUploadForm && (
                <form onSubmit={handleUpload} className="p-5 space-y-4">
                  {/* ドロ���プゾーン */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-primary-400 bg-primary-50'
                        : uploadFile
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-300 bg-gray-50 hover:border-primary-300 hover:bg-primary-50/30'
                    }`}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".docx"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    />
                    {uploadFile ? (
                      <>
                        <FileText className="h-10 w-10 text-green-500 mb-2" />
                        <p className="text-sm font-medium text-green-700">{uploadFile.name}</p>
                        <p className="text-xs text-green-600 mt-1">{formatSize(uploadFile.size)}</p>
                        <p className="text-xs text-gray-500 mt-2">クリックして変更</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-sm font-medium text-gray-700">
                          DOCXファイルをドロップ、またはクリックして選択
                        </p>
                        <p className="text-xs text-gray-500 mt-1">.docx ファイルのみ（最大50MB）</p>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* テンプレート名 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        テンプレート��� <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={uploadName}
                        onChange={(e) => setUploadName(e.target.value)}
                        placeholder="例: 標準施工計画書 v2"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      />
                    </div>

                    {/* 説明 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        説明（任意）
                      </label>
                      <input
                        type="text"
                        value={uploadDesc}
                        onChange={(e) => setUploadDesc(e.target.value)}
                        placeholder="例: 渋谷区提出用フ���ーマット"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                  </div>

                  {/* プレースホルダーヒント */}
                  <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                    <p className="text-xs font-medium text-blue-800 mb-1">プレースホルダーについて</p>
                    <p className="text-xs text-blue-700">
                      テンプレート DOCX 内に
                      <code className="mx-1 rounded bg-blue-100 px-1 py-0.5 font-mono">{`{{工事名}}`}</code>
                      <code className="mx-1 rounded bg-blue-100 px-1 py-0.5 font-mono">{`{{工事場所}}`}</code>
                      などと記述しておくと、生成時に自動で入力データに置き換わります。
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {['{{工事名}}', '{{工事種別}}', '{{契約番号}}', '{{工事場所}}',
                        '{{startDate}}', '{{endDate}}', '{{契約金額}}', '{{発注者}}', '{{受注者}}'].map((ph) => (
                        <code key={ph} className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-mono text-blue-700">{ph}</code>
                      ))}
                    </div>
                  </div>

                  {uploadError && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-700">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <p className="text-sm">{uploadError}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowUploadForm(false); setUploadFile(null); setUploadName(''); setUploadDesc(''); setUploadError(null); }}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={isUploading}
                      className="flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2 text-sm text-white font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
                    >
                      {isUploading ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {isUploading ? 'アップロード中...' : 'アップロード'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* テンプレート一覧 */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-500" />
                <h2 className="text-base font-semibold text-gray-900">
                  登録済みテンプレート
                  {templates.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-500">{templates.length} 件</span>
                  )}
                </h2>
              </div>
              <button
                onClick={fetchTemplates}
                disabled={fetching}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
                更新
              </button>
            </div>

            {fetching ? (
              <div className="flex items-center justify-center py-16">
                <Loader className="h-6 w-6 animate-spin text-primary-500" />
              </div>
            ) : fetchError ? (
              <div className="flex items-center gap-2 px-5 py-6 text-red-600">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{fetchError}</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <LayoutTemplate className="h-12 w-12 text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-500">テンプレートがありません</p>
                {isAdmin && (
                  <p className="text-xs text-gray-400 mt-1">「テンプレートを追加」か���DOCXファイル��アップロードしてください</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100">
                      <FileText className="h-5 w-5 text-primary-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{tmpl.name}</p>
                        {!tmpl.file_exists && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            ファイルなし
                          </span>
                        )}
                      </div>
                      {tmpl.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{tmpl.description}</p>
                      )}
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                        <span>{tmpl.original_filename}</span>
                        <span>·</span>
                        <span>{formatSize(tmpl.size)}</span>
                        <span>·</span>
                        <span>{formatDate(tmpl.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* ダウンロード */}
                      <button
                        onClick={() => handleDownload(tmpl)}
                        disabled={!tmpl.file_exists}
                        title="テンプレートをダウンロード"
                        className="rounded-lg p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      {/* 削除（管理者のみ） */}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(tmpl)}
                          disabled={deletingId === tmpl.id}
                          title="削除"
                          className="rounded-lg p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {deletingId === tmpl.id
                            ? <Loader className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TemplatesPage;
