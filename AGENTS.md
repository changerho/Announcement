# Project Instructions

## Goal
維護多來源公告 Dashboard，優先確保資料更新安全、來源抓取可追蹤、前端既有行為不被破壞。

## Stack
- Frontend: HTML, CSS, Vanilla JavaScript
- Backend/local server: Python standard library `http.server`
- Scraping: `urllib`, BeautifulSoup
- Data contract: `data.json`

## Important files
- `app.js`: 前端狀態、篩選與互動
- `parse_data.py`: 來源抓取與 `data.json` 生成
- `server.py`: 靜態檔案服務與 `/api/refresh`
- `Web Data.txt`: source name / URL mapping

## Commands
Install:
`pip install -r requirements.txt`

Run server:
`python server.py`

Refresh data only:
`python parse_data.py`

Syntax check:
`python -m py_compile parse_data.py server.py`

## Safety rules
- Never use `git push --force` automatically.
- Never commit or push as a side effect of scraping or refreshing data.
- Do not overwrite user Git history or discard uncommitted changes.
- Never add secrets, tokens, private keys, `.env` files, or credentials to Git.
- Before changing scraper logic, keep a fallback path so one broken source does not break the whole dashboard.
- Preserve the `data.json` shape unless the frontend is updated in the same change.

## Development rules
- Prefer small, reviewable changes.
- Keep filesystem paths relative to the project directory; do not hard-code a developer machine path.
- Run Python syntax checks after changing Python files.
- For scraper changes, validate at least the affected source and ensure malformed network responses do not crash all sources.
- Do not change visual behavior unless the task asks for UI changes.

## Known technical debt
- Source-specific scraping rules are concentrated in one large function.
- Several fallback dates/content items are hard-coded.
- There is no automated test suite yet.
- Network scraping uses an unverified TLS context; this should be reviewed before production use.
