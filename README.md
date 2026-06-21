# 滿月賀卡 · Baby Full-Month Interactive Card

一個純前端（HTML / CSS / JS，零相依套件、免建置）的互動式嬰兒滿月賀卡網頁 App，
針對 **iPhone 17 Pro**（402×874pt、DPR 3、安全區）做 RWD 最佳化，支援 **中／英** 切換。

A dependency-free, no-build static web app — an interactive baby full-month greeting card,
RWD-tuned for **iPhone 17 Pro**, with **Chinese / English** switching.

---

## ✨ 功能 Features

### 1. 滿月賀卡（搖一搖）
- 進入後顯示「開始」授權卡片（iOS 需要使用者手勢才能取得陀螺儀權限）。
- 點「開始」→ 顯示熟睡的寶寶（`baby-card`）與提示「緩慢地搖晃你的手機」。
- **搖晃手機** → 以 fade-in 淡入 **微笑** 的寶寶（`baby-smile`）。
- 搖晃**頻率降低或停止** → 淡入 **哭臉**（`baby-cry`）；**繼續搖** → 回到笑臉。
- 底部有「搖晃力度」能量條即時回饋。
- 桌機 / 無陀螺儀 / 拒絕授權時：可用滑鼠快速移動或**直接點照片**切換表情（無障礙備援）。

### 2. 抽卡
- 底部選單「抽卡」→ 進入魔法風格頁面。
- 點卡背 → 播放抽卡 / 翻牌動畫 → 翻出你的卡片（`card`，會依語言顯示中／英版本）。
- **點卡片圖片** → 全螢幕特寫（`card-og`），疊加循環動畫：飄升餘燼、魔法光點、閃爍星火、
  燭火閃動、法陣與花朵光暈，並支援**手指/滑鼠傾斜的視差**與整圖呼吸光暈。

### 3. 中英語系切換
- 右上角 中 / EN 滑動開關，全站 UI 即時切換並記憶選擇（`localStorage`）。
- 抽卡的卡片圖會跟著語言切換（`card-cn` ↔ `card-en`）。

---

## 📁 圖片 Assets

App 實際載入 `assets/images/` 內的檔案。已用 ffmpeg 產生最佳化 WebP（約 115–166 KB／張，
原始 PNG 約 2 MB），並保留原圖作為備援（找不到 `.webp` 會自動退回 `.png`/`.jpg`，
再退回內建佔位圖）。

| 用途 | 檔名（基底） | 來源原圖 |
|---|---|---|
| 賀卡・熟睡（初始） | `baby-card` | `baby card.png` |
| 賀卡・微笑 | `baby-smile` | `baby card smile.png` |
| 賀卡・哭臉 | `baby-cry` | `baby card cry.png` |
| 抽卡・卡片（中文） | `card-cn` | `card cn.jpg` |
| 抽卡・卡片（英文） | `card-en` | `card en.jpg` |
| 特寫動畫 | `card-og` | `card og.png` |

**要換圖時**：把新圖放進 `assets/images/`，沿用相同基底檔名即可（`.webp` / `.png` / `.jpg` 皆可）。
若想重新最佳化：

```bash
ffmpeg -y -i 你的圖.png -vf "scale='min(1206,iw)':-2:flags=lanczos" -c:v libwebp -quality 84 assets/images/baby-card.webp
```

---

## 🚀 在 iPhone 上測試 / 部署

> ⚠️ 陀螺儀（DeviceMotion）**只有在 HTTPS（或 localhost）才能運作**，所以請用下列方式之一。

### 方式 A：GitHub Pages（推薦，免費 HTTPS）
1. 建立 GitHub repo 並把整個資料夾推上去（預設分支 `main`）。
2. Repo → **Settings → Pages → Build and deployment → Source 選「GitHub Actions」**。
3. 本專案已附 `.github/workflows/deploy.yml`，推上去即自動部署。
4. 用 iPhone 開啟 `https://<帳號>.github.io/<repo>/`，點「開始」並允許動作權限。

### 方式 B：Netlify
- 直接把資料夾拖到 https://app.netlify.com/drop（已附 `netlify.toml`），取得 HTTPS 網址。

### 本機預覽（桌機，無陀螺儀也能測流程）
```bash
# 任選一種靜態伺服器
python -m http.server 8000
# 或
npx serve .
```
開 `http://localhost:8000`。桌機沒有陀螺儀，可用滑鼠快速晃動照片區或直接點照片切換表情。

---

## 🛠️ 開發小抄

- 加 `?debug` 於網址（例：`localhost:8000/?debug`）會顯示能量/狀態讀數，方便調整搖晃靈敏度。
- 搖晃靈敏度參數在 [app.js](app.js) 最上方的 `SHAKE` 物件（`ON` / `OFF` / `DECAY` / `MOTION_K`）。
- 多語字串集中在 [i18n.js](i18n.js) 的 `DICT`。
- 視覺主題色集中在 [styles.css](styles.css) `:root` 變數（暖色賀卡世界 + 紫金魔法世界）。
- 尊重系統「減少動態效果」設定（`prefers-reduced-motion`）。

## 結構
```
.
├─ index.html
├─ styles.css
├─ app.js
├─ i18n.js
├─ assets/images/        # app 載入的最佳化圖（webp + 原圖備援）
├─ netlify.toml
└─ .github/workflows/deploy.yml
```
