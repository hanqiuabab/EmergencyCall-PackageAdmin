import {
  applyCategoryTemplate, categories, createEmptyContact, duplicateContact, encodeBase64UTF8,
  generateStableIdentifier, nextSortOrder, normalizeContacts, normalizeDialNumber,
  reorderContacts, scopeTypes, serializeContacts, todayISO, validateContacts
} from "./core.mjs";

const repository = { owner: "hanqiuabab", name: "EmergencyCall-PackageAdmin", branch: "main" };
const sourcePath = "NumberPackages/Source/contacts.json";
const workflowFile = "publish-number-package.yml";
const draftKey = "emergency-call-package-draft-v1";
const tokenKey = "emergency-call-github-token";

const translations = {
  zh: {
    "brand.title": "资源包控制台", "status.local": "本地草稿", "status.clean": "已载入仓库版本",
    "contacts.eyebrow": "开发者号码", "contacts.unit": "条号码", "editor.eyebrow": "号码详情",
    "editor.emptyTitle": "选择或新增一个号码", "action.import": "导入", "action.export": "导出",
    "action.publish": "提交发布", "empty.title": "建立第一条开发者号码",
    "empty.body": "技术字段会自动生成，你只需维护服务内容、号码、地区和官方来源。", "empty.action": "新增号码",
    "field.identity": "所属服务与分类", "field.content": "双语内容", "field.number": "拨号信息",
    "field.coverage": "生效范围", "field.verification": "来源与核验", "field.service": "所属服务",
    "field.category": "分类", "field.zhName": "中文名称", "field.enName": "英文名称",
    "field.zhDescription": "中文说明", "field.enDescription": "英文说明", "field.displayNumber": "展示号码",
    "field.dialAutomatic": "自动拨号号码", "field.sourceURL": "官方来源 URL", "field.featured": "首页推荐",
    "field.verified": "最近核验", "field.notVerified": "尚未核验", "field.technical": "自动生成的技术信息",
    "field.id": "永久唯一 ID", "field.serviceKey": "业务键 serviceKey", "field.sortOrder": "自动排序值",
    "field.automaticHelp": "由展示号码自动去除空格、括号和短横线生成。",
    "service.new": "创建新的独立服务", "service.help": "地区替代号码请选择同一个所属服务，系统会自动保持相同业务键。",
    "service.unnamed": "未命名服务", "scope.nationwide": "全国", "scope.province": "省级", "scope.city": "市级",
    "scope.add": "添加范围", "category.police": "公安报警", "category.fire": "消防救援",
    "category.medical": "医疗急救", "category.traffic": "交通事故", "category.utility": "公共事业", "category.other": "其他",
    "action.createOverride": "创建地区替代号码", "action.delete": "删除", "action.preview": "查看 JSON",
    "action.close": "关闭", "action.addNumber": "新增号码", "action.removeScope": "移除范围",
    "action.verifyToday": "今天已核验", "action.moveUp": "上移", "action.moveDown": "下移",
    "aria.home": "资源包控制台首页", "aria.list": "号码列表", "aria.drag": "拖动调整排序",
    "validation.ready": "校验通过，可以提交发布", "validation.errors": "需要修正的问题",
    "validation.empty": "空号码包也可以通过校验，但正式发布前应确认这是你的意图。",
    "publish.title": "提交并发布资源包", "publish.description": "网页先提交 contacts.json，再由受保护工作流自动生成版本和发布元数据。",
    "publish.token": "GitHub 精细访问令牌", "publish.tokenHelp": "令牌仅保存在当前标签页会话中，需要 Contents 和 Actions 读写权限。",
    "publish.automatic": "自动生成：目标环境最高版本 +1、UTC 发布时间、SHA-256、Ed25519 签名和 CloudKit 记录名。",
    "publish.environment": "CloudKit 环境", "publish.development": "Development（先测试）", "publish.production": "Production（正式）",
    "publish.commit": "提交说明", "publish.confirm": "我确认官方来源、号码和地区范围已逐项核验",
    "publish.submit": "提交并触发发布", "publish.running": "已提交，工作流正在自动生成新版本并发布",
    "publish.failed": "提交发布失败", "import.success": "已导入号码包草稿", "export.success": "已导出 contacts.json",
    "draft.saved": "草稿已自动保存", "contact.new": "新号码", "contact.unnamed": "未命名号码",
    "search.placeholder": "搜索名称、号码或所属服务", "dialog.productionWarning": "Production 会影响正式 App。发布后只能用更高版本回滚。"
  },
  en: {
    "brand.title": "Package Console", "status.local": "Local draft", "status.clean": "Repository version loaded",
    "contacts.eyebrow": "Developer numbers", "contacts.unit": "numbers", "editor.eyebrow": "Number details",
    "editor.emptyTitle": "Select or add a number", "action.import": "Import", "action.export": "Export",
    "action.publish": "Publish", "empty.title": "Create the first developer number",
    "empty.body": "Technical fields are automatic. Maintain only service content, number, coverage, and official source.", "empty.action": "Add number",
    "field.identity": "Service & category", "field.content": "Bilingual content", "field.number": "Dialing",
    "field.coverage": "Coverage", "field.verification": "Source & verification", "field.service": "Service",
    "field.category": "Category", "field.zhName": "Chinese name", "field.enName": "English name",
    "field.zhDescription": "Chinese description", "field.enDescription": "English description", "field.displayNumber": "Display number",
    "field.dialAutomatic": "Automatic dial number", "field.sourceURL": "Official source URL", "field.featured": "Featured on Home",
    "field.verified": "Last verified", "field.notVerified": "Not verified", "field.technical": "Automatically generated technical information",
    "field.id": "Permanent unique ID", "field.serviceKey": "Stable serviceKey", "field.sortOrder": "Automatic sort order",
    "field.automaticHelp": "Generated from the display number by removing spaces, parentheses, and hyphens.",
    "service.new": "Create a new independent service", "service.help": "Choose the same service for a regional replacement; the stable key is preserved automatically.",
    "service.unnamed": "Unnamed service", "scope.nationwide": "Nationwide", "scope.province": "Province", "scope.city": "City",
    "scope.add": "Add scope", "category.police": "Police", "category.fire": "Fire and rescue",
    "category.medical": "Medical", "category.traffic": "Traffic accident", "category.utility": "Public utility", "category.other": "Other",
    "action.createOverride": "Create regional replacement", "action.delete": "Delete", "action.preview": "View JSON",
    "action.close": "Close", "action.addNumber": "Add number", "action.removeScope": "Remove scope",
    "action.verifyToday": "Verified today", "action.moveUp": "Move up", "action.moveDown": "Move down",
    "aria.home": "Package console home", "aria.list": "Number list", "aria.drag": "Drag to reorder",
    "validation.ready": "Validation passed and ready to publish", "validation.errors": "Issues to fix",
    "validation.empty": "An empty package is valid, but confirm that it is intentional before publishing.",
    "publish.title": "Commit and publish package", "publish.description": "The site commits contacts.json; the protected workflow generates the version and publishing metadata.",
    "publish.token": "GitHub fine-grained token", "publish.tokenHelp": "The token stays in this tab session only and needs Contents and Actions read/write access.",
    "publish.automatic": "Automatic: target environment latest version +1, UTC timestamp, SHA-256, Ed25519 signature, and CloudKit record name.",
    "publish.environment": "CloudKit environment", "publish.development": "Development (test first)", "publish.production": "Production (live)",
    "publish.commit": "Commit message", "publish.confirm": "I confirm every official source, number and coverage scope has been verified",
    "publish.submit": "Commit and start publishing", "publish.running": "Committed. The workflow is generating and publishing the next version.",
    "publish.failed": "Publishing request failed", "import.success": "Package draft imported", "export.success": "contacts.json exported",
    "draft.saved": "Draft saved automatically", "contact.new": "New number", "contact.unnamed": "Unnamed number",
    "search.placeholder": "Search name, number, or service", "dialog.productionWarning": "Production affects the live app. Rollback requires a new higher version."
  }
};

