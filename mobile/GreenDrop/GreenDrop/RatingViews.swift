import SwiftUI
import FirebaseFirestore

// MARK: - Review Model
struct Review: Identifiable, Codable {
    let id: String
    let orderId: String
    let userId: String
    let userName: String
    let shopId: String?
    let driverId: String?
    let shopRating: Int?
    let driverRating: Int?
    let shopComment: String?
    let driverComment: String?
    let tipAmount: Double?
    let createdAt: Date

    var overallRating: Double {
        var ratings: [Int] = []
        if let sr = shopRating { ratings.append(sr) }
        if let dr = driverRating { ratings.append(dr) }
        guard !ratings.isEmpty else { return 0 }
        return Double(ratings.reduce(0, +)) / Double(ratings.count)
    }
}

// MARK: - Review Service
@MainActor
final class ReviewService: ObservableObject {
    static let shared = ReviewService()

    @Published var pendingReviews: [Order] = []
    @Published var isSubmitting = false

    private let db = Firestore.firestore()

    private init() {}

    // Check if order needs review
    func needsReview(orderId: String) async -> Bool {
        do {
            let doc = try await db.collection("reviews").document(orderId).getDocument()
            return !doc.exists
        } catch {
            return true
        }
    }

    // Submit review
    func submitReview(
        order: Order,
        shopRating: Int,
        driverRating: Int?,
        shopComment: String?,
        driverComment: String?,
        tipAmount: Double?
    ) async throws {
        guard let user = AuthService.shared.userProfile else {
            throw NSError(domain: "ReviewService", code: 401, userInfo: [NSLocalizedDescriptionKey: "User not authenticated"])
        }

        isSubmitting = true
        defer { isSubmitting = false }

        let reviewData: [String: Any?] = [
            "orderId": order.id,
            "userId": user.id,
            "userName": user.name,
            "shopId": order.shopId,
            "driverId": order.driverId,
            "shopRating": shopRating,
            "driverRating": driverRating,
            "shopComment": shopComment,
            "driverComment": driverComment,
            "tipAmount": tipAmount,
            "createdAt": Timestamp(date: Date())
        ]

        // Save review
        try await db.collection("reviews").document(order.id).setData(reviewData.compactMapValues { $0 })

        // Update shop rating
        try await updateShopRating(shopId: order.shopId, newRating: shopRating)

        // Update driver rating
        if let driverId = order.driverId, let driverRating = driverRating {
            try await updateDriverRating(driverId: driverId, newRating: driverRating)
        }

        // Process tip if any
        if let tip = tipAmount, tip > 0, let driverId = order.driverId {
            try await processTip(orderId: order.id, driverId: driverId, amount: tip)
        }

        // Remove from pending
        pendingReviews.removeAll { $0.id == order.id }
    }

    private func updateShopRating(shopId: String, newRating: Int) async throws {
        let shopRef = db.collection("shops").document(shopId)

        try await db.runTransaction { transaction, errorPointer in
            let shopDoc: DocumentSnapshot
            do {
                shopDoc = try transaction.getDocument(shopRef)
            } catch let error {
                errorPointer?.pointee = error as NSError
                return nil
            }

            let currentRating = shopDoc.data()?["rating"] as? Double ?? 0
            let totalReviews = shopDoc.data()?["totalReviews"] as? Int ?? 0

            let newTotal = totalReviews + 1
            let newAverage = ((currentRating * Double(totalReviews)) + Double(newRating)) / Double(newTotal)

            transaction.updateData([
                "rating": newAverage,
                "totalReviews": newTotal
            ], forDocument: shopRef)

            return nil
        }
    }

    private func updateDriverRating(driverId: String, newRating: Int) async throws {
        let driverRef = db.collection("drivers").document(driverId)

        try await db.runTransaction { transaction, errorPointer in
            let driverDoc: DocumentSnapshot
            do {
                driverDoc = try transaction.getDocument(driverRef)
            } catch let error {
                errorPointer?.pointee = error as NSError
                return nil
            }

            let currentRating = driverDoc.data()?["rating"] as? Double ?? 5.0
            let totalDeliveries = driverDoc.data()?["completedDeliveries"] as? Int ?? 0

            // Weighted average
            let newAverage = ((currentRating * Double(max(totalDeliveries - 1, 0))) + Double(newRating)) / Double(max(totalDeliveries, 1))

            transaction.updateData([
                "rating": min(newAverage, 5.0)
            ], forDocument: driverRef)

            return nil
        }
    }

