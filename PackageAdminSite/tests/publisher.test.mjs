import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, verify } from "node:crypto";
import { test } from "node:test";
import { cloudKitSigningMessage, nextPackageVersion, packageDigest, packagePrivateKey, rawEd25519PublicKey, signPackage, validatePackageShape } from "../../Scripts/publish-cloudkit.mjs";

test("increments the latest CloudKit package version automatically", () => {
  assert.equal(nextPackageVersion(0), 1);
  assert.equal(nextPackageVersion("42"), 43);
  assert.throws(() => nextPackageVersion(-1), /non-negative/);
  assert.throws(() => nextPackageVersion(1.5), /safe integer/);
});

test("accepts the Swift tool contentVersion package schema", () => {
  const document = {
    schemaVersion: 1,
    contentVersion: 7,
    regionCatalogVersion: 1,
    publishedAt: "2026-09-01T00:00:00Z",
    regions: [],
    contacts: []
  };
  assert.doesNotThrow(() => validatePackageShape(document));
  assert.throws(() => validatePackageShape({ ...document, contentVersion: undefined }), /contentVersion/);
  assert.throws(() => validatePackageShape({ ...document, version: 7, contentVersion: undefined }), /contentVersion/);
});

test("constructs the exact CloudKit server signing message", () => {
  const body = '{"records":[]}';
  const expectedHash = createHash("sha256").update(body).digest("base64");
  assert.equal(
    cloudKitSigningMessage("2026-09-01T00:00:00Z", body, "/database/1/container/development/public/records/query"),
    `2026-09-01T00:00:00Z:${expectedHash}:/database/1/container/development/public/records/query`
  );
});

test("signs package bytes with Ed25519 and exposes the app-compatible raw public key", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const privatePEM = privateKey.export({ format: "pem", type: "pkcs8" });
  const data = Buffer.from('{"version":1}\n');
  const signature = Buffer.from(signPackage(data, privatePEM), "base64");
  assert.equal(verify(null, data, publicKey, signature), true);
  const publicDER = publicKey.export({ format: "der", type: "spki" });
  assert.deepEqual(rawEd25519PublicKey(privatePEM), Buffer.from(publicDER).subarray(-32));
  assert.equal(packageDigest(data), createHash("sha256").update(data).digest("hex"));
});

test("loads the raw 32-byte Keychain signing secret used by CI", () => {
  const { privateKey } = generateKeyPairSync("ed25519");
  const privateDER = privateKey.export({ format: "der", type: "pkcs8" });
  const rawSecret = Buffer.from(privateDER).subarray(-32).toString("base64");
  assert.deepEqual(rawEd25519PublicKey(packagePrivateKey({ NUMBER_PACKAGE_SIGNING_PRIVATE_KEY_B64: rawSecret })), rawEd25519PublicKey(privateKey));
});
