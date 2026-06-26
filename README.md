# 滿月賀卡 · Baby Full-Month Interactive Card

純前端（HTML / CSS / JS，零相依套件、免建置）的互動式嬰兒滿月賀卡，採統一的 **「月夜 Moonlit」** 視覺主題，
針對 **iPhone 17 Pro**（402×874pt、DPR 3、安全區）做 RWD 最佳化，支援 **中／英** 切換。

🌙 **線上版本**：<https://bobo-first-month.netlify.app>（部署於 Netlify）
📱 **QR Code**：[qr-code.png](qr-code.png) ／ [qr-code.svg](qr-code.svg)（掃描即開啟線上版本）

---

## ✨ 功能 Features

### 1. 滿月賀卡（搖一搖 → 三種心情）
進入後點「開始」授權陀螺儀（iOS 需使用者手勢）。搖晃強度對應寶寶的三種心情，三個階段都會在過程中出現：

| 心情 | 觸發 | 圖片 |
|---|---|---|
| 😣 **哭** | 不搖 / 停止後能量降到最低 | `baby-cry` |
| 😴 **不哭** | 輕搖、或停止後的中段 | `baby-card`（熟睡） |
| 😊 **笑** | 持續搖晃、能量最高 | `baby-smile` |

- 採單一「安撫值」（0–1）模型：搖晃推升、停手回落，**進度條＝安撫值＝心情**三者永遠一致。
- **全軸度偵測**：左右、前後、對著螢幕推拉（加速度 x/y/z）以及扭轉手機（rotationRate）都能觸發。
- 有阻尼與**停留設計**：停手後會先 hold 一段時間再「慢慢地」衰減，讓每個階段停留更久。
- 切換心情會有轉場小動畫：切到**哭**下雨、切到**笑**冒金色星星。
- 底部「哭 · 不哭 · 笑」心情軌會即時亮起對應階段，畫面光暈也會隨心情由暖金 ↔ 冷藍變化。
- **搖出笑臉時，會跳出下載按鈕**，可把當前這張寶寶賀卡存到手機。
- 無陀螺儀 / 拒絕授權 / 桌機：可**輕觸照片**循環切換三種心情（無障礙備援）。

### 2. 紀念小卡（抽卡 · 四種稀有度）
- 底部選單「波波紀念卡」→ 點卡背播放翻牌動畫 → **隨機翻出四種稀有度之一**（已去背、漂浮在夜空背景上，中／英版隨語言切換）。
- 抽中機率：**普通 40% > 精良 30% > 史詩 20% > 傳說 10%**（卡框寶石：無／藍／紫／金＋龍框）。
- 翻卡瞬間特效**依稀有度分級**：普通最樸素 → 精良（藍）→ 史詩（紫）→ 傳說（金）最華麗；卡片光暈也隨之變色。
- **點卡片圖片** → 全螢幕特寫（共用 `card-og` 場景，四種稀有度中央寶寶照片相同），疊加特效**也依稀有度分級**（粒子數、光束、光暈、視差深度遞增）。下載則會存下你抽到的那張卡。

### 3. 中英語系切換
右上滑動開關，全站 UI 即時切換並記憶（`localStorage`）；紀念小卡圖也跟著語言換版。

---

## 📁 圖片 Assets（`assets/images/`）

已用 ffmpeg 轉成最佳化 WebP，並保留 PNG 備援（找不到 `.webp` 會自動退回 `.png`，再退回佔位圖）。紀念小卡為純白底原圖，**從四角洪水填充去白底**（保留邊框寶石與數字）＋ 1px 內縮去白邊，四種稀有度用**同一套去背流程**處理（統一）。

| 用途 | 檔名（基底） | 來源原圖 |
|---|---|---|
| 賀卡・不哭（熟睡，初始） | `baby-card` | `baby card.png` |
| 賀卡・笑 | `baby-smile` | `baby card smile.png` |
| 賀卡・哭 | `baby-cry` | `baby card cry.png` |
| 紀念小卡・普通（中／英・去背） | `card-normal-cn` / `card-normal-en` | `baby card normal cn/en.jpg` |
| 紀念小卡・精良（中／英・去背） | `card-rare-cn` / `card-rare-en` | `baby card blue cn/en.jpg` |
| 紀念小卡・史詩（中／英・去背） | `card-epic-cn` / `card-epic-en` | `baby card epic cn/en.jpg` |
| 紀念小卡・傳說（中／英・去背） | `card-cn` / `card-en` | `card cn/en.jpg` |
| 特寫場景（共用） | `card-og` / `card-og-fg` | `card og.png` |

換圖：把新圖放進 `assets/images/` 沿用相同基底檔名即可。重新最佳化／去背的指令見下方「開發小抄」。

