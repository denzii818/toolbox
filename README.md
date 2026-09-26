# Denzii 工具箱 【toolbox】

公开整理 X 账号 [@denziideng](https://x.com/denziideng) 分享过的开源工具、学习资源和书单等。按场景查找，不必翻时间线。

## 怎么新增一条

1. 打开 `data/resources.json`
2. 复制最上面一条
3. 改 `id`（英文、唯一、无空格）和其他字段
4. 用 https://jsonlint.com 检查
5. Commit

`category` 只能用 `data/categories.json` 里已有的 id：

- desktop 办公与效率
- ai-dev AI & Agent
- ai-create AI 创作
- learn 学习与教育
- books 读书与书单
- content 内容与运营
- people 人物与信源
- life 生活与健康

## 星数和浏览量

- `github`：仓库地址。有这个字段时，页面会向 GitHub 公开接口刷新 `stars`。
- `stars`：备用快照。没有 GitHub 就填 `null`。
- `tweet`：原推链接。
- `tweetViews`：原推浏览量。打开原推，看分析/浏览数据后填数字；没有就填 `null`。

浏览量不会自动变，建议你补录或每周更新一次高流量条目。
