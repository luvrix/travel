# 贡献指南

感谢你对探Way 的兴趣！这份指南说明如何在本地跑起来、提交代码。

## 本地开发

需要 Node 22+（建议用 [nvm](https://github.com/nvm-sh/nvm) 切换，仓库根有 `.nvmrc`）。

```bash
git clone <repo-url>
cd travel-master
nvm use           # 自动切到 .nvmrc 指定的版本
npm install
npm run dev       # http://localhost:5173/travel/
```

## 常用脚本

| 命令 | 用途 |
|---|---|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 类型检查 + 生产构建 |
| `npm test` | 跑单元测试（vitest） |
| `npm run test:watch` | 测试 watch 模式 |
| `npm run lint` | eslint 检查 |
| `npm run geo:fetch` | 重新抓取 OSM 数据（耗时，按需） |
| `npm run geo:build` | 把抓取结果构建成 `public/data/geo.json` |

## 环境变量

复制 `.env.example` 为 `.env` 并填入高德 key：

```bash
cp .env.example .env
```

不配置也能用，仅本地 POI 数据库（约 8 万条）能命中。配置后未命中的地点会按需调高德查询补全坐标。

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 风格：

```
<type>(<scope>): <subject>

- type: feat / fix / docs / style / refactor / test / chore / perf
- scope: 可选，如 projection / geo / templates / compiler
- subject: 祈使句，中文/英文均可
```

示例：
- `feat(templates): 新增 trendy 模板的高亮配色`
- `fix(projection): 修复 6 景点方位角被打乱的 bug`
- `docs: 补全 README 数据来源说明`

## PR 流程

1. fork 仓库并在你的 fork 上开分支
2. 改动前先跑 `npm test && npm run lint`，确保基线干净
3. 提交时按上面的 Conventional Commits 格式
4. PR 描述里说明：
   - 解决什么问题（链接 issue 如果有）
   - 主要改动点
   - 是否需要更新文档 / 测试
5. 等待 CI（lint + test + build）通过
6. 维护者 review 后合入

## 测试覆盖期望

新增逻辑请附带测试，尤其是：
- `src/projection/` 下的布局算法 —— 几何关系必须有不变量测试
- `src/geo/compiler.ts` —— Trip → RouteMap 推导的边界 case
- `src/lib/markdown.ts` —— 解析器对异常输入的兜底

测试文件放在源文件旁边，命名 `*.test.ts(x)`。

## 不接受的贡献

- 引入付费/闭源依赖
- 把保向压缩布局换成「按真实距离等比例画」—— 这与项目核心目标冲突
- 增加需要后端服务的功能（项目定位为纯前端 SPA）

## 行为准则

参与本项目即视为同意遵守 [Code of Conduct](./CODE_OF_CONDUCT.md)。请在-issue/PR/commit 中保持友善、尊重。
