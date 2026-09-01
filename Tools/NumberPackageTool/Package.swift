// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "NumberPackageTool",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "NumberPackageTool", targets: ["NumberPackageTool"])
    ],
    targets: [
        .executableTarget(name: "NumberPackageTool"),
        .testTarget(name: "NumberPackageToolTests", dependencies: ["NumberPackageTool"])
    ]
)
