import SwiftUI
import FirebaseFirestore

// MARK: - Tip Model
struct Tip: Identifiable, Codable {
    let id: String
    let orderId: String
    let driverId: String
    let userId: String
    let amount: Double
    let status: TipStatus
    let createdAt: Date
    let paidAt: Date?

    enum TipStatus: String, Codable {
        case pending = "pending"
        case paid = "paid"
        case failed = "failed"
    }
}

// MARK: - Tip Service
@MainActor
final class TipService: ObservableObject {
    static let shared = TipService()

    @Published var selectedTip: Double = 0
    @Published var isProcessing = false

    private let db = Firestore.firestore()

    // Preset tip amounts
    let presets: [Double] = [1, 2, 3, 5]

    // Percentage presets (of order total)
    let percentagePresets: [Int] = [10, 15, 20]

    private init() {}

    // Set tip amount
    func setTip(_ amount: Double) {
        selectedTip = max(0, amount)
    }

    // Calculate tip from percentage
    func tipFromPercentage(_ percentage: Int, orderTotal: Double) -> Double {
        return orderTotal * Double(percentage) / 100
    }

    // Clear tip
    func clearTip() {
        selectedTip = 0
    }

    // Process tip after order
    func processTip(orderId: String, driverId: String, amount: Double) async throws {
        guard let userId = AuthService.shared.userProfile?.id else {
            throw NSError(domain: "TipService", code: 401, userInfo: [NSLocalizedDescriptionKey: "User not authenticated"])
        }

        guard amount > 0 else { return }

        isProcessing = true
        defer { isProcessing = false }

        let tipData: [String: Any] = [
            "orderId": orderId,
            "driverId": driverId,
            "userId": userId,
            "amount": amount,
            "status": "pending",
            "createdAt": Timestamp(date: Date())
        ]

        // Save tip to Firestore
        try await db.collection("tips").addDocument(data: tipData)

        // Update order with tip
        try await db.collection("orders").document(orderId).updateData([
            "tip": amount,
            "tipStatus": "pending"
        ])

        // Update driver's pending tips
        try await db.collection("drivers").document(driverId).updateData([
            "pendingTips": FieldValue.increment(amount)
        ])

        // Clear selected tip
        selectedTip = 0
    }

    // Get driver's total tips
    func getDriverTips(driverId: String) async -> (total: Double, pending: Double) {
        do {
            let snapshot = try await db.collection("tips")
                .whereField("driverId", isEqualTo: driverId)
                .getDocuments()

            var total: Double = 0
            var pending: Double = 0

            for doc in snapshot.documents {
                let amount = doc.data()["amount"] as? Double ?? 0
                let status = doc.data()["status"] as? String ?? "pending"

                total += amount
                if status == "pending" {
                    pending += amount
                }
            }

            return (total, pending)
        } catch {
            return (0, 0)
        }
    }
}

// MARK: - Tip Selection View (for checkout)
struct TipSelectionView: View {
    let orderTotal: Double
    @StateObject private var tipService = TipService.shared
    @State private var customAmount = ""
    @State private var showCustomInput = false
    @State private var selectedPreset: Double?
    @State private var selectedPercentage: Int?

    var tipAmount: Double {
        tipService.selectedTip
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                Image(systemName: "heart.fill")
                    .foregroundColor(Color(hex: "#F59E0B"))
                Text("Ajouter un pourboire")
                    .font(.subheadline)
                    .fontWeight(.medium)

                Spacer()

                if tipAmount > 0 {
                    Text(String(format: "+%.2f €", tipAmount))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(Color(hex: "#22C55E"))
                }
            }

            Text("100% du pourboire va au livreur")
                .font(.caption)
                .foregroundColor(.secondary)

