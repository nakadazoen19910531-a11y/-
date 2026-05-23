"""
PDFテキスト抽出・解析サービス
sekoplan_creator.py の実績あるパターンを活用して精度向上
"""
import re
import os
from pathlib import Path
from typing import Optional

try:
    from PyPDF2 import PdfReader
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False


class PDFService:
    """PDF テキスト抽出と契約情報解析サービス"""

    # 最大読み込みページ数
    MAX_PAGES = 5

    def extract_text(self, pdf_path: str, max_pages: int = None) -> str:
        """
        PDFからテキストを抽出

        Args:
            pdf_path: PDFファイルのパス
            max_pages: 最大読み込みページ数（Noneで全ページ）

        Returns:
            抽出したテキスト

        Raises:
            Exception: PDF読み込みエラー
        """
        if not PDF_AVAILABLE:
            raise Exception("PyPDF2 がインストールされていません。pip install PyPDF2 を実行してください")

        if not os.path.exists(pdf_path):
            raise Exception(f"ファイルが見つかりません: {pdf_path}")

        try:
            reader = PdfReader(pdf_path)
            text = ""
            limit = max_pages or (self.MAX_PAGES if max_pages != 0 else len(reader.pages))

            for i, page in enumerate(reader.pages):
                if i >= limit:
                    break
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"

            return text

        except Exception as e:
            raise Exception(f"PDF テキスト抽出に失敗しました: {str(e)}")

    def extract_from_pdf(self, pdf_path: str) -> dict:
        """
        PDFから契約情報を構造化データとして抽出

        sekoplan_creator.py の実績ある抽出パターンを使用

        Args:
            pdf_path: PDFファイルのパス

        Returns:
            抽出した契約情報の辞書
        """
        data = {}

        # ① ファイル名から契約番号を先に試みる
        filename_contract = self._extract_contract_from_filename(pdf_path)
        if filename_contract:
            data['contractNumber'] = filename_contract

        # ② PDFテキストを抽出
        try:
            text = self.extract_text(pdf_path)
        except Exception as e:
            # テキスト抽出失敗時はファイル名からの情報のみ返す
            return {**data, '_extraction_error': str(e)}

        if not text:
            return data

        # ③ テキストから各情報を抽出
        parsed = self._parse_contract_info(text, pdf_path)
        data.update(parsed)

        return data

    def _extract_contract_from_filename(self, pdf_path: str) -> Optional[str]:
        """
        ファイル名から契約番号を抽出

        例: R8-23762-契約書.pdf → R8-23762
             R8-23762_仕様書.pdf → R8-23762
        """
        filename = Path(pdf_path).stem  # 拡張子なし
        # パターン: R+数字-数字
        match = re.search(r'(R\d+[-_]\d+)', filename, re.IGNORECASE)
        if match:
            return match.group(1).replace('_', '-')
        return None

    def _parse_contract_info(self, text: str, pdf_path: str = '') -> dict:
        """
        テキストから契約情報を解析

        sekoplan_creator.py の実績パターンを活用

        Args:
            text: PDFから抽出したテキスト
            pdf_path: 元のPDFパス（ファイル名からの補助抽出に使用）

        Returns:
            解析した契約情報の辞書
        """
        data = {}

        # === 契約番号 ===
        if 'contractNumber' not in data:
            contract_patterns = [
                r'(R\d+[-]\d+)',           # R8-23762 形式
                r'契約番号[：:\s]*([^\n\s]+)',
                r'[Rr](\d+)\-?(\d+)',     # R8 23762 形式
            ]
            for pattern in contract_patterns:
                match = re.search(pattern, text)
                if match:
                    if match.lastindex and match.lastindex >= 2:
                        data['contractNumber'] = f"R{match.group(1)}-{match.group(2)}"
                    else:
                        data['contractNumber'] = match.group(1)
                    break

        # === 工事名 ===
        project_patterns = [
            r'工事名[称]?[：:\s]*([^\n]{2,50})',
            r'業務名[：:\s]*([^\n]{2,50})',
            r'委託名[：:\s]*([^\n]{2,50})',
        ]
        for pattern in project_patterns:
            match = re.search(pattern, text)
            if match:
                name = match.group(1).strip()
                # 不要な文字を除去
                name = re.sub(r'\s+', '', name)
                if len(name) >= 2:
                    data['projectName'] = name
                    break

        # === 工事場所 ===
        location_patterns = [
            r'工事場所[：:\s]*([^\n、。]{2,50})',
            r'施工場所[：:\s]*([^\n、。]{2,50})',
            r'履行場所[：:\s]*([^\n、。]{2,50})',
            r'場所[：:\s]*([^\n、。]{2,50})',
        ]
        for pattern in location_patterns:
            match = re.search(pattern, text)
            if match:
                loc = match.group(1).strip()
                loc = re.sub(r'\s+', ' ', loc).strip()
                if len(loc) >= 2:
                    data['location'] = loc
                    break

        # === 工期 ===
        # 単価契約判定
        if '業務名・単価別紙' in text or '別紙のとおり' in text:
            data['contractAmount'] = '別紙のとおり'

        # 履行期間（複数行対応）
        period_patterns = [
            r'履行期間([\s\S]+?)(?=\d{1,2}[\.．]\s*[^\d])',
            r'工期[：:\s]*([^\n。]{5,100})',
            r'施工期間[：:\s]*([^\n。]{5,100})',
        ]
        for pattern in period_patterns:
            match = re.search(pattern, text)
            if match:
                period_text = match.group(1).strip()
                # スペース除去
                period_text = re.sub(r'\s+', '', period_text)

                # 日付パターンで工期開始・終了を抽出
                reiwa_dates = re.findall(
                    r'令和\s*(\d+)\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日',
                    period_text
                )
                if len(reiwa_dates) >= 2:
                    start = reiwa_dates[0]
                    end = reiwa_dates[1]
                    data['startDate'] = f"令和{start[0]}年{start[1]}月{start[2]}日"
                    data['endDate'] = f"令和{end[0]}年{end[1]}月{end[2]}日"
                    break
                elif len(reiwa_dates) == 1:
                    d = reiwa_dates[0]
                    data['startDate'] = f"令和{d[0]}年{d[1]}月{d[2]}日"
                    break

        # 西暦日付でも試みる
        if 'startDate' not in data:
            western_dates = re.findall(r'(\d{4})年(\d{1,2})月(\d{1,2})日', text)
            if len(western_dates) >= 2:
                data['startDate'] = f"{western_dates[0][0]}年{western_dates[0][1]}月{western_dates[0][2]}日"
                data['endDate'] = f"{western_dates[1][0]}年{western_dates[1][1]}月{western_dates[1][2]}日"
            elif len(western_dates) == 1:
                d = western_dates[0]
                data['startDate'] = f"{d[0]}年{d[1]}月{d[2]}日"

        # === 契約金額 ===
        if 'contractAmount' not in data:
            # 単価契約のチェック
            if '業務名・単価別紙' in text or '別紙のとおり' in text:
                data['contractAmount'] = '別紙のとおり'
            else:
                amount_patterns = [
                    r'契約金額[：:\s]*([￥¥]?[\d,０-９，]+)\s*円',
                    r'契約金額[：:\s]*([￥¥][\d,]+)',
                    r'金額[：:\s]*([￥¥]?[\d,０-９，]+)\s*円',
                    r'(\d{1,3}(?:[,，]\d{3})+)\s*円',  # カンマ区切り + 円
                ]
                for pattern in amount_patterns:
                    match = re.search(pattern, text)
                    if match:
                        amount = match.group(1).strip()
                        # ¥記号を統一
                        if not amount.startswith('¥') and not amount.startswith('￥'):
                            amount = f"¥{amount}"
                        data['contractAmount'] = amount
                        break

        # === 発注者 ===
        client_patterns = [
            r'発注者[：:\s]*([^\n]{2,30})',
            r'委託者[：:\s]*([^\n]{2,30})',
            r'甲[：:\s]*([^\n]{2,30})',
        ]
        for pattern in client_patterns:
            match = re.search(pattern, text)
            if match:
                client = match.group(1).strip()
                client = re.sub(r'\s+', '', client)
                if len(client) >= 2:
                    data['client'] = client
                    break

        return data

    def parse_text(self, text: str) -> dict:
        """
        テキストを直接解析（PDFを介さない場合）

        Args:
            text: 解析するテキスト

        Returns:
            解析した情報の辞書
        """
        return self._parse_contract_info(text)