let language = localStorage.getItem("package-admin-language") || "zh";
let regions = [];
let contacts = [];
let selectedIndex = -1;
let draggingIndex = null;
let baseFileSHA = null;
let dirty = false;

const element = (selector) => document.querySelector(selector);
const t = (key) => translations[language][key] || key;

function applyLanguage() {
  document.documentElement.lang = language === "zh" ? "zh-Hans" : "en";
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
  element("#languageButton").textContent = language === "zh" ? "EN" : "中文";
  element("#searchInput").placeholder = t("search.placeholder");
  element(".brand").setAttribute("aria-label", t("aria.home"));
  element(".sidebar").setAttribute("aria-label", t("aria.list"));
  element("#addContactButton").setAttribute("aria-label", t("action.addNumber"));
  element("#publishCloseButton").setAttribute("aria-label", t("action.close"));
  element("#jsonCloseButton").setAttribute("aria-label", t("action.close"));
  render();
}

async function fetchJSON(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function loadInitialData() {
  regions = await fetchJSON("./data/regions.json");
  try {
    const metadata = await githubRequest(`/repos/${repository.owner}/${repository.name}/contents/${sourcePath}?ref=${repository.branch}`);
    baseFileSHA = metadata.sha;
  } catch {
    baseFileSHA = null;
  }
  const serverContacts = normalizeContacts(await fetchJSON("./data/contacts.json"));
  const saved = localStorage.getItem(draftKey);
  contacts = saved ? normalizeContacts(JSON.parse(saved)) : serverContacts;
  dirty = Boolean(saved);
  selectedIndex = contacts.length ? 0 : -1;
  render();
}

function saveDraft(showMessage = false) {
  localStorage.setItem(draftKey, serializeContacts(contacts));
  dirty = true;
  updateStatus();
  if (showMessage) toast(t("draft.saved"));
}

function clearDraft() {
  localStorage.removeItem(draftKey);
  dirty = false;
  updateStatus();
}

function updateStatus() {
  element("#statusText").textContent = dirty ? t("status.local") : t("status.clean");
}

function resequenceContacts() {
  contacts.forEach((contact, index) => { contact.sortOrder = (index + 1) * 10; });
}

function addContact() {
  contacts.push(createEmptyContact({ sortOrder: nextSortOrder(contacts) }));
  selectedIndex = contacts.length - 1;
  saveDraft();
  render();
  requestAnimationFrame(() => element("#field-zh-name")?.focus());
}

function createRegionalReplacement() {
  if (selectedIndex < 0) return;
  const copy = duplicateContact(contacts[selectedIndex]);
  contacts.splice(selectedIndex + 1, 0, copy);
  selectedIndex += 1;
  resequenceContacts();
  saveDraft();
  render();
}

function deleteSelected() {
  if (selectedIndex < 0) return;
  const name = contacts[selectedIndex].name.zhHans || contacts[selectedIndex].id || t("contact.unnamed");
  if (!window.confirm(language === "zh" ? `确认删除“${name}”？` : `Delete “${name}”?`)) return;
  contacts.splice(selectedIndex, 1);
  selectedIndex = Math.min(selectedIndex, contacts.length - 1);
  resequenceContacts();
  saveDraft();
  render();
}

function moveContact(fromIndex, toIndex) {
  if (fromIndex === toIndex) return;
  const selectedID = contacts[selectedIndex]?.id;
  contacts = reorderContacts(contacts, fromIndex, toIndex);
  selectedIndex = contacts.findIndex((contact) => contact.id === selectedID);
  saveDraft();
  render();
}

function render() {
  updateStatus();
  element("#contactCount").textContent = String(contacts.length);
  renderContactList();
  renderEditor();
  renderValidation();
}

function renderContactList() {
  const query = element("#searchInput").value.trim().toLocaleLowerCase();
  const list = element("#contactList");
  list.replaceChildren();
  contacts.forEach((contact, index) => {
    const haystack = [contact.id, contact.serviceKey, contact.name.zhHans, contact.name.en, contact.displayNumber].join(" ").toLocaleLowerCase();
    if (query && !haystack.includes(query)) return;
    const row = document.createElement("div");
    row.className = `contact-list-row${index === selectedIndex ? " is-selected" : ""}`;
    row.draggable = true;
    row.setAttribute("aria-label", t("aria.drag"));
    row.addEventListener("dragstart", (event) => {
      draggingIndex = index;
      row.classList.add("is-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
      }
    });
    row.addEventListener("dragend", () => { draggingIndex = null; row.classList.remove("is-dragging"); });
    row.addEventListener("dragover", (event) => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = "move"; });
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      const source = draggingIndex ?? Number(event.dataTransfer?.getData("text/plain"));
      if (Number.isInteger(source)) moveContact(source, index);
    });

    const button = document.createElement("button");
    button.type = "button";
    button.className = "contact-item";
    button.addEventListener("click", () => { selectedIndex = index; render(); });
    const title = document.createElement("strong");
    title.textContent = contact.name.zhHans || contact.name.en || contact.id || t("contact.unnamed");
    const meta = document.createElement("span");
    meta.textContent = `${contact.displayNumber || "—"} · ${t(`category.${contact.category}`)}`;
    const badge = document.createElement("small");
    badge.textContent = t(`scope.${contact.coverageScopes?.[0]?.type || "nationwide"}`);
    button.append(title, meta, badge);

    const controls = document.createElement("div");
    controls.className = "reorder-controls";
    controls.append(
      reorderButton("↑", t("action.moveUp"), index === 0, () => moveContact(index, index - 1)),
      reorderButton("↓", t("action.moveDown"), index === contacts.length - 1, () => moveContact(index, index + 1))
    );
    row.append(button, controls);
    list.append(row);
  });
}