            // Preset amounts
            VStack(spacing: 12) {
                // Fixed amounts
                HStack(spacing: 8) {
                    // No tip option
                    TipOptionButton(
                        label: "Non",
                        sublabel: nil,
                        isSelected: tipAmount == 0 && !showCustomInput,
                        color: "#6B7280"
                    ) {
                        selectNoTip()
                    }

                    ForEach(tipService.presets, id: \.self) { amount in
                        TipOptionButton(
                            label: "\(Int(amount)) €",
                            sublabel: nil,
                            isSelected: selectedPreset == amount,
                            color: "#F59E0B"
                        ) {
                            selectPreset(amount)
                        }
                    }
                }

                // Percentage options
                HStack(spacing: 8) {
                    ForEach(tipService.percentagePresets, id: \.self) { percentage in
                        let amount = tipService.tipFromPercentage(percentage, orderTotal: orderTotal)
                        TipOptionButton(
                            label: "\(percentage)%",
                            sublabel: String(format: "%.2f €", amount),
                            isSelected: selectedPercentage == percentage,
                            color: "#8B5CF6"
                        ) {
                            selectPercentage(percentage)
                        }
                    }

                    // Custom option
                    TipOptionButton(
                        label: "Autre",
                        sublabel: nil,
                        isSelected: showCustomInput,
                        color: "#3B82F6"
                    ) {
                        showCustomInput = true
                        selectedPreset = nil
                        selectedPercentage = nil
                    }
                }
            }

            // Custom amount input
            if showCustomInput {
                HStack {
                    TextField("Montant", text: $customAmount)
                        .keyboardType(.decimalPad)
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(10)
                        .onChange(of: customAmount) { _, newValue in
                            if let amount = Double(newValue.replacingOccurrences(of: ",", with: ".")) {
                                tipService.setTip(amount)
                            }
                        }

                    Text("€")
                        .foregroundColor(.secondary)

                    Button("OK") {
                        showCustomInput = false
                    }
                    .foregroundColor(Color(hex: "#22C55E"))
                    .fontWeight(.medium)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
    }

    private func selectNoTip() {
        tipService.clearTip()
        selectedPreset = nil
        selectedPercentage = nil
        showCustomInput = false
        customAmount = ""
    }

    private func selectPreset(_ amount: Double) {
        tipService.setTip(amount)
        selectedPreset = amount
        selectedPercentage = nil
        showCustomInput = false
        customAmount = ""
    }

    private func selectPercentage(_ percentage: Int) {
        let amount = tipService.tipFromPercentage(percentage, orderTotal: orderTotal)
        tipService.setTip(amount)
        selectedPercentage = percentage
        selectedPreset = nil
        showCustomInput = false
        customAmount = ""
    }
}

// MARK: - Tip Option Button
struct TipOptionButton: View {
    let label: String
    let sublabel: String?
    let isSelected: Bool
    let color: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Text(label)
                    .font(.subheadline)
                    .fontWeight(.medium)

                if let sublabel = sublabel {
                    Text(sublabel)
                        .font(.caption2)
                        .foregroundColor(isSelected ? .white.opacity(0.8) : .secondary)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(isSelected ? Color(hex: color) : Color(.systemGray6))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(10)
        }
    }
}

// MARK: - Post-Delivery Tip View
struct PostDeliveryTipView: View {
    let order: Order
    @StateObject private var tipService = TipService.shared
    @Environment(\.dismiss) private var dismiss

    @State private var selectedAmount: Double = 0
    @State private var customAmount = ""
    @State private var showCustom = false
    @State private var showSuccess = false
    @State private var errorMessage: String?

