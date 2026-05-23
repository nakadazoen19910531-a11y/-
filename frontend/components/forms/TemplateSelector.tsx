import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle2, Loader, AlertCircle, RefreshCw } from 'lucide-react';
import { getTemplates, type Template } from '@/lib/api';

interface TemplateSelectorProps {
  selectedId: string | null;
  onChange: (id: string | null) => void;
}

/** バイト数を人間が読みやすい文字列に変換 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** ISO 日付を日本語形式に変換 */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso;
  }
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ selectedId, onChange }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTemplates();
      setTemplates(res.templates.filter((t) => t.file_exists));
    } catch {
      setError('テンプレートの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // ローディング中
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-gray-50 py-10">
        <Loader className="h-5 w-5 animate-spin text-primary-500" />
        <span className="text-sm text-gray-600">テンプレートを読み込み中...</span>
      </div>
    );
  }

  // エラー
  if (error) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
        <button
          onClick={fetchTemplates}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* テンプレートなし（フォールバック） */}
      <label
        className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition-all ${
          selectedId === null
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <input
          type="radio"
          name="template"
          className="sr-only"
          checked={selectedId === null}
          onChange={() => onChange(null)}
        />
        <div
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            selectedId === null ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
          }`}
        >
          {selectedId === null && <div className="h-2 w-2 rounded-full bg-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900">標準テンプレート（デフォルト）</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            アップロードされ��テンプレートを使わず、システム標準の書式で施工計画書を生成します
          </p>
        </div>
        {selectedId === null && (
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary-500 mt-0.5" />
        )}
      </label>

      {/* テンプレートが0件の場合 */}
      {templates.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
          <FileText className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">アップロード済みのテンプレートがありません</p>
          <p className="text-xs text-gray-400 mt-1">
            管理者が「テンプレート管理」からテンプレートを追加できます
          </p>
        </div>
      )}

      {/* テンプレート一覧 */}
      {templates.map((tmpl) => (
        <label
          key={tmpl.id}
          className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition-all ${
            selectedId === tmpl.id
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            name="template"
            className="sr-only"
            checked={selectedId === tmpl.id}
            onChange={() => onChange(tmpl.id)}
          />
          <div
            className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
              selectedId === tmpl.id ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
            }`}
          >
            {selectedId === tmpl.id && <div className="h-2 w-2 rounded-full bg-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-900 truncate">{tmpl.name}</span>
            </div>
            {tmpl.description && (
              <p className="mt-1 text-xs text-gray-600 line-clamp-2">{tmpl.description}</p>
            )}
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
              <span>{tmpl.original_filename}</span>
              <span>·</span>
              <span>{formatSize(tmpl.size)}</span>
              <span>·</span>
              <span>{formatDate(tmpl.created_at)}</span>
            </div>
          </div>
          {selectedId === tmpl.id && (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary-500 mt-0.5" />
          )}
        </label>
      ))}

      {/* 再読み込みボタン */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={fetchTemplates}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          一覧を更新
        </button>
      </div>
    </div>
  );
};

export default TemplateSelector;
