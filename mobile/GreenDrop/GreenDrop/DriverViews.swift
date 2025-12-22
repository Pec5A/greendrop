import SwiftUI
import MapKit
import CoreLocation
import FirebaseFirestore

// MARK: - Driver Dashboard View
struct DriverDashboardView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var dataService = DataService.shared
    @State private var isOnline = true
    @State private var showFullMap = false
    @State private var showEarningsHistory = false
    @State private var showDeliveryHistory = false
    @State private var showTipsSummary = false
    @State private var deliveryForMap: Delivery? = nil

    var stats: DriverStats {
        guard let userId = authService.userProfile?.id else { return .empty }
        return dataService.getDriverStats(driverId: userId)
    }

    var activeDelivery: Delivery? {
        guard let userId = authService.userProfile?.id else { return nil }
        return dataService.getActiveDelivery(forDriver: userId)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Online Status Toggle Card
                    OnlineStatusCard(isOnline: $isOnline)

                    // Active Delivery Card
                    if let delivery = activeDelivery {
                        ActiveDeliveryCard(delivery: delivery)
                    } else if isOnline {
                        // Waiting for delivery card
                        WaitingForDeliveryCard()
                    }

                    // Today's Summary Card
                    TodaySummaryCard(stats: stats)

                    // Stats Grid
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                        DriverStatCard(
                            title: "Livraisons aujourd'hui",
                            value: "\(stats.todayDeliveries)",
                            icon: "bicycle",
                            color: "#22C55E",
                            trend: nil
                        )

                        DriverStatCard(
                            title: "Gains aujourd'hui",
                            value: String(format: "%.2f €", stats.todayEarnings),
                            icon: "eurosign.circle.fill",
                            color: "#3B82F6",
                            trend: nil
                        )

                        DriverStatCard(
                            title: "Total livraisons",
                            value: "\(stats.totalDeliveries)",
                            icon: "checkmark.seal.fill",
                            color: "#8B5CF6",
                            trend: nil
                        )

                        DriverStatCard(
                            title: "Note moyenne",
                            value: String(format: "%.1f ⭐", stats.rating),
                            icon: "star.fill",
                            color: "#F59E0B",
                            trend: nil
                        )
                    }

                    // Quick Actions
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Actions rapides")
                            .font(.headline)

                        HStack(spacing: 12) {
                            QuickActionButton(title: "Historique", icon: "clock.fill", color: "#6B7280") {
                                showDeliveryHistory = true
                            }
                            QuickActionButton(title: "Gains", icon: "chart.bar.fill", color: "#22C55E") {
                                showEarningsHistory = true
                            }
                            QuickActionButton(title: "Pourboires", icon: "heart.fill", color: "#F59E0B") {
                                showTipsSummary = true
                            }
                        }
                    }

                    // Performance Tips
                    PerformanceTipsCard()
                }
                .padding()
            }
            .navigationTitle("Dashboard")
            .onChange(of: isOnline) { _, online in
                Task {
                    await dataService.updateDriverStatus(online ? "online" : "offline")
                }
            }
            .fullScreenCover(isPresented: $showFullMap) {
                DriverFullMapView(delivery: $deliveryForMap)
            }
            .onChange(of: activeDelivery) { _, newDelivery in
                deliveryForMap = newDelivery
            }
            .onAppear {
                deliveryForMap = activeDelivery
            }
            .sheet(isPresented: $showEarningsHistory) {
                DriverEarningsHistoryView()
            }
            .sheet(isPresented: $showDeliveryHistory) {
                DriverDeliveryHistoryView()
            }
            .sheet(isPresented: $showTipsSummary) {
                DriverTipsSummaryView()
            }
        }
    }
}

// MARK: - Online Status Card
struct OnlineStatusCard: View {
    @Binding var isOnline: Bool

