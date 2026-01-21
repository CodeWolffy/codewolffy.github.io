# Keystatic GitHub Mode 配置指南

为了在 GitHub Pages 上使用 Keystatic 后台 (`/keystatic`) 编辑文章，你需要进行以下配置。

## 1. 创建 GitHub OAuth App

1.  登录 GitHub，进入 [Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)。
2.  点击 **New OAuth App**。
3.  填写以下信息：
    *   **Application name**: `My Blog Admin` (或任意名称)
    *   **Homepage URL**: `https://codewolffy.github.io` (你的博客网址)
    *   **Authorization callback URL**: `https://codewolffy.github.io/keystatic/github/oauth/callback`
        *   **注意**: 必须准确匹配该路径。
    *   **Enable Device Flow**: **不要勾选** (这是给设备用的，不是给网页用的)。
4.  点击 **Register application**。

## 2. 获取 Client ID

1.  注册成功后，你会看到 **Client ID** (例如 `Iv1.xxxxxxxxxxxx`)。
2.  不需要 Client Secret (因为这是静态网站，Secret 无法安全存储，也用不到)。

## 3. 配置项目

你的代码已经更新，现在需要确保在构建时传入 `KEYSTATIC_GITHUB_CLIENT_ID` 环境变量。

### 方法 A: 直接写死在代码中（简单，但不推荐开源）
如果你不介意 Client ID 公开（它本身不是密钥，但也建议保密），可以直接修改 `keystatic.config.ts`：

```typescript
// keystatic.config.ts
clientId: '你的_CLIENT_ID'
```

### 方法 B: 使用环境变量（推荐）
在 GitHub Actions 或部署脚本中设置环境变量 `KEYSTATIC_GITHUB_CLIENT_ID`。

如果你是在本地运行 `npm run build` 然后 push `dist` 文件夹，你可以在根目录创建一个 `.env` 文件（不要提交到 git）：

```env
KEYSTATIC_GITHUB_CLIENT_ID=你的_CLIENT_ID
```

## 4. 验证

1.  部署更新后的网站。
2.  访问 `https://codewolffy.github.io/keystatic`。
3.  点击登录，如果能跳转到 GitHub 授权页面并成功返回，则配置成功。
