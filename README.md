# angular-admin

> Angular 18 + NG-ZORRO 19 企业级后台管理系统 Demo

一个基于 **Angular 18 standalone 模式** 与 **NG-ZORRO 19** 组件库构建的企业级后台管理系统示例项目，内置登录鉴权、数据大盘、通用表单、数据列表、文件中心、系统设置、操作日志等典型业务模块，支持亮色 / 暗色主题切换、页面水印、响应式布局，并可直接部署至 Cloudflare Pages。

---

## 功能特性

- **登录与鉴权**：基于 Token 的模拟登录，路由守卫（`authGuard` / `loginGuard`），HTTP 鉴权拦截器，按角色（管理员 / 员工）过滤菜单与权限。
- **主框架布局**：侧边栏菜单（支持折叠 / 移动端抽屉）、顶部导航、面包屑、全局菜单搜索、用户下拉菜单。
- **数据大盘**：统计卡片 + ECharts 图表（折线图 / 柱状图 / 饼图 / 雷达图）。
- **通用表单**：基础表单（含草稿自动保存）、分步表单、动态表单。
- **数据列表**：服务端分页、多条件筛选、批量操作、状态切换、增删改查。
- **文件中心**：文件上传与解析（Excel / Word / 图片）。
- **系统设置**：
  - 个人信息修改（头像上传预览、姓名 / 邮箱 / 手机号表单校验）
  - 密码修改（旧 / 新 / 确认密码、密码强度提示、一致性校验、修改成功提示重新登录）
  - 系统主题配置（亮 / 暗主题切换、主题色色板、水印开关、菜单默认折叠）
- **操作日志**：分页查询、操作类型 / 模块 / 日期范围筛选、行点击查看详情弹窗、导出 Excel、清空日志（管理员权限）、日志类型标签颜色区分。
- **主题与水印**：亮色 / 暗色主题持久化、主题色选择、页面水印开关、菜单折叠默认状态。
- **响应式适配**：适配桌面端与移动端。

---

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 框架 | Angular 18（standalone 组件、Signals、ReactiveForms） |
| UI 组件库 | NG-ZORRO 19（Ant Design 风格） |
| 图表 | ECharts 5 + ngx-echarts 18 |
| Excel 处理 | xlsx + file-saver |
| 文件解析 | mammoth（Word）、html2canvas |
| 样式 | Less |
| 语言 | TypeScript 5.5 |
| 构建 | Angular CLI 18（`@angular-devkit/build-angular:application`） |

---

## 环境要求

- Node.js >= 18.19（推荐 20 LTS）
- npm >= 9

## 依赖安装

```bash
npm install
```

## 本地启动

```bash
npm start
# 或
ng serve
```

启动后访问 [http://localhost:4200](http://localhost:4200)。

## 打包构建

```bash
npm run build
# 或（使用相对路径 base-href，适配静态托管）
ng build --base-href="./"
```

构建产物输出至 `dist/angular-admin` 目录。

---

## 默认登录账号

| 角色 | 用户名 | 密码 | 说明 |
| --- | --- | --- | --- |
| 管理员 | `admin` | `123456` | 拥有全部菜单权限，含「操作日志」与「清空日志」 |
| 员工 | `employee` | `123456` | 仅拥有基础业务菜单权限 |

---

## Cloudflare Pages 部署步骤

1. **构建项目**：确保 `ng build --base-href="./"` 可成功生成 `dist/angular-admin` 产物。
2. **推送代码至 Git 仓库**（GitHub / GitLab，见下文）。
3. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → 进入 **Workers & Pages** → **创建项目** → **Pages** → **连接到 Git**。
4. 选择对应仓库与分支，配置如下：
   - **框架预设**：无（None）
   - **构建命令**：`npm run build`
   - **构建输出目录**：`dist/angular-admin`
   - **环境变量**（可选）：`NODE_VERSION` = `20`
5. 点击 **保存并部署**，等待构建完成，Cloudflare 会自动分配 `*.pages.dev` 域名。
6. 后续每次推送到主分支将自动触发重新部署。

> 也可使用命令行部署：  
> ```bash
> npm run build
> npx wrangler pages deploy dist/angular-admin --project-name=angular-admin
> ```

---

## Git 仓库推送步骤

```bash
# 1. 初始化仓库（若尚未初始化）
git init

# 2. 配置远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/<your-name>/<your-repo>.git

# 3. 添加并提交代码
git add .
git commit -m "feat: init angular-admin (Angular 18 + NG-ZORRO 19)"

# 4. 推送到远程仓库
git branch -M main
git push -u origin main
```

> 若仓库已有内容，可先执行 `git pull origin main --rebase` 后再推送。

---

## 项目目录结构

```
angular-admin/
├── src/
│   ├── app/                      # 根组件（app.ts / app.config.ts）
│   ├── core/                     # 核心层
│   │   ├── guards/               # 路由守卫（auth.guard / login.guard）
│   │   ├── interceptors/         # HTTP 拦截器（auth / error）
│   │   └── services/             # 全局服务
│   │       ├── auth.service.ts   # 鉴权、用户信息、菜单、登录登出
│   │       ├── theme.service.ts  # 主题（亮/暗）信号与切换
│   │       ├── log.service.ts    # 操作日志记录
│   │       └── data.service.ts   # 模拟数据（订单、统计、操作日志）
│   ├── environments/             # 环境配置（environment / environment.prod）
│   ├── layout/
│   │   └── main-layout/          # 主框架布局（侧边栏 / 顶栏 / 面包屑 / 水印）
│   ├── pages/                    # 业务页面
│   │   ├── login/                # 登录页
│   │   ├── dashboard/            # 数据大盘
│   │   ├── form/                 # 通用表单（基础 / 分步 / 动态）
│   │   ├── data-list/            # 数据列表
│   │   ├── file-center/          # 文件中心
│   │   ├── settings/             # 系统设置（个人信息 / 密码 / 主题）
│   │   └── logs/                 # 操作日志（筛选 / 详情 / 导出 / 清空）
│   ├── app.routes.ts             # 路由配置（懒加载 standalone 组件）
│   ├── index.html
│   ├── main.ts
│   ├── styles.less               # 全局样式（含 NG-ZORRO 主题与暗色变量）
│   ├── favicon.ico
│   └── assets/                   # 静态资源目录
├── angular.json
├── package.json
├── tsconfig.json
├── tsconfig.app.json
└── README.md
```

---

## 说明

- 所有组件均采用 **standalone 模式**，样式使用 **Less**，并通过 `inlineStyleLanguage: less` 支持内联 Less。
- 路由使用 `loadComponent` 懒加载各业务页面，默认重定向至 `/dashboard`。
- 用户信息、主题、水印、菜单折叠等偏好持久化于 `localStorage`。
- 本项目为演示用途，数据均为前端模拟（`DataService`），未连接真实后端。
