export const categories = ["police", "fire", "medical", "traffic", "utility", "other"];
export const scopeTypes = ["nationwide", "province", "city"];

export const categoryTemplates = {
  police: {
    name: { zhHans: "公安报警", en: "Police" },
    description: {
      zhHans: "用于刑事、治安案件报警及紧急求助。",
      en: "For reporting crimes and requesting urgent police assistance."
    }
  },
  fire: {
    name: { zhHans: "消防救援", en: "Fire and Rescue" },
    description: {
      zhHans: "用于火灾、爆炸及其他需要消防救援的紧急情况。",
      en: "For fires, explosions, and other emergencies requiring fire and rescue services."
    }
  },
  medical: {
    name: { zhHans: "医疗急救", en: "Medical Emergency" },
    description: {
      zhHans: "用于急危重症患者和事故伤员的医疗急救。",
      en: "For urgent medical assistance and accident rescue."
    }
  },
  traffic: {
    name: { zhHans: "交通事故报警", en: "Traffic Accident Police" },
    description: {
      zhHans: "用于报告交通事故并请求交通警察协助。",
      en: "For reporting traffic accidents and requesting traffic police assistance."
    }
  },
  utility: {
    name: { zhHans: "公共事业服务", en: "Public Utility Service" },
    description: {
      zhHans: "用于联系当地公共事业服务机构。",
      en: "For contacting the applicable local public utility service."
    }
  }
};

function randomUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  throw new Error("Secure UUID generation is unavailable in this browser.");
}

export function generateStableIdentifier(prefix, uuidFactory = randomUUID) {
  return `${prefix}-${uuidFactory()}`;
}

export function todayISO(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function normalizeDialNumber(value) {
  const normalized = String(value ?? "").normalize("NFKC").trim();
  const digits = normalized.replace(/\D/g, "");
  return `${normalized.startsWith("+") ? "+" : ""}${digits}`;
}

export function nextSortOrder(contacts) {
  const highest = contacts.reduce((result, contact) => {
    const value = Number(contact.sortOrder);
    return Number.isInteger(value) ? Math.max(result, value) : result;
  }, 0);
  return highest + 10;
}

export function createEmptyContact(options = {}) {
  const generateID = options.generateID || generateStableIdentifier;
  return {
    id: options.id || generateID("contact"),
    serviceKey: options.serviceKey || generateID("service"),
    category: "other",
    name: { zhHans: "", en: "" },
    description: { zhHans: "", en: "" },
    displayNumber: "",
    dialNumber: "",
    coverageScopes: [{ type: "nationwide", regionCode: null }],
    sourceURL: "",
    verifiedAt: "",
    sortOrder: options.sortOrder ?? 10,
    isFeatured: false
  };
}

export function cloneContact(contact) {
  return structuredClone(contact);
}

export function duplicateContact(contact, options = {}) {
  const copy = cloneContact(contact);
  copy.id = (options.generateID || generateStableIdentifier)("contact");
  copy.serviceKey = contact.serviceKey;
  copy.coverageScopes = [{ type: "province", regionCode: null }];
  copy.verifiedAt = "";
  copy.sortOrder = options.sortOrder ?? Number(contact.sortOrder) + 10;
  return copy;
}

function templateValue(path, template) {
  return path.split(".").reduce((value, part) => value?.[part], template);
}

function mayReplaceWithTemplate(path, value) {
  if (!String(value ?? "").trim()) return true;
  return Object.values(categoryTemplates).some((template) => templateValue(path, template) === value);
}

export function applyCategoryTemplate(contact, category) {
  const result = cloneContact(contact);
  result.category = category;
  const template = categoryTemplates[category];
  if (!template) return result;
  for (const path of ["name.zhHans", "name.en", "description.zhHans", "description.en"]) {
    const parts = path.split(".");
    const current = result[parts[0]][parts[1]];
    if (mayReplaceWithTemplate(path, current)) result[parts[0]][parts[1]] = templateValue(path, template);
  }
  return result;
}

export function reorderContacts(contacts, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= contacts.length || toIndex >= contacts.length) {
    return contacts.map(cloneContact);
  }
  const result = contacts.map(cloneContact);
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  result.forEach((contact, index) => { contact.sortOrder = (index + 1) * 10; });
  return result;
}