function reorderButton(symbol, label, disabled, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "reorder-button";
  button.textContent = symbol;
  button.title = label;
  button.setAttribute("aria-label", label);
  button.disabled = disabled;
  button.addEventListener("click", action);
  return button;
}

function field(label, id, value, options = {}) {
  const wrapper = document.createElement("label");
  wrapper.className = options.wide ? "form-field is-wide" : "form-field";
  const title = document.createElement("span"); title.textContent = label;
  const input = options.multiline ? document.createElement("textarea") : document.createElement("input");
  input.id = id; input.value = value ?? "";
  if (options.type) input.type = options.type;
  if (options.placeholder) input.placeholder = options.placeholder;
  if (options.multiline) input.rows = 3;
  if (options.readOnly) input.readOnly = true;
  if (options.onInput) input.addEventListener("input", options.onInput);
  wrapper.append(title, input);
  if (options.help) { const help = document.createElement("small"); help.textContent = options.help; wrapper.append(help); }
  return wrapper;
}

function section(title, children) {
  const card = document.createElement("section"); card.className = "form-card";
  const heading = document.createElement("h3"); heading.textContent = title;
  const grid = document.createElement("div"); grid.className = "form-grid"; grid.append(...children);
  card.append(heading, grid);
  return card;
}

function bind(path, transform = (value) => value) {
  return (event) => {
    const parts = path.split(".");
    let target = contacts[selectedIndex];
    for (const part of parts.slice(0, -1)) target = target[part];
    target[parts.at(-1)] = transform(event.target.type === "checkbox" ? event.target.checked : event.target.value);
    saveDraft();
    renderContactList();
    renderValidation();
    element("#editorTitle").textContent = contacts[selectedIndex].name.zhHans || contacts[selectedIndex].name.en || t("contact.new");
  };
}

