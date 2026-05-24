import React, { useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import {
  HelpCircle,
  BookOpen,
  Plus,
  History,
  LayoutTemplate,
  FolderOpen,
  Settings,
  User,
  LogIn,
  MousePointer2,
  Keyboard,
  Download,
  Upload,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Home,
  FileText,
  Search,
  Trash2,
  Pencil,
  Star,
  Phone,
  Mail,
  Eye,
  EyeOff,
} from 'lucide-react';

// ─── 共通コンポーネント ────────────────────────────────────────────────

// 注意ボックス（黄色）
const Warning: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-3 p-4 my-3 rounded-lg border-2 border-amber-300 bg-amber-50">
    <AlertTriangle className="h-6 w-6 flex-shrink-0 text-amber-600 mt-0.5" />
    <div className="text-base text-amber-900">
      <div className="font-bold mb-1">注意してください</div>
      {children}
    </div>
  </div>
);

// ヒントボックス（青）
const Tip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-3 p-4 my-3 rounded-lg border-2 border-blue-300 bg-blue-50">
    <Lightbulb className="h-6 w-6 flex-shrink-0 text-blue-600 mt-0.5" />
    <div className="text-base text-blue-900">
      <div className="font-bold mb-1">ヒント</div>
      {children}
    </div>
  </div>
);

// OK例（緑）
const OkExample: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-3 p-4 my-3 rounded-lg border-2 border-green-300 bg-green-50">
    <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-green-600 mt-0.5" />
    <div className="text-base text-green-900">{children}</div>
  </div>
);

// NG例（赤）
const NgExample: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-3 p-4 my-3 rounded-lg border-2 border-red-300 bg-red-50">
    <XCircle className="h-6 w-6 flex-shrink-0 text-red-600 mt-0.5" />
    <div className="text-base text-red-900">{children}</div>
  </div>
);

// ステップ番号
const Step: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <div className="flex gap-4 my-5">
    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary-500 text-white text-lg font-bold">
      {n}
    </div>
    <div className="flex-1 pt-1">
      <h4 className="text-lg font-bold text-gray-900 mb-2">{title}</h4>
      <div className="text-base text-gray-700 leading-relaxed">{children}</div>
    </div>
  </div>
);

// セクション
const Section: React.FC<{
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ id, icon, title, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <section id={id} className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 bg-gradient-to-r from-primary-50 to-blue-50 hover:from-primary-100 hover:to-blue-100 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-500 text-white">
            {icon}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        </div>
        {open ? <ChevronDown className="h-6 w-6 text-gray-500" /> : <ChevronRight className="h-6 w-6 text-gray-500" />}
      </button>
      {open && <div className="px-6 py-6">{children}</div>}
    </section>
  );
};