---

## 🚀 部署 / 更新

主站部署於 **Netlify**（免費 HTTPS）：<https://bobo-first-month.netlify.app>
設定見 [netlify.toml](netlify.toml)（純靜態、圖片長快取）。原 **GitHub Pages** 鏡像仍可用：<https://cas2953.github.io/full-moon-card/>

更新方式：
- **GitHub Pages**：`git push` 到 `main` 會自動重新發佈。
- **Netlify**：目前以 **CLI 手動部署**（未連動 git）。為避免把根目錄原圖一併公開，部署「只含網站檔」的乾淨內容即可，例如：
  ```bash
  # 站台已建立：name=bobo-first-month、id=8601a7b1-f626-48dc-aa38-f3d14aaf7ebd
  rm -rf __publish && mkdir -p __publish/assets && \
  cp index.html styles.css app.js i18n.js qr-code.png qr-code.svg netlify.toml __publish/ && \
  cp -r assets/images __publish/assets/ && \
  netlify deploy --prod --dir __publish --site bobo-first-month
  ```
  若想改成「push 自動部署」：到 Netlify 後台 **Site configuration → Build & deploy → Link repository** 連動本 repo（之後 push 即自動發佈，且原始原圖因被 `.gitignore` 排除而不會外洩）。

> ⚠️ 陀螺儀（DeviceMotion）只有在 **HTTPS（或 localhost）** 才能運作，所以請用線上版（或下方本機 HTTPS）測試搖晃功能。

### 重新產生 QR Code（若日後換網址）
```bash
python -c "import segno; segno.make('https://bobo-first-month.netlify.app', error='h').save('qr-code.png', scale=12, border=4, dark='#171231')"
```

### 本機預覽
```bash
python -m http.server 8000   # 然後開 http://localhost:8000
```
桌機沒有陀螺儀，可用滑鼠快速晃動照片區，或直接輕觸照片循環切換三種心情。

---

## 🛠️ 開發小抄

- 網址加 `?debug` 會顯示「安撫值（lvl）／心情」即時讀數，方便調整搖晃手感。
- 搖晃採單一「安撫值」（0–1）模型：晃動先餵給有阻尼的 `drive` 再推升安撫值；停手先 hold 再緩緩衰減。進度條＝安撫值＝心情，三者永遠一致。參數都在 [app.js](app.js) 最上方的 `SHAKE`：`NOISE_FLOOR`（調高＝更不敏感）、`ROT_K`（扭轉手機的權重）、`DAMP`（調低＝阻尼更重）、`RISE`（調低＝要搖更久）、`DRAIN`（衰減速度，調低＝每階段停更久）、`HOLD_MS`（停手後維持多久才衰減）、`CRY_MAX`/`SMILE_MIN`（哭／笑門檻）。全軸度（x/y/z + rotationRate）皆會觸發；切到哭下雨、切到笑冒星星。
- 紀念小卡稀有度設定在 [app.js](app.js) 的 `RARITY`（各自機率 `p`、中英圖、下載圖）與 `RARITY_FX`（特寫粒子密度／視差深度）；翻卡 burst 與卡片光暈的分級色彩在 [styles.css](styles.css) 的 `.draw-area[data-rarity=...]`，特寫光層分級在 `.lightbox[data-rarity=...]`。
- **換圖後一定要在 [app.js](app.js) 把 `ASSET_V` 加 1**：圖片是 1 年 immutable 快取、檔名不變，bump 後會在網址加 `?v=…`,瀏覽器才會抓到新圖(否則舊訪客會看到舊卡)。
- 多語字串集中在 [i18n.js](i18n.js) 的 `DICT`。
- 視覺主題色集中在 [styles.css](styles.css) `:root`（月夜底色 + 金色點綴 + 三種心情色）。
- 尊重系統「減少動態效果」設定（`prefers-reduced-motion`）。

重新最佳化圖片：
```bash
ffmpeg -y -i in.png -vf "scale='min(1206,iw)':-2:flags=lanczos" -c:v libwebp -quality 84 assets/images/baby-card.webp
```
紀念小卡去白底（純白底原圖 → 透明 PNG，保留邊框寶石與數字；四種稀有度同一流程）：四角洪水填充移除「近白且低彩度」的相連像素，再做 1px 內縮去白邊，最後 `ffmpeg -i out.png -c:v libwebp -quality 86 out.webp` 產生 WebP（含 alpha）。

## 結構
```
.
├─ index.html · styles.css · app.js · i18n.js
├─ assets/images/        # 最佳化 webp + png 備援（含去背紀念小卡）
├─ qr-code.png / .svg    # 指向線上版的 QR Code
└─ netlify.toml          # （備用）Netlify 靜態部署設定
```
