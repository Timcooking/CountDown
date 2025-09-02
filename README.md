# 温和风格任务倒计时（纯前端）

一个简洁、可直接托管在 Cloudflare Pages 的纯前端倒计时任务应用：
- 顶部主倒计时显示最近任务（或点击任意任务切换）。
- 下方按时间轴展示所有任务，显示标题与倒计时。
- 支持添加、编辑、删除任务。
- 数据保存在浏览器 localStorage，刷新不丢失。
- 设计为白底、温和配色；重要内容使用衬线字体。

## 使用

本项目是纯静态页面，无需构建，直接打开 `index.html` 即可。

- 本地预览：双击 `index.html`，或用任意静态服务器打开。
- 字体采用 Google Fonts，离线环境可自行替换或下载到本地。

## 部署到 Cloudflare Pages

1. 新建 Pages 项目，选择 “直接上传” 或连接 Git 仓库。
2. 如果直接上传，将本目录全部文件上传；如果连 Git，请将本目录提交到仓库根。
3. Build settings：
   - Framework preset: None
   - Build command: 空（无需）
   - Build output directory: 根目录（/）
4. 部署完成后即可访问。

## 数据说明

- localStorage key：
  - `countdown.tasks.v1` 保存任务数组。
  - `countdown.focusTaskId` 保存手动选择的主任务 id。
- 任务结构：`{ id: string, title: string, due: number }`，`due` 为毫秒时间戳。

## 功能小贴士

- 点击任意任务行或“设为主”按钮可切换顶部主倒计时。
- “返回最近”按钮可退出手动聚焦，自动选择最近任务。
- 编辑时为行内编辑，保存后将按截止时间重新排序。

## 许可

本示例仅用于学习与演示，可自由修改与使用。