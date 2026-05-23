import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Download, Loader, FileText, LayoutTemplate } from 'lucide-react';
import { apiPost, downloadPlan, type GenerateResponse } from '@/lib/api';
import TemplateSelector from '@/components/forms/TemplateSelector';

interface GenerationPanelProps {
  formData: Record<string, string>;
  onPrev: () => void;
  onSuccess: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  projectName:    '工事名',
  projectType:    '工事種別',
  contractNumber: '契約番号',
  location:       '工事場所',
  startDate:      '工期（始期）',
  endDate:        '工期（終期）',
  contractAmount: '契約金額',
  client:         '発注者',
  contractor:     '受注者',
};

const GenerationPanel: React.FC<GenerationPanelProps> = ({ formData, onPrev, onSuccess }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const [isGenerating, setIsGenerating]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<{
    planId: string;
    filename: string;
  } | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        ...(selectedTemplateId ? { templateId: selectedTemplateId } : {}),
      };
      const result = await apiPost<GenerateResponse>('/plans/generate', payload);
      setGeneratedPlan({ planId: result.plan_id, filename: result.filename });
    } catch (err) {
      setError(err instanceof Error ? err.message : '施工計画書の生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedPlan) return;
    setIsDownloading(true);
    try {
      await downloadPlan(generatedPlan.planId, generatedPlan.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ダウンロードに失敗しました');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">施工計画書を作成</h2>
        <p className="mt-2 text-gray-600">
          テンプレートを選択して「生成」ボタンを押すと、施工計画書（DOCX）が自動生成されます。
        </p>
      </div>

      {/* ── テ���プレート選択 ── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-5 py-4">
          <LayoutTemplate className="h-5 w-5 text-primary-500" />
          <h3 className="text-base font-semibold text-gray-900">テンプレートを選択</h3>
          <span className="ml-auto rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
            {selectedTemplateId ? '選択済み' : 'デフォルト'}
          </span>
        </div>
        <div className="p-5">
          <TemplateSelector
            selectedId={selectedTemplateId}
            onChange={setSelectedTemplateId}
          />
        </div>
      </div>

      {/* ── 入力内容確認テーブル ── */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 bg-white">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-500" />
            入力内容の確認
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {Object.entries(FIELD_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-start px-5 py-3">
              <span className="w-32 flex-shrink-0 text-xs font-medium text-gray-500 pt-0.5">
                {label}
              </span>
              <span className="text-sm text-gray-900 font-medium">
                {formData[key] || <span className="text-gray-400 italic">未入力</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 生成中 ── */}
      {isGenerating && (
        <div className="flex items-center justify-center gap-4 rounded-xl border border-blue-200 bg-blue-50 p-8">
          <Loader className="h-8 w-8 animate-spin text-blue-600" />
          <div>
            <p className="font-semibold text-blue-900">施工計画書を生成中...</p>
            <p className="text-sm text-blue-700 mt-1">テンプレートにデータを埋め込んでいます</p>
          </div>
        </div>
      )}

      {/* ── 生成完了 ── */}
      {generatedPlan && !isGenerating && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900">生成完了！</h3>
              <p className="text-sm text-green-700 mt-1">施工計画書が正常に生成されました</p>
              <div className="mt-3 flex items-center gap-2 bg-white rounded-lg px-4 py-2.5 border border-green-200">
                <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm font-mono text-gray-700 truncate">
                  {generatedPlan.filename}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── エラー ── */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* ── ナビゲーション ── */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onPrev}
          disabled={isGenerating}
          className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-gray-900 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          前へ戻る
        </button>

        <div className="flex gap-3">
          {!generatedPlan ? (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="rounded-lg bg-primary-500 px-8 py-2.5 text-white font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isGenerating && <Loader className="h-4 w-4 animate-spin" />}
              {isGenerating ? '生成中...' : '施工計画書を生成'}
            </button>
          ) : (
            <>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="rounded-lg border border-primary-500 bg-white px-6 py-2.5 text-primary-600 font-medium hover:bg-primary-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                ダウンロード
              </button>
              <button
                onClick={onSuccess}
                className="rounded-lg bg-primary-500 px-6 py-2.5 text-white font-medium hover:bg-primary-600 transition-colors"
              >
                完了
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerationPanel;
