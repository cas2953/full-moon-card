# 滿月賀卡 · Baby Full-Month Interactive Card

純前端（HTML / CSS / JS，零相依套件、免建置）的互動式嬰兒滿月賀卡，採統一的 **「月夜 Moonlit」** 視覺主題，
針對 **iPhone 17 Pro**（402×874pt、DPR 3、安全區）做 RWD 最佳化，支援 **中／英** 切換。

🌙 **線上版本**：<https://cas2953.github.io/full-moon-card/>
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

- 能量採**時間基準衰減**：搖一搖 → 哭→不哭→笑；停下來 → 笑→不哭→哭，三段都看得到。
- 底部「哭 · 不哭 · 笑」心情軌會即時亮起對應階段，畫面光暈也會隨心情由暖金 ↔ 冷藍變化。
- **搖出笑臉時，會跳出「儲存這張笑臉」下載按鈕**，可把寶寶笑臉存到手機。
- 無陀螺儀 / 拒絕授權 / 桌機：可**輕觸照片**循環切換三種心情（無障礙備援）。

### 2. 紀念小卡（原「抽卡」）
- 底部選單「紀念小卡」→ 點卡背播放翻牌動畫 → 翻出你的紀念小卡（**已去背、漂浮在夜空背景上**，中／英版隨語言切換）。
- **點卡片圖片** → 全螢幕特寫（`card-og`），疊加循環特效：飄升餘燼、魔法光點、星火、燭火／法陣／花朵光暈，並支援手指傾斜視差與整圖呼吸光暈。

### 3. 中英語系切換
右上滑動開關，全站 UI 即時切換並記憶（`localStorage`）；紀念小卡圖也跟著語言換版。

---

## 📁 圖片 Assets（`assets/images/`）

已用 ffmpeg 轉成最佳化 WebP（原 PNG 約 2 MB → 約 115–175 KB），並保留 PNG 備援（找不到 `.webp` 會自動退回 `.png`，再退回佔位圖）。紀念小卡已用 **rembg**（isnet-general-use）去背成透明 PNG/WebP。

| 用途 | 檔名（基底） | 來源原圖 |
|---|---|---|
| 賀卡・不哭（熟睡，初始） | `baby-card` | `baby card.png` |
| 賀卡・笑 | `baby-smile` | `baby card smile.png` |
| 賀卡・哭 | `baby-cry` | `baby card cry.png` |
| 紀念小卡（中／去背） | `card-cn` | `card cn.jpg` |
| 紀念小卡（英／去背） | `card-en` | `card en.jpg` |
| 特寫動畫 | `card-og` | `card og.png` |

換圖：把新圖放進 `assets/images/` 沿用相同基底檔名即可。重新最佳化／去背的指令見下方「開發小抄」。

---

## 🚀 部署 / 更新

本專案已上線於 **GitHub Pages（branch `main` / root，免費 HTTPS）**：<https://cas2953.github.io/full-moon-card/>

要更新內容，只要 push 到 `main`，Pages 會自動重新發佈：
```bash
git add -A && git commit -m "update" && git push
```

> ⚠️ 陀螺儀（DeviceMotion）只有在 **HTTPS（或 localhost）** 才能運作，所以請用線上版（或下方本機 HTTPS）測試搖晃功能。

### 重新產生 QR Code（若日後換網址）
```bash
python -c "import segno; segno.make('你的網址', error='h').save('qr-code.png', scale=12, border=4, dark='#171231')"
```

### 本機預覽
```bash
python -m http.server 8000   # 然後開 http://localhost:8000
```
桌機沒有陀螺儀，可用滑鼠快速晃動照片區，或直接輕觸照片循環切換三種心情。

---

## 🛠️ 開發小抄

- 網址加 `?debug` 會顯示「安撫值（lvl）／心情」即時讀數，方便調整搖晃手感。
- 搖晃採單一「安撫值」（0–1）模型：晃動先餵給一個有阻尼的 `drive`，再緩緩推升安撫值；停手就慢慢回落。進度條＝安撫值＝心情，三者永遠一致。參數都在 [app.js](app.js) 最上方的 `SHAKE`：`NOISE_FLOOR`（調高＝更不敏感、過濾小晃動）、`DAMP`（調低＝阻尼更重、更需要持續搖）、`RISE`（調低＝要搖更久才上升）、`DRAIN`（停手回落速度）、`CRY_MAX`/`SMILE_MIN`（哭／笑的門檻）。切換到哭會下雨、切換到笑會冒星星。
- 多語字串集中在 [i18n.js](i18n.js) 的 `DICT`。
- 視覺主題色集中在 [styles.css](styles.css) `:root`（月夜底色 + 金色點綴 + 三種心情色）。
- 尊重系統「減少動態效果」設定（`prefers-reduced-motion`）。

重新最佳化圖片：
```bash
ffmpeg -y -i in.png -vf "scale='min(1206,iw)':-2:flags=lanczos" -c:v libwebp -quality 84 assets/images/baby-card.webp
```
去背（需 `pip install rembg onnxruntime pillow`）：
```bash
python -c "from rembg import remove,new_session; from PIL import Image; s=new_session('isnet-general-use'); Image.open('in.jpg').convert('RGBA').save('out.png') if False else remove(Image.open('in.jpg').convert('RGBA'),session=s,alpha_matting=True).save('assets/images/card-cn.png')"
```

## 結構
```
.
├─ index.html · styles.css · app.js · i18n.js
├─ assets/images/        # 最佳化 webp + png 備援（含去背紀念小卡）
├─ qr-code.png / .svg    # 指向線上版的 QR Code
└─ netlify.toml          # （備用）Netlify 靜態部署設定
```
