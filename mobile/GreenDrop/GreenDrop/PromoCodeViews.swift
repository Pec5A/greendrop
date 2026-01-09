import SwiftUI
import FirebaseFirestore

// MARK: - Promo Code Model
struct PromoCode: Identifiable, Codable {
    let id: String
    let code: String
    let description: String
    let discountType: DiscountType
    let discountValue: Double
    let minimumOrder: Double?
    let maxDiscount: Double?
    let usageLimit: Int?
    let usedCount: Int
    let validFrom: Date
    let validUntil: Date
    let isActive: Bool
    let applicableShops: [String]? // nil means all shops
    let applicableCategories: [String]?

    enum DiscountType: String, Codable {
        case percentage = "percentage"
        case fixed = "fixed"
        case freeDelivery = "free_delivery"
    }

    var isValid: Bool {
        let now = Date()
        return isActive &&
               now >= validFrom &&
               now <= validUntil &&
               (usageLimit == nil || usedCount < usageLimit!)
    }

    var formattedDiscount: String {
        switch discountType {
        case .percentage:
            return "-\(Int(discountValue))%"
        case .fixed:
            return "-\(String(format: "%.2f", discountValue)) €"
        case .freeDelivery:
            return "Livraison gratuite"
        }
    }
}

// MARK: - Applied Promo
struct AppliedPromo {
    let code: PromoCode
    let discountAmount: Double

    var formattedDiscount: String {
        "-\(String(format: "%.2f", discountAmount)) €"
    }
}

// MARK: - Promo Code Service
@MainActor
final class PromoCodeService: ObservableObject {
    static let shared = PromoCodeService()

    @Published var appliedPromo: AppliedPromo?
    @Published var isValidating = false
    @Published var errorMessage: String?
    @Published var availableCodes: [PromoCode] = []

    private let db = Firestore.firestore()

    private init() {}

    // Validate and apply promo code
    func validateCode(
        _ codeString: String,
        orderTotal: Double,
        deliveryFee: Double,
        shopId: String?
    ) async -> AppliedPromo? {
        isValidating = true
        errorMessage = nil
        defer { isValidating = false }

        let normalizedCode = codeString.uppercased().trimmingCharacters(in: .whitespacesAndNewlines)

        guard !normalizedCode.isEmpty else {
            errorMessage = "Veuillez entrer un code promo"
            return nil
        }

        do {
            // Fetch promo code from Firestore
            let snapshot = try await db.collection("promoCodes")
                .whereField("code", isEqualTo: normalizedCode)
                .limit(to: 1)
                .getDocuments()

            guard let doc = snapshot.documents.first else {
                errorMessage = "Code promo invalide"
                return nil
            }

            let data = doc.data()
            let promoCode = parsePromoCode(id: doc.documentID, data: data)

            // Validate the promo code
            guard let validatedPromo = validatePromoCode(
                promoCode,
                orderTotal: orderTotal,
                deliveryFee: deliveryFee,
                shopId: shopId
            ) else {
                return nil
            }

            appliedPromo = validatedPromo
            return validatedPromo

        } catch {
            errorMessage = "Erreur de validation: \(error.localizedDescription)"
            return nil
        }
    }

    private func parsePromoCode(id: String, data: [String: Any]) -> PromoCode {
        PromoCode(
            id: id,
            code: data["code"] as? String ?? "",
            description: data["description"] as? String ?? "",
            discountType: PromoCode.DiscountType(rawValue: data["discountType"] as? String ?? "percentage") ?? .percentage,
            discountValue: data["discountValue"] as? Double ?? 0,
            minimumOrder: data["minimumOrder"] as? Double,
            maxDiscount: data["maxDiscount"] as? Double,
            usageLimit: data["usageLimit"] as? Int,
            usedCount: data["usedCount"] as? Int ?? 0,
            validFrom: (data["validFrom"] as? Timestamp)?.dateValue() ?? Date.distantPast,
            validUntil: (data["validUntil"] as? Timestamp)?.dateValue() ?? Date.distantFuture,
            isActive: data["isActive"] as? Bool ?? true,
            applicableShops: data["applicableShops"] as? [String],
            applicableCategories: data["applicableCategories"] as? [String]
        )
    }

