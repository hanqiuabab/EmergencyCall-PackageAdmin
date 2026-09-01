export const categories = ["police", "fire", "medical", "traffic", "utility", "other"];
export const scopeTypes = ["nationwide", "province", "city"];

export function createEmptyContact() {
  return {
    id: "",
    serviceKey: "",
    category: "other",
    name: { zhHans: "", en: "" },
    description: { zhHans: "", en: "" },
    displayNumber: "",
    dialNumber: "",
    coverageScopes: [{ type: "nationwide", regionCode: null }],
    sourceURL: "",
    verifiedAt: new Date().toISOString().slice(0, 10),
    sortOrder: 100,
    isFeatured: false
  };
}

export function cloneContact(contact) {
  return structuredClone(contact);
}

export function normalizeContacts(value) {
  if (!Array.isArray(value)) throw new Error("contacts.json must contain a JSON array.");
  return value.map((item) => ({
    ...createEmptyContact(),
    ...item,
    name: { zhHans: "", en: "", ...(item?.name || {}) },
    description: { zhHans: "", en: "", ...(item?.description || {}) },
    coverageScopes: Array.isArray(item?.coverageScopes) ? item.coverageScopes : []
  }));
}

export function validateContacts(contacts, regions) {
  const errors = [];
  const addError = (index, field, message, messageZh) => errors.push({ index, field, message, messageZh });
  const ids = new Set();
  const regionMap = new Map(regions.map((region) => [region.code, region]));

  contacts.forEach((contact, index) => {
    const label = contact.id || `#${index + 1}`;
    if (!contact.id.trim()) addError(index, "id", `${label}: id is required.`, `${label}：必须填写永久唯一 ID。`);
    if (ids.has(contact.id)) addError(index, "id", `${label}: id must be unique.`, `${label}：永久唯一 ID 不得重复。`);
    ids.add(contact.id);
    if (!contact.serviceKey.trim()) addError(index, "serviceKey", `${label}: serviceKey is required.`, `${label}：必须填写业务键 serviceKey。`);
    if (!categories.includes(contact.category)) addError(index, "category", `${label}: category is unsupported.`, `${label}：分类不受支持。`);
    if (!contact.name.zhHans.trim()) addError(index, "name.zhHans", `${label}: Chinese name is required.`, `${label}：必须填写中文名称。`);
    if (!contact.name.en.trim()) addError(index, "name.en", `${label}: English name is required.`, `${label}：必须填写英文名称。`);
    if (!contact.displayNumber.trim()) addError(index, "displayNumber", `${label}: displayNumber is required.`, `${label}：必须填写展示号码。`);
    if (!/^\+?\d+$/.test(contact.dialNumber) || contact.dialNumber === "+") {
      addError(index, "dialNumber", `${label}: dialNumber may only contain digits and one leading +.`, `${label}：拨号号码只允许数字，或一个开头的加号。`);
    }
    if (!Array.isArray(contact.coverageScopes) || contact.coverageScopes.length === 0) {
      addError(index, "coverageScopes", `${label}: at least one coverage scope is required.`, `${label}：至少需要一个生效范围。`);
    }

    const scopeKeys = new Set();
    for (const scope of contact.coverageScopes || []) {
      const scopeKey = `${scope.type}:${scope.regionCode || ""}`;
      if (scopeKeys.has(scopeKey)) addError(index, "coverageScopes", `${label}: duplicate coverage scope.`, `${label}：生效范围不得重复。`);
      scopeKeys.add(scopeKey);
      if (!scopeTypes.includes(scope.type)) {
        addError(index, "coverageScopes", `${label}: unsupported coverage type.`, `${label}：生效范围类型不受支持。`);
      } else if (scope.type === "nationwide" && scope.regionCode !== null) {
        addError(index, "coverageScopes", `${label}: nationwide coverage must use a null regionCode.`, `${label}：全国范围的 regionCode 必须为 null。`);
      } else if (scope.type !== "nationwide") {
        const region = regionMap.get(scope.regionCode);
        if (!region || region.level !== scope.type) {
          addError(index, "coverageScopes", `${label}: ${scope.regionCode || "missing code"} is not a valid ${scope.type}.`, `${label}：${scope.regionCode || "缺少代码"} 不是有效的${scope.type === "province" ? "省级" : "市级"}行政代码。`);
        }
      }
    }

    try {
      const source = new URL(contact.sourceURL);
      if (source.protocol !== "https:" || source.hostname.endsWith(".example") || source.hostname === "example.com") throw new Error();
    } catch {
      addError(index, "sourceURL", `${label}: sourceURL must be a non-placeholder HTTPS URL.`, `${label}：官方来源必须是非占位的 HTTPS URL。`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(contact.verifiedAt) || Number.isNaN(Date.parse(`${contact.verifiedAt}T00:00:00Z`))) {
      addError(index, "verifiedAt", `${label}: verifiedAt must use YYYY-MM-DD.`, `${label}：核验日期必须使用 YYYY-MM-DD 格式。`);
    }
    if (!Number.isInteger(Number(contact.sortOrder))) {
      addError(index, "sortOrder", `${label}: sortOrder must be an integer.`, `${label}：排序值必须是整数。`);
    }
  });

  return errors;
}

export function serializeContacts(contacts) {
  return `${JSON.stringify(contacts.map((contact) => ({
    ...contact,
    sortOrder: Number(contact.sortOrder),
    isFeatured: Boolean(contact.isFeatured)
  })), null, 2)}\n`;
}

export function encodeBase64UTF8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}
