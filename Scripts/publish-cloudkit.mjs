#!/usr/bin/env node

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign
} from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const container = "iCloud.com.hanqiu.EmergencyCall";
const recordType = "DeveloperNumberPackage";
const apiOrigin = "https://api.apple-cloudkit.com";

export function cloudKitSigningMessage(date, body, path) {
  const bodyHash = createHash("sha256").update(body).digest("base64");
  return `${date}:${bodyHash}:${path}`;
}

export function packageDigest(data) {
  return createHash("sha256").update(data).digest("hex");
}

export function signPackage(data, privateKeyPEM) {
  const privateKey = privateKeyPEM?.type === "private" ? privateKeyPEM : createPrivateKey(privateKeyPEM);
  return sign(null, data, privateKey).toString("base64");
}

export function rawEd25519PublicKey(privateKeyPEM) {
  const privateKey = privateKeyPEM?.type === "private" ? privateKeyPEM : createPrivateKey(privateKeyPEM);
  const der = createPublicKey(privateKey).export({ format: "der", type: "spki" });
  return Buffer.from(der).subarray(-32);
}

export function packagePrivateKey(environment = process.env) {
  if (environment.NUMBER_PACKAGE_SIGNING_PRIVATE_KEY_PEM?.trim()) {
    return createPrivateKey(environment.NUMBER_PACKAGE_SIGNING_PRIVATE_KEY_PEM);
  }
  const rawBase64 = environment.NUMBER_PACKAGE_SIGNING_PRIVATE_KEY_B64?.trim();
  if (!rawBase64) {
    throw new Error("Missing required secret: NUMBER_PACKAGE_SIGNING_PRIVATE_KEY_B64 or NUMBER_PACKAGE_SIGNING_PRIVATE_KEY_PEM");
  }
  const raw = Buffer.from(rawBase64, "base64");
  if (raw.length !== 32) throw new Error("NUMBER_PACKAGE_SIGNING_PRIVATE_KEY_B64 must decode to 32 bytes.");
  const prefix = Buffer.from("302e020100300506032b657004220420", "hex");
  return createPrivateKey({ key: Buffer.concat([prefix, raw]), format: "der", type: "pkcs8" });
}

function parseArguments(argumentsList) {
  const values = {};
  for (let index = 0; index < argumentsList.length; index += 2) {
    const key = argumentsList[index];
    const value = argumentsList[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error(`Invalid argument: ${key || "(missing)"}`);
    values[key.slice(2)] = value;
  }
  if (!values.package || !["development", "production"].includes(values.environment)) {
    throw new Error("Usage: publish-cloudkit.mjs --package <package.json> --environment <development|production>");
  }
  return values;
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`Missing required secret: ${name}`);
  return value;
}

function validatePackageShape(packageDocument) {
  for (const key of ["version", "schemaVersion", "regionCatalogVersion", "publishedAt", "regions", "contacts"]) {
    if (!(key in packageDocument)) throw new Error(`Package is missing ${key}.`);
  }
  if (!Number.isInteger(packageDocument.version) || packageDocument.version < 1) throw new Error("Package version must be a positive integer.");
  if (packageDocument.schemaVersion !== 1) throw new Error(`Unsupported schema version: ${packageDocument.schemaVersion}`);
  if (Number.isNaN(Date.parse(packageDocument.publishedAt))) throw new Error("Package publishedAt must be ISO 8601.");
}

