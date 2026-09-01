import Foundation
import Testing
@testable import NumberPackageTool

struct PackageBuilderTests {
    @Test func buildsDeterministicPackage() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let regionsURL = directory.appendingPathComponent("regions.json")
        let contactsURL = directory.appendingPathComponent("contacts.json")
        try Data(#"[{"code":"CN","parentCode":null,"level":"country","name":{"zhHans":"中国大陆","en":"Mainland China"},"aliases":["CN"]}]"#.utf8)
            .write(to: regionsURL)
        try Data("[]".utf8).write(to: contactsURL)
        let publishedAt = "1970-01-01T00:00:00Z"
        let first = try PackageBuilder.build(
            regionsURL: regionsURL,
            contactsURL: contactsURL,
            version: 1,
            publishedAt: publishedAt
        )
        let second = try PackageBuilder.build(
            regionsURL: regionsURL,
            contactsURL: contactsURL,
            version: 1,
            publishedAt: publishedAt
        )
        #expect(first == second)
    }
}