// 押すボタンの絵
const FakeButton: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = 'bg-primary-500 text-white',
}) => (
  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium ${color}`}>
    {children}
  </span>
);

// ─── メインページ ─────────────────────────────────────────────────────────

const HelpPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>ヘルプ・使い方 | 施工計画書自動作成システム</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <div className="bg-gradient-to-br from-primary-500 to-blue-600 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur">
                <HelpCircle className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">ヘルプ・使い方</h1>
                <p className="text-lg mt-1 text-blue-100">
                  はじめての方でも安心 — このページを見ながら一つずつ進めましょう
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* 目次 */}
          <nav className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary-500" />
              目次（クリックでジャンプ）
            </h2>
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-base">
              {[
                ['intro',      '0. このシステムって何？'],
                ['login',      '1. ログインの仕方'],
                ['screen',     '2. 画面の見方'],
                ['create',     '3. 施工計画書の作り方（一番大事！）'],
                ['history',    '4. 過去に作った計画書を見る'],
                ['templates',  '5. テンプレートを管理する'],
                ['past',       '6. 過去事例を管理する'],
                ['design',     '7. 設計図書を管理する（最重要）'],
                ['profile',    '8. プロフィール・設定'],
                ['trouble',    '9. 困ったとき'],
                ['glossary',   '10. 言葉の意味（用語集）'],
              ].map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary-50 text-gray-700 hover:text-primary-700 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* 0. このシステムって何？ */}
          <Section id="intro" icon={<HelpCircle className="h-6 w-6" />} title="0. このシステムって何？">
            <p className="text-lg text-gray-800 leading-relaxed mb-4">
              このシステムは、<strong>「施工計画書」というお仕事の書類を、自動で作ってくれるお助けツール</strong>です。
            </p>

            <div className="bg-gray-50 rounded-xl p-5 my-4">
              <p className="text-base text-gray-800 leading-relaxed">
                普段、紙やパソコンで一生懸命作っている「施工計画書」を、<br />
                <strong>必要な情報を入れるだけで、自動で形にしてくれる</strong>仕組みです。<br />
                作った書類はパソコンに保存できるので、印刷したり、メールで送ったりもできます。
              </p>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">こんな時に便利です</h3>
            <ul className="space-y-2 text-base text-gray-800">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                新しい工事の施工計画書を作る時
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                過去に作った計画書を見返したい時
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                設計図書（契約書や図面）を整理して保管したい時
              </li>
            </ul>

            <Tip>
              わからないことがあっても大丈夫です。何度間違えても、データが壊れることはありません。
              安心して、まずは触ってみてください。
            </Tip>
          </Section>

          {/* 1. ログインの仕方 */}
          <Section id="login" icon={<LogIn className="h-6 w-6" />} title="1. ログインの仕方">
            <p className="text-lg text-gray-800 mb-4">
              ログインとは、<strong>「自分のお部屋に入る」ためのお家の鍵</strong>のようなものです。
            </p>

            <Step n={1} title="インターネットを開いて、システムのアドレスを入力します">
              ブラウザ（Google ChromeやSafariなど、インターネットを見るアプリ）を開いて、上のアドレス欄に以下を入力します：
              <div className="my-3 px-4 py-3 bg-gray-100 rounded-lg font-mono text-sm">
                https://sekoplan.vercel.app
              </div>
            </Step>

            <Step n={2} title="メールアドレスを入力します">
              「<strong>メールアドレス</strong>」と書かれた箱の中に、あなたのメールアドレスを入れます。<br />
              例：<code className="bg-gray-100 px-2 py-0.5 rounded">tanaka@example.co.jp</code>
            </Step>

            <Step n={3} title="パスワードを入力します">
              「<strong>パスワード</strong>」と書かれた箱に、あなたの合言葉を入れます。<br />
              <span className="flex items-center gap-1 mt-2 text-gray-600">
                <EyeOff className="h-4 w-4" />
                入力中は <span className="font-mono">●●●●●</span> と隠れて表示されます（人に見られないように）
              </span>
              <span className="flex items-center gap-1 mt-1 text-gray-600">
                <Eye className="h-4 w-4" />
                目のマークを押すと、入力した文字が見えます
              </span>
            </Step>

            <Step n={4} title="「ログイン」ボタンを押します">
              青い <FakeButton>ログイン</FakeButton> ボタンを押すと、システムが立ち上がります。
            </Step>

            <Warning>
              <strong>パスワードは人に教えないでください。</strong>
              もし他の人に知られてしまったら、すぐに「設定」画面からパスワードを変更してください。
            </Warning>

            <Tip>
              <strong>ログイン状態を保つ</strong>のチェックを入れると、次回からはパスワードを入れずに使えます。
              ただし、自分以外も使うパソコンでは、安全のためチェックを入れない方がよいです。
            </Tip>
          </Section>

          {/* 2. 画面の見方 */}
          <Section id="screen" icon={<MousePointer2 className="h-6 w-6" />} title="2. 画面の見方">
            <p className="text-lg text-gray-800 mb-4">
              ログインすると、こんな画面が出てきます。
            </p>

            {/* 簡易図解 */}
            <div className="bg-gray-100 rounded-xl p-4 my-4">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-3 bg-blue-100 rounded-lg p-3 text-center">
                  <div className="text-sm font-bold text-blue-800 mb-1">サイドバー</div>
                  <div className="text-xs text-blue-700">（左側の青いメニュー）</div>
                  <ul className="text-xs text-left mt-2 space-y-1 text-blue-900">
                    <li>新規作成</li>
                    <li>過去の作成履歴</li>
                    <li>テンプレート管理</li>
                    <li>過去事例</li>
                    <li>設計図書</li>
                    <li>NotebookLM連携</li>
                    <li>プロフィール</li>
                    <li>設定</li>
                    <li>ヘルプ ← いまここ</li>
                  </ul>
                </div>
                <div className="col-span-9 bg-white rounded-lg p-3 border-2 border-gray-200">
                  <div className="text-xs text-gray-500 mb-2 text-right">画面右上：あなたの名前</div>
                  <div className="text-sm font-bold text-gray-900 mb-3 text-center">メイン画面（作業する場所）</div>
                  <div className="bg-gray-50 rounded p-3 text-xs text-gray-600 text-center min-h-[150px]">
                    ここに、選んだメニューの内容が表示されます
                  </div>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">サイドバーの各メニュー</h3>
            <div className="space-y-3">
              {[
                { icon: <Plus className="h-5 w-5" />, name: '新規作成', desc: '新しい施工計画書を作ります（一番よく使います）' },
                { icon: <History className="h-5 w-5" />, name: '過去の作成履歴', desc: '今までに作った計画書の一覧を見られます' },
                { icon: <LayoutTemplate className="h-5 w-5" />, name: 'テンプレート管理', desc: '計画書のひな型（テンプレート）を管理します' },
                { icon: <BookOpen className="h-5 w-5" />, name: '過去事例（施工計画書）', desc: '完成済みの過去の計画書を参考資料として保管します' },
                { icon: <FolderOpen className="h-5 w-5" />, name: '設計図書', desc: '契約書・図面・仕様書を保管します（一番大切な資料）' },
                { icon: <User className="h-5 w-5" />, name: 'プロフィール', desc: 'あなたの名前やメールアドレスを確認・変更します' },
                { icon: <Settings className="h-5 w-5" />, name: '設定', desc: 'システム全体の設定を変更します（管理者のみ）' },
                { icon: <HelpCircle className="h-5 w-5" />, name: 'ヘルプ', desc: 'いま見ているこのページです' },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 text-primary-700">
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-600">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* 3. 施工計画書の作り方 */}
          <Section id="create" icon={<Plus className="h-6 w-6" />} title="3. 施工計画書の作り方（一番大事！）">
            <p className="text-lg text-gray-800 mb-4">
              これがこのシステムの<strong>メインの使い方</strong>です。ゆっくり、一つずつ進めましょう。
            </p>

            <Step n={1} title="サイドバーから「新規作成」を押す">
              左の青いメニューから <FakeButton color="bg-primary-100 text-primary-700"><Plus className="h-4 w-4" />新規作成</FakeButton> を押します。
            </Step>

            <Step n={2} title="工事の情報を入力する">
              画面に出てくる箱（入力欄）に、工事の情報を入れていきます。
              <div className="my-3 bg-gray-50 rounded-lg p-4 space-y-2 text-base">
                <div><strong>工事件名</strong>：例「公園樹木せん定等委託（その1）」</div>
                <div><strong>工事種別</strong>：例「公園維持管理」</div>
                <div><strong>契約番号</strong>：例「R8-23762」</div>
                <div><strong>工事場所</strong>：例「渋谷区内全域」</div>
                <div><strong>工期 始期</strong>：例「2026年4月1日」</div>
                <div><strong>工期 終期</strong>：例「2027年3月31日」</div>
                <div><strong>契約金額</strong>：例「5,000,000円」</div>
                <div><strong>発注者</strong>：例「渋谷区」</div>
                <div><strong>受注者</strong>：例「中田造園株式会社」</div>
              </div>
            </Step>

            <Step n={3} title="（あれば）設計図書のPDFをアップロードする">
              <strong>設計図書のPDFファイル</strong>がある場合は、画面の指示に従ってアップロードできます。<br />
              そうすると、契約番号や工事場所などを<strong>自動で読み取って、入力欄に入れてくれます</strong>。
              <Tip>
                自動で読み取った内容は、必ず<strong>目で確認してください</strong>。
                間違っていたら、その場で直せます。
              </Tip>
            </Step>

            <Step n={4} title="テンプレートを選ぶ（任意）">
              「<strong>テンプレート</strong>」とは、計画書の<strong>ひな型・型紙</strong>のことです。<br />
              選ばなくても標準のものが使われますが、専用のひな型がある場合はここで選びます。
            </Step>

            <Step n={5} title="入力内容を確認する">
              画面を下にスクロール（マウスのコロコロを回す or 画面を指でスーッと上に動かす）して、入力内容を見直します。
              <NgExample>
                <strong>誤字脱字に注意！</strong>一度作った後でも直せますが、最初から正しく入れる方が早いです。
              </NgExample>
            </Step>

            <Step n={6} title="「生成する」ボタンを押す">
              全部入力できたら、<FakeButton>施工計画書を生成</FakeButton> ボタンを押します。<br />
              数秒〜10秒ほど待つと、完成した計画書ファイルができます。
            </Step>

            <Step n={7} title="ダウンロードして使う">
              <FakeButton color="bg-green-500 text-white"><Download className="h-4 w-4" />ダウンロード</FakeButton> ボタンを押すと、
              パソコンに計画書ファイルが保存されます。<br />
              通常は「ダウンロード」フォルダに入ります。
            </Step>

            <Warning>
              ダウンロードした後は、必ず<strong>中身を確認</strong>してください。
              数字や日付が正しいか、印刷する前にもう一度見直しましょう。
            </Warning>
          </Section>

          {/* 4. 過去の作成履歴 */}
          <Section id="history" icon={<History className="h-6 w-6" />} title="4. 過去に作った計画書を見る">
            <p className="text-lg text-gray-800 mb-4">
              今までに作った全ての計画書を、いつでも見直したり、もう一度ダウンロードできます。
            </p>

            <Step n={1} title="サイドバーから「過去の作成履歴」を押す">
              <FakeButton color="bg-primary-100 text-primary-700"><History className="h-4 w-4" />過去の作成履歴</FakeButton>
              を押します。
            </Step>

            <Step n={2} title="一覧から探す">
              作った計画書が新しい順に並んでいます。<br />
              工事名・作成日・ファイルの大きさが見られます。
            </Step>

            <Step n={3} title="もう一度ダウンロードする">
              <FakeButton color="bg-green-500 text-white"><Download className="h-4 w-4" />ダウンロード</FakeButton>
              のマークを押すと、何度でもダウンロードできます。
            </Step>

            <Tip>
              一度作った計画書は<strong>絶対に消えません</strong>。
              削除ボタンを押さない限り、ずっと保管されます。
            </Tip>
          </Section>

          {/* 5. テンプレート管理 */}
          <Section id="templates" icon={<LayoutTemplate className="h-6 w-6" />} title="5. テンプレートを管理する">
            <h3 className="text-xl font-bold text-gray-900 mb-3">テンプレートって何？</h3>
            <p className="text-base text-gray-800 leading-relaxed mb-4">
              「テンプレート」とは、<strong>あらかじめ用意された計画書のひな型</strong>のことです。<br />
              料理で例えると、「お弁当箱」のようなものです。<br />
              お弁当箱に「ご飯」「おかず」「漬物」を入れるように、テンプレートに工事情報を入れて完成させます。
            </p>

            <Warning>
              テンプレートを<strong>追加・削除できるのは「管理者」だけ</strong>です。
              一般ユーザーは見ることとダウンロードだけできます。
            </Warning>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">テンプレートを追加する（管理者のみ）</h3>
            <Step n={1} title="「テンプレート管理」を開く">
              サイドバーから <FakeButton color="bg-primary-100 text-primary-700"><LayoutTemplate className="h-4 w-4" />テンプレート管理</FakeButton>
            </Step>
            <Step n={2} title="「テンプレートを追加」ボタンを押す">
              青いボタン <FakeButton><Plus className="h-4 w-4" />テンプレートを追加</FakeButton>
            </Step>
            <Step n={3} title="ファイルを選ぶ（DOCX形式のみ）">
              点線の四角の中をクリックして、パソコン内のテンプレートファイル（.docxで終わるファイル）を選びます。<br />
              または、ファイルをマウスで点線の中に<strong>ドラッグ＆ドロップ</strong>もできます。
            </Step>
            <Step n={4} title="名前と説明を入れて「アップロード」">
              テンプレートの名前と説明を書いて、<FakeButton><Upload className="h-4 w-4" />アップロード</FakeButton> を押します。
            </Step>
          </Section>

          {/* 6. 過去事例 */}
          <Section id="past" icon={<BookOpen className="h-6 w-6" />} title="6. 過去事例を管理する">
            <h3 className="text-xl font-bold text-gray-900 mb-3">過去事例って何？</h3>
            <p className="text-base text-gray-800 leading-relaxed mb-4">
              「過去事例」とは、<strong>昔作った完成済みの計画書</strong>を、参考資料としてとっておく場所です。<br />
              新しい計画書を作る時に「以前はどう書いたかな？」と見直すのに便利です。
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">追加・削除の仕方</h3>
            <p className="text-base text-gray-800 mb-3">
              基本的な使い方はテンプレートと同じです：
            </p>
            <ol className="space-y-2 text-base text-gray-800 list-decimal list-inside ml-4">
              <li>サイドバーから「<strong>過去事例（施工計画書）</strong>」を開く</li>
              <li>「過去事例を追加」を押す</li>
              <li>DOCXファイルを選ぶ</li>
              <li>案件名・工事種別・発注者・場所などを入力</li>
              <li>「アップロード」を押す</li>
            </ol>

            <Tip>
              <strong>検索ボックス</strong>を使うと、たくさんの事例から目的のものをすぐに見つけられます。
              工事名・発注者名・場所のどれでも検索できます。
            </Tip>
          </Section>

          {/* 7. 設計図書 */}
          <Section id="design" icon={<FolderOpen className="h-6 w-6" />} title="7. 設計図書を管理する">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-red-500 fill-red-500" />
              <span className="text-red-600 font-bold text-lg">最重要！</span>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-3">設計図書って何？</h3>
            <p className="text-base text-gray-800 leading-relaxed mb-4">
              「設計図書」とは、<strong>その工事の元となる大切な書類</strong>のことです：
            </p>
            <ul className="space-y-2 text-base text-gray-800 mb-4">
              <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />契約書</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />図面</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />仕様書</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />数量計算書</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />見積書 など</li>
            </ul>

            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 my-4">
              <p className="text-base text-red-900">
                <strong>施工計画書はこの「設計図書」の内容に基づいて作ります。</strong><br />
                必ず最初にここにアップロードして、何度でも見返せるようにしておきましょう。
              </p>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">対応しているファイル</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['PDF', '.pdf', 'bg-red-100 text-red-700'],
                ['Word', '.docx', 'bg-blue-100 text-blue-700'],
                ['Excel', '.xlsx', 'bg-green-100 text-green-700'],
                ['ZIP', '.zip', 'bg-yellow-100 text-yellow-700'],
              ].map(([name, ext, color]) => (
                <div key={name} className={`text-center p-3 rounded-lg ${color}`}>
                  <div className="font-bold">{name}</div>
                  <div className="text-xs mt-1">{ext}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-2 text-center">
              ※ 1ファイルあたり最大100MBまで
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">追加の仕方</h3>
            <ol className="space-y-2 text-base text-gray-800 list-decimal list-inside ml-4">
              <li>サイドバーから「<strong>設計図書</strong>」を開く</li>
              <li>「設計図書を追加」を押す</li>
              <li>ファイル（PDFなど）を選ぶ</li>
              <li>図書名・図書種別（契約図書・図面など）・関連案件名を入力</li>
              <li>「アップロード」を押す</li>
            </ol>
          </Section>

          {/* 8. プロフィール・設定 */}
          <Section id="profile" icon={<User className="h-6 w-6" />} title="8. プロフィール・設定">
            <h3 className="text-xl font-bold text-gray-900 mb-3">プロフィール</h3>
            <p className="text-base text-gray-800 mb-3">
              サイドバー下部の <FakeButton color="bg-primary-100 text-primary-700"><User className="h-4 w-4" />プロフィール</FakeButton>
              を押すと、自分の情報を確認・変更できます：
            </p>
            <ul className="space-y-1 text-base text-gray-800 list-disc list-inside ml-4 mb-4">
              <li>名前</li>
              <li>メールアドレス</li>
              <li>パスワード（変更したい時はここから）</li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">設定</h3>
            <p className="text-base text-gray-800 mb-3">
              サイドバー下部の <FakeButton color="bg-primary-100 text-primary-700"><Settings className="h-4 w-4" />設定</FakeButton>
              は、システム全体の設定です：
            </p>
            <ul className="space-y-1 text-base text-gray-800 list-disc list-inside ml-4 mb-4">
              <li><strong>通知設定</strong>：施工計画書ができた時にお知らせするかどうか</li>
              <li><strong>表示設定</strong>：画面の見え方</li>
              <li><strong>出力設定</strong>：ファイルの保存場所など</li>
              <li><strong>ユーザー管理</strong>：他の人を追加・削除（管理者のみ）</li>
            </ul>

            <Warning>
              <strong>設定の変更は「管理者」だけができます。</strong>
              一般ユーザーは見ることだけできます（変更しようとしても押せません）。
            </Warning>
          </Section>

          {/* 9. 困ったとき */}
          <Section id="trouble" icon={<AlertTriangle className="h-6 w-6" />} title="9. 困ったとき">
            <div className="space-y-5">
              {/* ログインできない */}
              <div className="border-2 border-gray-200 rounded-xl p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  ログインできない
                </h3>
                <ul className="space-y-2 text-base text-gray-800">
                  <li>① メールアドレスとパスワードが正しいか、もう一度ゆっくり確認してください</li>
                  <li>② 大文字・小文字に注意（パスワードは区別されます）</li>
                  <li>③ それでもダメな場合は、管理者にパスワードのリセットを依頼してください</li>
                </ul>
              </div>

              {/* ファイルがダウンロードできない */}
              <div className="border-2 border-gray-200 rounded-xl p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  ファイルがダウンロードできない
                </h3>
                <ul className="space-y-2 text-base text-gray-800">
                  <li>① ブラウザが古い場合は、最新版に更新してください</li>
                  <li>② インターネットが繋がっているか確認してください</li>
                  <li>③ ページを更新（F5キーを押す）してから、もう一度試してください</li>
                </ul>
              </div>

              {/* 画面が動かない */}
              <div className="border-2 border-gray-200 rounded-xl p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  画面が動かない・反応しない
                </h3>
                <ul className="space-y-2 text-base text-gray-800">
                  <li>① ページを更新する（パソコンのキーボードで「F5」を押す）</li>
                  <li>② いったんブラウザを閉じて、もう一度開く</li>
                  <li>③ パソコンを再起動する</li>
                </ul>
              </div>

              {/* データが消えた */}
              <div className="border-2 border-gray-200 rounded-xl p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  データは絶対に消えません
                </h3>
                <p className="text-base text-gray-800">
                  一度作った計画書、アップロードしたテンプレート・過去事例・設計図書は、
                  <strong>削除ボタンを押さない限り、ずっと安全に保管</strong>されています。
                  「消えたかも？」と思ったら、まずページを更新してください。
                </p>
              </div>

              {/* 入力した文字が消えた */}
              <div className="border-2 border-gray-200 rounded-xl p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  入力中の文字が消えてしまった
                </h3>
                <p className="text-base text-gray-800 mb-2">
                  ブラウザを閉じてしまうと、まだ「生成する」を押していない入力内容は消えます。
                </p>
                <Tip>
                  長い文章を入力する時は、メモ帳などに先に書いてから、コピー＆ペーストすると安心です。
                </Tip>
              </div>

              {/* 連絡先 */}
              <div className="border-2 border-blue-200 bg-blue-50 rounded-xl p-5">
                <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  どうしても解決しない時は
                </h3>
                <p className="text-base text-blue-900">
                  社内のシステム管理者（植竹さん）に連絡してください。<br />
                  画面の状態を写真に撮って送ると、解決が早くなります。
                </p>
              </div>
            </div>
          </Section>

          {/* 10. 用語集 */}
          <Section id="glossary" icon={<BookOpen className="h-6 w-6" />} title="10. 言葉の意味（用語集）">
            <p className="text-base text-gray-800 mb-4">
              システムでよく出てくる言葉の意味です。わからない言葉があったらここを見てください。
            </p>
            <dl className="space-y-4">
              {[
                ['ログイン', '自分のアカウントでシステムに入ること。お家の鍵を開けるイメージ'],
                ['ログアウト', 'システムから出ること。お家から出るイメージ'],
                ['アカウント', '自分専用のお部屋。メールアドレスとパスワードで入ります'],
                ['パスワード', 'お部屋に入るための合言葉。人に教えてはいけません'],
                ['管理者', 'システムの偉い人。他の人を追加したり、テンプレートを変えたりできます'],
                ['一般ユーザー', '普通の利用者。計画書を作ったり、ファイルをダウンロードできます'],
                ['アップロード', '自分のパソコンにあるファイルを、システムに送ること（上に送るイメージ）'],
                ['ダウンロード', 'システムにあるファイルを、自分のパソコンに保存すること（下に降ろすイメージ）'],
                ['テンプレート', '計画書のひな型・型紙。お弁当箱のようなもの'],
                ['過去事例', '昔作った完成済みの計画書。新しい計画書の参考になります'],
                ['設計図書', '工事の元となる契約書・図面・仕様書など。一番大切な書類'],
                ['施工計画書', '工事をどう進めるか書いた書類。このシステムで自動作成できます'],
                ['DOCX（ドキッス）', 'マイクロソフトのWordというソフトで作る書類のファイル形式'],
                ['PDF（ピーディーエフ）', '色んなパソコンで同じように見える書類の形式。設計図書によく使われます'],
                ['ブラウザ', 'インターネットを見るための道具。Chrome、Safari、Edgeなどがあります'],
                ['ドラッグ＆ドロップ', 'マウスでファイルをつかんで、別の場所まで運んで離す操作'],
                ['クリック', 'マウスの左ボタンを押すこと'],
                ['更新（リロード）', 'ページの内容を最新にすること。キーボードの「F5」を押す'],
              ].map(([term, def]) => (
                <div key={term} className="border-l-4 border-primary-300 pl-4">
                  <dt className="font-bold text-gray-900 text-base">{term}</dt>
                  <dd className="text-gray-700 text-base mt-1">{def}</dd>
                </div>
              ))}
            </dl>
          </Section>

          {/* お疲れ様 */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl border-2 border-green-200 p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">お疲れ様でした！</h2>
            <p className="text-base text-gray-700 leading-relaxed mb-4">
              最初は難しく感じるかもしれませんが、何度か使っているうちに必ず慣れます。<br />
              わからないことがあったら、いつでもこのページに戻ってきてください。
            </p>
            <Link
              href="/plans/create"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 transition-colors"
            >
              <Plus className="h-5 w-5" />
              さっそく新規作成してみる
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default HelpPage;
