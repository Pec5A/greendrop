import SwiftUI

// MARK: - Button Styles
public enum AppButtonStyle {
    case primary
    case secondary
    case outline
    case ghost
    case destructive
}

public enum AppButtonSize {
    case small
    case medium
    case large

    var height: CGFloat {
        switch self {
        case .small: return 36
        case .medium: return 44
        case .large: return 52
        }
    }

    var fontSize: Font {
        switch self {
        case .small: return .subheadline
        case .medium: return .body
        case .large: return .headline
        }
    }

    var horizontalPadding: CGFloat {
        switch self {
        case .small: return 12
        case .medium: return 16
        case .large: return 20
        }
    }
}

// MARK: - App Button
public struct AppButton: View {
    let title: String
    let icon: String?
    let style: AppButtonStyle
    let size: AppButtonSize
    let isFullWidth: Bool
    let isLoading: Bool
    let isDisabled: Bool
    let action: () -> Void

    public init(
        _ title: String,
        icon: String? = nil,
        style: AppButtonStyle = .primary,
        size: AppButtonSize = .medium,
        isFullWidth: Bool = false,
        isLoading: Bool = false,
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.style = style
        self.size = size
        self.isFullWidth = isFullWidth
        self.isLoading = isLoading
        self.isDisabled = isDisabled
        self.action = action
    }

    public var body: some View {
        Button(action: {
            if !isLoading && !isDisabled {
                action()
            }
        }) {
            HStack(spacing: AppSpacing.sm) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: foregroundColor))
                        .scaleEffect(0.8)
                } else if let icon = icon {
                    Image(systemName: icon)
                        .font(size.fontSize)
                }
                Text(title)
                    .font(size.fontSize.weight(.semibold))
            }
            .frame(maxWidth: isFullWidth ? .infinity : nil)
            .frame(height: size.height)
            .padding(.horizontal, size.horizontalPadding)
            .foregroundColor(foregroundColor)
            .background(backgroundColor)
            .cornerRadius(AppRadius.md)
            .overlay(
                RoundedRectangle(cornerRadius: AppRadius.md)
                    .stroke(borderColor, lineWidth: style == .outline ? 1.5 : 0)
            )
        }
        .disabled(isDisabled || isLoading)
        .opacity(isDisabled ? 0.6 : 1)
    }

    private var foregroundColor: Color {
        switch style {
        case .primary:
            return .white
        case .secondary:
            return .white
        case .outline:
            return AppColors.primaryFallback
        case .ghost:
            return AppColors.primaryFallback
        case .destructive:
            return .white
        }
    }

    private var backgroundColor: Color {
        switch style {
        case .primary:
            return AppColors.primaryFallback
        case .secondary:
            return AppColors.secondary
        case .outline:
            return .clear
        case .ghost:
            return AppColors.primaryFallback.opacity(0.1)
        case .destructive:
            return AppColors.error
        }
    }

    private var borderColor: Color {
        switch style {
        case .outline:
            return AppColors.primaryFallback
        default:
            return .clear
        }
    }
}

// MARK: - Icon Button
public struct AppIconButton: View {
    let icon: String
    let style: AppButtonStyle
    let size: CGFloat
    let action: () -> Void

    public init(
        icon: String,
        style: AppButtonStyle = .ghost,
        size: CGFloat = 44,
        action: @escaping () -> Void
    ) {
        self.icon = icon
        self.style = style
        self.size = size
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: size * 0.4, weight: .medium))
                .frame(width: size, height: size)
                .foregroundColor(foregroundColor)
                .background(backgroundColor)
                .clipShape(Circle())
        }
    }

    private var foregroundColor: Color {
        switch style {
        case .primary, .secondary, .destructive:
            return .white
        case .outline, .ghost:
            return AppColors.primaryFallback
        }
    }

    private var backgroundColor: Color {
        switch style {
        case .primary:
            return AppColors.primaryFallback
        case .secondary:
            return AppColors.secondary
        case .destructive:
            return AppColors.error
        case .outline:
            return .clear
        case .ghost:
            return AppColors.primaryFallback.opacity(0.1)
        }
    }
}

// MARK: - Preview
#Preview {
    VStack(spacing: 16) {
        AppButton("Primary Button", icon: "cart", style: .primary, isFullWidth: true) {}
        AppButton("Secondary", style: .secondary) {}
        AppButton("Outline", style: .outline) {}
        AppButton("Ghost", style: .ghost) {}
        AppButton("Destructive", icon: "trash", style: .destructive) {}
        AppButton("Loading...", style: .primary, isLoading: true) {}
        AppButton("Disabled", style: .primary, isDisabled: true) {}

        HStack {
            AppIconButton(icon: "plus", style: .primary) {}
            AppIconButton(icon: "heart", style: .ghost) {}
            AppIconButton(icon: "trash", style: .destructive) {}
        }
    }
    .padding()
}
