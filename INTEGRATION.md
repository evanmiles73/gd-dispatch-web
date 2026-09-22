# GD 車趟管理整合基準（2026-09-23）

## 唯一 Web 主線
- Web / iPhone / Vercel：本 repository `gd-dispatch-web`
- 正式功能來源：`app/page.js`
- Production 只應追蹤 `main`

## Android Companion
- `gd-trip-manager-app` 保留為 Android 抓單助手，不再當成 Web UI 的來源。
- Android 專案負責 LINE 通知抓單與開啟 GD 管理系統；Web 功能不要直接覆蓋 Android Gradle 專案。

## 目前 Web 已整合功能
- GD OPERATIONS 手機版畫面
- 貼上車趟文字自動解析
- 日期、時間、姓名、電話
- 上下車完整地址
- 航班與固定航點 / 航廈
- 人數、行李尺寸與件數、手提行李
- 車型、金額、備註
- 未派 / 已派 / 已接 / 已完成
- 搜尋、地區 / 車型篩選、日期 / 金額排序
- 司機資料與三證 / 黑名單
- 收款、回金帳號、待回金
- 多點距離、跨縣市、安全座椅 / 增高墊加價
- 每月已完成清單與追查

## 整合規則
1. 不刪除兩個既有 repository。
2. Web 新功能先進 integration branch 驗收，再合併 main。
3. 不再建立第三套 GD 車趟 Web repository。
4. Vercel 正式站只綁定 gd-dispatch-web/main。
5. Android App 若需顯示 Web，固定指向正式 Web 網址，不複製 Web UI 程式碼。

## 本次整合分支
`integration/gd-trip-unified-20260923`

這個分支是安全整合層；main 在驗收前保持不動。
