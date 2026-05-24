import React, { useState, useEffect, useRef } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  FolderOpen,
  Upload,
  Trash2,
  Download,
  Loader,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileSearch,
  Plus,
  RefreshCw,
  Lock,
  Search,
  Star,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getDesignDocuments,
  uploadDesignDocument,
  deleteDesignDocument,
  downloadDesignDocument,
  type DesignDocument,
} from '@/lib/api';

// 図書種別の選択肢
const DOC_TYPES = ['契約図書', '図面', '仕様書', '数量計算書', '見積書', '参考資料', 'その他'];

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

// ファイル種別に応じたアイコン
function FileIcon({ filename }: { filename: string }) {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'pdf':
      return <FileSearch className="h-5 w-5 text-red-600" />;
    case 'xlsx':
    case 'xls':
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    case 'zip':
      return <FileArchive className="h-5 w-5 text-yellow-600" />;
    default:
      return <FileText className="h-5 w-5 text-blue-600" />;
  }
}

// 図書種別バッジカラー
function typeBadgeColor(type: string): string {
  const map: Record<string, string> = {
    '契約図書': 'bg-purple-100 text-purple-700',
    '図面':     'bg-blue-100 text-blue-700',
    '仕様書':   'bg-indigo-100 text-indigo-700',
    '数量計算書': 'bg-emerald-100 text-emerald-700',
    '見積書':   'bg-amber-100 text-amber-700',
    '参考資料': 'bg-gray-100 text-gray-700',
    'その他':   'bg-gray-100 text-gray-600',
  };
  return map[type] || 'bg-gray-100 text-gray-700';
}

