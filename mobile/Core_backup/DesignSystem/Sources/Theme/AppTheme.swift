import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

// MARK: - App Colors
public struct AppColors {
    // Primary (using direct colors since we don't have asset catalog in SPM)
    public static let primary = Color(hex: "#22C55E")
    public static let primaryLight = Color(hex: "#86EFAC")
    public static let primaryDark = Color(hex: "#16A34A")

    // Fallback colors if assets not found
    public static let primaryFallback = Color(hex: "#22C55E") // Green
    public static let primaryLightFallback = Color(hex: "#86EFAC")
    public static let primaryDarkFallback = Color(hex: "#16A34A")

    // Secondary
    public static let secondary = Color(hex: "#3B82F6") // Blue
    public static let secondaryLight = Color(hex: "#93C5FD")
    public static let secondaryDark = Color(hex: "#2563EB")

    // Accent
    public static let accent = Color(hex: "#F59E0B") // Amber
    public static let accentLight = Color(hex: "#FCD34D")
    public static let accentDark = Color(hex: "#D97706")

    // Status Colors
    public static let success = Color(hex: "#22C55E")
    public static let warning = Color(hex: "#F59E0B")
    public static let error = Color(hex: "#EF4444")
    public static let info = Color(hex: "#3B82F6")

    // Neutral
    #if canImport(UIKit)
    public static let background = Color(UIColor.systemBackground)
    public static let secondaryBackground = Color(UIColor.secondarySystemBackground)
    public static let tertiaryBackground = Color(UIColor.tertiarySystemBackground)
    public static let groupedBackground = Color(UIColor.systemGroupedBackground)
    public static let text = Color(UIColor.label)
    public static let textSecondary = Color(UIColor.secondaryLabel)
    public static let textTertiary = Color(UIColor.tertiaryLabel)
    public static let border = Color(hex: "#E5E5EA")
    public static let divider = Color(hex: "#C6C6C8")
    #else
    public static let background = Color.white
    public static let secondaryBackground = Color(hex: "#F5F5F5")
    public static let tertiaryBackground = Color(hex: "#EFEFEF")
    public static let groupedBackground = Color(hex: "#F2F2F7")
    public static let text = Color.black
    public static let textSecondary = Color.gray
    public static let textTertiary = Color(hex: "#999999")
    public static let border = Color(hex: "#E5E5E5")
    public static let divider = Color(hex: "#CCCCCC")
    #endif
    public static let textInverse = Color.white

    // Order Status Colors
    public static func orderStatusColor(_ status: String) -> Color {
        switch status {
        case "pending": return .orange
        case "confirmed": return .blue
        case "preparing": return .purple
        case "ready": return .cyan
        case "delivering": return primaryFallback
        case "delivered": return success
        case "cancelled": return error
        default: return .gray
        }
    }

    // Driver Status Colors
    public static func driverStatusColor(_ status: String) -> Color {
        switch status {
        case "online": return success
        case "busy": return warning
        case "break": return .orange
        case "offline": return .gray
        default: return .gray
        }
    }
}

// MARK: - Color Extension
public extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Typography
public struct AppTypography {
    // Large Title
    public static let largeTitle = Font.system(size: 34, weight: .bold, design: .rounded)

    // Titles
    public static let title1 = Font.system(size: 28, weight: .bold, design: .rounded)
    public static let title2 = Font.system(size: 22, weight: .bold, design: .rounded)
    public static let title3 = Font.system(size: 20, weight: .semibold, design: .rounded)

    // Headlines
    public static let headline = Font.system(size: 17, weight: .semibold, design: .default)
    public static let subheadline = Font.system(size: 15, weight: .medium, design: .default)

    // Body
    public static let body = Font.system(size: 17, weight: .regular, design: .default)
    public static let bodyBold = Font.system(size: 17, weight: .semibold, design: .default)

    // Callout
    public static let callout = Font.system(size: 16, weight: .regular, design: .default)

    // Footnote & Caption
    public static let footnote = Font.system(size: 13, weight: .regular, design: .default)
    public static let caption1 = Font.system(size: 12, weight: .regular, design: .default)
    public static let caption2 = Font.system(size: 11, weight: .regular, design: .default)

    // Price
    public static let price = Font.system(size: 18, weight: .bold, design: .rounded)
    public static let priceSmall = Font.system(size: 14, weight: .semibold, design: .rounded)
}

// MARK: - Spacing
public struct AppSpacing {
    public static let xxs: CGFloat = 2
    public static let xs: CGFloat = 4
    public static let sm: CGFloat = 8
    public static let md: CGFloat = 12
    public static let lg: CGFloat = 16
    public static let xl: CGFloat = 20
    public static let xxl: CGFloat = 24
    public static let xxxl: CGFloat = 32
    public static let huge: CGFloat = 48
}

// MARK: - Corner Radius
public struct AppRadius {
    public static let xs: CGFloat = 4
    public static let sm: CGFloat = 8
    public static let md: CGFloat = 12
    public static let lg: CGFloat = 16
    public static let xl: CGFloat = 20
    public static let xxl: CGFloat = 24
    public static let full: CGFloat = 9999
}

// MARK: - Shadows
public struct AppShadow {
    public static let sm = ShadowStyle(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    public static let md = ShadowStyle(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
    public static let lg = ShadowStyle(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
    public static let xl = ShadowStyle(color: .black.opacity(0.2), radius: 16, x: 0, y: 8)
}

public struct ShadowStyle {
    public let color: Color
    public let radius: CGFloat
    public let x: CGFloat
    public let y: CGFloat
}

// MARK: - View Modifier
public struct AppShadowModifier: ViewModifier {
    let style: ShadowStyle

    public func body(content: Content) -> some View {
        content.shadow(color: style.color, radius: style.radius, x: style.x, y: style.y)
    }
}

public extension View {
    func appShadow(_ style: ShadowStyle) -> some View {
        modifier(AppShadowModifier(style: style))
    }
}
