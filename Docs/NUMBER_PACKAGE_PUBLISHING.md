# 号码包制作与发布

## 实际更新的文件

日常维护时主要编辑 `NumberPackages/Source/contacts.json`。行政区划发生变化时才编辑 `NumberPackages/Source/regions.json`。这两个文件是维护源，不直接交给 App。

真正上传到 CloudKit 的资源是 `NumberPackageTool build` 生成的单一 UTF-8 JSON 文件，例如：

```text
NumberPackages/Dist/developer-numbers-v000001.json
```

它不是 ZIP。该 JSON 是完整快照，包含 `schemaVersion`、递增的 `contentVersion`、发布时间、全部地区目录和全部开发者号码。删除号码时，在下一个更高版本的 `contacts.json` 中省略该号码并重新生成全量包。

发布时，工具会计算 SHA-256，并使用 Ed25519 私钥签名。JSON 作为 `payloadAsset`（`CKAsset`）上传；版本、schema、哈希、签名和发布时间作为同一条 `DeveloperNumberPackage` CloudKit 记录的字段上传。本地 CLI 使用 macOS 钥匙串中的密钥；网站发布则使用 GitHub Environment 中的同一把密钥。

## 联系人源格式

`contacts.json` 是 JSON 数组。每项字段如下：

| 字段 | 含义 |
| --- | --- |
| `id` | 永久稳定且唯一的号码记录 ID；网页新增或复制时自动生成，不需要人工输入 |
| `serviceKey` | 同一业务的稳定键；网页根据“所属服务”自动生成或复用，地区更具体的号码用它覆盖全国默认值 |
| `category` | `police`、`fire`、`medical`、`traffic`、`utility`、`other` |
| `name.zhHans` / `name.en` | 中英文名称 |
| `description.zhHans` / `description.en` | 中英文说明 |
| `displayNumber` | 面向用户显示的格式 |
| `dialNumber` | 网页根据 `displayNumber` 自动去除空格、括号和短横线；结果只允许数字，或开头一个 `+` 后跟数字 |
| `coverageScopes` | `nationwide`、`province` 或 `city`；网页显示地区名称并自动写入行政代码 |
| `sourceURL` | 核验来源，必须是 HTTPS |
| `verifiedAt` | 最近人工核验日期；只有点击“今天已核验”才更新 |
| `sortOrder` | 网页根据列表顺序自动生成 |
| `isFeatured` | 是否在首页推荐 |

全国范围写法：

```json
{"type":"nationwide","regionCode":null}
```

省级和市级范围写法：

```json
{"type":"province","regionCode":"320000"}
{"type":"city","regionCode":"320100"}
```

## 构建

先校验维护源：

```sh
swift run --package-path Tools/NumberPackageTool NumberPackageTool validate \
  --regions NumberPackages/Source/regions.json \
  --contacts NumberPackages/Source/contacts.json
```

再使用明确的版本和 UTC 发布时间生成确定性文件。同样的源、版本和发布时间会得到完全相同的字节：

```sh
swift run --package-path Tools/NumberPackageTool NumberPackageTool build \
  --regions NumberPackages/Source/regions.json \
  --contacts NumberPackages/Source/contacts.json \
  --version 1 \
  --published-at 2026-09-01T08:00:00Z \
  --output-dir NumberPackages/Dist
```

版本必须严格大于已发布版本。不要修改已经发布过的同版本文件。

## 发布

推荐从 GitHub Pages 资源包控制台发布，操作方式与密钥初始化见 `Docs/PACKAGE_ADMIN_SITE.md`。控制台提交 `contacts.json` 后，GitHub Actions 会查询目标环境最高版本并自动加一，然后校验源文件、生成确定性全量包、签名并上传 Asset。编辑人员无需填写版本、发布时间、SHA-256、签名或 CloudKit 记录名。

以下命令保留用于本机发布。

私钥保存在钥匙串服务 `com.hanqiu.EmergencyCall.NumberPackageSigningKey`，不在仓库中。CloudKit 用户令牌或管理令牌同样不得写入仓库。

先发布到 development 并用测试构建验证：

```sh
swift run --package-path Tools/NumberPackageTool NumberPackageTool publish \
  --package NumberPackages/Dist/developer-numbers-v000001.json \
  --environment development
```

确认后再发布到 production：

```sh
swift run --package-path Tools/NumberPackageTool NumberPackageTool publish \
  --package NumberPackages/Dist/developer-numbers-v000001.json \
  --environment production
```

工具会先查询目标环境版本；查询失败会中止发布，发现相同或更高版本也会中止。App 下载后会验证 schema、业务字段、SHA-256 和 Ed25519 签名，只写入暂存区，并在下次冷启动时切换。

## 回滚

CloudKit 包只前进不覆盖。需要回滚时，取旧版本内容，修改为一个更高的 `contentVersion` 和新的 `publishedAt`，重新构建、签名并发布。
