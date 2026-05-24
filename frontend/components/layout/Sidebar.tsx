import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FileText,
  Plus,
  History,
  Share2,
  Settings,
  HelpCircle,
  X,
  User,
  LayoutTemplate,
  BookOpen,
  FolderOpen,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  adminOnly?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const router  = useRouter();
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';

  const navigationItems: NavItem[] = [
    {
      label: '新規作成',
      href:  '/plans/create',
      icon:  <Plus className="h-5 w-5" />,
    },
    {
      label: '過去の作成履歴',
      href:  '/plans/history',
      icon:  <History className="h-5 w-5" />,
    },
    {
      label: 'テンプレート管理',
      href:  '/templates',
      icon:  <LayoutTemplate className="h-5 w-5" />,
    },
    {
      label: '過去事例（施工計画書）',
      href:  '/past-cases',
      icon:  <BookOpen className="h-5 w-5" />,
    },
    {
      label: '設計図書',
      href:  '/design-documents',
      icon:  <FolderOpen className="h-5 w-5" />,
    },
    {
      label: 'NotebookLM連携',
      href:  '/notebooklm',
      icon:  <Share2 className="h-5 w-5" />,
    },
  ];

  const secondaryItems: NavItem[] = [
    {
      label: 'プロフィール',
      href:  '/profile',
      icon:  <User className="h-5 w-5" />,
    },
    {
      label: '設定',
      href:  '/settings',
      icon:  <Settings className="h-5 w-5" />,
    },
    {
      label: 'ヘルプ',
      href:  '/help',
      icon:  <HelpCircle className="h-5 w-5" />,
    },
  ];

  const isActive = (href: string) =>
    router.pathname === href || router.pathname.startsWith(href + '/');

  const renderNavItem = (item: NavItem) => {
    if (item.adminOnly && !isAdmin) return null;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive(item.href)
            ? 'bg-primary-100 text-primary-700'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        {item.icon}
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className="rounded-full bg-primary-500 px-2 py-0.5 text-xs font-semibold text-white">
            {item.badge}
          </span>
        )}
        {item.adminOnly && (
          <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
            管理者
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-300 lg:relative lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <Link href="/" className="flex items-center space-x-2">
            <FileText className="h-8 w-8 text-primary-500" />
            <div>
              <div className="text-sm font-bold text-gray-900">施工計画書</div>
              <div className="text-xs text-gray-500">自動作成</div>
            </div>
          </Link>
          <button className="lg:hidden">
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-6">
          <div>
            <p className="px-3 text-xs font-semibold uppercase text-gray-500">メインメニュー</p>
            <div className="mt-3 space-y-1">
              {navigationItems.map(renderNavItem)}
            </div>
          </div>

          {/* Secondary Navigation */}
          <div className="border-t border-gray-200 pt-6">
            <p className="px-3 text-xs font-semibold uppercase text-gray-500">その他</p>
            <div className="mt-3 space-y-1">
              {secondaryItems.map(renderNavItem)}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-xs font-semibold text-gray-900">バージョン 1.0.0</p>
            <p className="mt-1 text-xs text-gray-600">
              公共工事施工計画書自動作成システム
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
