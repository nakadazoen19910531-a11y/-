import React, { useState } from 'react';
import { FileText, AlertCircle } from 'lucide-react';

interface NotebookLMInputProps {
  value: string;
  onChange: (text: string) => void;
  onNext: () => void;
}

const NotebookLMInput: React.FC<NotebookLMInputProps> = ({
  value,
  onChange,
  onNext,
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (!value.trim()) {
      setError('NotebookLMのテキストを入力してください');
      return;
    }

    if (value.length < 50) {
      setError('もっと詳しい内容を入力してください（最低50文字）');
      return;
    }

    setError(null);
    onNext();
  };

  const requiredFields = [
    '工事名',
    '工事種別',
    '工事場所',
    '工期',
    '契約金額',
  ];

  const foundFields = requiredFields.filter((field) =>
    value.includes(field)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          NotebookLMのテキストを入力
        </h2>
        <p className="mt-2 text-gray-600">
          NotebookLMから抽出したテキストを以下に貼り付けてください。
          以下の情報が含まれていると自動入力できます：
        </p>
      </div>

      {/* Required Fields Checklist */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-medium text-blue-900 mb-3">
          検出された項目：
        </p>
        <div className="grid grid-cols-2 gap-2">
          {requiredFields.map((field) => (
            <div
              key={field}
              className={`flex items-center space-x-2 text-sm ${
                foundFields.includes(field)
                  ? 'text-green-700'
                  : 'text-gray-600'
              }`}
            >
              <div
                className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                  foundFields.includes(field)
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {foundFields.includes(field) && (
                  <span className="text-white text-xs font-bold">✓</span>
                )}
              </div>
              <span>{field}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <div>
        <label htmlFor="notebook" className="block text-sm font-medium text-gray-900 mb-2">
          NotebookLMテキスト
        </label>
        <textarea
          id="notebook"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setError(null);
          }}
          placeholder="NotebookLMから抽出したテキストを貼り付けてください..."
          className="w-full h-64 rounded-lg border border-gray-300 p-4 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        />
        <div className="mt-2 text-xs text-gray-500">
          {value.length} 文字
        </div>
      </div>

      {/* Example */}
      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-900 mb-2">入力例：</p>
        <p className="text-xs text-gray-600 whitespace-pre-wrap">
{`工事名：公園樹木せん定等委託
工事種別：造園工事
工事場所：渋谷区内全域
工期：令和8年4月1日から令和9年3月31日まで
契約金額：$5,000,000`}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 rounded-lg bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
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

export default NotebookLMInput;
