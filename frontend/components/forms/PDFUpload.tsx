import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  X,
  AlertCircle,
  CheckCircle2,
  Loader,
  FolderOpen,
  BookOpen,
  Plus,
  Database,
  Download,
} from 'lucide-react';
import {
  apiUpload,
  type ExtractResponse,
  getDesignDocuments,
  getPastCases,
  fetchDesignDocumentBlob,
  fetchPastCaseBlob,
  downloadPastCase,
  type DesignDocument,
  type PastCase,
} from '@/lib/api';

interface ExtractedData {
  projectName?: string;
  contractNumber?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  contractAmount?: string;
  client?: string;
}

interface PDFUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onExtracted?: (data: ExtractedData) => void;
  onNext: () => void;
  onPrev: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  projectName: '工事名',
  contractNumber: '契約番号',
  location: '工事場所',
  startDate: '工期（始期）',
  endDate: '工期（終期）',
  contractAmount: '契約金額',
  client: '発注者',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PDFUpload: React.FC<PDFUploadProps> = ({
  files,
  onFilesChange,
  onExtracted,
  onNext,
  onPrev,
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 保存済み設計図書・過去事例
  const [designDocs, setDesignDocs] = useState<DesignDocument[]>([]);
  const [pastCases, setPastCases] = useState<PastCase[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [selectedDesignDocId, setSelectedDesignDocId] = useState<string>('');
  const [selectedPastCaseId, setSelectedPastCaseId] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);

  // 初回ロード: 保存済みファイルの一覧取得
  useEffect(() => {
    const load = async () => {
      try {
        const [docsRes, casesRes] = await Promise.all([
          getDesignDocuments(),
          getPastCases(),
        ]);
        setDesignDocs(docsRes.design_documents || []);
        setPastCases(casesRes.past_cases || []);
      } catch (e) {
        console.warn('保存済み一覧の取得失敗:', e);
      } finally {
        setLoadingSaved(false);
      }
    };
    load();
  }, []);

  const addFiles = (newFiles: File[]) => {
    const pdfFiles = newFiles.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length !== newFiles.length) {
      setError('PDFファイル以外はアップロードできません');
    } else {
      setError(null);
    }
    const deduped = [...files, ...pdfFiles].filter(
      (f, i, arr) => arr.findIndex((x) => x.name === f.name) === i
    );
    onFilesChange(deduped);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleRemoveFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
    setExtractedData(null);
  };

  // 保存済み設計図書を選択して追加
  const handleAddSavedDesignDoc = async () => {
    if (!selectedDesignDocId) return;
    const doc = designDocs.find((d) => d.id === selectedDesignDocId);
    if (!doc) return;

    setIsImporting(true);
    setError(null);
    try {
      const blob = await fetchDesignDocumentBlob(doc.id);
      const file = new File([blob], doc.original_filename || `${doc.name}.pdf`, {
        type: doc.mime_type || 'application/pdf',
      });

      // 重複チェック
      if (files.some((f) => f.name === file.name)) {
        setError(`「${file.name}」は既に追加されています`);
        setIsImporting(false);
        return;
      }

      // PDF以外は警告
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError(`「${file.name}」はPDFではありません。自動データ抽出は使えませんが、参考としては保管できます`);
      }

      onFilesChange([...files, file]);
      setSelectedDesignDocId('');
      setExtractedData(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '設計図書の読み込みに失敗しました');
    } finally {
      setIsImporting(false);
    }
  };

  // 保存済み過去事例を参考としてDL（ファイル一覧には追加しない）
  const handleDownloadSavedPastCase = async () => {
    if (!selectedPastCaseId) return;
    const pc = pastCases.find((p) => p.id === selectedPastCaseId);
    if (!pc) return;

    try {
      await downloadPastCase(pc.id, pc.original_filename || `${pc.name}.docx`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '過去事例のダウンロードに失敗しました');
    }
  };

  const handleExtract = async () => {
    if (files.length === 0) {
      setError('PDFファイルを選択してください');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setWarnings([]);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const result = await apiUpload<ExtractResponse>('/pdf/extract', formData);

      const data = result.extracted_data;
      setExtractedData(data);

      if (result.warnings?.length) {
        setWarnings(result.warnings);
      }

      if (onExtracted) {
        onExtracted(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF抽出に失敗しました');
    } finally {
      setIsExtracting(false);
    }
  };

  // PDFのみのフィルタ済み一覧
  const pdfDesignDocs = designDocs.filter((d) => {
    const ext = (d.original_filename || '').toLowerCase().split('.').pop();
    return ext === 'pdf' || d.mime_type === 'application/pdf';
  });
  const otherDesignDocs = designDocs.filter((d) => {
    const ext = (d.original_filename || '').toLowerCase().split('.').pop();
    return ext !== 'pdf' && d.mime_type !== 'application/pdf';
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">設計図書（PDF）を準備</h2>
        <p className="mt-2 text-gray-600">
          保存済みの設計図書から選ぶか、新しいPDFをアップロードします。<br />
          選択後「データを自動抽出」を押すと、契約番号・工事場所・工期・契約金額などを自動で読み取ります。
        </p>
      </div>

      {/* ─── 保存済みから選択 ────────────────────────────────────────────── */}
      <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 bg-blue-100/60 border-b border-blue-200">
          <Database className="h-5 w-5 text-blue-700" />
          <h3 className="font-semibold text-blue-900">保存済みのファイルから選ぶ</h3>
        </div>

        <div className="p-5 space-y-4">
          {/* 設計図書ドロップダウン */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
              <FolderOpen className="h-4 w-4 text-primary-600" />
              設計図書（PDFのみ追加可能）
              {loadingSaved ? (
                <span className="text-xs text-gray-500">読み込み中...</span>
              ) : (
                <span className="text-xs text-gray-500">{pdfDesignDocs.length}件</span>
              )}
            </label>
            <div className="flex gap-2 flex-wrap">
              <select
                value={selectedDesignDocId}
                onChange={(e) => setSelectedDesignDocId(e.target.value)}
                disabled={loadingSaved || pdfDesignDocs.length === 0}
                className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-gray-100"
              >
                <option value="">
                  {pdfDesignDocs.length === 0
                    ? '保存済みPDF設計図書がありません'
                    : '設計図書を選択してください'}
                </option>
                {pdfDesignDocs.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.document_type || '種別未設定'}] {d.name}
                    {d.project_name ? ` (${d.project_name})` : ''}
                    {d.year ? ` ${d.year}` : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddSavedDesignDoc}
                disabled={!selectedDesignDocId || isImporting}
                className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm text-white font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                ファイル一覧に追加
              </button>
            </div>
            {otherDesignDocs.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                ※ PDF以外（DOCX/XLSX/ZIP）の設計図書が {otherDesignDocs.length} 件あります。
                自動抽出には使えませんが、「設計図書」メニューから個別にダウンロードできます。
              </p>
            )}
          </div>

          {/* 過去事例ドロップダウン */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
              <BookOpen className="h-4 w-4 text-primary-600" />
              過去事例（参考としてダウンロード）
              {!loadingSaved && (
                <span className="text-xs text-gray-500">{pastCases.length}件</span>
              )}
            </label>
            <div className="flex gap-2 flex-wrap">
              <select
                value={selectedPastCaseId}
                onChange={(e) => setSelectedPastCaseId(e.target.value)}
                disabled={loadingSaved || pastCases.length === 0}
                className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-gray-100"
              >
                <option value="">
                  {pastCases.length === 0
                    ? '保存済み過去事例がありません'
                    : '過去事例を選択してください'}
                </option>
                {pastCases.map((p) => {
                  const ext = (p.original_filename || '').toLowerCase().split('.').pop();
                  const typeLabel = ext ? `(${ext.toUpperCase()})` : '';
                  return (
                    <option key={p.id} value={p.id}>
                      {typeLabel} {p.name}
                      {p.project_type ? ` [${p.project_type}]` : ''}
                      {p.client ? ` - ${p.client}` : ''}
                      {p.year ? ` ${p.year}` : ''}
                    </option>
                  );
                })}
              </select>
              <button
                onClick={handleDownloadSavedPastCase}
                disabled={!selectedPastCaseId}
                className="flex items-center gap-1.5 rounded-lg border border-primary-500 bg-white px-4 py-2 text-sm text-primary-600 font-medium hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                ダウンロードして参考にする
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              ※ 過去事例は PDF / Word / Excel など様々な形式があります。ダウンロードして対応するソフトで開き、参考として参照してください。
            </p>
          </div>
        </div>
      </div>

      {/* ─── 新規アップロード ────────────────────────────────────────────── */}
      <div className="rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 bg-gray-100 border-b border-gray-200">
          <Upload className="h-5 w-5 text-gray-700" />
          <h3 className="font-semibold text-gray-900">または、新しいPDFをアップロード</h3>
        </div>

        <div className="p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary-400 bg-primary-50'
                : 'border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileInput}
              className="hidden"
            />
            <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-900">
              PDFファイルをドラッグ＆ドロップ
            </p>
            <p className="text-xs text-gray-500 mt-1">またはクリックしてファイルを選択（最大 50MB / ファイル）</p>
          </div>
        </div>
      </div>

      {/* ファイル一覧（選択済み・追加済み） */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">
            選択済みファイル
            <span className="ml-2 text-gray-500 font-normal">{files.length}件</span>
          </h3>
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-900 font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveFile(i); }}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="一覧から外す"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 抽出結果 */}
      {extractedData && Object.keys(extractedData).length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="font-semibold text-green-900">データ抽出完了</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(extractedData).map(([key, value]) =>
              value ? (
                <div key={key} className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-xs font-medium text-green-700 mb-1">
                    {FIELD_LABELS[key] || key}
                  </p>
                  <p className="text-sm text-gray-900 font-medium">{value}</p>
                </div>
              ) : null
            )}
          </div>
          <p className="text-xs text-green-700 mt-3">
            ※ 「次へ進む」でデータ確認・編集画面に反映されます
          </p>
        </div>
      )}

      {/* 警告 */}
      {warnings.length > 0 && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm font-medium text-yellow-800 mb-1">警告</p>
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-700">{w}</p>
          ))}
        </div>
      )}

      {/* エラー */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* ナビゲーション */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onPrev}
          className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-gray-900 font-medium hover:bg-gray-50 transition-colors"
        >
          前へ戻る
        </button>

        <div className="flex gap-3">
          {files.length > 0 && !extractedData && (
            <button
              onClick={handleExtract}
              disabled={isExtracting}
              className="rounded-lg border border-primary-500 bg-white px-6 py-2.5 text-primary-600 font-medium hover:bg-primary-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isExtracting && <Loader className="h-4 w-4 animate-spin" />}
              {isExtracting ? 'データ抽出中...' : 'データを自動抽出'}
            </button>
          )}

          <button
            onClick={onNext}
            className="rounded-lg bg-primary-500 px-6 py-2.5 text-white font-medium hover:bg-primary-600 transition-colors"
          >
            次へ進む
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFUpload;
