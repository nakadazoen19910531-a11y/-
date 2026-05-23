import React, { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Download, Trash2, Loader, Search, Filter, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiDelete, downloadPlan, type Plan, type PlansResponse } from '@/lib/api';

const HistoryPage: NextPage = () => {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<Plan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'failed'>('all');
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // 未認証時はログインへ
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [isLoading, user, router]);

  // 計画書一覧を取得
  useEffect(() => {
    if (!user) return;
    const fetchPlans = async () => {
      try {
        setIsLoadingPlans(true);
        setError(null);
        const result = await apiGet<PlansResponse>('/plans/');
        setPlans(result.plans || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '計画書の読み込みに失敗しました');
      } finally {
        setIsLoadingPlans(false);
      }
    };
    fetchPlans();
  }, [user]);

  // 検索・フィルタ処理
  useEffect(() => {
    let result = plans;

    if (filterStatus !== 'all') {
      result = result.filter((p) => p.status === filterStatus);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.projectName?.toLowerCase().includes(q) ||
          p.contractNumber?.toLowerCase().includes(q) ||
          p.projectType?.toLowerCase().includes(q)
      );
    }

    result = [...result].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setFilteredPlans(result);
  }, [plans, searchQuery, filterStatus]);

  const handleDownload = async (plan: Plan) => {
    try {
      setDownloadingId(plan.id);
      await downloadPlan(plan.id, plan.filename);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ダウンロードに失敗しました');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('この計画書を削除してもよろしいですか？')) return;
    try {
      setDeletingId(planId);
      await apiDelete(`/plans/${planId}`);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      if (selectedPlan?.id === planId) setSelectedPlan(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { cls: string; label: string }> = {
      completed: { cls: 'bg-green-100 text-green-800', label: '完了' },
      processing: { cls: 'bg-yellow-100 text-yellow-800', label: '処理中' },
      failed: { cls: 'bg-red-100 text-red-800', label: '失敗' },
    };
    const s = map[status] ?? { cls: 'bg-gray-100 text-gray-800', label: status };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>生成履歴 | 施工計画書自動作成システム</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900">生成履歴</h1>
            <p className="mt-2 text-sm text-gray-600">以前に生成した施工計画書の一覧です</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 検索・フィルタ */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="工事名・契約番号で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-primary-500"
              >
                <option value="all">すべて</option>
                <option value="completed">完了のみ</option>
                <option value="failed">失敗のみ</option>
              </select>
            </div>
          </div>

          {/* エラー */}
          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* ローディング */}
          {isLoadingPlans ? (
            <div className="flex items-center justify-center py-20">
              <Loader className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <p className="text-gray-500 mb-6">
                {plans.length === 0
                  ? 'まだ施工計画書が生成されていません'
                  : '検索条件に一致する計画書がありません'}
              </p>
              {plans.length === 0 && (
                <button
                  onClick={() => router.push('/plans/create')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
                >
                  施工計画書を作成する
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['工事名', '種別', '契約番号', '生成日時', 'サイズ', 'ステータス', '操作'].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSelectedPlan(plan)}
                          className="text-primary-600 font-medium hover:text-primary-700 text-sm text-left"
                        >
                          {plan.projectName || '—'}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{plan.projectType || '—'}</td>
                      <td className="px-5 py-4 text-sm font-mono text-gray-600">{plan.contractNumber || '—'}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{formatDate(plan.created_at)}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{formatFileSize(plan.file_size)}</td>
                      <td className="px-5 py-4"><StatusBadge status={plan.status} /></td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDownload(plan)}
                            disabled={downloadingId === plan.id || !plan.file_exists}
                            title={plan.file_exists ? 'ダウンロード' : 'ファイルが見つかりません'}
                            className="p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-40"
                          >
                            {downloadingId === plan.id ? (
                              <Loader className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(plan.id)}
                            disabled={deletingId === plan.id}
                            title="削除"
                            className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          >
                            {deletingId === plan.id ? (
                              <Loader className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 統計 */}
          {plans.length > 0 && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: '合計件数', value: `${plans.length} 件`, cls: 'text-gray-900' },
                {
                  label: '完了',
                  value: `${plans.filter((p) => p.status === 'completed').length} 件`,
                  cls: 'text-green-600',
                },
                {
                  label: '合計サイズ',
                  value: formatFileSize(plans.reduce((s, p) => s + (p.file_size || 0), 0)),
                  cls: 'text-gray-900',
                },
              ].map(({ label, value, cls }) => (
                <div key={label} className="rounded-xl border border-gray-200 bg-white p-6">
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className={`text-3xl font-bold mt-2 ${cls}`}>{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 詳細モーダル */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-5">
              {selectedPlan.projectName}
            </h2>
            <div className="space-y-3 mb-6">
              {[
                ['工事種別', selectedPlan.projectType],
                ['契約番号', selectedPlan.contractNumber],
                ['工事場所', selectedPlan.location],
                ['生成日時', formatDate(selectedPlan.created_at)],
                ['ファイルサイズ', formatFileSize(selectedPlan.file_size)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{value || '—'}</p>
                </div>
              ))}
              <div>
                <p className="text-xs text-gray-500">ステータス</p>
                <div className="mt-1">
                  <StatusBadge status={selectedPlan.status} />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleDownload(selectedPlan)}
                disabled={!selectedPlan.file_exists}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                ダウンロード
              </button>
              <button
                onClick={() => setSelectedPlan(null)}
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HistoryPage;
