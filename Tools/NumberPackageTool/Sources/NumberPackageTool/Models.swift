import Foundation

struct LocalizedValue: Codable {
    let zhHans: String
    let en: String
}

enum RegionLevel: String, Codable { case country, province, city }

struct AdministrativeRegion: Codable {
    let code: String
    let parentCode: String?
    let level: RegionLevel
    let name: LocalizedValue
    let aliases: [String]
}

enum RegionScopeType: String, Codable { case nationwide, province, city }

struct RegionScope: Codable {
    let type: RegionScopeType
    let regionCode: String?
}

enum ContactCategory: String, Codable {
    case police, fire, medical, traffic, utility, other
}

struct DeveloperContact: Codable {
    let id: String
    let serviceKey: String
    let category: ContactCategory
    let name: LocalizedValue
    let description: LocalizedValue
    let displayNumber: String
    let dialNumber: String
    let coverageScopes: [RegionScope]
    let sourceURL: URL
    let verifiedAt: String
    let sortOrder: Int
    let isFeatured: Bool
}

struct DeveloperNumberPackage: Codable {
    let schemaVersion: Int
    let contentVersion: Int
    let regionCatalogVersion: Int
    let publishedAt: String
    let regions: [AdministrativeRegion]
    let contacts: [DeveloperContact]
}
