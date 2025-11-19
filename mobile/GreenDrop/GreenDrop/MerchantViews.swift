import SwiftUI
import Charts
import CoreLocation
import MapKit
import FirebaseStorage

// MARK: - Merchant Dashboard View
struct MerchantDashboardView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var dataService = DataService.shared
    @State private var selectedPeriod: StatsPeriod = .today

    // Get shopId from user profile
    @State private var resolvedShopId: String?

    var shopId: String { resolvedShopId ?? authService.userProfile?.shopId ?? "" }

    var stats: MerchantStats {
        dataService.getMerchantStats(shopId: shopId, period: selectedPeriod)
    }

    var recentOrders: [Order] {
        Array(dataService.getOrders(forShop: shopId).prefix(5))
    }

    var allOrders: [Order] {
        dataService.getOrders(forShop: shopId)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Period Selector
                    Picker("Période", selection: $selectedPeriod) {
                        ForEach(StatsPeriod.allCases, id: \.self) { period in
                            Text(period.title).tag(period)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)

                    // Stats Grid
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                        MerchantStatCard(
                            title: "Commandes",
                            value: "\(stats.todayOrders)",
                            icon: "bag.fill",
                            color: "#22C55E"
                        )

                        MerchantStatCard(
                            title: "Revenus",
                            value: String(format: "%.0f €", stats.todayRevenue),
                            icon: "eurosign.circle.fill",
                            color: "#3B82F6"
                        )

                        MerchantStatCard(
                            title: "En attente",
                            value: "\(stats.pendingOrders)",
                            icon: "clock.fill",
                            color: "#F59E0B",
                            trend: nil
                        )

                        MerchantStatCard(
                            title: "Produits",
                            value: "\(stats.totalProducts)",
                            icon: "cube.box.fill",
                            color: "#8B5CF6",
                            trend: nil
                        )
                    }
                    .padding(.horizontal)

                    // Revenue Chart
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Évolution des revenus")
                            .font(.headline)

                        RevenueChartView(orders: allOrders)
                            .frame(height: 200)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(16)
                    .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
                    .padding(.horizontal)

                    // Order Status Distribution
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Répartition des commandes")
                            .font(.headline)

                        OrderStatusChart(orders: allOrders)
                            .frame(height: 150)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(16)
                    .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
                    .padding(.horizontal)

                    // Top Products
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Produits populaires")
                                .font(.headline)
                            Spacer()
                            NavigationLink(destination: MerchantProductsView()) {
                                Text("Gérer")
                                    .font(.subheadline)
                                    .foregroundColor(Color(hex: "#22C55E"))
                            }
                        }

                        TopProductsView(orders: allOrders)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(16)
                    .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
                    .padding(.horizontal)

                    // Recent Orders
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Commandes récentes")
                                .font(.headline)
                            Spacer()
                            NavigationLink(destination: MerchantOrdersView()) {
                                Text("Voir tout")
                                    .font(.subheadline)
                                    .foregroundColor(Color(hex: "#22C55E"))
                            }
                        }

                        if recentOrders.isEmpty {
                            HStack {
                                Spacer()
                                VStack(spacing: 8) {
                                    Image(systemName: "tray")
                                        .font(.title)
                                        .foregroundColor(.secondary)
                                    Text("Aucune commande")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                                Spacer()
                            }
                            .padding(.vertical, 30)
                        } else {
                            ForEach(recentOrders) { order in
                                MerchantOrderRow(order: order)
                            }
                        }
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(16)
                    .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
                    .padding(.horizontal)

                    Spacer(minLength: 20)
                }
                .padding(.vertical)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Dashboard")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    NavigationLink(destination: ShopSettingsView(shopId: shopId)) {
                        Image(systemName: "storefront")
                            .foregroundColor(Color(hex: "#22C55E"))
                    }
                    .accessibilityLabel("Paramètres de la boutique")
                }
            }
            .refreshable {
                await resolveShopIdAndLoadOrders()
            }
            .task {
                await resolveShopIdAndLoadOrders()
            }
        }
    }

    private func resolveShopIdAndLoadOrders() async {
        if let profileShopId = authService.userProfile?.shopId, !profileShopId.isEmpty {
            resolvedShopId = profileShopId
            await dataService.loadOrdersForShop(shopId: profileShopId)
            return
        }
        if let userId = authService.userProfile?.id {
            if let foundShopId = await dataService.resolveShopId(forOwner: userId) {
                resolvedShopId = foundShopId
                await dataService.loadOrdersForShop(shopId: foundShopId)
            }
        }
    }
}