function renderEditor() {
  const body = element("#editorBody"); body.replaceChildren();
  if (selectedIndex < 0 || !contacts[selectedIndex]) {
    body.className = "empty-state";
    const symbol = document.createElement("div"); symbol.className = "empty-symbol"; symbol.textContent = "+";
    const title = document.createElement("h3"); title.textContent = t("empty.title");
    const paragraph = document.createElement("p"); paragraph.textContent = t("empty.body");
    const button = document.createElement("button"); button.type = "button"; button.className = "button button-primary"; button.textContent = t("empty.action"); button.addEventListener("click", addContact);
    body.append(symbol, title, paragraph, button);
    element("#editorTitle").textContent = t("editor.emptyTitle");
    return;
  }

  body.className = "editor-body";
  const contact = contacts[selectedIndex];
  element("#editorTitle").textContent = contact.name.zhHans || contact.name.en || t("contact.new");

  body.append(
    section(t("field.identity"), [renderServiceSelect(contact), renderCategorySelect(contact)]),
    section(t("field.content"), [
      field(t("field.zhName"), "field-zh-name", contact.name.zhHans, { onInput: bind("name.zhHans") }),
      field(t("field.enName"), "field-en-name", contact.name.en, { onInput: bind("name.en") }),
      field(t("field.zhDescription"), "field-zh-description", contact.description.zhHans, { onInput: bind("description.zhHans"), multiline: true }),
      field(t("field.enDescription"), "field-en-description", contact.description.en, { onInput: bind("description.en"), multiline: true })
    ]),
    section(t("field.number"), [
      field(t("field.displayNumber"), "field-display-number", contact.displayNumber, { onInput: updateDisplayNumber, placeholder: "+86 10 1234 5678" }),
      field(t("field.dialAutomatic"), "field-dial-auto", contact.dialNumber, { readOnly: true, help: t("field.automaticHelp") })
    ]),
    renderCoverage(contact), renderVerification(contact), renderTechnicalDetails(contact), renderEditorActions()
  );
}