    var body: some View {
        HStack {
            // Status indicator
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(isOnline ? Color(hex: "#22C55E").opacity(0.2) : Color(.systemGray4).opacity(0.5))
                        .frame(width: 50, height: 50)

                    Circle()
                        .fill(isOnline ? Color(hex: "#22C55E") : Color(.systemGray3))
                        .frame(width: 16, height: 16)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(isOnline ? "En ligne" : "Hors ligne")
                        .font(.headline)
                    Text(isOnline ? "Vous recevez des livraisons" : "Vous ne recevez pas de livraisons")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            Toggle("", isOn: $isOnline)
                .tint(Color(hex: "#22C55E"))
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(isOnline ? Color(hex: "#22C55E").opacity(0.08) : Color(.systemGray6))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(isOnline ? Color(hex: "#22C55E").opacity(0.3) : Color.clear, lineWidth: 1)
        )
    }
}

// MARK: - Waiting For Delivery Card
struct WaitingForDeliveryCard: View {
    @State private var pulseAnimation = false

    var body: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(Color(hex: "#22C55E").opacity(0.1))
                    .frame(width: 80, height: 80)
                    .scaleEffect(pulseAnimation ? 1.2 : 1.0)
                    .opacity(pulseAnimation ? 0 : 1)

                Image(systemName: "bicycle")
                    .font(.system(size: 36))
                    .foregroundColor(Color(hex: "#22C55E"))
            }
            .onAppear {
                withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: false)) {
                    pulseAnimation = true
                }
            }

            Text("En attente de livraisons")
                .font(.headline)

            Text("Les nouvelles commandes apparaîtront ici")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
    }
}

// MARK: - Today's Summary Card
struct TodaySummaryCard: View {
    let stats: DriverStats

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Résumé du jour")
                    .font(.headline)
                Spacer()
                Text(Date().formatted(date: .abbreviated, time: .omitted))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            HStack(spacing: 0) {
                // Deliveries
                VStack(spacing: 4) {
                    Text("\(stats.todayDeliveries)")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(Color(hex: "#22C55E"))
                    Text("Livraisons")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)

                Divider()
                    .frame(height: 40)

                // Earnings
                VStack(spacing: 4) {
                    Text(String(format: "%.2f €", stats.todayEarnings))
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(Color(hex: "#3B82F6"))
                    Text("Gains")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)

                Divider()
                    .frame(height: 40)

                // Avg per delivery
                VStack(spacing: 4) {
                    let avg = stats.todayDeliveries > 0 ? stats.todayEarnings / Double(stats.todayDeliveries) : 0
                    Text(String(format: "%.2f €", avg))
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(Color(hex: "#8B5CF6"))
                    Text("Moyenne")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
    }
}

// MARK: - Driver Stat Card
struct DriverStatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: String
    let trend: Double?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(Color(hex: color))
                Spacer()
                if let trend = trend {
                    HStack(spacing: 2) {
                        Image(systemName: trend >= 0 ? "arrow.up.right" : "arrow.down.right")
                            .font(.caption2)
                        Text("\(abs(Int(trend)))%")
                            .font(.caption2)
                    }
                    .foregroundColor(trend >= 0 ? Color(hex: "#22C55E") : .red)
                }
            }

            Text(value)
                .font(.title2)
                .fontWeight(.bold)

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
    }
}