    private func validatePromoCode(
        _ code: PromoCode,
        orderTotal: Double,
        deliveryFee: Double,
        shopId: String?
    ) -> AppliedPromo? {
        // Check if code is active and within date range
        guard code.isValid else {
            errorMessage = "Ce code promo a expire ou n'est plus valide"
            return nil
        }

        // Check minimum order
        if let minimum = code.minimumOrder, orderTotal < minimum {
            errorMessage = "Commande minimum de \(String(format: "%.2f", minimum)) € requise"
            return nil
        }

        // Check applicable shops
        if let shops = code.applicableShops, let shopId = shopId {
            guard shops.contains(shopId) else {
                errorMessage = "Ce code n'est pas valide pour cette boutique"
                return nil
            }
        }

        // Calculate discount
        var discountAmount: Double = 0

        switch code.discountType {
        case .percentage:
            discountAmount = orderTotal * (code.discountValue / 100)
            if let maxDiscount = code.maxDiscount {
                discountAmount = min(discountAmount, maxDiscount)
            }
        case .fixed:
            discountAmount = min(code.discountValue, orderTotal)
        case .freeDelivery:
            discountAmount = deliveryFee
        }

        return AppliedPromo(code: code, discountAmount: discountAmount)
    }

    // Remove applied promo
    func removePromo() {
        appliedPromo = nil
        errorMessage = nil
    }

    // Load available promo codes for user
    func loadAvailableCodes() async {
        do {
            let now = Timestamp(date: Date())
            let snapshot = try await db.collection("promoCodes")
                .whereField("isActive", isEqualTo: true)
                .whereField("validUntil", isGreaterThan: now)
                .order(by: "validUntil")
                .limit(to: 10)
                .getDocuments()

            availableCodes = snapshot.documents.map { doc in
                parsePromoCode(id: doc.documentID, data: doc.data())
            }.filter { $0.isValid }
        } catch {
        }
    }

    // Record promo code usage
    func recordUsage(code: PromoCode, orderId: String) async {
        do {
            try await db.collection("promoCodes").document(code.id).updateData([
                "usedCount": FieldValue.increment(Int64(1))
            ])

            // Record usage for analytics
            try await db.collection("promoCodeUsage").addDocument(data: [
                "codeId": code.id,
                "code": code.code,
                "orderId": orderId,
                "userId": AuthService.shared.userProfile?.id ?? "",
                "usedAt": Timestamp(date: Date())
            ])
        } catch {
        }
    }
}

// MARK: - Promo Code Input View
struct PromoCodeInputView: View {
    let orderTotal: Double
    let deliveryFee: Double
    let shopId: String?

    @StateObject private var promoService = PromoCodeService.shared
    @State private var codeInput = ""
    @State private var showAvailableCodes = false
    @FocusState private var isInputFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Image(systemName: "tag.fill")
                    .foregroundColor(Color(hex: "#8B5CF6"))
                Text("Code promo")
                    .font(.subheadline)
                    .fontWeight(.medium)

                Spacer()

                if !promoService.availableCodes.isEmpty {
                    Button(action: { showAvailableCodes = true }) {
                        Text("Voir les codes")
                            .font(.caption)
                            .foregroundColor(Color(hex: "#8B5CF6"))
                    }
                }
            }

            if let applied = promoService.appliedPromo {
                // Applied promo display
                AppliedPromoView(promo: applied) {
                    promoService.removePromo()
                }
            } else {
                // Input field
                HStack(spacing: 12) {
                    TextField("Entrez votre code", text: $codeInput)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(10)
                        .focused($isInputFocused)

                    Button(action: applyCode) {
                        if promoService.isValidating {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Appliquer")
                                .fontWeight(.medium)
                        }
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 14)
                    .background(codeInput.isEmpty ? Color.gray : Color(hex: "#8B5CF6"))
                    .cornerRadius(10)
                    .disabled(codeInput.isEmpty || promoService.isValidating)
                }

                // Error message
                if let error = promoService.errorMessage {
                    HStack(spacing: 4) {
                        Image(systemName: "exclamationmark.circle.fill")
                        Text(error)
                    }
                    .font(.caption)
                    .foregroundColor(.red)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
        .sheet(isPresented: $showAvailableCodes) {
            AvailablePromoCodesSheet(
                orderTotal: orderTotal,
                deliveryFee: deliveryFee,
                shopId: shopId
            )
        }
        .task {
            await promoService.loadAvailableCodes()
        }
    }

    func applyCode() {
        isInputFocused = false
        Task {
            if let _ = await promoService.validateCode(
                codeInput,
                orderTotal: orderTotal,
                deliveryFee: deliveryFee,
                shopId: shopId
            ) {
                codeInput = ""
            }
        }
    }
}

// MARK: - Applied Promo View
struct AppliedPromoView: View {
    let promo: AppliedPromo
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color(hex: "#22C55E").opacity(0.15))
                    .frame(width: 40, height: 40)
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(Color(hex: "#22C55E"))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(promo.code.code)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Text(promo.code.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Text(promo.formattedDiscount)
                .font(.headline)
                .foregroundColor(Color(hex: "#22C55E"))

            Button(action: onRemove) {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(hex: "#22C55E").opacity(0.1))
        .cornerRadius(12)
    }
}

