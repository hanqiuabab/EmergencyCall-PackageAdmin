# AGENTS.md

## 开始工作前

1. 阅读 `Docs/PACKAGE_ADMIN_SITE.md` 和 `Docs/NUMBER_PACKAGE_PUBLISHING.md`。
2. 检查现有改动，不覆盖用户未提交的内容。
3. 修改字段、校验或发布行为时同步更新文档与测试。

## 工程规则

- 不引入第三方前端依赖；保持 GitHub Pages 静态部署。
- 所有用户可见文本同时提供简体中文和英文。
- 支持窄屏、深色模式、键盘操作、VoiceOver 和至少 44pt 点击区域。
- 号码字段、行政区划、版本、哈希和签名逻辑必须有自动化测试。
- 发布流程必须先校验，再生成确定性 JSON，最后签名和上传。

## 安全规则

- 禁止提交 Ed25519 私钥、CloudKit 私钥、GitHub 令牌、证书或用户信息。
- 网站不得读取或持有 CloudKit 密钥；它们只能存在于 GitHub Environment secrets。
- GitHub 令牌只允许保存在当前标签页的 `sessionStorage`。
- Production 使用受保护的 GitHub Environment，版本只能严格递增。