// MARK: - Performance Tips Card
struct PerformanceTipsCard: View {
    private let tips = [
        ("lightbulb.fill", "Restez près des zones à forte demande", "#F59E0B"),
        ("clock.fill", "Les heures de pointe: 12h-14h et 19h-21h", "#3B82F6"),
        ("star.fill", "Gardez une bonne note pour plus de commandes", "#8B5CF6")
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Conseils")
                .font(.headline)

            VStack(spacing: 8) {
                ForEach(tips, id: \.1) { tip in
                    HStack(spacing: 12) {
                        Image(systemName: tip.0)
                            .foregroundColor(Color(hex: tip.2))
                            .frame(width: 24)

                        Text(tip.1)
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        Spacer()
                    }
                    .padding(.vertical, 8)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(16)
    }
}

// MARK: - Driver Earnings History View
struct DriverEarningsHistoryView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var authService: AuthService
    @StateObject private var dataService = DataService.shared
    @State private var selectedPeriod = "week"

    private let periods = [("week", "Semaine"), ("month", "Mois"), ("year", "Année")]

    var completedDeliveries: [Delivery] {
        guard let userId = authService.userProfile?.id else { return [] }
        return dataService.getCompletedDeliveries(forDriver: userId)
    }

    var earningsData: [(String, Double)] {
        let calendar = Calendar.current

        switch selectedPeriod {
        case "week":
            // Last 7 days
            let dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
            var result: [(String, Double)] = []
            for i in (0..<7).reversed() {
                let date = calendar.date(byAdding: .day, value: -i, to: Date()) ?? Date()
                let dayStart = calendar.startOfDay(for: date)
                let dayEnd = calendar.date(byAdding: .day, value: 1, to: dayStart) ?? dayStart
                let dayEarnings = completedDeliveries
                    .filter { ($0.deliveredAt ?? Date.distantPast) >= dayStart && ($0.deliveredAt ?? Date.distantPast) < dayEnd }
                    .reduce(0) { $0 + $1.earnings }
                let weekday = calendar.component(.weekday, from: date)
                result.append((dayNames[weekday - 1], dayEarnings))
            }
            return result

        case "month":
            // Last 4 weeks
            var result: [(String, Double)] = []
            for i in (0..<4).reversed() {
                let weekStart = calendar.date(byAdding: .weekOfYear, value: -i, to: calendar.startOfDay(for: Date())) ?? Date()
                let weekEnd = calendar.date(byAdding: .weekOfYear, value: 1, to: weekStart) ?? weekStart
                let weekEarnings = completedDeliveries
                    .filter { ($0.deliveredAt ?? Date.distantPast) >= weekStart && ($0.deliveredAt ?? Date.distantPast) < weekEnd }
                    .reduce(0) { $0 + $1.earnings }
                result.append(("S\(4 - i)", weekEarnings))
            }
            return result

        case "year":
            // Last 6 months
            let monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
            var result: [(String, Double)] = []
            for i in (0..<6).reversed() {
                let monthDate = calendar.date(byAdding: .month, value: -i, to: Date()) ?? Date()
                let components = calendar.dateComponents([.year, .month], from: monthDate)
                let monthStart = calendar.date(from: components) ?? monthDate
                let monthEnd = calendar.date(byAdding: .month, value: 1, to: monthStart) ?? monthStart
                let monthEarnings = completedDeliveries
                    .filter { ($0.deliveredAt ?? Date.distantPast) >= monthStart && ($0.deliveredAt ?? Date.distantPast) < monthEnd }
                    .reduce(0) { $0 + $1.earnings }
                let monthIndex = calendar.component(.month, from: monthDate) - 1
                result.append((monthNames[monthIndex], monthEarnings))
            }
            return result

        default:
            return []
        }
    }

    var totalEarnings: Double {
        earningsData.reduce(0) { $0 + $1.1 }
    }

    var periodLabel: String {
        switch selectedPeriod {
        case "week": return "cette semaine"
        case "month": return "ce mois"
        case "year": return "cette année"
        default: return ""
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Period Selector
                    Picker("Période", selection: $selectedPeriod) {
                        ForEach(periods, id: \.0) { period in
                            Text(period.1).tag(period.0)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)

                    // Total Card
                    VStack(spacing: 8) {
                        Text("Total")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Text(String(format: "%.2f €", totalEarnings))
                            .font(.system(size: 42, weight: .bold))
                            .foregroundColor(Color(hex: "#22C55E"))
                        Text(periodLabel)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 24)

                    // Chart
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Gains par jour")
                            .font(.headline)
                            .padding(.horizontal)

                        EarningsBarChart(data: earningsData)
                            .frame(height: 200)
                            .padding(.horizontal)
                    }
                    .padding(.vertical)
                    .background(Color(.systemBackground))
                    .cornerRadius(16)
                    .shadow(color: .black.opacity(0.05), radius: 10)
                    .padding(.horizontal)

                    // Daily breakdown
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Détail")
                            .font(.headline)
                            .padding(.horizontal)

                        if earningsData.allSatisfy({ $0.1 == 0 }) {
                            HStack {
                                Spacer()
                                Text("Aucun gain pour cette période")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                    .padding(.vertical, 20)
                                Spacer()
                            }
                        } else {
                            ForEach(earningsData.reversed(), id: \.0) { day, amount in
                                HStack {
                                    Text(day)
                                        .fontWeight(.medium)
                                    Spacer()
                                    Text(String(format: "%.2f €", amount))
                                        .foregroundColor(Color(hex: "#22C55E"))
                                }
                                .padding(.horizontal)
                                .padding(.vertical, 8)

                                if day != earningsData.first?.0 {
                                    Divider()
                                        .padding(.horizontal)
                                }
                            }
                        }
                    }
                    .padding(.vertical)
                    .background(Color(.systemBackground))
                    .cornerRadius(16)
                    .shadow(color: .black.opacity(0.05), radius: 10)
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .navigationTitle("Historique des gains")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Fermer") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Earnings Bar Chart
struct EarningsBarChart: View {
    let data: [(String, Double)]

    var maxValue: Double {
        data.map(\.1).max() ?? 1
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: 12) {
            ForEach(data, id: \.0) { item in
                VStack(spacing: 8) {
                    Text(String(format: "%.0f€", item.1))
                        .font(.caption2)
                        .foregroundColor(.secondary)

                    RoundedRectangle(cornerRadius: 6)
                        .fill(
                            LinearGradient(
                                colors: [Color(hex: "#22C55E"), Color(hex: "#22C55E").opacity(0.6)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .frame(height: CGFloat(item.1 / maxValue) * 140)

                    Text(item.0)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }
}

// MARK: - Driver Delivery History View
struct DriverDeliveryHistoryView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var authService: AuthService
    @StateObject private var dataService = DataService.shared

    var completedDeliveries: [Delivery] {
        guard let userId = authService.userProfile?.id else { return [] }
        return dataService.getCompletedDeliveries(forDriver: userId)
    }

    var body: some View {
        NavigationStack {
            Group {
                if completedDeliveries.isEmpty {
                    ContentUnavailableView(
                        "Pas d'historique",
                        systemImage: "clock.arrow.circlepath",
                        description: Text("Vos livraisons terminées apparaîtront ici")
                    )
                } else {
                    List {
                        ForEach(completedDeliveries) { delivery in
                            DeliveryHistoryRow(delivery: delivery)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Historique")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Fermer") { dismiss() }
                }
            }
        }
    }
}

struct DeliveryHistoryRow: View {
    let delivery: Delivery

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(delivery.shopName)
                        .font(.headline)

                    if let deliveredAt = delivery.deliveredAt {
                        Text(deliveredAt.formatted(date: .abbreviated, time: .shortened))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                Text(String(format: "+%.2f €", delivery.earnings))
                    .font(.headline)
                    .foregroundColor(Color(hex: "#22C55E"))
            }

            HStack(spacing: 16) {
                Label(String(format: "%.1f km", delivery.distance), systemImage: "arrow.triangle.swap")
                Label(delivery.status.displayName, systemImage: "checkmark.circle.fill")
            }
            .font(.caption)
            .foregroundColor(.secondary)
        }
        .padding(.vertical, 8)
    }
}

struct ActiveDeliveryCard: View {
    let delivery: Delivery
    @StateObject private var dataService = DataService.shared
    @State private var showFullMap = false
    @State private var driverLocation: CLLocationCoordinate2D? = nil
    @State private var deliveryForMap: Delivery? = nil
    @State private var eta: String? = nil
    @State private var showDeliveryProof = false
    @State private var showChat = false
    @State private var showDeliverySuccess = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Livraison en cours")
                        .font(.headline)
                    Text(delivery.shopName)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Text(delivery.status.displayName)
                    .font(.caption)
                    .fontWeight(.medium)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color(hex: "#22C55E").opacity(0.15))
                    .foregroundColor(Color(hex: "#22C55E"))
                    .cornerRadius(8)

                if let eta = eta {
                    Text(eta)
                        .font(.caption)
                        .fontWeight(.medium)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(hex: "#3B82F6").opacity(0.15))
                        .foregroundColor(Color(hex: "#3B82F6"))
                        .cornerRadius(6)
                }
            }

            // Mini Map Preview
            DeliveryRouteMapView(
                shopCoordinate: delivery.shopCoordinate,
                customerCoordinate: delivery.customerCoordinate,
                shopName: delivery.shopName,
                customerName: delivery.customerName,
                driverLocation: $driverLocation
            )
            .frame(height: 150)
            .cornerRadius(12)
            .onTapGesture {
                showFullMap = true
            }

            Divider()

            // Pickup
            HStack(spacing: 12) {
                Image(systemName: "storefront.fill")
                    .foregroundColor(Color(hex: "#22C55E"))
                    .frame(width: 24)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Récupération")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(delivery.shopAddress)
                        .font(.subheadline)
                }
            }

            // Delivery
            HStack(spacing: 12) {
                Image(systemName: "mappin.circle.fill")
                    .foregroundColor(.red)
                    .frame(width: 24)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Livraison")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(delivery.customerAddress)
                        .font(.subheadline)
                }
            }

            // Action Buttons
            HStack(spacing: 8) {
                Button(action: { showFullMap = true }) {
                    Label("Carte", systemImage: "map.fill")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color(hex: "#22C55E"))
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }

                Button(action: { showChat = true }) {
                    Label("Chat", systemImage: "message.fill")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color(hex: "#8B5CF6"))
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }

                Button(action: { updateStatus() }) {
                    Text(nextStatusButtonTitle)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(delivery.status == .delivering ? Color(hex: "#22C55E") : Color(hex: "#3B82F6"))
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.08), radius: 12, x: 0, y: 4)
        .fullScreenCover(isPresented: $showFullMap) {
            DriverFullMapView(delivery: $deliveryForMap)
        }
        .sheet(isPresented: $showDeliveryProof) {
            DeliveryCodeEntryView(delivery: delivery) {
                completeDeliveryWithProof()
            }
        }
        .fullScreenCover(isPresented: $showChat) {
            DeliveryChatView(delivery: delivery)
        }
        .alert("Livraison terminée !", isPresented: $showDeliverySuccess) {
            Button("OK") {}
        } message: {
            Text("La commande a été livrée avec succès. Gains: +\(String(format: "%.2f €", delivery.earnings))")
        }
        .onAppear {
            deliveryForMap = delivery
        }
        .task {
            await calculateETA()
        }
    }

    func calculateETA() async {
        let dest: CLLocationCoordinate2D = (delivery.status == .accepted || delivery.status == .atShop)
            ? delivery.shopCoordinate
            : delivery.customerCoordinate
        let request = MKDirections.Request()
        request.source = MKMapItem.forCurrentLocation()
        request.destination = MKMapItem(placemark: MKPlacemark(coordinate: dest))
        request.transportType = .automobile
        if let response = try? await MKDirections(request: request).calculate(),
           let route = response.routes.first {
            eta = "\(Int(route.expectedTravelTime / 60)) min"
        }
    }

    var nextStatusButtonTitle: String {
        switch delivery.status {
        case .accepted: return "Au magasin"
        case .atShop: return "Récupérée"
        case .pickedUp: return "En route"
        case .delivering: return "Livrée"
        default: return "Suivant"
        }
    }

    func updateStatus() {
        // If delivery is in progress and about to be marked as delivered, show proof capture
        if delivery.status == .delivering {
            showDeliveryProof = true
            return
        }

        let nextStatus: DeliveryStatus
        switch delivery.status {
        case .accepted: nextStatus = .atShop
        case .atShop: nextStatus = .pickedUp
        case .pickedUp: nextStatus = .delivering
        default: return
        }
        Task {
            await dataService.updateDeliveryStatus(delivery.id, status: nextStatus)
        }
    }

    func completeDeliveryWithProof() {
        Task {
            await dataService.updateDeliveryStatus(delivery.id, status: .delivered)
            showDeliverySuccess = true
        }
    }
}

struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(Color(hex: color))
                Text(title)
                    .font(.caption)
                    .foregroundColor(.primary)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }
}

// MARK: - Driver Deliveries View
struct DriverDeliveriesView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var dataService = DataService.shared
    @State private var selectedTab = 0

    var availableDeliveries: [Delivery] {
        dataService.getAvailableDeliveries()
    }

    var completedDeliveries: [Delivery] {
        guard let userId = authService.userProfile?.id else { return [] }
        return dataService.getCompletedDeliveries(forDriver: userId)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("", selection: $selectedTab) {
                    Text("Disponibles").tag(0)
                    Text("Historique").tag(1)
                }
                .pickerStyle(.segmented)
                .padding()

                if selectedTab == 0 {
                    if availableDeliveries.isEmpty {
                        Spacer()
                        VStack(spacing: 12) {
                            Image(systemName: "bicycle")
                                .font(.system(size: 50))
                                .foregroundColor(.secondary)
                            Text("Aucune livraison disponible")
                                .foregroundColor(.secondary)
                            Text("Revenez plus tard!")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 16) {
                                ForEach(availableDeliveries) { delivery in
                                    AvailableDeliveryCard(delivery: delivery)
                                }
                            }
                            .padding()
                        }
                    }
                } else {
                    if completedDeliveries.isEmpty {
                        Spacer()
                        VStack(spacing: 12) {
                            Image(systemName: "clock.arrow.circlepath")
                                .font(.system(size: 50))
                                .foregroundColor(.secondary)
                            Text("Aucun historique")
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 16) {
                                ForEach(completedDeliveries) { delivery in
                                    CompletedDeliveryCard(delivery: delivery)
                                }
                            }
                            .padding()
                        }
                    }
                }
            }
            .navigationTitle("Livraisons")
        }
    }
}

