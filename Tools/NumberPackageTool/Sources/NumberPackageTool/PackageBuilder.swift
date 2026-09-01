import CryptoKit
import Foundation

enum ToolError: LocalizedError {
    case invalidArguments(String)
    case validation(String)
    case missingKey
    case commandFailed(String)

    var errorDescription: String? {
        switch self {
        case .invalidArguments(let value): value
        case .validation(let value): value
        case .missingKey: "The signing key is missing from the macOS Keychain."
        case .commandFailed(let value): value
        }
    }
}

enum PackageBuilder {
    static func build(
        regionsURL: URL,
        contactsURL: URL,
        version: Int,
        regionCatalogVersion: Int = 1,
        publishedAt: String
    ) throws -> Data {
        guard version > 0 else { throw ToolError.validation("Version must be greater than zero.") }
        guard ISO8601DateFormatter().date(from: publishedAt) != nil else {
            throw ToolError.validation("Published time must be ISO-8601, for example 2026-09-01T08:00:00Z.")
        }
        let decoder = JSONDecoder()
        let regions = try decoder.decode([AdministrativeRegion].self, from: Data(contentsOf: regionsURL))
        let contacts = try decoder.decode([DeveloperContact].self, from: Data(contentsOf: contactsURL))
        try validate(regions: regions, contacts: contacts)
        let package = DeveloperNumberPackage(
            schemaVersion: 1,
            contentVersion: version,
            regionCatalogVersion: regionCatalogVersion,
            publishedAt: publishedAt,
            regions: regions,
            contacts: contacts.sorted {
                if $0.sortOrder == $1.sortOrder { return $0.id < $1.id }
                return $0.sortOrder < $1.sortOrder
            }
        )
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return try encoder.encode(package)
    }

    static func validate(regions: [AdministrativeRegion], contacts: [DeveloperContact]) throws {
        let regionCodes = Set(regions.map(\.code))
        let regionsByCode = Dictionary(uniqueKeysWithValues: regions.map { ($0.code, $0) })
        guard regionCodes.count == regions.count, regionCodes.contains("CN") else {
            throw ToolError.validation("Region codes must be unique and include CN.")
        }
        for region in regions {
            guard !region.code.isEmpty, !region.name.zhHans.isEmpty else {
                throw ToolError.validation("Region \(region.code) has an empty required field.")
            }
            if let parent = region.parentCode, !regionCodes.contains(parent) {
                throw ToolError.validation("Region \(region.code) references missing parent \(parent).")
            }
        }
        guard Set(contacts.map(\.id)).count == contacts.count else {
            throw ToolError.validation("Contact ids must be unique.")
        }
        for contact in contacts {
            guard !contact.id.isEmpty,
                  !contact.serviceKey.isEmpty,
                  !contact.name.zhHans.isEmpty,
                  !contact.name.en.isEmpty,
                  !contact.coverageScopes.isEmpty,
                  contact.sourceURL.scheme?.lowercased() == "https",
                  normalize(contact.dialNumber) == contact.dialNumber else {
                throw ToolError.validation("Contact \(contact.id) has invalid required fields.")
            }
            for scope in contact.coverageScopes {
                switch scope.type {
                case .nationwide:
                    guard scope.regionCode == nil else {
                        throw ToolError.validation("Nationwide contact \(contact.id) must not have a region code.")
                    }
                case .province, .city:
                    guard let code = scope.regionCode,
                          let region = regionsByCode[code],
                          (scope.type == .province && region.level == .province) ||
                          (scope.type == .city && region.level == .city) else {
                        throw ToolError.validation("Contact \(contact.id) references an unknown region.")
                    }
                }
            }
        }
    }

    static func sha256Hex(_ data: Data) -> String {
        SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }

    private static func normalize(_ value: String) -> String? {
        let allowed = CharacterSet(charactersIn: "+0123456789")
        guard !value.isEmpty, value.unicodeScalars.allSatisfy(allowed.contains) else { return nil }
        let plusCount = value.filter { $0 == "+" }.count
        guard plusCount <= 1, plusCount == 0 || value.hasPrefix("+") else { return nil }
        return value
    }
}