async function cloudKitRequest({ path, body, keyID, serverPrivateKey }) {
  const encodedBody = JSON.stringify(body);
  const date = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const signature = sign(
    "sha256",
    Buffer.from(cloudKitSigningMessage(date, encodedBody, path)),
    createPrivateKey(serverPrivateKey)
  ).toString("base64");
  const response = await fetch(`${apiOrigin}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Apple-CloudKit-Request-KeyID": keyID,
      "X-Apple-CloudKit-Request-ISO8601Date": date,
      "X-Apple-CloudKit-Request-SignatureV1": signature
    },
    body: encodedBody
  });
  const text = await response.text();
  let result = {};
  try { result = text ? JSON.parse(text) : {}; } catch { result = { rawResponse: text }; }
  if (!response.ok || result.serverErrorCode) {
    throw new Error(`CloudKit ${response.status}: ${result.reason || result.serverErrorCode || text || response.statusText}`);
  }
  return result;
}

async function latestPublishedVersion(configuration) {
  const path = `${configuration.databasePath}/records/query`;
  const result = await cloudKitRequest({
    ...configuration,
    path,
    body: {
      query: { recordType, sortBy: [{ fieldName: "version", ascending: false }] },
      desiredKeys: ["version"],
      resultsLimit: 1
    }
  });
  return Number(result.records?.[0]?.fields?.version?.value || 0);
}

async function requestAssetUpload(configuration, recordName) {
  const path = `${configuration.databasePath}/assets/upload`;
  const result = await cloudKitRequest({
    ...configuration,
    path,
    body: { tokens: [{ recordName, recordType, fieldName: "payloadAsset" }] }
  });
  const token = result.tokens?.[0];
  if (!token?.url) throw new Error(`CloudKit did not return an asset upload URL: ${JSON.stringify(result)}`);
  return token;
}

async function uploadAsset(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: data
  });
  const text = await response.text();
  let result;
  try { result = JSON.parse(text); } catch { throw new Error(`Invalid asset upload response: ${text}`); }
  if (!response.ok || result.serverErrorCode) {
    throw new Error(`Asset upload ${response.status}: ${result.reason || result.serverErrorCode || response.statusText}`);
  }
  return result;
}

async function createPackageRecord(configuration, packageDocument, hash, packageSignature, assetValue) {
  const recordName = `developer-number-package-v${packageDocument.version}`;
  const path = `${configuration.databasePath}/records/modify`;
  const result = await cloudKitRequest({
    ...configuration,
    path,
    body: {
      operations: [{
        operationType: "create",
        record: {
          recordType,
          recordName,
          fields: {
            version: { value: packageDocument.version },
            schemaVersion: { value: packageDocument.schemaVersion },
            regionCatalogVersion: { value: packageDocument.regionCatalogVersion },
            publishedAt: { value: Date.parse(packageDocument.publishedAt) },
            sha256: { value: hash },
            signature: { value: packageSignature },
            payloadAsset: { value: assetValue }
          }
        }
      }],
      desiredKeys: ["version", "sha256"]
    }
  });
  const record = result.records?.[0];
  if (!record || record.serverErrorCode) {
    throw new Error(`CloudKit record creation failed: ${record?.reason || record?.serverErrorCode || JSON.stringify(result)}`);
  }
  return record;
}

async function main() {
  const argumentsMap = parseArguments(process.argv.slice(2));
  const packagePath = resolve(argumentsMap.package);
  const packageData = await readFile(packagePath);
  const packageDocument = JSON.parse(packageData.toString("utf8"));
  validatePackageShape(packageDocument);

  const signingPrivateKey = packagePrivateKey();
  const serverPrivateKey = requiredEnvironment("CLOUDKIT_SERVER_PRIVATE_KEY_PEM");
  const keyID = requiredEnvironment("CLOUDKIT_SERVER_KEY_ID");
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const applicationPublicKeyPath = resolve(
    process.env.NUMBER_PACKAGE_PUBLIC_KEY_PATH ||
      resolve(scriptDirectory, "../EmergencyCall/Resources/Packages/number-package-public-key.b64")
  );
  const applicationPublicKey = (await readFile(applicationPublicKeyPath, "utf8")).trim();
  const derivedPublicKey = rawEd25519PublicKey(signingPrivateKey).toString("base64");
  if (derivedPublicKey !== applicationPublicKey) {
    throw new Error("The package signing private key does not match the public key embedded in the app.");
  }

  const hash = packageDigest(packageData);
  const packageSignature = signPackage(packageData, signingPrivateKey);
  const configuration = {
    databasePath: `/database/1/${container}/${argumentsMap.environment}/public`,
    keyID,
    serverPrivateKey
  };
  const latestVersion = await latestPublishedVersion(configuration);
  if (packageDocument.version <= latestVersion) {
    throw new Error(`Version ${packageDocument.version} must be greater than published version ${latestVersion}.`);
  }

  const recordName = `developer-number-package-v${packageDocument.version}`;
  const uploadToken = await requestAssetUpload(configuration, recordName);
  const uploadedAsset = await uploadAsset(uploadToken.url, packageData);
  const assetValue = uploadedAsset.singleFile || uploadedAsset;
  await createPackageRecord(configuration, packageDocument, hash, packageSignature, assetValue);

  await writeFile(`${packagePath}.sha256`, `${hash}\n`);
  await writeFile(`${packagePath}.sig`, `${packageSignature}\n`);
  console.log(`Published ${recordName} to CloudKit ${argumentsMap.environment}.`);
  console.log(`SHA-256: ${hash}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
