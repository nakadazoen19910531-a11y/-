import React, { useState, useEffect } from 'react';
import { AlertCircle, Edit2, Save, X } from 'lucide-react';

interface DataReviewProps {
  notebookData: Record<string, string>;
  pdfData: Record<string, string>;
  mergedData: Record<string, string>;
  onChange: (data: Record<string, string>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const requiredFields = [
  { key: 'projectName', label: '工事名', placeholder: '工事名を入力' },
  { key: 'projectType', label: '工事種別', placeholder: '土木工事' },
  { key: 'contractNumber', label: '契約番号', placeholder: 'R8-XXXXX' },
  { key: 'location', label: '工事場所', placeholder: '工事場所を入力' },
  { key: 'startDate', label: '開始日', placeholder: '2026年4月1日' },
  { key: 'endDate', label: '終了日', placeholder: '2027年3月31日' },
  { key: 'contractAmount', label: '契約金額', placeholder: '¥0,000,000' },
  { key: 'client', label: '発注者', placeholder: '官公庁名' },
  { key: 'contractor', label: '受注者', placeholder: '中田造園株式会社' },
];

const DataReview: React.FC<DataReviewProps> = ({
  notebookData,
  pdfData,
  mergedData,
  onChange,
  onNext,
  onPrev,
}) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [localData, setLocalData] = useState<Record<string, string>>(mergedData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalData(mergedData);
  }, [mergedData]);

  const handleEditStart = (key: string, value: string) => {
    setEditingField(key);
    setEditValue(value);
  };

  const handleEditSave = (key: string) => {
    setLocalData({ ...localData, [key]: editValue });
    onChange({ ...localData, [key]: editValue });
    setEditingField(null);
  };

  const handleEditCancel = () => {
    setEditingField(null);
  };

  const handleNext = () => {
    const missingFields = requiredFields.filter(
      (f) => !localData[f.key] || localData[f.key].trim() === ''
    );

    if (missingFields.length > 0) {
      setError(
        `以下の項目が入力されていません：${missingFields.map((f) => f.label).join('、')}`
      );
      return;
    }

    setError(null);
    onChange(localData);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          データを確認・編集
        </h2>
        <p className="mt-2 text-gray-600">
          NotebookLMとPDF抽出結果をマージしたデータを確認・編集してください。
          PDFから抽出した情報が優先されます。
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 rounded-lg bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Data Table */}
      <div className="space-y-3">
        {requiredFields.map((field) => {
          const value = localData[field.key] || '';
          const isEditing = editingField === field.key;
          const isMissing = !value || value.trim() === '';

          return (
            <div key={field.key} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">
                  {field.label}
                  {isMissing && <span className="ml-1 text-red-600">*</span>}
                </label>
                {!isEditing && (
                  <button
                    onClick={() => handleEditStart(field.key, value)}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-primary-300 p-2 text-sm"
                    rows={2}
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={handleEditCancel}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => handleEditSave(field.key)}
                      className="rounded-lg bg-primary-500 px-3 py-1 text-sm text-white hover:bg-primary-600"
                    >
                      <Save className="inline h-4 w-4 mr-1" />
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`text-sm ${isMissing ? 'text-gray-500' : 'text-gray-900'}`}>
                  {value || field.placeholder}
                </div>
              )}

              {/* Source Indicator */}
              {value && (
                <div className="mt-2 text-xs text-gray-500">
                  {pdfData[field.key] && `📄 PDF抽出 | `}
                  {notebookData[field.key] && `📝 NotebookLM`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onPrev}
          className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-gray-900 font-medium hover:bg-gray-50 transition-colors"
        >
          前へ戻る
        </button>

        <button
          onClick={handleNext}
          className="rounded-lg bg-primary-500 px-6 py-2 text-white font-medium hover:bg-primary-600 transition-colors"
        >
          次へ進む
        </button>
      </div>
    </div>
  );
};

export default DataReview;