// MARK: - Stats Period
enum StatsPeriod: String, CaseIterable {
    case today = "today"
    case week = "week"
    case month = "month"

    var title: String {
        switch self {
        case .today: return "Aujourd'hui"
        case .week: return "Semaine"
        case .month: return "Mois"
        }
    }
}

// MARK: - Revenue Chart View
struct RevenueChartView: View {
    let orders: [Order]

    var chartData: [RevenueData] {
        // Generate last 7 days data
        let calendar = Calendar.current
        var data: [RevenueData] = []

        for i in (0..<7).reversed() {
            let date = calendar.date(byAdding: .day, value: -i, to: Date()) ?? Date()
            let dayOrders = orders.filter { calendar.isDate($0.createdAt, inSameDayAs: date) }
            let revenue = dayOrders.reduce(0) { $0 + $1.total }

            data.append(RevenueData(
                day: date.formatted(.dateTime.weekday(.abbreviated)),
                revenue: revenue
            ))
        }

        return data
    }

    var body: some View {
        Chart(chartData) { item in
            BarMark(
                x: .value("Jour", item.day),
                y: .value("Revenus", item.revenue)
            )
            .foregroundStyle(Color(hex: "#22C55E").gradient)
            .cornerRadius(4)
        }
        .chartYAxis {
            AxisMarks(position: .leading) { value in
                AxisValueLabel {
                    if let revenue = value.as(Double.self) {
                        Text("\(Int(revenue))€")
                            .font(.caption2)
                    }
                }
            }
        }
    }
}

struct RevenueData: Identifiable {
    let id = UUID()
    let day: String
    let revenue: Double
}

// MARK: - Order Status Chart
struct OrderStatusChart: View {
    let orders: [Order]

    var statusCounts: [(status: String, count: Int, color: Color)] {
        let statuses: [(OrderStatus, Color)] = [
            (.pending, Color.orange),
            (.confirmed, Color.blue),
            (.preparing, Color.purple),
            (.ready, Color.cyan),
            (.delivered, Color(hex: "#22C55E"))
        ]

        return statuses.map { status, color in
            let count = orders.filter { $0.status == status }.count
            return (status.displayName, count, color)
        }
    }

    var body: some View {
        HStack(spacing: 16) {
            // Pie Chart representation
            ZStack {
                ForEach(Array(statusCounts.enumerated()), id: \.offset) { index, item in
                    Circle()
                        .trim(from: trimStart(for: index), to: trimEnd(for: index))
                        .stroke(item.color, lineWidth: 20)
                        .rotationEffect(.degrees(-90))
                }
            }
            .frame(width: 100, height: 100)

            // Legend
            VStack(alignment: .leading, spacing: 8) {
                ForEach(Array(statusCounts.enumerated()), id: \.offset) { _, item in
                    HStack(spacing: 8) {
                        Circle()
                            .fill(item.color)
                            .frame(width: 10, height: 10)

                        Text(item.status)
                            .font(.caption)

                        Spacer()

                        Text("\(item.count)")
                            .font(.caption)
                            .fontWeight(.semibold)
                    }
                }
            }
        }
    }

    private var total: Int {
        statusCounts.reduce(0) { $0 + $1.count }
    }

    private func trimStart(for index: Int) -> CGFloat {
        let sum = statusCounts.prefix(index).reduce(0) { $0 + $1.count }
        return CGFloat(sum) / CGFloat(max(total, 1))
    }

