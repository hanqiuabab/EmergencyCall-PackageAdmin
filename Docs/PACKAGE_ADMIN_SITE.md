# GitHub 资源包控制台

## 网站职责

部署地址：<https://hanqiuabab.github.io/EmergencyCall-PackageAdmin/>

公开维护仓库：<https://github.com/hanqiuabab/EmergencyCall-PackageAdmin>。该仓库只包含号码包控制台、公开行政区划、号码维护源和发布工具，不包含 iOS App 私有源码。

网站是一个无后端的 GitHub Pages 静态应用，用于：

- 用表单编辑中英文名称、展示号码、分类、适用省市和官方来源。
- 新建号码时自动生成永久 ID 和业务键；创建地区替代号码时自动保留同一业务键。
- 自动规范化拨号号码，通过拖拽或上下移动按钮生成排序值；技术字段只读展示。
- 选择分类时可填充中英文名称与说明模板，已有人工文案不会被覆盖。
- 只有编辑人员点击“今天已核验”后才记录核验日期，保存本身不会冒充人工核验。
- 自动保存本机草稿、导入或导出 `contacts.json`、查看最终 JSON。
- 提交前校验自动 ID、业务键、拨号格式、行政代码、HTTPS 官方来源和明确核验日期。
- 将公开维护仓库中的 `NumberPackages/Source/contacts.json` 提交到 GitHub，并触发签名发布工作流。

网站不会持有 CloudKit 或 Ed25519 私钥。输入的 GitHub 精细访问令牌只保存在当前标签页的 `sessionStorage`，关闭标签页后失效；请不要在公共电脑使用发布功能。

## 第一次启用 GitHub Pages

公开仓库 `EmergencyCall-PackageAdmin` 的 `Settings → Pages → Build and deployment` Source 选择 **GitHub Actions**。推送 `main` 后，`Deploy Package Console` 工作流会自动测试、构建并部署网站。

## 创建网页提交令牌

在 GitHub 的 `Settings → Developer settings → Personal access tokens → Fine-grained tokens` 创建仅限 `hanqiuabab/EmergencyCall-PackageAdmin` 的令牌：

- Repository access：Only select repositories → `EmergencyCall-PackageAdmin`。
- Repository permissions → Contents：Read and write。
- Repository permissions → Actions：Read and write。
- 设置较短有效期；不需要 Administration、Secrets 或其他仓库权限。

令牌只在点击“提交发布”时输入。发布成功或关闭标签页后可在 GitHub 撤销。

## 初始化号码包签名密钥

GitHub Actions 的签名私钥必须与 App 内的 `EmergencyCall/Resources/Packages/number-package-public-key.b64` 配对。本工程已把私钥保存在 macOS 钥匙串中；先用以下安全命令输出公钥，并确认它和 App 公钥文件完全一致：

```sh
swift run --package-path Tools/NumberPackageTool NumberPackageTool public-key
cat EmergencyCall/Resources/Packages/number-package-public-key.b64
```

使用已登录的 GitHub CLI 时，可以不把私钥打印到终端，直接从钥匙串写入两个 GitHub Environment：

```sh
security find-generic-password -s com.hanqiu.EmergencyCall.NumberPackageSigningKey -a hanqiu -w | gh secret set NUMBER_PACKAGE_SIGNING_PRIVATE_KEY_B64 --env development
security find-generic-password -s com.hanqiu.EmergencyCall.NumberPackageSigningKey -a hanqiu -w | gh secret set NUMBER_PACKAGE_SIGNING_PRIVATE_KEY_B64 --env production
```

如果改用 PEM 格式，也可设置 `NUMBER_PACKAGE_SIGNING_PRIVATE_KEY_PEM`。不要把私钥放入本仓库、聊天记录、普通云盘或命令日志。已经发布正式包后不得随意更换这把密钥，否则旧版本 App 无法验证新包。

## 初始化 CloudKit Server-to-Server 密钥

在安全目录生成 P-256 密钥对，并将 PKCS#8 私钥转为适合 CI secret 的单行 Base64：

```sh
openssl ecparam -name prime256v1 -genkey -noout -out cloudkit-server-key.pem
openssl ec -in cloudkit-server-key.pem -pubout -out cloudkit-server-key-public.pem
openssl pkcs8 -topk8 -nocrypt -in cloudkit-server-key.pem -outform DER | base64 | tr -d '\n' > cloudkit-server-key-pkcs8.b64
```

在 CloudKit Console 的容器 `iCloud.com.hanqiu.EmergencyCall` 中创建 Server-to-Server Key，上传 `cloudkit-server-key-public.pem`，记录 Apple 返回的 Key ID。随后在 `development` 与 `production` 两个 GitHub Environment 中分别添加：

```text
CLOUDKIT_SERVER_KEY_ID
CLOUDKIT_SERVER_PRIVATE_KEY_B64
```

其中私钥 secret 的值是 `cloudkit-server-key-pkcs8.b64` 的单行内容，避免 CI 环境传递多行 PEM 时发生格式变化。发布器会优先使用 Base64，也兼容旧的 `CLOUDKIT_SERVER_PRIVATE_KEY_PEM`。CloudKit 公共数据库 schema 必须先部署到对应环境。

建议为 GitHub 的 `production` Environment 配置 Required reviewers，确保正式发布必须再人工确认一次。

## 日常发布流程

1. 打开控制台，点击“新增号码”，选择所属服务和分类并填写内容；永久 ID、业务键和拨号号码由系统管理。
2. 地区号码需要覆盖同一服务时，选中已有号码并点击“创建地区替代号码”，再选择省市范围。
3. 打开官方 HTTPS 来源逐项核验，确认内容正确后点击“今天已核验”。
4. 用拖拽或上下移动按钮调整显示顺序，查看底部校验结果，必要时导出本地备份。
5. 点击“提交发布”，首次先选择 Development；输入精细访问令牌并确认。
6. 网页将源文件提交到 `main` 并触发 `Publish Number Package`。工作流会查询目标环境最高版本并自动使用下一版本，同时生成 UTC 发布时间、哈希、签名和 CloudKit 记录名。
7. 在 GitHub Actions 查看结果；用测试版 App 验证后，再将相同内容发布到 Production。两个环境各自独立计算下一版本。

删除号码是在下一版全量快照中删除该项。回滚不是覆盖旧 CloudKit 记录，而是用更高版本号重新发布确认过的旧内容。

## 安全检查

- 不把任何 PEM、令牌或 Base64 私钥写进 `contacts.json`、Issue、提交信息或构建日志。
- 版本号不由编辑人员输入。工作流按目标环境最高版本自动加一，并用环境级并发锁避免同环境的两个发布任务争用同一版本。
- 发布工作流会比较签名私钥派生出的公钥和 App 内置公钥；不匹配会立即失败。
- CloudKit 上传失败时不会生成可被 App 采用的新记录，现有有效资源包继续工作。
