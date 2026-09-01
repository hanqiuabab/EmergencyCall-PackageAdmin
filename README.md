# Emergency Call Package Console

“紧急呼叫 / Emergency Call”的开发者号码资源包编辑与发布控制台。

网站：<https://hanqiuabab.github.io/EmergencyCall-PackageAdmin/>

## 能做什么

- 可视化编辑中英文号码信息、分类、拨号号码与省市生效范围。
- 本地草稿、JSON 导入导出、官方来源与业务规则校验。
- 提交 `contacts.json` 并触发 GitHub Actions，生成、签名和发布 CloudKit 全量资源包。
- 深色模式、响应式布局和中英文即时切换。

## 安全模型

这是静态 GitHub Pages 网站，不含后台服务器。CloudKit Server-to-Server 密钥与号码包签名私钥仅存放在受保护的 GitHub Environment secrets 中，不进入网页或仓库。网页使用的 GitHub 精细访问令牌只保存在当前标签页会话中。

首次配置与日常发布说明见 [Docs/PACKAGE_ADMIN_SITE.md](Docs/PACKAGE_ADMIN_SITE.md)。