    private func trimEnd(for index: Int) -> CGFloat {
        let sum = statusCounts.prefix(index + 1).reduce(0) { $0 + $1.count }
        return CGFloat(sum) / CGFloat(max(total, 1))
    }
}

// MARK: - Top Products View
struct TopProductsView: View {
    let orders: [Order]

    var topProducts: [(name: String, count: Int, revenue: Double)] {
        var productStats: [String: (count: Int, revenue: Double)] = [:]

        for order in orders {
            for item in order.items {
                let current = productStats[item.productName] ?? (0, 0)
                productStats[item.productName] = (current.count + item.quantity, current.revenue + item.total)
            }
        }

        return productStats
            .map { ($0.key, $0.value.count, $0.value.revenue) }
            .sorted { $0.1 > $1.1 }
            .prefix(4)
            .map { $0 }
    }

    var body: some View {
        VStack(spacing: 12) {
            if topProducts.isEmpty {
                HStack {
                    Spacer()
                    Text("Aucune vente pour le moment")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .padding(.vertical, 20)
                    Spacer()
                }
            }
            ForEach(Array(topProducts.enumerated()), id: \.offset) { index, product in
                HStack {
                    Text("\(index + 1)")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .frame(width: 24, height: 24)
                        .background(Color(hex: "#22C55E"))
                        .clipShape(Circle())

                    Text(product.name)
                        .font(.subheadline)
                        .lineLimit(1)

                    Spacer()

                    VStack(alignment: .trailing) {
                        Text("\(product.count) vendus")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(String(format: "%.2f €", product.revenue))
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(Color(hex: "#22C55E"))
                    }
                }
                .padding(.vertical, 4)

                if index < topProducts.count - 1 {
                    Divider()
                }
            }
        }
    }
}

struct MerchantStatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: String
    var trend: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(Color(hex: color))
                Spacer()

                if let trend = trend {
                    HStack(spacing: 2) {
                        Image(systemName: trend.hasPrefix("+") ? "arrow.up.right" : "arrow.down.right")
                            .font(.caption2)
                        Text(trend)
                            .font(.caption2)
                            .fontWeight(.medium)
                    }
                    .foregroundColor(trend.hasPrefix("+") ? .green : .red)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(trend.hasPrefix("+") ? Color.green.opacity(0.1) : Color.red.opacity(0.1))
                    .cornerRadius(4)
                }
            }

            Text(value)
                .font(.title2)
                .fontWeight(.bold)

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
    }
}

struct MerchantOrderRow: View {
    let order: Order
    @StateObject private var dataService = DataService.shared

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("#\(order.id.prefix(8))")
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text("\(order.items.count) articles")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(order.createdAt.formatted(date: .omitted, time: .shortened))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(String(format: "%.2f €", order.total))
                    .font(.subheadline)
                    .fontWeight(.semibold)

                StatusBadge(status: order.status)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - Merchant Orders View
struct MerchantOrdersView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var dataService = DataService.shared
    @State private var selectedFilter: OrderStatusFilter = .all
    @State private var resolvedShopId: String?

    var shopId: String { resolvedShopId ?? authService.userProfile?.shopId ?? "" }

    var filteredOrders: [Order] {
        let orders = dataService.getOrders(forShop: shopId)
        switch selectedFilter {
        case .all: return orders
        case .pending: return orders.filter { $0.status == .pending }
        case .preparing: return orders.filter { $0.status == .confirmed || $0.status == .preparing }
        case .ready: return orders.filter { $0.status == .ready }
        case .completed: return orders.filter { $0.status == .delivered || $0.status == .cancelled }
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Filter Tabs
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(OrderStatusFilter.allCases, id: \.self) { filter in
                            Button(action: { selectedFilter = filter }) {
                                Text(filter.displayName)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                                    .background(selectedFilter == filter ? Color(hex: "#22C55E") : Color(.systemGray6))
                                    .foregroundColor(selectedFilter == filter ? .white : .primary)
                                    .cornerRadius(20)
                            }
                        }
                    }
                    .padding()
                }

