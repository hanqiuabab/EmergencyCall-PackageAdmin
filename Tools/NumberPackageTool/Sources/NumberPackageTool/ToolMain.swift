import Foundation

@main
enum NumberPackageTool {
    static func main() {
        do {
            try run(Array(CommandLine.arguments.dropFirst()))
        } catch {
            FileHandle.standardError.write(Data(("Error: \(error.localizedDescription)\n").utf8))
            exit(EXIT_FAILURE)
        }
    }

    private static func run(_ arguments: [String]) throws {
        guard let command = arguments.first else { return printUsage() }
        let options = parseOptions(Array(arguments.dropFirst()))
        switch command {
        case "validate":
            let regions = try requiredURL("regions", options)
            let contacts = try requiredURL("contacts", options)
            _ = try PackageBuilder.build(
                regionsURL: regions,
                contactsURL: contacts,
                version: 1,
                publishedAt: "1970-01-01T00:00:00Z"
            )
            print("Package source is valid.")
        case "build":
            let regions = try requiredURL("regions", options)
            let contacts = try requiredURL("contacts", options)
            guard let versionText = options["version"], let version = Int(versionText) else {
                throw ToolError.invalidArguments("Missing or invalid --version.")
            }
            guard let publishedAt = options["published-at"] else {
                throw ToolError.invalidArguments("Missing --published-at.")
            }
            let outputDirectory = try requiredURL("output-dir", options)
            try FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)
            let data = try PackageBuilder.build(
                regionsURL: regions,
                contactsURL: contacts,
                version: version,
                publishedAt: publishedAt
            )
            let output = outputDirectory.appendingPathComponent(String(format: "developer-numbers-v%06d.json", version))
            try data.write(to: output, options: .atomic)
            print(output.path)
        case "publish":
            let package = try requiredURL("package", options)
            let environment = options["environment"] ?? "development"
            try CloudKitPublisher.publish(packageURL: package, environment: environment)
        case "keygen":
            let publicKey = try KeychainSigningKey.generate(force: options["force"] == "true")
            print("Public key (base64): \(publicKey)")
        case "public-key":
            print(try KeychainSigningKey.publicKey())
        default:
            throw ToolError.invalidArguments("Unknown command: \(command)")
        }
    }

    private static func parseOptions(_ arguments: [String]) -> [String: String] {
        var result: [String: String] = [:]
        var index = 0
        while index < arguments.count {
            let item = arguments[index]
            guard item.hasPrefix("--") else { index += 1; continue }
            let key = String(item.dropFirst(2))
            if index + 1 < arguments.count, !arguments[index + 1].hasPrefix("--") {
                result[key] = arguments[index + 1]
                index += 2
            } else {
                result[key] = "true"
                index += 1
            }
        }
        return result
    }

    private static func requiredURL(_ key: String, _ options: [String: String]) throws -> URL {
        guard let path = options[key] else {
            throw ToolError.invalidArguments("Missing --\(key).")
        }
        return URL(fileURLWithPath: path)
    }

    private static func printUsage() {
        print("""
        NumberPackageTool commands:
          validate --regions <regions.json> --contacts <contacts.json>
          build --regions <regions.json> --contacts <contacts.json> --version <n> --published-at <ISO-8601> --output-dir <dir>
          publish --package <package.json> --environment <development|production>
          keygen [--force]
          public-key
        """)
    }
}