// MARK: - Available Promo Codes Sheet
struct AvailablePromoCodesSheet: View {
    let orderTotal: Double
    let deliveryFee: Double
    let shopId: String?

    @StateObject private var promoService = PromoCodeService.shared
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                if promoService.availableCodes.isEmpty {
                    ContentUnavailableView(
                        "Aucun code disponible",
                        systemImage: "tag.slash",
                        description: Text("Revenez plus tard pour decouvrir nos offres")
                    )
                } else {
                    ForEach(promoService.availableCodes) { code in
                        PromoCodeCard(code: code) {
                            Task {
                                if let _ = await promoService.validateCode(
                                    code.code,
                                    orderTotal: orderTotal,
                                    deliveryFee: deliveryFee,
                                    shopId: shopId
                                ) {
                                    dismiss()
                                }
                            }
                        }
                    }
                }
            }
            .listStyle(.plain)
            .navigationTitle("Codes promo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

// MARK: - Promo Code Card
struct PromoCodeCard: View {
    let code: PromoCode
    let onApply: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                // Code badge
                Text(code.code)
                    .font(.caption)
                    .fontWeight(.bold)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color(hex: "#8B5CF6").opacity(0.15))
                    .foregroundColor(Color(hex: "#8B5CF6"))
                    .cornerRadius(6)

                Spacer()

                // Discount badge
                Text(code.formattedDiscount)
                    .font(.headline)
                    .foregroundColor(Color(hex: "#22C55E"))
            }

            Text(code.description)
                .font(.subheadline)

            // Conditions
            HStack(spacing: 16) {
                if let minimum = code.minimumOrder {
                    Label("Min. \(String(format: "%.0f", minimum)) €", systemImage: "cart.fill")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Label(
                    "Jusqu'au \(code.validUntil.formatted(date: .abbreviated, time: .omitted))",
                    systemImage: "calendar"
                )
                .font(.caption)
                .foregroundColor(.secondary)
            }

            Button(action: onApply) {
                Text("Utiliser ce code")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color(hex: "#8B5CF6"))
                    .cornerRadius(10)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - Checkout Summary with Promo
struct CheckoutSummaryView: View {
    let subtotal: Double
    let deliveryFee: Double
    let appliedPromo: AppliedPromo?
    let tip: Double?

    var discount: Double {
        appliedPromo?.discountAmount ?? 0
    }

    var total: Double {
        subtotal + deliveryFee - discount + (tip ?? 0)
    }

    var body: some View {
        VStack(spacing: 12) {
            // Subtotal
            HStack {
                Text("Sous-total")
                    .foregroundColor(.secondary)
                Spacer()
                Text(String(format: "%.2f €", subtotal))
            }

            // Delivery fee
            HStack {
                Text("Frais de livraison")
                    .foregroundColor(.secondary)
                Spacer()
                if appliedPromo?.code.discountType == .freeDelivery {
                    Text(String(format: "%.2f €", deliveryFee))
                        .strikethrough()
                        .foregroundColor(.secondary)
                    Text("GRATUIT")
                        .foregroundColor(Color(hex: "#22C55E"))
                        .fontWeight(.medium)
                } else {
                    Text(String(format: "%.2f €", deliveryFee))
                }
            }

            // Discount
            if discount > 0 {
                HStack {
                    HStack(spacing: 4) {
                        Image(systemName: "tag.fill")
                            .foregroundColor(Color(hex: "#8B5CF6"))
                        Text(appliedPromo?.code.code ?? "Reduction")
                    }
                    .foregroundColor(Color(hex: "#8B5CF6"))

                    Spacer()

                    Text("-\(String(format: "%.2f €", discount))")
                        .foregroundColor(Color(hex: "#22C55E"))
                        .fontWeight(.medium)
                }
            }

            // Tip
            if let tip = tip, tip > 0 {
                HStack {
                    HStack(spacing: 4) {
                        Image(systemName: "heart.fill")
                            .foregroundColor(Color(hex: "#F59E0B"))
                        Text("Pourboire")
                    }
                    .foregroundColor(.secondary)

                    Spacer()

                    Text(String(format: "%.2f €", tip))
                }
            }

            Divider()

            // Total
            HStack {
                Text("Total")
                    .font(.headline)
                Spacer()
                Text(String(format: "%.2f €", total))
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(Color(hex: "#22C55E"))
            }
        }
        .font(.subheadline)
    }
}
