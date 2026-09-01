import CryptoKit
import Foundation
import Security

enum KeychainSigningKey {
    static let service = "com.hanqiu.EmergencyCall.NumberPackageSigningKey"
    static let account = "hanqiu"

    static func load() throws -> Curve25519.Signing.PrivateKey {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let encoded = item as? Data,
              let base64 = String(data: encoded, encoding: .utf8),
              let raw = Data(base64Encoded: base64) else {
            throw ToolError.missingKey
        }
        return try Curve25519.Signing.PrivateKey(rawRepresentation: raw)
    }

    static func generate(force: Bool) throws -> String {
        if !force, (try? load()) != nil {
            throw ToolError.validation("A signing key already exists. Pass --force only for a deliberate key rotation.")
        }
        let key = Curve25519.Signing.PrivateKey()
        let encoded = key.rawRepresentation.base64EncodedString().data(using: .utf8) ?? Data()
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account
        ]
        SecItemDelete(query as CFDictionary)
        var add = query
        add[kSecValueData] = encoded
        guard SecItemAdd(add as CFDictionary, nil) == errSecSuccess else {
            throw ToolError.commandFailed("Unable to save the signing key to Keychain.")
        }
        return key.publicKey.rawRepresentation.base64EncodedString()
    }

    /// Returns the public verification key for the private key stored in Keychain.
    static func publicKey() throws -> String {
        try load().publicKey.rawRepresentation.base64EncodedString()
    }
}