export function normalizeContacts(value) {
  if (!Array.isArray(value)) throw new Error("contacts.json must contain a JSON array.");
  return value.map((item, index) => {
    const base = createEmptyContact({ sortOrder: (index + 1) * 10 });
    const displayNumber = String(item?.displayNumber ?? item?.dialNumber ?? "");
    return {
      ...base,
      ...item,
      id: String(item?.id || base.id),
      serviceKey: String(item?.serviceKey || base.serviceKey),
      name: { zhHans: "", en: "", ...(item?.name || {}) },
      description: { zhHans: "", en: "", ...(item?.description || {}) },
      displayNumber,
      dialNumber: normalizeDialNumber(displayNumber),
      coverageScopes: Array.isArray(item?.coverageScopes) ? item.coverageScopes : [],
      verifiedAt: String(item?.verifiedAt || ""),
      sortOrder: Number.isInteger(Number(item?.sortOrder)) ? Number(item.sortOrder) : (index + 1) * 10,
      isFeatured: Boolean(item?.isFeatured)
    };
  });
}

export function validateContacts(contacts, regions) {
  const errors = [];
  const addError = (index, field, message, messageZh) => errors.push({ index, field, message, messageZh });
  const ids = new Set();
  const regionMap = new Map(regions.map((region) => [region.code, region]));

  contacts.forEach((contact, index) => {
    const label = contact.id || `#${index + 1}`;
    if (!contact.id.trim()) addError(index, "id", `${label}: id is required.`, `${label}：必须包含自动生成的永久唯一 ID。`);
    if (ids.has(contact.id)) addError(index, "id", `${label}: id must be unique.`, `${label}：永久唯一 ID 不得重复。`);
    ids.add(contact.id);
    if (!contact.serviceKey.trim()) addError(index, "serviceKey", `${label}: serviceKey is required.`, `${label}：必须关联一个所属服务。`);
    if (!categories.includes(contact.category)) addError(index, "category", `${label}: category is unsupported.`, `${label}：分类不受支持。`);
    if (!contact.name.zhHans.trim()) addError(index, "name.zhHans", `${label}: Chinese name is required.`, `${label}：必须填写中文名称。`);
    if (!contact.name.en.trim()) addError(index, "name.en", `${label}: English name is required.`, `${label}：必须填写英文名称。`);
    if (!contact.displayNumber.trim()) addError(index, "displayNumber", `${label}: displayNumber is required.`, `${label}：必须填写展示号码。`);
    const automaticDialNumber = normalizeDialNumber(contact.displayNumber);
    if (!/^\+?\d+$/.test(automaticDialNumber) || automaticDialNumber === "+") {
      addError(index, "dialNumber", `${label}: displayNumber cannot produce a valid dial number.`, `${label}：展示号码无法自动生成有效的拨号号码。`);
    } else if (contact.dialNumber !== automaticDialNumber) {
      addError(index, "dialNumber", `${label}: dialNumber must match the automatically normalized display number.`, `${label}：拨号号码必须与展示号码的自动规范化结果一致。`);
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
      addError(index, "verifiedAt", `${label}: verification must be explicitly confirmed.`, `${label}：请点击“今天已核验”确认核验日期。`);
    }
    if (!Number.isInteger(Number(contact.sortOrder))) {
      addError(index, "sortOrder", `${label}: sortOrder must be an integer.`, `${label}：自动排序值必须是整数。`);
    }
  });

  return errors;
}

export function serializeContacts(contacts) {
  return `${JSON.stringify(contacts.map((contact) => ({
    ...contact,
    dialNumber: normalizeDialNumber(contact.displayNumber),
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