function renderServiceSelect(contact) {
  const wrapper = document.createElement("label"); wrapper.className = "form-field";
  const title = document.createElement("span"); title.textContent = t("field.service");
  const select = document.createElement("select");
  const services = new Map();
  contacts.forEach((candidate) => { if (!services.has(candidate.serviceKey)) services.set(candidate.serviceKey, candidate); });
  for (const [key, representative] of services) {
    const label = representative.name[language === "zh" ? "zhHans" : "en"] || representative.name.zhHans || representative.name.en || t("service.unnamed");
    select.add(new Option(label, key, false, key === contact.serviceKey));
  }
  select.add(new Option(`＋ ${t("service.new")}`, "__new_service__"));
  select.addEventListener("change", (event) => {
    contact.serviceKey = event.target.value === "__new_service__" ? generateStableIdentifier("service") : event.target.value;
    saveDraft(); render();
  });
  const help = document.createElement("small"); help.textContent = t("service.help");
  wrapper.append(title, select, help);
  return wrapper;
}

function renderCategorySelect(contact) {
  const wrapper = document.createElement("label"); wrapper.className = "form-field";
  const title = document.createElement("span"); title.textContent = t("field.category");
  const select = document.createElement("select");
  for (const category of categories) select.add(new Option(t(`category.${category}`), category, false, category === contact.category));
  select.addEventListener("change", (event) => {
    contacts[selectedIndex] = applyCategoryTemplate(contact, event.target.value);
    saveDraft(); render();
  });
  wrapper.append(title, select);
  return wrapper;
}

function updateDisplayNumber(event) {
  const contact = contacts[selectedIndex];
  contact.displayNumber = event.target.value;
  contact.dialNumber = normalizeDialNumber(event.target.value);
  const automatic = element("#field-dial-auto");
  if (automatic) automatic.value = contact.dialNumber;
  saveDraft(); renderContactList(); renderValidation();
}