    let presets: [Double] = [1, 2, 3, 5, 10]

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Color(hex: "#F59E0B").opacity(0.15))
                            .frame(width: 80, height: 80)
                        Image(systemName: "heart.fill")
                            .font(.system(size: 36))
                            .foregroundColor(Color(hex: "#F59E0B"))
                    }

                    Text("Remercier votre livreur")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Commande #\(String(order.id.prefix(8)))")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top)

                // Amount selection
                VStack(spacing: 16) {
                    // Preset amounts
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 12) {
                        ForEach(presets, id: \.self) { amount in
                            Button(action: { selectAmount(amount) }) {
                                Text("\(Int(amount)) €")
                                    .font(.headline)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 20)
                                    .background(selectedAmount == amount ? Color(hex: "#F59E0B") : Color(.systemGray6))
                                    .foregroundColor(selectedAmount == amount ? .white : .primary)
                                    .cornerRadius(12)
                            }
                        }

                        Button(action: { showCustom = true }) {
                            Text("Autre")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 20)
                                .background(showCustom ? Color(hex: "#F59E0B") : Color(.systemGray6))
                                .foregroundColor(showCustom ? .white : .primary)
                                .cornerRadius(12)
                        }
                    }

                    // Custom input
                    if showCustom {
                        HStack {
                            TextField("Montant", text: $customAmount)
                                .keyboardType(.decimalPad)
                                .font(.title2)
                                .multilineTextAlignment(.center)
                                .padding()
                                .background(Color(.systemGray6))
                                .cornerRadius(12)

                            Text("€")
                                .font(.title2)
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.horizontal)

                // Display selected amount
                if selectedAmount > 0 || !customAmount.isEmpty {
                    VStack(spacing: 4) {
                        Text("Pourboire")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(String(format: "%.2f €", finalAmount))
                            .font(.system(size: 48, weight: .bold))
                            .foregroundColor(Color(hex: "#F59E0B"))
                    }
                }

                Spacer()

                // Error
                if let error = errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                }

                // Send button
                Button(action: sendTip) {
                    HStack {
                        if tipService.isProcessing {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Image(systemName: "heart.fill")
                            Text("Envoyer le pourboire")
                        }
                    }
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(finalAmount > 0 ? Color(hex: "#F59E0B") : Color.gray)
                    .cornerRadius(14)
                }
                .disabled(finalAmount <= 0 || tipService.isProcessing)
                .padding(.horizontal)

                Button(action: { dismiss() }) {
                    Text("Pas maintenant")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.bottom)
            }
            .navigationTitle("Pourboire")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { dismiss() }
                }
            }
            .alert("Pourboire envoye !", isPresented: $showSuccess) {
                Button("OK") { dismiss() }
            } message: {
                Text("Votre livreur a ete notifie. Merci pour votre generosite !")
            }
        }
    }

    var finalAmount: Double {
        if showCustom {
            return Double(customAmount.replacingOccurrences(of: ",", with: ".")) ?? 0
        }
        return selectedAmount
    }

    func selectAmount(_ amount: Double) {
        selectedAmount = amount
        showCustom = false
        customAmount = ""
    }

    func sendTip() {
        guard let driverId = order.driverId else {
            errorMessage = "Livreur non trouve"
            return
        }

        Task {
            do {
                try await tipService.processTip(
                    orderId: order.id,
                    driverId: driverId,
                    amount: finalAmount
                )
                showSuccess = true
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}

// MARK: - Driver Tips Summary View
struct DriverTipsSummaryView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var tipService = TipService.shared
    @State private var totalTips: Double = 0
    @State private var pendingTips: Double = 0
    @State private var isLoading = true

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Mes pourboires")
                        .font(.headline)
                    Text("Total recu")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                if isLoading {
                    ProgressView()
                } else {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(String(format: "%.2f €", totalTips))
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(Color(hex: "#F59E0B"))

                        if pendingTips > 0 {
                            Text("\(String(format: "%.2f €", pendingTips)) en attente")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(hex: "#F59E0B").opacity(0.1))
        .cornerRadius(16)
        .task {
            guard let driverId = authService.userProfile?.id else { return }
            let tips = await tipService.getDriverTips(driverId: driverId)
            totalTips = tips.total
            pendingTips = tips.pending
            isLoading = false
        }
    }
}

// MARK: - Tip Badge (for order card)
struct TipBadge: View {
    let amount: Double

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "heart.fill")
                .font(.caption2)
            Text(String(format: "+%.2f €", amount))
                .font(.caption)
                .fontWeight(.medium)
        }
        .foregroundColor(Color(hex: "#F59E0B"))
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color(hex: "#F59E0B").opacity(0.15))
        .cornerRadius(6)
    }
}

// MARK: - Order Tip Prompt (shows after delivery)
struct OrderTipPrompt: View {
    let order: Order
    @State private var showTipView = false

    var body: some View {
        Button(action: { showTipView = true }) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color(hex: "#F59E0B").opacity(0.15))
                        .frame(width: 44, height: 44)
                    Image(systemName: "heart.fill")
                        .foregroundColor(Color(hex: "#F59E0B"))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("Satisfait de la livraison ?")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    Text("Laissez un pourboire a votre livreur")
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
        .sheet(isPresented: $showTipView) {
            PostDeliveryTipView(order: order)
        }
    }
}
