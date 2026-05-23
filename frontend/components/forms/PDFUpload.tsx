import React, { useState, useRef } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { apiUpload, type ExtractResponse } from '@/lib/api';

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

  const addFiles = (newFiles: File[]) => {
    const pdfFiles = newFiles.filter((f) => f.type === 'application/pdf');
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

      // 親コンポーネントに抽出データを渡す
      if (onExtracted) {
        onExtracted(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF抽出に失敗しました');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">設計図書（PDF）をアップロード</h2>
        <p className="mt-2 text-gray-600">
          設計図書のPDFをアップロードすると、契約番号・工事場所・工期・契約金額を自動抽出します。
        </p>
      </div>

      {/* ドロップゾーン */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
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
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
        <p className="text-sm font-medium text-gray-900">
          PDFファイルをドラッグ＆ドロップ
        </p>
        <p className="text-xs text-gray-500 mt-1">またはクリックしてファイルを選択</p>
        <p className="text-xs text-gray-400 mt-2">最大 50MB / ファイル</p>
      </div>

      {/* ファイル一覧 */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">選択済みファイル</h3>
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-900 font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveFile(i); }}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
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