                if filteredOrders.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "tray")
                            .font(.system(size: 50))
                            .foregroundColor(.secondary)
                        Text("Aucune commande")
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(filteredOrders) { order in
                                MerchantOrderCard(order: order)
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Commandes")
            .refreshable {
                await resolveAndLoadOrders()
            }
            .task {
                await resolveAndLoadOrders()
            }
        }
    }

    private func resolveAndLoadOrders() async {
        if let profileShopId = authService.userProfile?.shopId, !profileShopId.isEmpty {
            resolvedShopId = profileShopId
            await dataService.loadOrdersForShop(shopId: profileShopId)
            return
        }
        if let userId = authService.userProfile?.id {
            if let foundShopId = await dataService.resolveShopId(forOwner: userId) {
                resolvedShopId = foundShopId
                await dataService.loadOrdersForShop(shopId: foundShopId)
            }
        }
    }
}

enum OrderStatusFilter: CaseIterable {
    case all, pending, preparing, ready, completed

    var displayName: String {
        switch self {
        case .all: return "Toutes"
        case .pending: return "En attente"
        case .preparing: return "En cours"
        case .ready: return "Prêtes"
        case .completed: return "Terminées"
        }
    }
}

struct MerchantOrderCard: View {
    let order: Order
    @StateObject private var dataService = DataService.shared
    @State private var isUpdating = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Commande #\(order.id.prefix(8))")
                        .font(.headline)
                    Text(order.createdAt.formatted(date: .abbreviated, time: .shortened))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                StatusBadge(status: order.status)
            }

            Divider()

            // Items
            ForEach(order.items) { item in
                HStack {
                    Text("\(item.quantity)x")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .frame(width: 30, alignment: .leading)
                    Text(item.productName)
                        .font(.subheadline)
                    Spacer()
                    Text(String(format: "%.2f €", item.total))
                        .font(.subheadline)
                }
            }

            Divider()

            // Delivery Info
            VStack(alignment: .leading, spacing: 4) {
                Label(order.deliveryAddress, systemImage: "mappin.circle.fill")
                    .font(.caption)
                    .foregroundColor(.secondary)

                if let notes = order.notes {
                    Label(notes, systemImage: "text.bubble.fill")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            HStack {
                Text("Total")
                    .font(.subheadline)
                Spacer()
                Text(String(format: "%.2f €", order.total))
                    .font(.headline)
                    .foregroundColor(Color(hex: "#22C55E"))
            }

            // Action Buttons
            if order.status != .delivered && order.status != .cancelled {
                HStack(spacing: 12) {
                    if order.status == .pending {
                        Button(action: { updateStatus(.cancelled) }) {
                            Text("Refuser")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Color.red.opacity(0.1))
                                .foregroundColor(.red)
                                .cornerRadius(10)
                        }
                    }

                    Button(action: { updateStatus(nextStatus) }) {
                        HStack {
                            if isUpdating {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text(nextStatusButtonTitle)
                                    .fontWeight(.medium)
                            }
                        }
                        .font(.subheadline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color(hex: "#22C55E"))
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }
                    .disabled(isUpdating)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
    }

    var nextStatus: OrderStatus {
        switch order.status {
        case .pending: return .confirmed
        case .confirmed: return .preparing
        case .preparing: return .ready
        default: return order.status
        }
    }

    var nextStatusButtonTitle: String {
        switch order.status {
        case .pending: return "Accepter"
        case .confirmed: return "Commencer préparation"
        case .preparing: return "Marquer prête"
        default: return "Suivant"
        }
    }

    func updateStatus(_ status: OrderStatus) {
        isUpdating = true
        Task {
            await dataService.updateOrderStatus(order.id, status: status)
            isUpdating = false
        }
    }
}

// MARK: - Merchant Products View
struct MerchantProductsView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var dataService = DataService.shared
    @State private var showAddProduct = false
    @State private var searchText = ""
    @State private var resolvedShopId: String?

    var shopId: String { resolvedShopId ?? authService.userProfile?.shopId ?? "" }

    var products: [Product] {
        let allProducts = dataService.products.filter { $0.shopId == shopId }
        if searchText.isEmpty {
            return allProducts
        }
        return allProducts.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    TextField("Rechercher un produit...", text: $searchText)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding()

                if products.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "cube.box")
                            .font(.system(size: 50))
                            .foregroundColor(.secondary)
                        Text("Aucun produit")
                            .foregroundColor(.secondary)
                        Button("Ajouter un produit") {
                            showAddProduct = true
                        }
                        .foregroundColor(Color(hex: "#22C55E"))
                    }
                    Spacer()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(products) { product in
                                MerchantProductRow(product: product)
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Produits")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showAddProduct = true }) {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(Color(hex: "#22C55E"))
                    }
                }
            }
            .sheet(isPresented: $showAddProduct) {
                AddEditProductView(shopId: shopId)
            }
            .task {
                await resolveShopIdAndLoadProducts()
            }
        }
    }

    private func resolveShopIdAndLoadProducts() async {
        if let profileShopId = authService.userProfile?.shopId, !profileShopId.isEmpty {
            resolvedShopId = profileShopId
            await dataService.loadProducts(forShop: profileShopId)
            return
        }
        if let userId = authService.userProfile?.id {
            if let foundShopId = await dataService.resolveShopId(forOwner: userId) {
                resolvedShopId = foundShopId
                await dataService.loadProducts(forShop: foundShopId)
            }
        }
    }
}