    private func processTip(orderId: String, driverId: String, amount: Double) async throws {
        let tipData: [String: Any] = [
            "orderId": orderId,
            "driverId": driverId,
            "amount": amount,
            "status": "pending",
            "createdAt": Timestamp(date: Date())
        ]

        try await db.collection("tips").addDocument(data: tipData)
    }

    // Get reviews for a shop
    func getShopReviews(shopId: String) async -> [Review] {
        do {
            let snapshot = try await db.collection("reviews")
                .whereField("shopId", isEqualTo: shopId)
                .order(by: "createdAt", descending: true)
                .limit(to: 20)
                .getDocuments()

            return snapshot.documents.compactMap { doc -> Review? in
                let data = doc.data()
                return Review(
                    id: doc.documentID,
                    orderId: data["orderId"] as? String ?? "",
                    userId: data["userId"] as? String ?? "",
                    userName: data["userName"] as? String ?? "",
                    shopId: data["shopId"] as? String,
                    driverId: data["driverId"] as? String,
                    shopRating: data["shopRating"] as? Int,
                    driverRating: data["driverRating"] as? Int,
                    shopComment: data["shopComment"] as? String,
                    driverComment: data["driverComment"] as? String,
                    tipAmount: data["tipAmount"] as? Double,
                    createdAt: (data["createdAt"] as? Timestamp)?.dateValue() ?? Date()
                )
            }
        } catch {
            return []
        }
    }
}

// MARK: - Order Rating View
struct OrderRatingView: View {
    let order: Order
    @StateObject private var reviewService = ReviewService.shared
    @Environment(\.dismiss) private var dismiss

    @State private var shopRating: Int = 0
    @State private var driverRating: Int = 0
    @State private var shopComment = ""
    @State private var driverComment = ""
    @State private var selectedTip: TipOption = .none
    @State private var customTipAmount = ""
    @State private var showSuccess = false
    @State private var currentStep = 0

    enum TipOption: Equatable {
        case none
        case preset(Double)
        case custom

        var amount: Double? {
            switch self {
            case .none: return nil
            case .preset(let value): return value
            case .custom: return nil
            }
        }
    }

    let tipPresets: [Double] = [1, 2, 3, 5]

    var tipAmount: Double? {
        switch selectedTip {
        case .none: return nil
        case .preset(let value): return value
        case .custom: return Double(customTipAmount.replacingOccurrences(of: ",", with: "."))
        }
    }

