import SwiftUI
import Kingfisher

// MARK: - Basic Card
public struct AppCard<Content: View>: View {
    let content: Content
    let padding: CGFloat

    public init(
        padding: CGFloat = AppSpacing.lg,
        @ViewBuilder content: () -> Content
    ) {
        self.padding = padding
        self.content = content()
    }

    public var body: some View {
        content
            .padding(padding)
            .background(AppColors.background)
            .cornerRadius(AppRadius.lg)
            .appShadow(AppShadow.sm)
    }
}

// MARK: - Shop Card
public struct ShopCard: View {
    let name: String
    let address: String
    let imageUrl: String?
    let rating: Double?
    let distance: String?
    let categories: [String]
    let onTap: () -> Void

    public init(
        name: String,
        address: String,
        imageUrl: String? = nil,
        rating: Double? = nil,
        distance: String? = nil,
        categories: [String] = [],
        onTap: @escaping () -> Void
    ) {
        self.name = name
        self.address = address
        self.imageUrl = imageUrl
        self.rating = rating
        self.distance = distance
        self.categories = categories
        self.onTap = onTap
    }

    public var body: some View {
        Button(action: onTap) {
            HStack(spacing: AppSpacing.md) {
                // Image
                Group {
                    if let imageUrl = imageUrl, let url = URL(string: imageUrl) {
                        KFImage(url)
                            .placeholder {
                                shopPlaceholder
                            }
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } else {
                        shopPlaceholder
                    }
                }
                .frame(width: 80, height: 80)
                .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))

                // Info
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text(name)
                        .font(AppTypography.headline)
                        .foregroundColor(AppColors.text)
                        .lineLimit(1)

                    Text(address)
                        .font(AppTypography.caption1)
                        .foregroundColor(AppColors.textSecondary)
                        .lineLimit(1)

                    HStack(spacing: AppSpacing.md) {
                        if let rating = rating {
                            HStack(spacing: 2) {
                                Image(systemName: "star.fill")
                                    .foregroundColor(.orange)
                                Text(String(format: "%.1f", rating))
                            }
                            .font(AppTypography.caption1)
                            .foregroundColor(AppColors.textSecondary)
                        }

                        if let distance = distance {
                            HStack(spacing: 2) {
                                Image(systemName: "location")
                                Text(distance)
                            }
                            .font(AppTypography.caption1)
                            .foregroundColor(AppColors.textSecondary)
                        }
                    }

                    if !categories.isEmpty {
                        Text(categories.prefix(3).joined(separator: " • "))
                            .font(AppTypography.caption2)
                            .foregroundColor(AppColors.primaryFallback)
                            .lineLimit(1)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundColor(AppColors.textTertiary)
            }
            .padding(AppSpacing.md)
            .background(AppColors.background)
            .cornerRadius(AppRadius.lg)
            .appShadow(AppShadow.sm)
        }
        .buttonStyle(.plain)
    }

    private var shopPlaceholder: some View {
        ZStack {
            Color.gray.opacity(0.2)
            Image(systemName: "storefront")
                .font(.title2)
                .foregroundColor(.gray)
        }
    }
}

// MARK: - Product Card
public struct ProductCard: View {
    let name: String
    let price: String
    let imageUrl: String?
    let isAvailable: Bool
    let onTap: () -> Void
    let onAddToCart: () -> Void

    public init(
        name: String,
        price: String,
        imageUrl: String? = nil,
        isAvailable: Bool = true,
        onTap: @escaping () -> Void,
        onAddToCart: @escaping () -> Void
    ) {
        self.name = name
        self.price = price
        self.imageUrl = imageUrl
        self.isAvailable = isAvailable
        self.onTap = onTap
        self.onAddToCart = onAddToCart
    }

