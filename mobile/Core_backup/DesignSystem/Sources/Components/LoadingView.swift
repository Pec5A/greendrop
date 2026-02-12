import SwiftUI

// MARK: - Loading View
public struct LoadingView: View {
    let message: String?

    public init(message: String? = nil) {
        self.message = message
    }

    public var body: some View {
        VStack(spacing: AppSpacing.lg) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(AppColors.primaryFallback)

            if let message = message {
                Text(message)
                    .font(AppTypography.subheadline)
                    .foregroundColor(AppColors.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppColors.background.opacity(0.8))
    }
}

// MARK: - Empty State View
public struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    let actionTitle: String?
    let action: (() -> Void)?

    public init(
        icon: String,
        title: String,
        message: String,
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.icon = icon
        self.title = title
        self.message = message
        self.actionTitle = actionTitle
        self.action = action
    }

    public var body: some View {
        VStack(spacing: AppSpacing.lg) {
            Image(systemName: icon)
                .font(.system(size: 64))
                .foregroundColor(AppColors.textTertiary)

            VStack(spacing: AppSpacing.sm) {
                Text(title)
                    .font(AppTypography.title3)
                    .foregroundColor(AppColors.text)

                Text(message)
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textSecondary)
                    .multilineTextAlignment(.center)
            }

            if let actionTitle = actionTitle, let action = action {
                AppButton(actionTitle, style: .primary) {
                    action()
                }
            }
        }
        .padding(AppSpacing.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Error View
public struct ErrorView: View {
    let title: String
    let message: String
    let retryAction: (() -> Void)?

    public init(
        title: String = "Oups !",
        message: String,
        retryAction: (() -> Void)? = nil
    ) {
        self.title = title
        self.message = message
        self.retryAction = retryAction
    }

    public var body: some View {
        VStack(spacing: AppSpacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 56))
                .foregroundColor(AppColors.error)

            VStack(spacing: AppSpacing.sm) {
                Text(title)
                    .font(AppTypography.title3)
                    .foregroundColor(AppColors.text)

                Text(message)
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textSecondary)
                    .multilineTextAlignment(.center)
            }

            if let retryAction = retryAction {
                AppButton("Réessayer", icon: "arrow.clockwise", style: .primary) {
                    retryAction()
                }
            }
        }
        .padding(AppSpacing.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Skeleton View
public struct SkeletonView: View {
    let height: CGFloat

    public init(height: CGFloat = 20) {
        self.height = height
    }

    @State private var isAnimating = false

    public var body: some View {
        Rectangle()
            .fill(
                LinearGradient(
                    colors: [
                        Color.gray.opacity(0.3),
                        Color.gray.opacity(0.1),
                        Color.gray.opacity(0.3)
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .frame(height: height)
            .cornerRadius(AppRadius.sm)
            .opacity(isAnimating ? 0.5 : 1)
            .animation(
                Animation.easeInOut(duration: 1)
                    .repeatForever(autoreverses: true),
                value: isAnimating
            )
            .onAppear {
                isAnimating = true
            }
    }
}

// MARK: - Skeleton Card
public struct SkeletonCard: View {
    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            HStack(spacing: AppSpacing.md) {
                SkeletonView(height: 80)
                    .frame(width: 80)
                    .cornerRadius(AppRadius.md)

                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    SkeletonView(height: 16)
                        .frame(width: 150)
                    SkeletonView(height: 12)
                        .frame(width: 100)
                    SkeletonView(height: 12)
                        .frame(width: 80)
                }
            }
        }
        .padding(AppSpacing.md)
        .background(AppColors.background)
        .cornerRadius(AppRadius.lg)
    }
}

// MARK: - Preview
#Preview {
    VStack(spacing: 32) {
        LoadingView(message: "Chargement...")

        EmptyStateView(
            icon: "bag",
            title: "Panier vide",
            message: "Ajoutez des produits pour commencer",
            actionTitle: "Parcourir"
        ) {}

        ErrorView(
            message: "Impossible de charger les données"
        ) {}

        VStack(spacing: 12) {
            SkeletonCard()
            SkeletonCard()
        }
        .padding()
    }
}