    var canSubmit: Bool {
        shopRating > 0 && (order.driverId == nil || driverRating > 0)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Order Summary
                    OrderSummaryCard(order: order)

                    // Shop Rating
                    RatingSection(
                        title: "Comment était votre commande ?",
                        subtitle: order.shopName,
                        icon: "storefront.fill",
                        iconColor: "#22C55E",
                        rating: $shopRating,
                        comment: $shopComment,
                        commentPlaceholder: "Partagez votre expérience (optionnel)"
                    )

                    // Driver Rating (if applicable)
                    if order.driverId != nil {
                        RatingSection(
                            title: "Comment était la livraison ?",
                            subtitle: "Votre livreur",
                            icon: "bicycle",
                            iconColor: "#3B82F6",
                            rating: $driverRating,
                            comment: $driverComment,
                            commentPlaceholder: "Comment s'est passée la livraison ? (optionnel)"
                        )

                        // Tip Section
                        TipSection(
                            selectedTip: $selectedTip,
                            customAmount: $customTipAmount,
                            presets: tipPresets
                        )
                    }

                    // Submit Button
                    Button(action: submitReview) {
                        HStack {
                            if reviewService.isSubmitting {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Image(systemName: "paperplane.fill")
                                Text("Envoyer mon avis")
                            }
                        }
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(canSubmit ? Color(hex: "#22C55E") : Color.gray)
                        .cornerRadius(14)
                    }
                    .disabled(!canSubmit || reviewService.isSubmitting)
                    .padding(.horizontal)

                    // Skip button
                    Button(action: { dismiss() }) {
                        Text("Plus tard")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.bottom)
                }
                .padding(.vertical)
            }
            .navigationTitle("Votre avis")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .alert("Merci pour votre avis !", isPresented: $showSuccess) {
                Button("OK") { dismiss() }
            } message: {
                if let tip = tipAmount, tip > 0 {
                    Text("Votre pourboire de \(String(format: "%.2f", tip)) € a été envoyé au livreur.")
                } else {
                    Text("Votre avis nous aide à améliorer notre service.")
                }
            }
        }
    }

    func submitReview() {
        Task {
            do {
                try await reviewService.submitReview(
                    order: order,
                    shopRating: shopRating,
                    driverRating: order.driverId != nil ? driverRating : nil,
                    shopComment: shopComment.isEmpty ? nil : shopComment,
                    driverComment: driverComment.isEmpty ? nil : driverComment,
                    tipAmount: tipAmount
                )
                showSuccess = true
            } catch {
            }
        }
    }
}

// MARK: - Order Summary Card
struct OrderSummaryCard: View {
    let order: Order

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Commande #\(String(order.id.prefix(8)))")
                        .font(.headline)
                    Text(order.createdAt.formatted(date: .abbreviated, time: .shortened))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Text(String(format: "%.2f €", order.total))
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(Color(hex: "#22C55E"))
            }

            HStack {
                Image(systemName: "bag.fill")
                    .foregroundColor(Color(hex: "#22C55E"))
                Text("\(order.items.count) article\(order.items.count > 1 ? "s" : "")")
                    .font(.subheadline)

                Spacer()

                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(Color(hex: "#22C55E"))
                Text("Livrée")
                    .font(.subheadline)
                    .foregroundColor(Color(hex: "#22C55E"))
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(16)
        .padding(.horizontal)
    }
}

// MARK: - Rating Section
struct RatingSection: View {
    let title: String
    let subtitle: String
    let icon: String
    let iconColor: String
    @Binding var rating: Int
    @Binding var comment: String
    let commentPlaceholder: String

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color(hex: iconColor).opacity(0.15))
                        .frame(width: 50, height: 50)
                    Image(systemName: icon)
                        .font(.title2)
                        .foregroundColor(Color(hex: iconColor))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.headline)
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }

            // Star Rating
            HStack(spacing: 8) {
                ForEach(1...5, id: \.self) { star in
                    Button(action: { rating = star }) {
                        Image(systemName: star <= rating ? "star.fill" : "star")
                            .font(.system(size: 36))
                            .foregroundColor(star <= rating ? .yellow : Color(.systemGray3))
                    }
                }
            }
            .frame(maxWidth: .infinity)

            // Rating Label
            if rating > 0 {
                Text(ratingLabel(rating))
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity)
            }

            // Comment
            TextField(commentPlaceholder, text: $comment, axis: .vertical)
                .lineLimit(3...5)
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
        .padding(.horizontal)
    }

    func ratingLabel(_ rating: Int) -> String {
        switch rating {
        case 1: return "Très insatisfait"
        case 2: return "Insatisfait"
        case 3: return "Correct"
        case 4: return "Satisfait"
        case 5: return "Excellent !"
        default: return ""
        }
    }
}