function renderCoverage(contact) {
  const card = document.createElement("section"); card.className = "form-card";
  const headingRow = document.createElement("div"); headingRow.className = "card-heading";
  const heading = document.createElement("h3"); heading.textContent = t("field.coverage");
  const add = document.createElement("button"); add.type = "button"; add.className = "button button-secondary button-small"; add.textContent = t("scope.add");
  add.addEventListener("click", () => { contact.coverageScopes.push({ type: "province", regionCode: null }); saveDraft(); render(); });
  headingRow.append(heading, add);
  const rows = document.createElement("div"); rows.className = "scope-list";
  contact.coverageScopes.forEach((scope, scopeIndex) => {
    const row = document.createElement("div"); row.className = "scope-row";
    const typeSelect = document.createElement("select"); typeSelect.setAttribute("aria-label", t("field.coverage"));
    for (const type of scopeTypes) typeSelect.add(new Option(t(`scope.${type}`), type, false, scope.type === type));
    typeSelect.addEventListener("change", (event) => { scope.type = event.target.value; scope.regionCode = null; saveDraft(); render(); });
    row.append(typeSelect);
    if (scope.type !== "nationwide") row.append(regionSelect(scope));
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "icon-button icon-button-muted"; remove.textContent = "−";
    remove.setAttribute("aria-label", t("action.removeScope"));
    remove.addEventListener("click", () => { contact.coverageScopes.splice(scopeIndex, 1); saveDraft(); render(); });
    row.append(remove); rows.append(row);
  });
  card.append(headingRow, rows);
  return card;
}

function regionSelect(scope) {
  const select = document.createElement("select");
  select.setAttribute("aria-label", scope.type === "province" ? t("scope.province") : t("scope.city"));
  select.add(new Option(language === "zh" ? "请选择地区" : "Choose a region", "", false, !scope.regionCode));
  for (const region of regions.filter((candidate) => candidate.level === scope.type)) {
    const parent = regions.find((candidate) => candidate.code === region.parentCode);
    const name = language === "zh" ? region.name.zhHans : (region.name.en || region.name.zhHans);
    const parentName = parent ? (language === "zh" ? parent.name.zhHans : (parent.name.en || parent.name.zhHans)) : "";
    const label = scope.type === "city" && parentName ? `${name} · ${parentName}` : name;
    select.add(new Option(label, region.code, false, region.code === scope.regionCode));
  }
  select.addEventListener("change", (event) => { scope.regionCode = event.target.value || null; saveDraft(); renderValidation(); });
  return select;
}

function renderVerification(contact) {
  const featured = document.createElement("label"); featured.className = "check-field";
  const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = contact.isFeatured; checkbox.addEventListener("change", bind("isFeatured"));
  const featuredLabel = document.createElement("span"); featuredLabel.textContent = t("field.featured"); featured.append(checkbox, featuredLabel);

  const verification = document.createElement("div"); verification.className = "verification-field";
  const label = document.createElement("span"); label.textContent = t("field.verified");
  const row = document.createElement("div"); row.className = "verification-row";
  const value = document.createElement("strong"); value.textContent = contact.verifiedAt || t("field.notVerified");
  const verify = document.createElement("button"); verify.type = "button"; verify.className = "button button-secondary button-small"; verify.textContent = t("action.verifyToday");
  verify.addEventListener("click", () => { contact.verifiedAt = todayISO(); saveDraft(); render(); });
  row.append(value, verify); verification.append(label, row);

  return section(t("field.verification"), [
    field(t("field.sourceURL"), "field-source", contact.sourceURL, { onInput: bind("sourceURL"), type: "url", wide: true, placeholder: "https://official.gov.cn/page" }),
    verification, featured
  ]);
}