const DesignDocumentsPage: NextPage = () => {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === 'admin';
  const fileRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<DesignDocument[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');

  // アップロードフォーム
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadDocType, setUploadDocType] = useState('');
  const [uploadProjectName, setUploadProjectName] = useState('');
  const [uploadClient, setUploadClient] = useState('');
  const [uploadLocation, setUploadLocation] = useState('');
  const [uploadYear, setUploadYear] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 削除中のID
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 認証ガード
  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [isLoading, user, router]);

  // 一覧取得
  const fetchDocuments = async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const res = await getDesignDocuments();
      setDocuments(res.design_documents);
    } catch {
      setFetchError('設計図書の取得に失敗しました');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user) fetchDocuments();
  }, [user]);

  // フォームリセット
  const resetForm = () => {
    setUploadFile(null);
    setUploadName('');
    setUploadDesc('');
    setUploadDocType('');
    setUploadProjectName('');
    setUploadClient('');
    setUploadLocation('');
    setUploadYear('');
    setUploadError(null);
  };

  // ファイル選択
  const handleFileSelect = (file: File) => {
    const allowed = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.zip'];
    const ext = '.' + (file.name.toLowerCase().split('.').pop() || '');
    if (!allowed.includes(ext)) {
      setUploadError(`対応していないファイル形式です（${ext}）。対応: ${allowed.join(', ')}`);
      return;
    }
    setUploadFile(file);
    if (!uploadName) {
      setUploadName(file.name.replace(/\.[^.]+$/, ''));
    }
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
    if (!uploadFile) {
      setUploadError('ファイルを選択してください');
      return;
    }
    if (!uploadName.trim()) {
      setUploadError('図書名を入力してください');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      await uploadDesignDocument(uploadFile, {
        name: uploadName.trim(),
        description: uploadDesc.trim(),
        document_type: uploadDocType.trim(),
        project_name: uploadProjectName.trim(),
        client: uploadClient.trim(),
        location: uploadLocation.trim(),
        year: uploadYear.trim(),
      });
      setMessage({ type: 'success', text: `「${uploadName}」をアップロードしました` });
      setShowUploadForm(false);
      resetForm();
      await fetchDocuments();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setIsUploading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // 削除
  const handleDelete = async (doc: DesignDocument) => {
    if (!confirm(`設計図書「${doc.name}」を削除してもよろしいですか？\n（この操作は取り消せません）`)) return;
    setDeletingId(doc.id);
    try {
      await deleteDesignDocument(doc.id);
      setMessage({ type: 'success', text: `「${doc.name}」を削除しました` });
      await fetchDocuments();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '削除に失敗しました' });
    } finally {
      setDeletingId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // ダウンロード
  const handleDownload = async (doc: DesignDocument) => {
    try {
      await downloadDesignDocument(doc.id, doc.original_filename || doc.name);
    } catch {
      setMessage({ type: 'error', text: 'ダウンロードに失敗しました' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 検索 + タイプフィルタ
  const filteredDocs = documents.filter((d) => {
    if (filterType && d.document_type !== filterType) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.document_type.toLowerCase().includes(q) ||
      d.project_name.toLowerCase().includes(q) ||
      d.client.toLowerCase().includes(q) ||
      d.location.toLowerCase().includes(q) ||
      d.year.toLowerCase().includes(q)
    );
  });

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
        <title>設計図書 | 施工計画書自動作成システム</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-3 mb-2">
              <FolderOpen className="h-8 w-8 text-primary-500" />
              <h1 className="text-3xl font-bold text-gray-900">設計図書</h1>
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                <Star className="h-3 w-3" />
                最重要資料
              </span>
            </div>
            <p className="text-sm text-gray-600">
              公共工事の設計図書（契約書・図面・仕様書・数量計算書等）を保管します。
              <span className="font-semibold text-gray-700">施工計画書はこの内容に基づいて作成されるため、最も重要な参照資料です。</span>
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* グローバルメッセージ */}
          {message && (
            <div
              className={`flex items-start gap-3 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
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

          {/* 管理者以外の警告 */}
          {!isAdmin && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <Lock className="h-4 w-4 flex-shrink-0 text-amber-600" />
              <p className="text-sm text-amber-700">
                設計図書のアップロード・削除は管理者のみ行えます。閲覧とダウンロードは可能です。
              </p>
            </div>
          )}

          {/* アップロード（管理者のみ） */}
          {isAdmin && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary-500" />
                  <h2 className="text-base font-semibold text-gray-900">新しい設計図書を追加</h2>
                </div>
                <button
                  onClick={() => {
                    setShowUploadForm(!showUploadForm);
                    setUploadError(null);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm text-white font-medium hover:bg-primary-600 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  設計図書を追加
                </button>
              </div>

              {showUploadForm && (
                <form onSubmit={handleUpload} className="p-5 space-y-4">
                  {/* ドロップゾーン */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
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
                      accept=".pdf,.docx,.doc,.xlsx,.xls,.zip"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    />
                    {uploadFile ? (
                      <>
                        <FileIcon filename={uploadFile.name} />
                        <p className="text-sm font-medium text-green-700 mt-2">{uploadFile.name}</p>
                        <p className="text-xs text-green-600 mt-1">{formatSize(uploadFile.size)}</p>
                        <p className="text-xs text-gray-500 mt-2">クリックして変更</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-sm font-medium text-gray-700">
                          ファイルをドロップ、またはクリックして選択
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PDF / DOCX / XLSX / ZIP（最大500MB）
                        </p>
                      </>
                    )}
                  </div>

                  {/* メタデータ入力 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        図書名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={uploadName}
                        onChange={(e) => setUploadName(e.target.value)}
                        placeholder="例: 公園樹木せん定_契約図書"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        図書種別
                      </label>
                      <select
                        value={uploadDocType}
                        onChange={(e) => setUploadDocType(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      >
                        <option value="">選択してください</option>
                        {DOC_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        関連案件名
                      </label>
                      <input
                        type="text"
                        value={uploadProjectName}
                        onChange={(e) => setUploadProjectName(e.target.value)}
                        placeholder="例: 公園樹木せん定等委託（その1）"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        発注者
                      </label>
                      <input
                        type="text"
                        value={uploadClient}
                        onChange={(e) => setUploadClient(e.target.value)}
                        placeholder="例: 渋谷区"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        工事場所
                      </label>
                      <input
                        type="text"
                        value={uploadLocation}
                        onChange={(e) => setUploadLocation(e.target.value)}
                        placeholder="例: 渋谷区内全域"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        年度
                      </label>
                      <input
                        type="text"
                        value={uploadYear}
                        onChange={(e) => setUploadYear(e.target.value)}
                        placeholder="例: 令和8年度"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        備考（任意）
                      </label>
                      <input
                        type="text"
                        value={uploadDesc}
                        onChange={(e) => setUploadDesc(e.target.value)}
                        placeholder="例: 令和8年4月発注分の契約書一式"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      />
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
                      onClick={() => {
                        setShowUploadForm(false);
                        resetForm();
                      }}
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

          {/* 一覧 */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50 gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-gray-500" />
                <h2 className="text-base font-semibold text-gray-900">
                  登録済み設計図書
                  {documents.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      {filteredDocs.length} / {documents.length} 件
                    </span>
                  )}
                </h2>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* 図書種別フィルタ */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                >
                  <option value="">全種別</option>
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                {/* 検索ボックス */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="図書名・案件名などで検索..."
                    className="w-64 pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </div>

                <button
                  onClick={fetchDocuments}
                  disabled={fetching}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
                  更新
                </button>
              </div>
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
            ) : filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FolderOpen className="h-12 w-12 text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-500">
                  {documents.length === 0 ? '設計図書がありません' : '該当する設計図書がありません'}
                </p>
                {isAdmin && documents.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    「設計図書を追加」からPDF・DOCX・Excel・ZIPをアップロードしてください
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <FileIcon filename={doc.original_filename} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{doc.name}</p>
                        {!doc.file_exists && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            ファイルなし
                          </span>
                        )}
                        {doc.document_type && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeColor(doc.document_type)}`}>
                            {doc.document_type}
                          </span>
                        )}
                        {doc.year && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {doc.year}
                          </span>
                        )}
                      </div>

                      {/* メタデータ表示 */}
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                        {doc.project_name && (
                          <span><span className="text-gray-400">案件:</span> {doc.project_name}</span>
                        )}
                        {doc.client && (
                          <span><span className="text-gray-400">発注者:</span> {doc.client}</span>
                        )}
                        {doc.location && (
                          <span><span className="text-gray-400">場所:</span> {doc.location}</span>
                        )}
                      </div>

                      {doc.description && (
                        <p className="text-xs text-gray-500 mt-1">{doc.description}</p>
                      )}

                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                        <span>{doc.original_filename}</span>
                        <span>·</span>
                        <span>{formatSize(doc.size)}</span>
                        <span>·</span>
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* ダウンロード */}
                      <button
                        onClick={() => handleDownload(doc)}
                        disabled={!doc.file_exists}
                        title="設計図書をダウンロード"
                        className="rounded-lg p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      {/* 削除（管理者のみ） */}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={deletingId === doc.id}
                          title="削除"
                          className="rounded-lg p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {deletingId === doc.id ? (
                            <Loader className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
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

export default DesignDocumentsPage;
