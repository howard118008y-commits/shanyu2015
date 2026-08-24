# 山遇莊園民宿官網 — 上線說明

這個資料夾就是完整網站，純靜態、無後端：

- `index.html` — 網站本體（HTML + CSS + 少量 JS 都在這一個檔案）
- `assets/` — 六張壓縮過的照片（hero、四間房型、朝食）

## 如何上線（擇一，皆免費）

1. **Netlify Drop**（最簡單）：打開 https://app.netlify.com/drop ，把整個 `site` 資料夾拖進去，立刻得到網址；可再免費綁自己的網域。
2. **GitHub Pages**：把 `site` 內容推上 GitHub repo，Settings → Pages 開啟即可。
3. **Cloudflare Pages / Vercel**：拖放或連 repo 皆可。

## 上線前待辦

- [ ] 「住客的話」三則目前是**範例文字**（頁面上標示「範例評價・待替換」），請換成真實住客回饋。
- [ ] 確認 LINE ID `hans588121`、電話 `0939-588121`、`(03) 8650-566` 無誤。
- [ ] 如要自訂網域，於主機商設定即可（無其他相依）。

## 修改內容

直接編輯 `index.html`：房價在「房」區塊各 `price-row` 內；須知在 `info-list`；文字皆為明碼中文，搜尋即可找到。

## 備註

- 照片原始檔在 `../design_handoff_shanyu_website/photos/`（20 張）；如要換照片，壓成寬 1600–1920px 的 JPG/WebP 放進 `assets/` 並改 `index.html` 的 `src`。
- Google 地圖與 Google Fonts（Noto Serif TC / Noto Sans TC）由頁面直接載入，上線後自動生效，無需申請金鑰。