struct MerchantProductRow: View {
    let product: Product
    @StateObject private var dataService = DataService.shared
    @State private var showEdit = false

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Rectangle()
                    .fill(Color(hex: "#22C55E").opacity(0.1))
                Image(systemName: "leaf.fill")
                    .foregroundColor(Color(hex: "#22C55E"))
            }
            .frame(width: 60, height: 60)
            .cornerRadius(10)

            VStack(alignment: .leading, spacing: 4) {
                Text(product.name)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(product.category)
                    .font(.caption)
                    .foregroundColor(.secondary)

                HStack {
                    Text(product.formattedPrice)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(Color(hex: "#22C55E"))

                    Spacer()

                    Text("Stock: \(product.stock)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Menu {
                Button(action: { showEdit = true }) {
                    Label("Modifier", systemImage: "pencil")
                }

                Button(action: toggleAvailability) {
                    Label(product.isAvailable ? "Désactiver" : "Activer", systemImage: product.isAvailable ? "eye.slash" : "eye")
                }

                Button(role: .destructive, action: deleteProduct) {
                    Label("Supprimer", systemImage: "trash")
                }
            } label: {
                Image(systemName: "ellipsis.circle.fill")
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 8, x: 0, y: 2)
        .opacity(product.isAvailable ? 1 : 0.6)
        .sheet(isPresented: $showEdit) {
            AddEditProductView(shopId: product.shopId, existingProduct: product)
        }
    }

    func toggleAvailability() {
        var updated = product
        updated.isAvailable.toggle()
        Task {
            try? await dataService.updateProduct(updated)
        }
    }

    func deleteProduct() {
        Task {
            try? await dataService.deleteProduct(id: product.id)
        }
    }
}

struct AddEditProductView: View {
    let shopId: String
    var existingProduct: Product?

    @StateObject private var dataService = DataService.shared
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var description = ""
    @State private var price = ""
    @State private var category = ""
    @State private var stock = "10"
    @State private var selectedImage: UIImage?
    @State private var showImagePicker = false
    @State private var imagePickerSource: UIImagePickerController.SourceType = .photoLibrary
    @State private var showImageSourceSheet = false
    @State private var isUploading = false

    var isEditing: Bool { existingProduct != nil }

