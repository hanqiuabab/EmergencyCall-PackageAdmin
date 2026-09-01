import CryptoKit
import Foundation

enum CloudKitPublisher {
    static let teamID = "98455AN6FY"
    static let containerID = "iCloud.com.hanqiu.EmergencyCall"

    static func publish(packageURL: URL, environment: String) throws {
        guard ["development", "production"].contains(environment) else {
            throw ToolError.invalidArguments("Environment must be development or production.")
        }
        let data = try Data(contentsOf: packageURL)
        let package = try JSONDecoder().decode(DeveloperNumberPackage.self, from: data)
        try PackageBuilder.validate(regions: package.regions, contacts: package.contacts)
        try rejectNonIncreasingVersion(package.contentVersion, environment: environment)

        let key = try KeychainSigningKey.load()
        let signature = try key.signature(for: data).base64EncodedString()
        let hash = PackageBuilder.sha256Hex(data)
        let directory = packageURL.deletingLastPathComponent()
        let baseName = packageURL.deletingPathExtension().lastPathComponent
        let hashURL = directory.appendingPathComponent(baseName + ".sha256")
        let signatureURL = directory.appendingPathComponent(baseName + ".sig")
        let fieldsURL = directory.appendingPathComponent(baseName + ".cloudkit-fields.json")
        try Data(hash.utf8).write(to: hashURL, options: .atomic)
        try Data(signature.utf8).write(to: signatureURL, options: .atomic)

        let fields: [String: [String: Any]] = [
            "version": ["type": "int64Type", "value": package.contentVersion],
            "schemaVersion": ["type": "int64Type", "value": package.schemaVersion],
            "regionCatalogVersion": ["type": "int64Type", "value": package.regionCatalogVersion],
            "publishedAt": ["type": "timestampType", "value": package.publishedAt],
            "sha256": ["type": "stringType", "value": hash],
            "signature": ["type": "stringType", "value": signature],
            "payloadAsset": ["type": "assetType", "value": "PAYLOAD"]
        ]
        let fieldsData = try JSONSerialization.data(withJSONObject: fields, options: [.prettyPrinted, .sortedKeys])
        try fieldsData.write(to: fieldsURL, options: .atomic)

        try runCKTool([
            "create-record",
            "--team-id", teamID,
            "--container-id", containerID,
            "--environment", environment,
            "--database-type", "public",
            "--record-type", "DeveloperNumberPackage",
            "--fields-file", fieldsURL.path,
            "--asset-files", "PAYLOAD=\(packageURL.path)"
        ])
        print("Published number package v\(package.contentVersion) to \(environment).")
    }

    private static func rejectNonIncreasingVersion(_ version: Int, environment: String) throws {
        let output = try runCKTool([
            "query-records",
            "--team-id", teamID,
            "--container-id", containerID,
            "--environment", environment,
            "--database-type", "public",
            "--record-type", "DeveloperNumberPackage",
            "--requested-fields", "version",
            "--limit", "200"
        ])
        guard let data = output.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
        let records = (json["records"] as? [[String: Any]]) ?? []
        let latest = records.compactMap { record -> Int? in
            let fields = record["fields"] as? [String: Any]
            let versionField = fields?["version"] as? [String: Any]
            return (versionField?["value"] as? NSNumber)?.intValue
                ?? versionField?["value"] as? Int
        }.max()
        if let latest, version <= latest {
            throw ToolError.validation("Version \(version) must be greater than CloudKit version \(latest).")
        }
    }

    @discardableResult
    private static func runCKTool(
        _ arguments: [String]
    ) throws -> String {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/xcrun")
        process.arguments = ["cktool"] + arguments
        let output = Pipe()
        let errors = Pipe()
        process.standardOutput = output
        process.standardError = errors
        try process.run()
        process.waitUntilExit()
        let stdout = String(decoding: output.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self)
        let stderr = String(decoding: errors.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self)
        if process.terminationStatus != 0 {
            throw ToolError.commandFailed(stderr.isEmpty ? stdout : stderr)
        }
        return stdout
    }
}