struct AvailableDeliveryCard: View {
    let delivery: Delivery
    @EnvironmentObject var authService: AuthService
    @StateObject private var dataService = DataService.shared
    @State private var isAccepting = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(delivery.shopName)
                        .font(.headline)
                    Text(String(format: "%.1f km", delivery.distance))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text(String(format: "%.2f €", delivery.earnings))
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(Color(hex: "#22C55E"))
                    Text("Gain")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Divider()

            // Pickup
            HStack(spacing: 12) {
                Circle()
                    .fill(Color(hex: "#22C55E"))
                    .frame(width: 10, height: 10)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Récupération")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(delivery.shopAddress)
                        .font(.subheadline)
                        .lineLimit(1)
                }
            }

            // Delivery
            HStack(spacing: 12) {
                Circle()
                    .fill(.red)
                    .frame(width: 10, height: 10)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Livraison à")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(delivery.customerAddress)
                        .font(.subheadline)
                        .lineLimit(1)
                }
            }

            Button(action: acceptDelivery) {
                HStack {
                    if isAccepting {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Accepter la livraison")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(hex: "#22C55E"))
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(isAccepting)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
    }

    func acceptDelivery() {
        guard let userId = authService.userProfile?.id else { return }
        isAccepting = true

        Task {
            await dataService.acceptDelivery(delivery.id, driverId: userId)
            isAccepting = false
        }
    }
}

struct CompletedDeliveryCard: View {
    let delivery: Delivery

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(delivery.shopName)
                    .font(.headline)

                if let deliveredAt = delivery.deliveredAt {
                    Text(deliveredAt.formatted(date: .abbreviated, time: .shortened))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Text(delivery.customerAddress)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(String(format: "%.2f €", delivery.earnings))
                    .font(.headline)
                    .foregroundColor(Color(hex: "#22C55E"))

                HStack(spacing: 2) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(Color(hex: "#22C55E"))
                    Text("Livrée")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.03), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Delivery Code Entry View
struct DeliveryCodeEntryView: View {
    let delivery: Delivery
    let onComplete: () -> Void

    @StateObject private var locationManager = LocationManager()
    @Environment(\.dismiss) private var dismiss

    @State private var enteredCode = ""
    @State private var errorMessage: String?
    @State private var isVerifying = false
    @State private var isWaitingForGPS = true
    @State private var distanceToClient: Double?
    @FocusState private var isCodeFocused: Bool

    /// Maximum distance in meters to consider the driver "at" the client
    private let proximityThreshold: Double = 200

    var isNearClient: Bool {
        guard let distance = distanceToClient else { return false }
        return distance <= proximityThreshold
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                // Header
                VStack(spacing: 8) {
                    Image(systemName: "lock.shield.fill")
                        .font(.system(size: 60))
                        .foregroundColor(Color(hex: "#22C55E"))

                    Text("Confirmer la livraison")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Demandez le code à 4 chiffres au client")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }

                // GPS proximity indicator
                HStack(spacing: 12) {
                    if isWaitingForGPS {
                        ProgressView()
                            .tint(Color(hex: "#22C55E"))
                    } else {
                        Image(systemName: isNearClient ? "location.fill" : "location.slash.fill")
                            .foregroundColor(isNearClient ? Color(hex: "#22C55E") : .orange)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        if isWaitingForGPS {
                            Text("Localisation en cours...")
                                .font(.subheadline)
                                .fontWeight(.medium)
                            Text("Recherche de votre position GPS")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        } else if isNearClient {
                            Text("Position confirmée")
                                .font(.subheadline)
                                .fontWeight(.medium)
                            if let dist = distanceToClient {
                                Text("Vous êtes à \(Int(dist))m du client")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        } else {
                            Text("Vous êtes trop loin du client")
                                .font(.subheadline)
                                .fontWeight(.medium)
                            if let dist = distanceToClient {
                                Text("Distance: \(Int(dist))m (max \(Int(proximityThreshold))m)")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(isWaitingForGPS ? Color.blue.opacity(0.1) : (isNearClient ? Color(hex: "#22C55E").opacity(0.1) : Color.orange.opacity(0.1)))
                .cornerRadius(12)
                .padding(.horizontal)

                // Code Entry
                VStack(spacing: 12) {
                    TextField("0000", text: $enteredCode)
                        .font(.system(size: 40, weight: .bold, design: .monospaced))
                        .multilineTextAlignment(.center)
                        .keyboardType(.numberPad)
                        .focused($isCodeFocused)
                        .onChange(of: enteredCode) { _, newValue in
                            let filtered = String(newValue.prefix(4).filter { $0.isNumber })
                            if filtered != newValue {
                                enteredCode = filtered
                            }
                            errorMessage = nil
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                        .padding(.horizontal, 60)

                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }

                // Validate button
                Button(action: validateCode) {
                    HStack {
                        if isVerifying {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Image(systemName: "checkmark.circle.fill")
                            Text("Valider la livraison")
                                .fontWeight(.semibold)
                        }
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(canValidate ? Color(hex: "#22C55E") : Color.gray)
                    .cornerRadius(12)
                }
                .disabled(!canValidate)
                .padding(.horizontal)

                Spacer()
            }
            .navigationTitle("Code de livraison")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") { dismiss() }
                }
            }
            .onAppear {
                locationManager.requestPermission()
                locationManager.startUpdating()
                isCodeFocused = true
            }
            .onReceive(locationManager.$location) { newLocation in
                guard let loc = newLocation else { return }
                isWaitingForGPS = false
                let driverCL = CLLocation(latitude: loc.latitude, longitude: loc.longitude)
                let clientCL = CLLocation(latitude: delivery.customerLatitude, longitude: delivery.customerLongitude)
                distanceToClient = driverCL.distance(from: clientCL)
            }
        }
    }

    var canValidate: Bool {
        enteredCode.count == 4 && isNearClient && !isVerifying
    }

    func validateCode() {
        isVerifying = true
        errorMessage = nil

        // Fetch the order's delivery code from Firestore
        Task {
            let db = DataService.shared
            if let order = db.orders.first(where: { $0.id == delivery.orderId }),
               let code = order.deliveryCode {
                if enteredCode == code {
                    onComplete()
                    dismiss()
                } else {
                    errorMessage = "Code incorrect. Veuillez réessayer."
                }
            } else {
                // Fallback: fetch from Firestore directly
                do {
                    let doc = try await Firestore.firestore().collection("orders").document(delivery.orderId).getDocument()
                    let firestoreCode = doc.data()?["deliveryCode"] as? String
                    if let firestoreCode = firestoreCode, enteredCode == firestoreCode {
                        onComplete()
                        dismiss()
                    } else {
                        errorMessage = "Code incorrect. Veuillez réessayer."
                    }
                } catch {
                    errorMessage = "Erreur de vérification. Réessayez."
                }
            }
            isVerifying = false
        }
    }
}