function renderTechnicalDetails(contact) {
  const details = document.createElement("details"); details.className = "technical-details";
  const summary = document.createElement("summary"); summary.textContent = t("field.technical");
  const list = document.createElement("dl");
  for (const [label, value] of [
    [t("field.id"), contact.id], [t("field.serviceKey"), contact.serviceKey],
    [t("field.dialAutomatic"), contact.dialNumber || "—"], [t("field.sortOrder"), String(contact.sortOrder)]
  ]) {
    const term = document.createElement("dt"); term.textContent = label;
    const definition = document.createElement("dd"); const code = document.createElement("code"); code.textContent = value; definition.append(code);
    list.append(term, definition);
  }
  details.append(summary, list);
  return details;
}

function renderEditorActions() {
  const actions = document.createElement("div"); actions.className = "editor-actions";
  const duplicate = document.createElement("button"); duplicate.type = "button"; duplicate.className = "button button-secondary"; duplicate.textContent = t("action.createOverride"); duplicate.addEventListener("click", createRegionalReplacement);
  const preview = document.createElement("button"); preview.type = "button"; preview.className = "button button-secondary"; preview.textContent = t("action.preview"); preview.addEventListener("click", showJSONPreview);
  const remove = document.createElement("button"); remove.type = "button"; remove.className = "button button-danger"; remove.textContent = t("action.delete"); remove.addEventListener("click", deleteSelected);
  actions.append(duplicate, preview, remove);
  return actions;
}

function renderValidation() {
  const panel = element("#validationPanel");
  const errors = validateContacts(contacts, regions);
  panel.replaceChildren(); panel.className = `validation-panel ${errors.length ? "has-errors" : "is-ready"}`;
  const title = document.createElement("strong"); title.textContent = errors.length ? `${t("validation.errors")} · ${errors.length}` : t("validation.ready"); panel.append(title);
  if (!contacts.length && !errors.length) {
    const note = document.createElement("p"); note.textContent = t("validation.empty"); panel.append(note);
  } else if (errors.length) {
    const list = document.createElement("ul");
    for (const error of errors.slice(0, 6)) { const item = document.createElement("li"); item.textContent = language === "zh" ? error.messageZh : error.message; list.append(item); }
    if (errors.length > 6) { const item = document.createElement("li"); item.textContent = `+${errors.length - 6}`; list.append(item); }
    panel.append(list);
  }
  element("#publishButton").disabled = errors.length > 0;
}

function showJSONPreview() {
  element("#jsonPreview").textContent = serializeContacts(contacts);
  element("#jsonDialog").showModal();
}

async function importContacts(file) {
  contacts = normalizeContacts(JSON.parse(await file.text()));
  resequenceContacts();
  selectedIndex = contacts.length ? 0 : -1;
  saveDraft(); render(); toast(t("import.success"));
}