    var body: some View {
        NavigationStack {
            Form {
                Section("Photo du produit") {
                    if let image = selectedImage {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                            .frame(height: 200)
                            .clipped()
                            .cornerRadius(12)
                            .onTapGesture { showImageSourceSheet = true }
                    } else if let urlString = existingProduct?.imageURL, !urlString.isEmpty {
                        AsyncImage(url: URL(string: urlString)) { phase in
                            switch phase {
                            case .success(let img):
                                img.resizable().scaledToFill()
                                    .frame(height: 200).clipped().cornerRadius(12)
                            default:
                                imagePlaceholder
                            }
                        }
                        .onTapGesture { showImageSourceSheet = true }
                    } else {
                        imagePlaceholder
                            .onTapGesture { showImageSourceSheet = true }
                    }
                }

                Section("Informations") {
                    TextField("Nom du produit", text: $name)
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                    TextField("Catégorie", text: $category)
                }

                Section("Prix et Stock") {
                    HStack {
                        TextField("Prix", text: $price)
                            .keyboardType(.decimalPad)
                        Text("€")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        TextField("Stock", text: $stock)
                            .keyboardType(.numberPad)
                        Text("unités")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle(isEditing ? "Modifier" : "Nouveau produit")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Annuler") { dismiss() }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(isEditing ? "Enregistrer" : "Ajouter") {
                        saveProduct()
                    }
                    .fontWeight(.semibold)
                    .disabled(name.isEmpty || price.isEmpty || isUploading)
                }
            }
            .onAppear {
                if let product = existingProduct {
                    name = product.name
                    description = product.description
                    price = String(format: "%.2f", product.price)
                    category = product.category
                    stock = "\(product.stock)"
                }
            }
            .confirmationDialog("Ajouter une photo", isPresented: $showImageSourceSheet) {
                Button("Prendre une photo") {
                    imagePickerSource = .camera
                    showImagePicker = true
                }
                Button("Choisir dans la galerie") {
                    imagePickerSource = .photoLibrary
                    showImagePicker = true
                }
                Button("Annuler", role: .cancel) {}
            }
            .sheet(isPresented: $showImagePicker) {
                ProductImagePicker(image: $selectedImage, sourceType: imagePickerSource)
            }
        }
    }

    private var imagePlaceholder: some View {
        VStack(spacing: 8) {
            Image(systemName: "camera.fill")
                .font(.largeTitle)
                .foregroundColor(.secondary)
            Text("Ajouter une photo")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 150)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    func saveProduct() {
        guard let priceValue = Double(price.replacingOccurrences(of: ",", with: ".")),
              let stockValue = Int(stock) else { return }

        isUploading = true

        Task {
            var imageURL: String? = existingProduct?.imageURL

            // Upload image if a new one was selected
            if let image = selectedImage {
                imageURL = await uploadProductImage(image)
            }

            if let existing = existingProduct {
                var updated = existing
                updated.name = name
                updated.description = description
                updated.price = priceValue
                updated.category = category
                updated.stock = stockValue
                if let url = imageURL {
                    updated.imageURL = url
                }
                try? await dataService.updateProduct(updated)
            } else {
                let newProduct = Product(
                    id: UUID().uuidString,
                    name: name,
                    description: description,
                    price: priceValue,
                    imageURL: imageURL,
                    category: category,
                    shopId: shopId,
                    isAvailable: true,
                    stock: stockValue
                )
                try? await dataService.addProduct(newProduct)
            }

            await MainActor.run {
                isUploading = false
                dismiss()
            }
        }
    }

    private func uploadProductImage(_ image: UIImage) async -> String? {
        guard let imageData = image.jpegData(compressionQuality: 0.7) else { return nil }

        do {
            let storage = FirebaseStorage.Storage.storage()
            let fileName = UUID().uuidString + ".jpg"
            let ref = storage.reference().child("products/\(shopId)/\(fileName)")
            _ = try await ref.putDataAsync(imageData, metadata: StorageMetadata(dictionary: ["contentType": "image/jpeg"]))
            let url = try await ref.downloadURL()
            return url.absoluteString
        } catch {
            return nil
        }
    }
}

// MARK: - Product Image Picker
struct ProductImagePicker: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    var sourceType: UIImagePickerController.SourceType

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = sourceType
        picker.delegate = context.coordinator
        picker.allowsEditing = true
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: ProductImagePicker
        init(_ parent: ProductImagePicker) { self.parent = parent }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let edited = info[.editedImage] as? UIImage {
                parent.image = edited
            } else if let original = info[.originalImage] as? UIImage {
                parent.image = original
            }
            picker.dismiss(animated: true)
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            picker.dismiss(animated: true)
        }
    }
}