    public var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                // Image
                ZStack(alignment: .topTrailing) {
                    Group {
                        if let imageUrl = imageUrl, let url = URL(string: imageUrl) {
                            KFImage(url)
                                .placeholder {
                                    productPlaceholder
                                }
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } else {
                            productPlaceholder
                        }
                    }
                    .frame(height: 120)
                    .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))

                    if !isAvailable {
                        Text("Indisponible")
                            .font(AppTypography.caption2)
                            .foregroundColor(.white)
                            .padding(.horizontal, AppSpacing.sm)
                            .padding(.vertical, AppSpacing.xs)
                            .background(Color.black.opacity(0.7))
                            .cornerRadius(AppRadius.xs)
                            .padding(AppSpacing.xs)
                    }
                }

                // Info
                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(name)
                        .font(AppTypography.subheadline)
                        .foregroundColor(AppColors.text)
                        .lineLimit(2)

                    HStack {
                        Text(price)
                            .font(AppTypography.price)
                            .foregroundColor(AppColors.primaryFallback)

                        Spacer()

                        if isAvailable {
                            Button(action: onAddToCart) {
                                Image(systemName: "plus.circle.fill")
                                    .font(.title2)
                                    .foregroundColor(AppColors.primaryFallback)
                            }
                        }
                    }
                }
            }
            .padding(AppSpacing.sm)
            .background(AppColors.background)
            .cornerRadius(AppRadius.lg)
            .appShadow(AppShadow.sm)
        }
        .buttonStyle(.plain)
        .opacity(isAvailable ? 1 : 0.7)
    }

    private var productPlaceholder: some View {
        ZStack {
            Color.gray.opacity(0.2)
            Image(systemName: "photo")
                .font(.title)
                .foregroundColor(.gray)
        }
    }
}

// MARK: - Order Card
public struct OrderCard: View {
    let reference: String
    let shopName: String
    let status: String
    let statusColor: Color
    let total: String
    let date: String
    let itemsCount: Int
    let onTap: () -> Void

    public init(
        reference: String,
        shopName: String,
        status: String,
        statusColor: Color,
        total: String,
        date: String,
        itemsCount: Int,
        onTap: @escaping () -> Void
    ) {
        self.reference = reference
        self.shopName = shopName
        self.status = status
        self.statusColor = statusColor
        self.total = total
        self.date = date
        self.itemsCount = itemsCount
        self.onTap = onTap
    }

    public var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        Text(reference)
                            .font(AppTypography.headline)
                            .foregroundColor(AppColors.text)

                        Text(shopName)
                            .font(AppTypography.caption1)
                            .foregroundColor(AppColors.textSecondary)
                    }

                    Spacer()

                    // Status Badge
                    Text(status)
                        .font(AppTypography.caption1.weight(.medium))
                        .foregroundColor(.white)
                        .padding(.horizontal, AppSpacing.sm)
                        .padding(.vertical, AppSpacing.xs)
                        .background(statusColor)
                        .cornerRadius(AppRadius.sm)
                }

                Divider()

                // Footer
                HStack {
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: "bag")
                        Text("\(itemsCount) article\(itemsCount > 1 ? "s" : "")")
                    }
                    .font(AppTypography.caption1)
                    .foregroundColor(AppColors.textSecondary)

                    Spacer()

                    Text(total)
                        .font(AppTypography.bodyBold)
                        .foregroundColor(AppColors.text)
                }

                Text(date)
                    .font(AppTypography.caption2)
                    .foregroundColor(AppColors.textTertiary)
            }
            .padding(AppSpacing.lg)
            .background(AppColors.background)
            .cornerRadius(AppRadius.lg)
            .appShadow(AppShadow.sm)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Preview
#Preview {
    ScrollView {
        VStack(spacing: 16) {
            ShopCard(
                name: "Bio Market Paris",
                address: "45 Boulevard Saint-Germain, 75005 Paris",
                rating: 4.7,
                distance: "1.2 km",
                categories: ["Bio", "Fruits & Légumes"]
            ) {}

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ProductCard(
                    name: "Tomates Bio",
                    price: "4,50 €",
                    isAvailable: true,
                    onTap: {},
                    onAddToCart: {}
                )
                ProductCard(
                    name: "Pommes de Normandie",
                    price: "3,50 €",
                    isAvailable: false,
                    onTap: {},
                    onAddToCart: {}
                )
            }

            OrderCard(
                reference: "ORD-2025-001",
                shopName: "Bio Market Paris",
                status: "En livraison",
                statusColor: .green,
                total: "42,50 €",
                date: "15 janvier 2025 à 14:30",
                itemsCount: 3
            ) {}
        }
        .padding()
    }
}