// MARK: - Tip Section
struct TipSection: View {
    @Binding var selectedTip: OrderRatingView.TipOption
    @Binding var customAmount: String
    let presets: [Double]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color(hex: "#F59E0B").opacity(0.15))
                        .frame(width: 50, height: 50)
                    Image(systemName: "heart.fill")
                        .font(.title2)
                        .foregroundColor(Color(hex: "#F59E0B"))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("Ajouter un pourboire ?")
                        .font(.headline)
                    Text("100% pour le livreur")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }

            // Preset amounts
            HStack(spacing: 12) {
                // No tip
                TipButton(
                    label: "Non merci",
                    isSelected: selectedTip == .none
                ) {
                    selectedTip = .none
                }

                ForEach(presets, id: \.self) { amount in
                    TipButton(
                        label: "\(Int(amount)) €",
                        isSelected: selectedTip == .preset(amount)
                    ) {
                        selectedTip = .preset(amount)
                    }
                }

                // Custom
                TipButton(
                    label: "Autre",
                    isSelected: selectedTip == .custom
                ) {
                    selectedTip = .custom
                }
            }

            // Custom amount input
            if selectedTip == .custom {
                HStack {
                    TextField("Montant", text: $customAmount)
                        .keyboardType(.decimalPad)
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(10)

                    Text("€")
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
        .padding(.horizontal)
    }
}

struct TipButton: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(isSelected ? Color(hex: "#F59E0B") : Color(.systemGray6))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(10)
        }
    }
}

// MARK: - Shop Reviews List View
struct ShopReviewsListView: View {
    let shopId: String
    let shopName: String
    @StateObject private var reviewService = ReviewService.shared
    @State private var reviews: [Review] = []
    @State private var isLoading = true

    var averageRating: Double {
        guard !reviews.isEmpty else { return 0 }
        let total = reviews.compactMap { $0.shopRating }.reduce(0, +)
        return Double(total) / Double(reviews.count)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Summary
                VStack(spacing: 8) {
                    Text(String(format: "%.1f", averageRating))
                        .font(.system(size: 48, weight: .bold))
                        .foregroundColor(Color(hex: "#22C55E"))

                    HStack(spacing: 4) {
                        ForEach(1...5, id: \.self) { star in
                            Image(systemName: star <= Int(averageRating.rounded()) ? "star.fill" : "star")
                                .foregroundColor(.yellow)
                        }
                    }

                    Text("\(reviews.count) avis")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical)

                Divider()
                    .padding(.horizontal)

                // Reviews list
                if isLoading {
                    ProgressView()
                        .padding()
                } else if reviews.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "star.slash")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)
                        Text("Aucun avis pour le moment")
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 40)
                } else {
                    LazyVStack(spacing: 16) {
                        ForEach(reviews) { review in
                            ReviewCard(review: review)
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
        .navigationTitle("Avis - \(shopName)")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            reviews = await reviewService.getShopReviews(shopId: shopId)
            isLoading = false
        }
    }
}

// MARK: - Review Card
struct ReviewCard: View {
    let review: Review

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                // Avatar
                ZStack {
                    Circle()
                        .fill(Color(hex: "#22C55E").opacity(0.15))
                        .frame(width: 40, height: 40)
                    Text(String(review.userName.prefix(1)).uppercased())
                        .font(.headline)
                        .foregroundColor(Color(hex: "#22C55E"))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(review.userName)
                        .font(.subheadline)
                        .fontWeight(.medium)
                    Text(review.createdAt.formatted(date: .abbreviated, time: .omitted))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Rating
                if let rating = review.shopRating {
                    HStack(spacing: 2) {
                        Image(systemName: "star.fill")
                            .foregroundColor(.yellow)
                        Text("\(rating)")
                            .fontWeight(.semibold)
                    }
                    .font(.subheadline)
                }
            }

            // Comment
            if let comment = review.shopComment, !comment.isEmpty {
                Text(comment)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - Pending Review Banner
struct PendingReviewBanner: View {
    let order: Order
    @State private var showRating = false

    var body: some View {
        Button(action: { showRating = true }) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color(hex: "#F59E0B").opacity(0.15))
                        .frame(width: 44, height: 44)
                    Image(systemName: "star.fill")
                        .foregroundColor(Color(hex: "#F59E0B"))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("Donnez votre avis")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    Text("Commande #\(String(order.id.prefix(8)))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(hex: "#F59E0B").opacity(0.1))
            .cornerRadius(12)
        }
        .sheet(isPresented: $showRating) {
            OrderRatingView(order: order)
        }
    }
}