function exportContacts() {
  const blob = new Blob([serializeContacts(contacts)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = "contacts.json"; anchor.click(); URL.revokeObjectURL(url);
  toast(t("export.success"));
}

function openPublishDialog() {
  if (validateContacts(contacts, regions).length) return renderValidation();
  const values = {
    publishDialogTitle: "publish.title", publishDialogDescription: "publish.description", tokenLabel: "publish.token",
    tokenHelp: "publish.tokenHelp", versionAutomaticText: "publish.automatic", environmentLabel: "publish.environment",
    commitLabel: "publish.commit", confirmLabel: "publish.confirm", publishSubmitButton: "publish.submit", publishCancelButton: "action.close"
  };
  for (const [id, key] of Object.entries(values)) element(`#${id}`).textContent = t(key);
  element("#environmentInput").options[0].textContent = t("publish.development");
  element("#environmentInput").options[1].textContent = t("publish.production");
  element("#githubTokenInput").value = sessionStorage.getItem(tokenKey) || "";
  element("#commitInput").value = language === "zh" ? "更新开发者号码资源" : "Update developer number package";
  element("#confirmInput").checked = false;
  element("#publishResult").replaceChildren();
  element("#publishDialog").showModal();
}

async function submitPublish(event) {
  event.preventDefault();
  const button = element("#publishSubmitButton");
  const token = element("#githubTokenInput").value.trim();
  const environment = element("#environmentInput").value;
  const message = element("#commitInput").value.trim();
  if (!token || !message || !element("#confirmInput").checked) return;
  if (environment === "production" && !window.confirm(t("dialog.productionWarning"))) return;

  button.disabled = true; sessionStorage.setItem(tokenKey, token);
  try {
    const current = await githubRequest(`/repos/${repository.owner}/${repository.name}/contents/${sourcePath}?ref=${repository.branch}`, {}, token);
    if (baseFileSHA && current.sha !== baseFileSHA) throw new Error(language === "zh" ? "仓库文件已更新，请刷新页面后重试。" : "The repository file changed. Reload before publishing.");
    const update = await githubRequest(`/repos/${repository.owner}/${repository.name}/contents/${sourcePath}`, {
      method: "PUT", body: JSON.stringify({ message, content: encodeBase64UTF8(serializeContacts(contacts)), sha: current.sha, branch: repository.branch })
    }, token);
    const sourceCommit = update.commit.sha; baseFileSHA = update.content.sha;
    await githubRequest(`/repos/${repository.owner}/${repository.name}/actions/workflows/${workflowFile}/dispatches`, {
      method: "POST", body: JSON.stringify({ ref: repository.branch, inputs: { environment, source_commit: sourceCommit } })
    }, token, true);
    clearDraft();
    const messageNode = document.createElement("p"); messageNode.className = "success-message"; messageNode.textContent = t("publish.running");
    const link = document.createElement("a"); link.href = `https://github.com/${repository.owner}/${repository.name}/actions/workflows/${workflowFile}`; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = language === "zh" ? "查看发布进度" : "View publishing progress";
    element("#publishResult").replaceChildren(messageNode, link);
  } catch (error) {
    const messageNode = document.createElement("p"); messageNode.className = "error-message"; messageNode.textContent = `${t("publish.failed")}：${error.message}`;
    element("#publishResult").replaceChildren(messageNode);
  } finally { button.disabled = false; }
}

async function githubRequest(path, options = {}, token = "", allowEmpty = false) {
  const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`https://api.github.com${path}`, { ...options, headers });
  if (!response.ok) {
    let reason = `${response.status} ${response.statusText}`;
    try { reason = (await response.json()).message || reason; } catch { /* no response body */ }
    throw new Error(reason);
  }
  if (allowEmpty || response.status === 204) return null;
  return response.json();
}

function toast(message) {
  const node = document.createElement("div"); node.className = "toast"; node.textContent = message; element("#toastRegion").append(node);
  window.setTimeout(() => node.remove(), 2600);
}

element("#languageButton").addEventListener("click", () => { language = language === "zh" ? "en" : "zh"; localStorage.setItem("package-admin-language", language); applyLanguage(); });
element("#addContactButton").addEventListener("click", addContact);
element("#searchInput").addEventListener("input", renderContactList);
element("#importButton").addEventListener("click", () => element("#fileInput").click());
element("#fileInput").addEventListener("change", (event) => { const [file] = event.target.files; if (file) importContacts(file).catch((error) => toast(error.message)); event.target.value = ""; });
element("#exportButton").addEventListener("click", exportContacts);
element("#publishButton").addEventListener("click", openPublishDialog);
element("#publishForm").addEventListener("submit", submitPublish);
element("#publishCancelButton").addEventListener("click", () => element("#publishDialog").close());
element("#publishCloseButton").addEventListener("click", () => element("#publishDialog").close());
element("#jsonCloseButton").addEventListener("click", () => element("#jsonDialog").close());

applyLanguage();
loadInitialData().catch((error) => { element("#editorBody").className = "error-state"; element("#editorBody").textContent = error.message; });