// MARK: - Shop Settings View
struct ShopSettingsView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var dataService = DataService.shared
    @StateObject private var addressCompleter = AddressSearchCompleter()
    @Environment(\.dismiss) private var dismiss

    let shopId: String

    @State private var shopName = ""
    @State private var shopDescription = ""
    @State private var shopAddress = ""
    @State private var shopCoordinate: CLLocationCoordinate2D?
    @State private var isAddressValidated = false
    @State private var showAddressSearch = false
    @State private var selectedCategory: ShopCategory = .cbd
    @State private var deliveryFee = ""
    @State private var minOrderAmount = ""

    @State private var selectedImage: UIImage?
    @State private var existingImageURL: String?
    @State private var showImageSourceSheet = false
    @State private var imageSourceType: UIImagePickerController.SourceType = .photoLibrary
    @State private var showImagePicker = false

    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showSuccess = false

    var body: some View {
        Form {
            // Shop Photo
            Section("Photo de la boutique") {
                if let image = selectedImage {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(height: 200)
                        .frame(maxWidth: .infinity)
                        .clipped()
                        .cornerRadius(12)
                        .onTapGesture { showImageSourceSheet = true }
                } else if let urlString = existingImageURL, !urlString.isEmpty {
                    AsyncImage(url: URL(string: urlString)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                                .frame(height: 200)
                                .frame(maxWidth: .infinity)
                                .clipped()
                                .cornerRadius(12)
                        default:
                            shopImagePlaceholder
                        }
                    }
                    .onTapGesture { showImageSourceSheet = true }
                } else {
                    shopImagePlaceholder
                        .onTapGesture { showImageSourceSheet = true }
                }
            }

            // Shop Info
            Section("Informations") {
                TextField("Nom de la boutique", text: $shopName)
                TextField("Description", text: $shopDescription, axis: .vertical)
                    .lineLimit(2...5)

                Button(action: { showAddressSearch = true }) {
                    HStack {
                        Text(shopAddress.isEmpty ? "Rechercher une adresse" : shopAddress)
                            .foregroundColor(shopAddress.isEmpty ? .secondary : .primary)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                        Spacer()
                        if isAddressValidated {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(Color(hex: "#22C55E"))
                        } else {
                            Image(systemName: "magnifyingglass")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .buttonStyle(PlainButtonStyle())

                Picker("Catégorie", selection: $selectedCategory) {
                    ForEach(ShopCategory.allCases, id: \.self) { cat in
                        Text(cat.displayName).tag(cat)
                    }
                }
            }

            // Delivery Settings
            Section("Livraison") {
                HStack {
                    Text("Frais de livraison (€)")
                    Spacer()
                    TextField("2.99", text: $deliveryFee)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                }
                HStack {
                    Text("Commande min. (€)")
                    Spacer()
                    TextField("10.00", text: $minOrderAmount)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                }
            }

            // Error
            if let error = errorMessage {
                Section {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.caption)
                }
            }

            // Save
            Section {
                Button(action: saveShop) {
                    HStack {
                        if isSaving {
                            ProgressView()
                        }
                        Text("Enregistrer")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                }
                .disabled(isSaving || shopName.isEmpty)
            }
        }
        .navigationTitle("Ma boutique")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Source de la photo", isPresented: $showImageSourceSheet) {
            Button("Appareil photo") {
                imageSourceType = .camera
                showImagePicker = true
            }
            Button("Galerie photos") {
                imageSourceType = .photoLibrary
                showImagePicker = true
            }
            Button("Annuler", role: .cancel) {}
        }
        .sheet(isPresented: $showImagePicker) {
            ProductImagePicker(image: $selectedImage, sourceType: imageSourceType)
        }
        .sheet(isPresented: $showAddressSearch) {
            AddressSearchView(
                completer: addressCompleter,
                onAddressSelected: { selectedAddress, coordinate in
                    shopAddress = selectedAddress
                    shopCoordinate = coordinate
                    isAddressValidated = true
                    showAddressSearch = false
                }
            )
        }
        .alert("Boutique mise à jour", isPresented: $showSuccess) {
            Button("OK") { dismiss() }
        } message: {
            Text("Les informations de votre boutique ont été enregistrées.")
        }
        .task {
            // Load shops if not yet loaded
            if dataService.shops.isEmpty {
                await dataService.loadShops()
            }
            loadShopData()
        }
        .onChange(of: dataService.shops) {
            // Reload if shop data was empty and shops just loaded
            if shopName.isEmpty || existingImageURL == nil {
                loadShopData()
            }
        }
    }

    private var shopImagePlaceholder: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray6))
                .frame(height: 200)
            VStack(spacing: 8) {
                Image(systemName: "camera.fill")
                    .font(.title)
                    .foregroundColor(.secondary)
                Text("Ajouter une photo")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
    }

    private func loadShopData() {
        // Try from local cache first
        if let shop = dataService.getShop(id: shopId) {
            populateFields(from: shop)
            return
        }
        // Fallback: load directly from Firestore
        Task {
            await dataService.loadShops()
            if let shop = dataService.getShop(id: shopId) {
                populateFields(from: shop)
            }
        }
    }

    private func populateFields(from shop: Shop) {
        // Only populate if fields are empty (don't overwrite user edits)
        if shopName.isEmpty { shopName = shop.name }
        if shopDescription.isEmpty { shopDescription = shop.description }
        if shopAddress.isEmpty { shopAddress = shop.address }
        if existingImageURL == nil { existingImageURL = shop.imageURL }
        selectedCategory = shop.category
        if deliveryFee.isEmpty { deliveryFee = String(format: "%.2f", shop.deliveryFee) }
        if minOrderAmount.isEmpty { minOrderAmount = String(format: "%.2f", shop.minOrderAmount) }
        if !shop.address.isEmpty && shopCoordinate == nil {
            shopCoordinate = shop.coordinate
            isAddressValidated = true
        }
    }

    private func saveShop() {
        isSaving = true
        errorMessage = nil

        Task {
            do {
                var imageURL = existingImageURL ?? ""

                // Upload new image if selected
                if let image = selectedImage {
                    if let uploadedURL = await uploadShopImage(image) {
                        imageURL = uploadedURL
                    }
                }

                var data: [String: Any] = [
                    "name": shopName,
                    "description": shopDescription,
                    "address": shopAddress,
                    "category": selectedCategory.rawValue,
                    "imageURL": imageURL,
                    "deliveryFee": Double(deliveryFee.replacingOccurrences(of: ",", with: ".")) ?? 2.99,
                    "minOrderAmount": Double(minOrderAmount.replacingOccurrences(of: ",", with: ".")) ?? 10.0
                ]

                if let coordinate = shopCoordinate {
                    data["location"] = [
                        "latitude": coordinate.latitude,
                        "longitude": coordinate.longitude
                    ]
                    // Also store at top level for compatibility
                    data["latitude"] = coordinate.latitude
                    data["longitude"] = coordinate.longitude
                }

                try await dataService.updateShop(shopId: shopId, data: data)
                showSuccess = true
            } catch {
                errorMessage = error.localizedDescription
            }
            isSaving = false
        }
    }

    private func uploadShopImage(_ image: UIImage) async -> String? {
        guard let imageData = image.jpegData(compressionQuality: 0.7) else { return nil }

        do {
            let storage = FirebaseStorage.Storage.storage()
            let fileName = "shop_photo.jpg"
            let ref = storage.reference().child("shops/\(shopId)/\(fileName)")
            let metadata = StorageMetadata()
            metadata.contentType = "image/jpeg"
            _ = try await ref.putDataAsync(imageData, metadata: metadata)
            let url = try await ref.downloadURL()
            return url.absoluteString
        } catch {
            return nil
        }
    }
}
