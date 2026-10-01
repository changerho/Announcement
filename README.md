# Announcement Dashboard

一個以純 HTML/CSS/JavaScript 顯示多來源公告的儀表板。Python 負責抓取來源網站並產生 `data.json`，本機 HTTP server 提供頁面與手動重新整理 API。

## 架構

- `index.html` / `style.css` / `app.js`：前端介面
- `server.py`：本機 HTTP server，提供 `/api/refresh`
- `parse_data.py`：讀取 `Web Data.txt` 的來源並抓取公告，產生 `data.json`
- `Web Data.txt`：資訊來源名稱與 URL 對照
- `data.json`：前端讀取的產出資料

## 環境

建議 Python 3.11+。

```bash
python -m venv .venv
```

Windows PowerShell：

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python server.py
```

macOS / Linux：

```bash
source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

然後開啟：`http://localhost:8000`

## 僅更新資料

```bash
python parse_data.py
```

`parse_data.py` 只更新本機 `data.json`，不會自動 commit、push 或 force-push。版本控制與部署應由開發者或 CI 明確執行。

## Git 工作流程

```bash
git status
git add <files>
git commit -m "Describe the change"
git push origin main
```

在 push 前請先檢查 diff，避免把本機暫存資料、憑證或不預期的 generated files 上傳。

## 注意事項

抓取器依賴第三方網站的 HTML 結構；來源網站改版後，個別 parser 可能需要調整。部分來源抓不到資料時會使用程式內建 fallback 資料，因此「有資料」不一定代表即時抓取成功。
