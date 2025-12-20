import SwiftUI
import MapKit
import StripePaymentSheet

// MARK: - Search Filters
struct SearchFilters {
    var category: ShopCategory?
    var minRating: Double = 0
    var maxDeliveryFee: Double = 100
    var onlyOpen: Bool = false
    var sortOption: SortOption = .rating

    enum SortOption: String, CaseIterable {
        case rating = "Note"
        case deliveryFee = "Frais de livraison"
        case name = "Nom"
        case distance = "Distance"
    }

    var hasActiveFilters: Bool {
        minRating > 0 || maxDeliveryFee < 100 || onlyOpen || category != nil
    }

    mutating func reset() {
        category = nil
        minRating = 0
        maxDeliveryFee = 100
        onlyOpen = false
        sortOption = .rating
    }
}

// MARK: - Client Home View
struct ClientHomeView: View {
    @StateObject private var dataService = DataService.shared
    @StateObject private var locationManager = LocationManager()
    @State private var searchText = ""
    @State private var filters = SearchFilters()
    @State private var showFilters = false
    @State private var showMapView = false
    @State private var isLoading = true
    @State private var selectedCBDSubCategory: CBDSubCategory = .all

    var filteredShops: [Shop] {
        var shops = dataService.getShops()

        // Category filter
        if let category = filters.category {
            shops = shops.filter { $0.category == category }
        }

        // Search text
        if !searchText.isEmpty {
            shops = shops.filter {
                $0.name.localizedCaseInsensitiveContains(searchText) ||
                $0.description.localizedCaseInsensitiveContains(searchText) ||
                $0.address.localizedCaseInsensitiveContains(searchText)
            }
        }

        // Rating filter
        if filters.minRating > 0 {
            shops = shops.filter { $0.rating >= filters.minRating }
        }

        // Delivery fee filter
        if filters.maxDeliveryFee < 100 {
            shops = shops.filter { $0.deliveryFee <= filters.maxDeliveryFee }
        }

        // Open only filter
        if filters.onlyOpen {
            shops = shops.filter { $0.isOpen }
        }

        // Sorting
        switch filters.sortOption {
        case .rating:
            shops.sort { $0.rating > $1.rating }
        case .deliveryFee:
            shops.sort { $0.deliveryFee < $1.deliveryFee }
        case .name:
            shops.sort { $0.name < $1.name }
        case .distance:
            if let userLocation = locationManager.location {
                shops.sort {
                    let dist1 = distanceBetween(userLocation, $0.coordinate)
                    let dist2 = distanceBetween(userLocation, $1.coordinate)
                    return dist1 < dist2
                }
            }
        }

        return shops
    }

    var activeFiltersCount: Int {
        var count = 0
        if filters.category != nil { count += 1 }
        if filters.minRating > 0 { count += 1 }
        if filters.maxDeliveryFee < 100 { count += 1 }
        if filters.onlyOpen { count += 1 }
        return count
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Search Bar with Filters
                    HStack(spacing: 12) {
                        HStack {
                            Image(systemName: "magnifyingglass")
                                .foregroundColor(.secondary)
                            TextField("Rechercher boutique, produit, adresse...", text: $searchText)
                                .autocorrectionDisabled()
                            if !searchText.isEmpty {
                                Button(action: { searchText = "" }) {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)

                        // Filter Button
                        Button(action: { showFilters = true }) {
                            ZStack(alignment: .topTrailing) {
                                Image(systemName: "slider.horizontal.3")
                                    .font(.title3)
                                    .foregroundColor(filters.hasActiveFilters ? .white : Color(hex: "#22C55E"))
                                    .padding(12)
                                    .background(filters.hasActiveFilters ? Color(hex: "#22C55E") : Color(.systemGray6))
                                    .cornerRadius(12)

                                if activeFiltersCount > 0 {
                                    Text("\(activeFiltersCount)")
                                        .font(.caption2)
                                        .fontWeight(.bold)
                                        .foregroundColor(.white)
                                        .frame(width: 18, height: 18)
                                        .background(Color.red)
                                        .clipShape(Circle())
                                        .offset(x: 4, y: -4)
                                }
                            }
                        }

                        // Map View Button
                        Button(action: { showMapView = true }) {
                            Image(systemName: "map")
                                .font(.title3)
                                .foregroundColor(Color(hex: "#3B82F6"))
                                .padding(12)
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                        }
                    }
                    .padding(.horizontal)

                    // Active Filters Display
                    if filters.hasActiveFilters {
                        ActiveFiltersBar(filters: $filters)
                    }

                    // CBD Categories
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(CBDSubCategory.allCases, id: \.self) { subCategory in
                                CategoryChip(
                                    name: subCategory.rawValue,
                                    icon: subCategory.icon,
                                    isSelected: selectedCBDSubCategory == subCategory
                                ) {
                                    selectedCBDSubCategory = subCategory
                                }
                            }
                        }
                        .padding(.horizontal)
                    }

                    // Sort Option
                    HStack {
                        Text("\(filteredShops.count) boutique\(filteredShops.count > 1 ? "s" : "")")
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        Spacer()

                        Menu {
                            ForEach(SearchFilters.SortOption.allCases, id: \.self) { option in
                                Button(action: { filters.sortOption = option }) {
                                    HStack {
                                        Text(option.rawValue)
                                        if filters.sortOption == option {
                                            Image(systemName: "checkmark")
                                        }
                                    }
                                }
                            }
                        } label: {
                            HStack(spacing: 4) {
                                Text("Trier: \(filters.sortOption.rawValue)")
                                    .font(.subheadline)
                                Image(systemName: "chevron.down")
                                    .font(.caption)
                            }
                            .foregroundColor(Color(hex: "#22C55E"))
                        }
                    }
                    .padding(.horizontal)

                    // Shops List
                    if filteredShops.isEmpty {
                        NoResultsView(searchText: searchText, hasFilters: filters.hasActiveFilters) {
                            searchText = ""
                            filters.reset()
                        }
                    } else {
                        LazyVStack(spacing: 16) {
                            ForEach(filteredShops) { shop in
                                NavigationLink(destination: ShopDetailView(shop: shop)) {
                                    ShopCard(shop: shop)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Boutiques")
            .overlay {
                if dataService.isLoading && filteredShops.isEmpty {
                    VStack(spacing: 12) {
                        ProgressView()
                        Text("Chargement...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                } else if let error = dataService.errorMessage, filteredShops.isEmpty && searchText.isEmpty && !filters.hasActiveFilters {
                    VStack(spacing: 12) {
                        Image(systemName: "wifi.exclamationmark")
                            .font(.largeTitle)
                            .foregroundColor(.orange)
                        Text("Mode hors ligne")
                            .font(.headline)
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        Button("Réessayer") {
                            Task { await dataService.loadShops() }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(Color(hex: "#22C55E"))
                    }
                    .padding()
                }
            }
            .refreshable {
                await dataService.loadShops(category: filters.category?.rawValue, search: searchText.isEmpty ? nil : searchText)
            }
            .task {
                await dataService.loadShops()
                locationManager.requestPermission()
            }
            .sheet(isPresented: $showFilters) {
                SearchFiltersSheet(filters: $filters)
            }
            .fullScreenCover(isPresented: $showMapView) {
                ShopsMapView(shops: filteredShops)
            }
        }
    }

    func distanceBetween(_ coord1: CLLocationCoordinate2D, _ coord2: CLLocationCoordinate2D) -> Double {
        let loc1 = CLLocation(latitude: coord1.latitude, longitude: coord1.longitude)
        let loc2 = CLLocation(latitude: coord2.latitude, longitude: coord2.longitude)
        return loc1.distance(from: loc2)
    }
}

// MARK: - Active Filters Bar
struct ActiveFiltersBar: View {
    @Binding var filters: SearchFilters

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // Clear all button
                Button(action: { filters.reset() }) {
                    HStack(spacing: 4) {
                        Image(systemName: "xmark")
                        Text("Effacer")
                    }
                    .font(.caption)
                    .foregroundColor(.red)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(20)
                }

                if let category = filters.category {
                    FilterChip(text: category.displayName, icon: category.icon) {
                        filters.category = nil
                    }
                }

                if filters.minRating > 0 {
                    FilterChip(text: "≥ \(String(format: "%.1f", filters.minRating))⭐", icon: "star.fill") {
                        filters.minRating = 0
                    }
                }

                if filters.maxDeliveryFee < 100 {
                    FilterChip(text: "< \(String(format: "%.0f", filters.maxDeliveryFee))€", icon: "eurosign.circle") {
                        filters.maxDeliveryFee = 100
                    }
                }

                if filters.onlyOpen {
                    FilterChip(text: "Ouvert", icon: "clock.fill") {
                        filters.onlyOpen = false
                    }
                }
            }
            .padding(.horizontal)
        }
    }
}

struct FilterChip: View {
    let text: String
    let icon: String
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.caption2)
            Text(text)
                .font(.caption)
            Button(action: onRemove) {
                Image(systemName: "xmark.circle.fill")
                    .font(.caption)
            }
        }
        .foregroundColor(Color(hex: "#22C55E"))
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color(hex: "#22C55E").opacity(0.1))
        .cornerRadius(20)
    }
}

// MARK: - Search Filters Sheet
struct SearchFiltersSheet: View {
    @Binding var filters: SearchFilters
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                // Rating
                Section("Note minimum") {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            ForEach(0..<5) { index in
                                Image(systemName: Double(index) < filters.minRating ? "star.fill" : "star")
                                    .foregroundColor(Double(index) < filters.minRating ? .yellow : .gray)
                                    .onTapGesture {
                                        filters.minRating = Double(index + 1)
                                    }
                            }
                            Spacer()
                            if filters.minRating > 0 {
                                Text("\(String(format: "%.0f", filters.minRating))+ étoiles")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .font(.title2)

                        Slider(value: $filters.minRating, in: 0...5, step: 0.5)
                            .tint(Color(hex: "#22C55E"))
                    }
                }

                // Delivery Fee
                Section("Frais de livraison max") {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text(filters.maxDeliveryFee >= 100 ? "Tous" : "\(String(format: "%.0f", filters.maxDeliveryFee)) €")
                                .font(.headline)
                            Spacer()
                        }

                        Slider(value: $filters.maxDeliveryFee, in: 0...100, step: 1)
                            .tint(Color(hex: "#22C55E"))

                        HStack {
                            Text("0 €")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("100 €+")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }

                // Open Only
                Section {
                    Toggle(isOn: $filters.onlyOpen) {
                        Label("Boutiques ouvertes uniquement", systemImage: "clock.fill")
                    }
                    .tint(Color(hex: "#22C55E"))
                }

                // Sort
                Section("Tri") {
                    Picker("Trier par", selection: $filters.sortOption) {
                        ForEach(SearchFilters.SortOption.allCases, id: \.self) { option in
                            Text(option.rawValue).tag(option)
                        }
                    }
                    .pickerStyle(.navigationLink)
                }

                // Reset Button
                Section {
                    Button(action: { filters.reset() }) {
                        HStack {
                            Spacer()
                            Text("Réinitialiser les filtres")
                                .foregroundColor(.red)
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Filtres")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Appliquer") { dismiss() }
                        .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

// MARK: - No Results View
struct NoResultsView: View {
    let searchText: String
    let hasFilters: Bool
    let onClear: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 50))
                .foregroundColor(.secondary)

            VStack(spacing: 8) {
                Text("Aucun résultat")
                    .font(.title3)
                    .fontWeight(.semibold)

                if !searchText.isEmpty {
                    Text("Aucune boutique ne correspond à \"\(searchText)\"")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                } else if hasFilters {
                    Text("Essayez de modifier vos filtres")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }

            Button(action: onClear) {
                Text("Effacer la recherche")
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color(hex: "#22C55E"))
                    .cornerRadius(10)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }
}

// MARK: - Shops Map View (Full Screen)
struct ShopsMapView: View {
    let shops: [Shop]
    @Environment(\.dismiss) private var dismiss
    @State private var selectedShop: Shop?
    @State private var navigateToShop: Shop?
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 48.8566, longitude: 2.3522),
        span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
    )

    var body: some View {
        NavigationStack {
            ZStack {
                // Map plein écran
                Map(coordinateRegion: $region, annotationItems: shops) { shop in
                    MapAnnotation(coordinate: shop.coordinate) {
                        ShopMapPin(shop: shop, isSelected: selectedShop?.id == shop.id)
                            .onTapGesture { selectedShop = shop }
                    }
                }
                .ignoresSafeArea()
                .onTapGesture {
                    selectedShop = nil
                }

                // Overlay UI
                VStack {
                    // Top bar
                    HStack {
                        Button(action: { dismiss() }) {
                            Image(systemName: "xmark")
                                .font(.headline)
                                .foregroundColor(.black)
                                .padding(12)
                                .background(Color(uiColor: .white))
                                .clipShape(Circle())
                                .shadow(color: .black.opacity(0.2), radius: 6, x: 0, y: 2)
                        }

                        Spacer()

                        Text("\(shops.count) boutiques")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.black)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color(uiColor: .white))
                            .cornerRadius(20)
                            .shadow(color: .black.opacity(0.2), radius: 6, x: 0, y: 2)
                    }
                    .padding()

                    Spacer()

                    // Carte boutique sélectionnée
                    if let shop = selectedShop {
                        ShopMapCard(shop: shop)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                navigateToShop = shop
                            }
                            .padding(.horizontal, 16)
                            .padding(.bottom, 24)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                }
                .compositingGroup()
            }
            .animation(.easeInOut(duration: 0.2), value: selectedShop)
            .navigationBarHidden(true)
            .navigationDestination(item: $navigateToShop) { shop in
                ShopDetailView(shop: shop)
            }
        }
    }
}

struct ShopMapPin: View {
    let shop: Shop
    let isSelected: Bool

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(isSelected ? Color(hex: "#22C55E") : .white)
                    .frame(width: isSelected ? 44 : 36, height: isSelected ? 44 : 36)
                    .shadow(radius: 3)

                Image(systemName: shop.category.icon)
                    .font(.system(size: isSelected ? 20 : 16))
                    .foregroundColor(isSelected ? .white : Color(hex: "#22C55E"))
            }

            // Pin tail
            Image(systemName: "triangle.fill")
                .font(.system(size: 10))
                .foregroundColor(isSelected ? Color(hex: "#22C55E") : .white)
                .rotationEffect(.degrees(180))
                .offset(y: -3)
                .shadow(radius: 1)
        }
        .scaleEffect(isSelected ? 1.1 : 1.0)
        .animation(.spring(response: 0.3), value: isSelected)
    }
}

struct ShopMapCard: View {
    let shop: Shop

    var body: some View {
        HStack(spacing: 12) {
            // Image boutique
            if let imageURL = shop.imageURL, let url = URL(string: imageURL) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        shopImagePlaceholder
                    }
                }
                .frame(width: 70, height: 70)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            } else {
                shopImagePlaceholder
                    .frame(width: 70, height: 70)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(shop.name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.black)

                HStack(spacing: 4) {
                    Image(systemName: "star.fill")
                        .foregroundStyle(.orange)
                        .font(.system(size: 11))
                    Text(String(format: "%.1f", shop.rating))
                        .foregroundStyle(.black)
                    Text("(\(shop.reviewCount))")
                        .foregroundStyle(Color(uiColor: .darkGray))
                }
                .font(.caption)

                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.system(size: 10))
                    Text(shop.estimatedDeliveryTime)
                    Text("·")
                    Text(String(format: "%.2f€", shop.deliveryFee))
                }
                .font(.caption)
                .foregroundStyle(Color(uiColor: .darkGray))
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Color(hex: "#22C55E"))
        }
        .padding(12)
        .background(Color(uiColor: .white))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.2), radius: 10, x: 0, y: 4)
    }

    private var shopImagePlaceholder: some View {
        Rectangle()
            .fill(Color(uiColor: UIColor(red: 0.93, green: 0.97, blue: 0.93, alpha: 1)))
            .overlay(
                Image(systemName: "leaf.fill")
                    .foregroundStyle(Color(hex: "#22C55E"))
                    .font(.system(size: 24))
            )
    }
}

import CoreLocation

// MARK: - Favorites View
struct FavoritesView: View {
    @StateObject private var favoritesManager = FavoritesManager.shared
    @StateObject private var dataService = DataService.shared

    var favoriteShops: [Shop] {
        dataService.shops.filter { favoritesManager.favoriteShopIds.contains($0.id) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if favoriteShops.isEmpty {
                    // Empty state
                    VStack(spacing: 20) {
                        Image(systemName: "heart.slash")
                            .font(.system(size: 60))
                            .foregroundColor(.secondary)

                        Text("Aucun favori")
                            .font(.title2)
                            .fontWeight(.semibold)

                        Text("Ajoutez des boutiques à vos favoris\nen appuyant sur le cœur")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)

                        NavigationLink(destination: ClientHomeView()) {
                            Text("Découvrir les boutiques")
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                                .padding()
                                .background(Color(hex: "#22C55E"))
                                .cornerRadius(12)
                        }
                    }
                    .padding()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(favoriteShops) { shop in
                                NavigationLink(destination: ShopDetailView(shop: shop)) {
                                    FavoriteShopCard(shop: shop)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Mes Favoris")
        }
    }
}

struct FavoriteShopCard: View {
    let shop: Shop
    @StateObject private var favoritesManager = FavoritesManager.shared

    var body: some View {
        HStack(spacing: 16) {
            // Shop Image
            AsyncImage(url: URL(string: shop.imageURL ?? "")) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                default:
                    ZStack {
                        Rectangle()
                            .fill(Color(hex: "#22C55E").opacity(0.1))
                        Image(systemName: shop.category.icon)
                            .foregroundColor(Color(hex: "#22C55E"))
                    }
                }
            }
            .frame(width: 80, height: 80)
            .clipped()
            .cornerRadius(12)

            VStack(alignment: .leading, spacing: 6) {
                Text(shop.name)
                    .font(.headline)
                    .foregroundColor(.primary)

                Text(shop.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)

                HStack(spacing: 12) {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.caption2)
                            .foregroundColor(.yellow)
                        Text(String(format: "%.1f", shop.rating))
                            .font(.caption)
                    }

                    HStack(spacing: 4) {
                        Image(systemName: "clock")
                            .font(.caption2)
                        Text(shop.estimatedDeliveryTime)
                            .font(.caption)
                    }
                    .foregroundColor(.secondary)
                }
            }

            Spacer()

            // Remove favorite button
            Button(action: {
                withAnimation {
                    favoritesManager.toggleFavorite(shopId: shop.id)
                }
            }) {
                Image(systemName: "heart.fill")
                    .foregroundColor(.red)
                    .font(.title3)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
    }
}

struct CategoryChip: View {
    let name: String
    let icon: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.caption)
                Text(name)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(isSelected ? Color(hex: "#22C55E") : Color(.systemGray6))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(20)
        }
    }
}

struct ShopCard: View {
    let shop: Shop
    @StateObject private var favoritesManager = FavoritesManager.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Shop Image with AsyncImage + Favorite Button
            ZStack(alignment: .topTrailing) {
                AsyncImage(url: URL(string: shop.imageURL ?? "")) { phase in
                switch phase {
                case .empty:
                    // Loading placeholder
                    ZStack {
                        Rectangle()
                            .fill(Color(hex: "#22C55E").opacity(0.1))
                        ProgressView()
                    }
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure(_):
                    // Fallback to icon placeholder
                    ZStack {
                        Rectangle()
                            .fill(Color(hex: "#22C55E").opacity(0.1))
                        Image(systemName: shop.category.icon)
                            .font(.system(size: 40))
                            .foregroundColor(Color(hex: "#22C55E"))
                    }
                @unknown default:
                    ZStack {
                        Rectangle()
                            .fill(Color(hex: "#22C55E").opacity(0.1))
                        Image(systemName: shop.category.icon)
                            .font(.system(size: 40))
                            .foregroundColor(Color(hex: "#22C55E"))
                    }
                }
                }
                .frame(height: 140)
                .clipped()
                .cornerRadius(12)

                // Favorite Button
                Button(action: {
                    withAnimation(.spring(response: 0.3)) {
                        favoritesManager.toggleFavorite(shopId: shop.id)
                    }
                }) {
                    Image(systemName: favoritesManager.isFavorite(shopId: shop.id) ? "heart.fill" : "heart")
                        .font(.title3)
                        .foregroundColor(favoritesManager.isFavorite(shopId: shop.id) ? .red : .white)
                        .padding(8)
                        .background(Color.black.opacity(0.3))
                        .clipShape(Circle())
                }
                .padding(8)
            }

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(shop.name)
                        .font(.headline)
                        .foregroundColor(.primary)

                    Spacer()

                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.caption)
                            .foregroundColor(.yellow)
                        Text(String(format: "%.1f", shop.rating))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Text(shop.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)

                HStack(spacing: 12) {
                    Label(shop.estimatedDeliveryTime, systemImage: "clock")
                    Label(String(format: "%.2f €", shop.deliveryFee), systemImage: "bicycle")
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
    }
}

// MARK: - Shop Detail View
struct ShopDetailView: View {
    let shop: Shop
    @StateObject private var dataService = DataService.shared
    @EnvironmentObject var cartManager: CartManager
    @State private var selectedCategory: String = "Tous"

    var products: [Product] {
        dataService.getProducts(forShop: shop.id)
    }

    var categories: [String] {
        ["Tous"] + Array(Set(products.map { $0.category })).sorted()
    }

    var filteredProducts: [Product] {
        if selectedCategory == "Tous" {
            return products
        }
        return products.filter { $0.category == selectedCategory }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                ZStack(alignment: .bottomLeading) {
                    AsyncImage(url: URL(string: shop.imageURL ?? "")) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        default:
                            Rectangle()
                                .fill(Color(hex: "#22C55E").opacity(0.1))
                                .overlay(
                                    Image(systemName: shop.category.icon)
                                        .font(.system(size: 60))
                                        .foregroundColor(Color(hex: "#22C55E"))
                                )
                        }
                    }
                    .frame(height: 200)
                    .clipped()

                    VStack(alignment: .leading, spacing: 4) {
                        Text(shop.name)
                            .font(.title2)
                            .fontWeight(.bold)

                        HStack(spacing: 16) {
                            HStack(spacing: 4) {
                                Image(systemName: "star.fill")
                                    .foregroundColor(.yellow)
                                Text(String(format: "%.1f", shop.rating))
                                Text("(\(shop.reviewCount))")
                                    .foregroundColor(.secondary)
                            }

                            HStack(spacing: 4) {
                                Image(systemName: "clock")
                                Text(shop.estimatedDeliveryTime)
                            }
                            .foregroundColor(.secondary)
                        }
                        .font(.subheadline)
                    }
                    .padding()
                    .background(.ultraThinMaterial)
                    .cornerRadius(12)
                    .padding()
                }

                // Info
                VStack(alignment: .leading, spacing: 8) {
                    Label(shop.address, systemImage: "mappin.circle.fill")
                    Label("Min. \(String(format: "%.2f €", shop.minOrderAmount))", systemImage: "bag.fill")
                    Label("Livraison: \(String(format: "%.2f €", shop.deliveryFee))", systemImage: "bicycle")
                }
                .font(.subheadline)
                .foregroundColor(.secondary)
                .padding(.horizontal)

                Divider()
                    .padding(.horizontal)

                // Categories
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(categories, id: \.self) { category in
                            Button(action: { selectedCategory = category }) {
                                Text(category)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                                    .background(selectedCategory == category ? Color(hex: "#22C55E") : Color(.systemGray6))
                                    .foregroundColor(selectedCategory == category ? .white : .primary)
                                    .cornerRadius(20)
                            }
                        }
                    }
                    .padding(.horizontal)
                }

                // Products
                LazyVStack(spacing: 12) {
                    ForEach(filteredProducts) { product in
                        ProductRow(product: product)
                    }
                }
                .padding(.horizontal)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) {
            if !cartManager.cart.isEmpty && cartManager.currentShopId == shop.id {
                CartFloatingButton()
            }
        }
        .overlay {
            if dataService.isLoading && products.isEmpty {
                ProgressView("Chargement des produits...")
            }
        }
        .task {
            await dataService.loadProducts(forShop: shop.id)
        }
    }
}

struct ProductRow: View {
    let product: Product
    @EnvironmentObject var cartManager: CartManager
    @State private var quantity = 1

    var body: some View {
        HStack(spacing: 12) {
            // Product Image with AsyncImage
            AsyncImage(url: URL(string: product.imageURL ?? "")) { phase in
                switch phase {
                case .empty:
                    ZStack {
                        Rectangle()
                            .fill(Color(hex: "#22C55E").opacity(0.1))
                        ProgressView()
                    }
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure(_):
                    ZStack {
                        Rectangle()
                            .fill(Color(hex: "#22C55E").opacity(0.1))
                        Image(systemName: "leaf.fill")
                            .foregroundColor(Color(hex: "#22C55E"))
                    }
                @unknown default:
                    ZStack {
                        Rectangle()
                            .fill(Color(hex: "#22C55E").opacity(0.1))
                        Image(systemName: "leaf.fill")
                            .foregroundColor(Color(hex: "#22C55E"))
                    }
                }
            }
            .frame(width: 80, height: 80)
            .clipped()
            .cornerRadius(12)

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(product.name)
                        .font(.headline)

                    if product.isRestricted {
                        AgeRestrictionBadge()
                    }
                }

                Text(product.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)

                Text(product.formattedPrice)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(Color(hex: "#22C55E"))
            }

            Spacer()

            Button(action: {
                cartManager.addToCart(product)
            }) {
                Image(systemName: "plus.circle.fill")
                    .font(.title2)
                    .foregroundColor(Color(hex: "#22C55E"))
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Age Restriction Badge
struct AgeRestrictionBadge: View {
    var body: some View {
        HStack(spacing: 2) {
            Image(systemName: "18.circle.fill")
                .font(.caption2)
            Text("+")
                .font(.caption2)
                .fontWeight(.bold)
        }
        .foregroundColor(.white)
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(Color(hex: "#EF4444"))
        .cornerRadius(6)
    }
}

struct CartFloatingButton: View {
    @EnvironmentObject var cartManager: CartManager

    var body: some View {
        NavigationLink(destination: CartView()) {
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "cart.fill")
                    Text("\(cartManager.cart.itemCount) articles")
                }

                Spacer()

                Text(String(format: "%.2f €", cartManager.total))
                    .fontWeight(.bold)
            }
            .foregroundColor(.white)
            .padding()
            .background(Color(hex: "#22C55E"))
            .cornerRadius(16)
            .padding()
        }
    }
}

// MARK: - Cart View
struct CartView: View {
    @EnvironmentObject var cartManager: CartManager
    @EnvironmentObject var authService: AuthService
    @StateObject private var dataService = DataService.shared
    @State private var showCheckout = false
    @State private var orderPlaced = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if cartManager.cart.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "cart")
                            .font(.system(size: 60))
                            .foregroundColor(.secondary)
                        Text("Votre panier est vide")
                            .font(.title3)
                            .foregroundColor(.secondary)
                        Text("Parcourez les boutiques pour ajouter des articles")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                } else {
                    ScrollView {
                        VStack(spacing: 20) {
                            // Shop info
                            if let shopName = cartManager.currentShopName {
                                HStack {
                                    Image(systemName: "storefront.fill")
                                        .foregroundColor(Color(hex: "#22C55E"))
                                    Text(shopName)
                                        .font(.headline)
                                    Spacer()
                                }
                                .padding()
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                            }

                            // Cart items
                            ForEach(cartManager.cart.items) { item in
                                CartItemRow(item: item)
                            }

                            Divider()

                            // Summary
                            VStack(spacing: 12) {
                                HStack {
                                    Text("Sous-total")
                                    Spacer()
                                    Text(String(format: "%.2f €", cartManager.subtotal))
                                }

                                HStack {
                                    Text("Frais de livraison")
                                    Spacer()
                                    Text(String(format: "%.2f €", cartManager.deliveryFee))
                                }

                                Divider()

                                HStack {
                                    Text("Total")
                                        .fontWeight(.bold)
                                    Spacer()
                                    Text(String(format: "%.2f €", cartManager.total))
                                        .fontWeight(.bold)
                                        .foregroundColor(Color(hex: "#22C55E"))
                                }
                            }
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(12)

                            // Checkout button
                            Button(action: { showCheckout = true }) {
                                Text("Commander")
                                    .fontWeight(.semibold)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color(hex: "#22C55E"))
                                    .cornerRadius(12)
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Panier")
            .sheet(isPresented: $showCheckout) {
                CheckoutView(orderPlaced: $orderPlaced)
            }
            .onChange(of: orderPlaced) { _, placed in
                if placed {
                    dismiss()
                }
            }
        }
    }
}

struct CartItemRow: View {
    let item: CartItem
    @EnvironmentObject var cartManager: CartManager

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Rectangle()
                    .fill(Color(hex: "#22C55E").opacity(0.1))
                Image(systemName: "leaf.fill")
                    .foregroundColor(Color(hex: "#22C55E"))
            }
            .frame(width: 60, height: 60)
            .cornerRadius(8)

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(item.product.name)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    if item.product.isRestricted {
                        AgeRestrictionBadge()
                    }
                }

                Text(String(format: "%.2f €", item.product.price))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            HStack(spacing: 12) {
                Button(action: {
                    cartManager.updateQuantity(item.product.id, quantity: item.quantity - 1)
                }) {
                    Image(systemName: "minus.circle.fill")
                        .foregroundColor(.secondary)
                }

                Text("\(item.quantity)")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .frame(minWidth: 24)

                Button(action: {
                    cartManager.updateQuantity(item.product.id, quantity: item.quantity + 1)
                }) {
                    Image(systemName: "plus.circle.fill")
                        .foregroundColor(Color(hex: "#22C55E"))
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Checkout View
struct CheckoutView: View {
    @Binding var orderPlaced: Bool
    @EnvironmentObject var cartManager: CartManager
    @EnvironmentObject var authService: AuthService
    @StateObject private var dataService = DataService.shared
    @StateObject private var addressManager = AddressManager.shared
    @StateObject private var promoManager = PromoCodeManager.shared
    @StateObject private var tipManager = TipManager.shared
    @StateObject private var scheduleManager = ScheduledDeliveryManager.shared
    @StateObject private var kycService = KYCService.shared
    @Environment(\.dismiss) private var dismiss

    @StateObject private var paymentService = PaymentService.shared
    @StateObject private var addressCompleter = AddressSearchCompleter()
    @StateObject private var locationManager = LocationManager()
    @State private var deliveryAddress = ""
    @State private var validatedCoordinate: CLLocationCoordinate2D?
    @State private var isAddressValidated = false
    @State private var showAddressSearch = false
    @State private var isGeolocating = false
    @State private var addressError: String?
    @State private var notes = ""
    @State private var isPlacingOrder = false
    @State private var showAddressSelection = false
    @State private var promoCodeInput = ""
    @State private var showSchedulePicker = false
    @State private var showKYCVerification = false
    @State private var showAgeVerificationAlert = false
    @State private var paymentIntentId: String?
    @State private var paymentSheet: PaymentSheet?
    @State private var showPaymentError = false
    @State private var paymentErrorMessage = ""
    @State private var showOrderConfirmation = false
    @State private var confirmedOrderId: String?

    var selectedAddress: AddressManager.SavedAddress? {
        addressManager.selectedAddress
    }

    var promoDiscount: Double {
        promoManager.getDiscount(forAmount: cartManager.subtotal)
    }

    var tipAmount: Double {
        tipManager.calculateTip(forAmount: cartManager.subtotal)
    }

    var finalTotal: Double {
        cartManager.subtotal + cartManager.deliveryFee - promoDiscount + tipAmount
    }

    var needsAgeVerification: Bool {
        cartManager.hasRestrictedProducts && kycService.verificationStatus != .approved
    }

    var canPlaceOrder: Bool {
        (selectedAddress != nil || isAddressValidated) && !isPlacingOrder && !needsAgeVerification
    }

    // MARK: - Extracted Subviews

    @ViewBuilder
    private var deliveryAddressSection: some View {
        CheckoutSection(title: "Adresse de livraison", icon: "mappin.circle.fill") {
            if let address = selectedAddress {
                // Saved address selected
                Button(action: { showAddressSelection = true }) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(address.label)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                if address.isDefault {
                                    Text("Par défaut")
                                        .font(.caption2)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color(hex: "#22C55E").opacity(0.15))
                                        .foregroundColor(Color(hex: "#22C55E"))
                                        .cornerRadius(4)
                                }
                            }
                            Text(address.fullAddress)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(Color(hex: "#22C55E"))
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }
                .buttonStyle(PlainButtonStyle())
            } else if isAddressValidated {
                // Validated manual/GPS address
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(deliveryAddress)
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Text("Adresse validée")
                            .font(.caption)
                            .foregroundColor(Color(hex: "#22C55E"))
                    }
                    Spacer()
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(Color(hex: "#22C55E"))
                }
                .padding()
                .background(Color(hex: "#22C55E").opacity(0.08))
                .cornerRadius(12)

                Button(action: {
                    isAddressValidated = false
                    validatedCoordinate = nil
                    deliveryAddress = ""
                    addressError = nil
                }) {
                    HStack {
                        Image(systemName: "pencil")
                        Text("Modifier l'adresse")
                    }
                    .font(.subheadline)
                    .foregroundColor(Color(hex: "#22C55E"))
                }
            } else {
                // GPS position button
                Button(action: { useCurrentLocation() }) {
                    HStack {
                        if isGeolocating {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle())
                                .scaleEffect(0.8)
                        } else {
                            Image(systemName: "location.fill")
                        }
                        Text("Utiliser ma position")
                            .fontWeight(.medium)
                        Spacer()
                        Image(systemName: "arrow.right")
                            .font(.caption)
                    }
                    .font(.subheadline)
                    .foregroundColor(.white)
                    .padding()
                    .background(Color(hex: "#22C55E"))
                    .cornerRadius(12)
                }
                .disabled(isGeolocating)

                // Address search field
                Button(action: { showAddressSearch = true }) {
                    HStack {
                        Image(systemName: "magnifyingglass")
                        Text(deliveryAddress.isEmpty ? "Saisir une adresse" : deliveryAddress)
                            .foregroundColor(deliveryAddress.isEmpty ? .secondary : .primary)
                        Spacer()
                        if !deliveryAddress.isEmpty && !isAddressValidated {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.red.opacity(0.6))
                        }
                    }
                    .font(.subheadline)
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }
                .buttonStyle(PlainButtonStyle())

                if let error = addressError {
                    HStack(spacing: 4) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.caption)
                        Text(error)
                            .font(.caption)
                    }
                    .foregroundColor(.red)
                }

                if !addressManager.addresses.isEmpty {
                    Button(action: { showAddressSelection = true }) {
                        HStack {
                            Image(systemName: "bookmark.fill")
                            Text("Choisir une adresse enregistrée")
                        }
                        .font(.subheadline)
                        .foregroundColor(Color(hex: "#22C55E"))
                    }
                }
            }
        }
    }

    private func useCurrentLocation() {
        isGeolocating = true
        addressError = nil
        locationManager.requestPermission()
        locationManager.startUpdating()

        Task {
            // Wait for location with timeout
            var attempts = 0
            while locationManager.location == nil && attempts < 20 {
                try? await Task.sleep(nanoseconds: 250_000_000)
                attempts += 1
            }

            guard let coordinate = locationManager.location else {
                isGeolocating = false
                addressError = "Impossible d'obtenir votre position. Vérifiez vos paramètres de localisation."
                return
            }

            locationManager.stopUpdating()

            do {
                let address = try await GeocodingService.shared.reverseGeocode(coordinate)
                deliveryAddress = address
                validatedCoordinate = coordinate
                isAddressValidated = true
                addressError = nil
            } catch {
                addressError = "Impossible de déterminer l'adresse de votre position."
            }
            isGeolocating = false
        }
    }

    @ViewBuilder
    private var orderSummarySection: some View {
        CheckoutSection(title: "Résumé", icon: "list.bullet") {
            VStack(spacing: 12) {
                ForEach(cartManager.cart.items) { item in
                    HStack {
                        Text("\(item.quantity)x \(item.product.name)")
                            .font(.subheadline)
                        Spacer()
                        Text(String(format: "%.2f €", item.product.price * Double(item.quantity)))
                            .font(.subheadline)
                    }
                }

                Divider()

                SummaryRow(label: "Sous-total", value: cartManager.subtotal)
                SummaryRow(label: "Livraison", value: cartManager.deliveryFee)

                if promoDiscount > 0 {
                    SummaryRow(label: "Réduction", value: -promoDiscount, isDiscount: true)
                }

                if tipAmount > 0 {
                    SummaryRow(label: "Pourboire", value: tipAmount)
                }

                Divider()

                HStack {
                    Text("Total")
                        .font(.headline)
                    Spacer()
                    Text(String(format: "%.2f €", finalTotal))
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(Color(hex: "#22C55E"))
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }

    private func preparePayment() {
        guard let shopId = cartManager.currentShopId else { return }

        isPlacingOrder = true

        Task {
            do {
                let paymentResponse = try await paymentService.preparePayment(
                    amount: finalTotal,
                    shopId: shopId,
                    useSavedCard: true
                )
                paymentIntentId = paymentResponse.paymentIntentId

                if paymentService.wasAutoConfirmed {
                    await createOrderAfterPayment(shopId: shopId, paymentIntentId: paymentResponse.paymentIntentId)
                } else {
                    paymentSheet = paymentService.configurePaymentSheet(from: paymentResponse)
                    isPlacingOrder = false
                }
            } catch {
                isPlacingOrder = false
                paymentErrorMessage = error.localizedDescription
                showPaymentError = true
            }
        }
    }

    @ViewBuilder
    private var scheduledDeliverySection: some View {
        CheckoutSection(title: "Heure de livraison", icon: "clock.fill") {
            Toggle(isOn: $scheduleManager.isScheduled) {
                HStack {
                    Text(scheduleManager.isScheduled ? "Livraison programmée" : "Dès que possible")
                        .font(.subheadline)
                    if !scheduleManager.isScheduled {
                        Text("~30-45 min")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .tint(Color(hex: "#22C55E"))

            if scheduleManager.isScheduled {
                Button(action: { showSchedulePicker = true }) {
                    HStack {
                        if let slot = scheduleManager.selectedTimeSlot {
                            VStack(alignment: .leading) {
                                Text(scheduleManager.scheduledDate.formatted(date: .abbreviated, time: .omitted))
                                    .font(.subheadline)
                                Text(slot.displayString)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        } else {
                            Text("Choisir un créneau")
                                .font(.subheadline)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
    }

    @ViewBuilder
    private var promoCodeSection: some View {
        CheckoutSection(title: "Code promo", icon: "tag.fill") {
            if let promo = promoManager.appliedPromoCode {
                HStack {
                    VStack(alignment: .leading) {
                        Text(promo.code)
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Text("-\(String(format: "%.2f", promoDiscount)) €")
                            .font(.caption)
                            .foregroundColor(Color(hex: "#22C55E"))
                    }
                    Spacer()
                    Button(action: { promoManager.removePromoCode() }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
                .background(Color(hex: "#22C55E").opacity(0.1))
                .cornerRadius(12)
            } else {
                HStack {
                    TextField("Entrez un code promo", text: $promoCodeInput)
                        .textInputAutocapitalization(.characters)

                    Button(action: applyPromoCode) {
                        if promoManager.isValidating {
                            ProgressView()
                        } else {
                            Text("Appliquer")
                                .fontWeight(.medium)
                        }
                    }
                    .disabled(promoCodeInput.isEmpty || promoManager.isValidating)
                    .foregroundColor(promoCodeInput.isEmpty ? .secondary : Color(hex: "#22C55E"))
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)

                if let error = promoManager.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                }
            }
        }
    }

    @ViewBuilder
    private var tipSection: some View {
        CheckoutSection(title: "Pourboire pour le livreur", icon: "heart.fill") {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(tipManager.tipOptions, id: \.displayName) { option in
                        let sublabel: String? = {
                            if case .percentage(let percent) = option {
                                return String(format: "%.2f €", cartManager.subtotal * Double(percent) / 100)
                            }
                            return nil
                        }()
                        TipOptionButton(
                            label: option.displayName,
                            sublabel: sublabel,
                            isSelected: tipManager.selectedTipOption == option,
                            color: "#22C55E"
                        ) {
                            tipManager.selectedTipOption = option
                        }
                    }
                }
            }

            if case .custom = tipManager.selectedTipOption {
                HStack {
                    TextField("Montant", value: $tipManager.customTipAmount, format: .number)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(.roundedBorder)
                    Text("€")
                }
            }
        }
    }

    @ViewBuilder
    private var placeOrderButton: some View {
        if let sheet = paymentSheet {
            PaymentSheet.PaymentButton(paymentSheet: sheet, onCompletion: handlePaymentResult) {
                HStack {
                    Image(systemName: "creditcard.fill")
                    Text("Payer \(String(format: "%.2f €", finalTotal))")
                        .fontWeight(.semibold)
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(hex: "#22C55E"))
                .cornerRadius(12)
            }
        } else {
            Button(action: preparePayment) {
                HStack {
                    if isPlacingOrder {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Payer \(String(format: "%.2f €", finalTotal))")
                            .fontWeight(.semibold)
                    }
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(canPlaceOrder ? Color(hex: "#22C55E") : Color.gray)
                .cornerRadius(12)
            }
            .disabled(!canPlaceOrder)
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    deliveryAddressSection
                    scheduledDeliverySection

                    CheckoutSection(title: "Instructions", icon: "text.bubble.fill") {
                        TextField("Ex: Laisser à la porte, digicode 1234...", text: $notes)
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                    }

                    promoCodeSection
                    tipSection
                    orderSummarySection

                    if cartManager.hasRestrictedProducts {
                        AgeVerificationWarningView(
                            restrictedProducts: cartManager.restrictedProductNames,
                            isVerified: kycService.verificationStatus == .approved,
                            verificationStatus: kycService.verificationStatus,
                            onVerifyTapped: { showKYCVerification = true }
                        )
                    }

                    placeOrderButton
                }
                .padding()
            }
            .navigationTitle("Finaliser")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Annuler") { dismiss() }
                }
            }
            .onAppear {
                deliveryAddress = authService.userProfile?.address ?? ""
            }
            .sheet(isPresented: $showAddressSelection) {
                AddressSelectionSheet()
            }
            .sheet(isPresented: $showAddressSearch) {
                AddressSearchView(
                    completer: addressCompleter,
                    onAddressSelected: { address, coordinate in
                        deliveryAddress = address
                        validatedCoordinate = coordinate
                        isAddressValidated = true
                        addressError = nil
                        showAddressSearch = false
                    }
                )
            }
            .sheet(isPresented: $showSchedulePicker) {
                ScheduleDeliverySheet()
            }
            .fullScreenCover(isPresented: $showKYCVerification) {
                KYCVerificationFlow()
            }
            .alert("Vérification d'âge requise", isPresented: $showAgeVerificationAlert) {
                Button("Vérifier mon identité") { showKYCVerification = true }
                Button("Annuler", role: .cancel) {}
            } message: {
                Text("Votre panier contient des produits réservés aux personnes majeures. Veuillez vérifier votre identité pour continuer.")
            }
            .alert("Erreur de paiement", isPresented: $showPaymentError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(paymentErrorMessage)
            }
            .fullScreenCover(isPresented: $showOrderConfirmation) {
                OrderConfirmationOverlay(orderId: confirmedOrderId) {
                    orderPlaced = true
                    dismiss()
                }
            }
        }
    }

    func applyPromoCode() {
        Task {
            _ = await promoManager.validatePromoCode(promoCodeInput, orderAmount: cartManager.subtotal)
            if promoManager.appliedPromoCode != nil {
                promoCodeInput = ""
            }
        }
    }

    private func handlePaymentResult(_ result: PaymentSheetResult) {
        switch result {
        case .completed:
            guard let shopId = cartManager.currentShopId,
                  let pid = paymentIntentId else { return }
            isPlacingOrder = true
            Task {
                await createOrderAfterPayment(shopId: shopId, paymentIntentId: pid)
            }
        case .canceled:
            paymentSheet = nil
            paymentService.reset()
        case .failed(let error):
            paymentSheet = nil
            paymentService.reset()
            paymentErrorMessage = error.localizedDescription
            showPaymentError = true
        }
    }

    private func createOrderAfterPayment(shopId: String, paymentIntentId: String) async {
        let finalAddress = selectedAddress?.fullAddress ?? deliveryAddress
        let coordinate = selectedAddress?.coordinate ?? validatedCoordinate

        let orderItems = cartManager.cart.items.map { item in
            CreateOrderItem(
                productId: item.product.id,
                productName: item.product.name,
                price: item.product.price,
                quantity: item.quantity
            )
        }

        let orderRequest = CreateOrderRequest(
            shopId: shopId,
            items: orderItems,
            deliveryAddress: finalAddress,
            deliveryLatitude: coordinate?.latitude ?? 0,
            deliveryLongitude: coordinate?.longitude ?? 0,
            notes: notes.isEmpty ? nil : notes
        )

        do {
            let order = try await dataService.createOrder(orderRequest, paymentIntentId: paymentIntentId)
            cartManager.clearCart()
            promoManager.removePromoCode()
            tipManager.reset()
            scheduleManager.reset()
            paymentService.reset()
            isPlacingOrder = false
            confirmedOrderId = order.id
            showOrderConfirmation = true
        } catch {
            isPlacingOrder = false
            paymentErrorMessage = error.localizedDescription
            showPaymentError = true
        }
    }
}

// MARK: - Order Confirmation Overlay
struct OrderConfirmationOverlay: View {
    let orderId: String?
    let onDismiss: () -> Void
    @State private var showCheckmark = false
    @State private var showText = false

    var body: some View {
        ZStack {
            Color(hex: "#22C55E")
                .ignoresSafeArea()

            VStack(spacing: 24) {
                Spacer()

                ZStack {
                    Circle()
                        .fill(Color.white.opacity(0.2))
                        .frame(width: 120, height: 120)
                        .scaleEffect(showCheckmark ? 1 : 0.5)

                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 80))
                        .foregroundColor(.white)
                        .scaleEffect(showCheckmark ? 1 : 0)
                }
                .animation(.spring(response: 0.6, dampingFraction: 0.6), value: showCheckmark)

                VStack(spacing: 8) {
                    Text("Commande validée !")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.white)

                    Text("Votre commande est en cours de préparation")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.9))
                        .multilineTextAlignment(.center)

                    if let orderId = orderId {
                        Text("N° \(orderId.prefix(8).uppercased())")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.white.opacity(0.7))
                            .padding(.top, 4)
                    }
                }
                .opacity(showText ? 1 : 0)
                .offset(y: showText ? 0 : 20)
                .animation(.easeOut(duration: 0.4).delay(0.3), value: showText)

                Spacer()

                Button(action: onDismiss) {
                    Text("Voir ma commande")
                        .fontWeight(.semibold)
                        .foregroundColor(Color(hex: "#22C55E"))
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.white)
                        .cornerRadius(12)
                }
                .padding(.horizontal, 32)
                .opacity(showText ? 1 : 0)
                .animation(.easeOut(duration: 0.4).delay(0.6), value: showText)

                Spacer()
                    .frame(height: 40)
            }
        }
        .onAppear {
            showCheckmark = true
            showText = true
        }
    }
}

// MARK: - Address Search View
struct AddressSearchView: View {
    @ObservedObject var completer: AddressSearchCompleter
    var onAddressSelected: (String, CLLocationCoordinate2D) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var isLoading = false
    @State private var errorMessage: String?
    @FocusState private var isFieldFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search field
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    TextField("Rechercher une adresse...", text: $completer.query)
                        .focused($isFieldFocused)
                        .autocorrectionDisabled()
                    if !completer.query.isEmpty {
                        Button(action: { completer.clear() }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding()

                if let error = errorMessage {
                    HStack(spacing: 4) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.caption)
                        Text(error)
                            .font(.caption)
                    }
                    .foregroundColor(.red)
                    .padding(.horizontal)
                }

                if isLoading {
                    ProgressView("Validation de l'adresse...")
                        .padding()
                }

                // Results list
                List(completer.results, id: \.self) { result in
                    Button(action: { selectAddress(result) }) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(result.title)
                                .font(.subheadline)
                                .fontWeight(.medium)
                            if !result.subtitle.isEmpty {
                                Text(result.subtitle)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .listStyle(.plain)
            }
            .navigationTitle("Rechercher une adresse")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") {
                        completer.clear()
                        dismiss()
                    }
                }
            }
            .onAppear {
                isFieldFocused = true
            }
        }
    }

    private func selectAddress(_ result: MKLocalSearchCompletion) {
        isLoading = true
        errorMessage = nil
        Task {
            do {
                let (address, coordinate) = try await completer.selectResult(result)
                completer.clear()
                onAddressSelected(address, coordinate)
            } catch {
                errorMessage = "Impossible de valider cette adresse. Réessayez."
            }
            isLoading = false
        }
    }
}

// MARK: - Checkout Helpers
struct CheckoutSection<Content: View>: View {
    let title: String
    let icon: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(Color(hex: "#22C55E"))
                Text(title)
                    .font(.headline)
            }
            content
        }
    }
}

struct SummaryRow: View {
    let label: String
    let value: Double
    var isDiscount: Bool = false

    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
            Spacer()
            Text(String(format: "%.2f €", value))
                .font(.subheadline)
                .foregroundColor(isDiscount ? Color(hex: "#22C55E") : .primary)
        }
    }
}

// MARK: - Age Verification Warning View
struct AgeVerificationWarningView: View {
    let restrictedProducts: [String]
    let isVerified: Bool
    let verificationStatus: KYCService.VerificationStatus
    let onVerifyTapped: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: isVerified ? "checkmark.shield.fill" : "exclamationmark.triangle.fill")
                    .font(.title2)
                    .foregroundColor(Color(hex: isVerified ? "#22C55E" : "#F59E0B"))

                VStack(alignment: .leading, spacing: 4) {
                    Text(isVerified ? "Identité vérifiée" : "Vérification d'âge requise")
                        .font(.headline)

                    Text(isVerified
                         ? "Vous pouvez commander des produits réservés aux adultes."
                         : "Votre panier contient des produits réservés aux personnes majeures (18+).")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            if !isVerified {
                // List of restricted products
                VStack(alignment: .leading, spacing: 6) {
                    Text("Produits concernés:")
                        .font(.caption)
                        .fontWeight(.medium)

                    ForEach(restrictedProducts.prefix(3), id: \.self) { productName in
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.circle.fill")
                                .font(.caption)
                                .foregroundColor(Color(hex: "#F59E0B"))
                            Text(productName)
                                .font(.caption)
                        }
                    }

                    if restrictedProducts.count > 3 {
                        Text("et \(restrictedProducts.count - 3) autre(s)...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.leading, 36)

                // Verification status info
                if verificationStatus == .pending || verificationStatus == .inReview {
                    HStack(spacing: 8) {
                        ProgressView()
                            .scaleEffect(0.8)
                        Text("Vérification en cours...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top, 4)
                } else {
                    // Verify button
                    Button(action: onVerifyTapped) {
                        HStack {
                            Image(systemName: "person.badge.shield.checkmark.fill")
                            Text("Vérifier mon identité")
                                .fontWeight(.medium)
                        }
                        .font(.subheadline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color(hex: "#22C55E"))
                        .cornerRadius(10)
                    }
                    .padding(.top, 4)
                }
            }
        }
        .padding()
        .background(Color(hex: isVerified ? "#22C55E" : "#F59E0B").opacity(0.1))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color(hex: isVerified ? "#22C55E" : "#F59E0B").opacity(0.3), lineWidth: 1)
        )
    }
}

// MARK: - Schedule Delivery Sheet
struct ScheduleDeliverySheet: View {
    @StateObject private var scheduleManager = ScheduledDeliveryManager.shared
    @Environment(\.dismiss) private var dismiss

    var availableSlots: [ScheduledDeliveryManager.TimeSlot] {
        scheduleManager.getAvailableTimeSlots(for: scheduleManager.scheduledDate)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // Date picker
                DatePicker(
                    "Date",
                    selection: $scheduleManager.scheduledDate,
                    in: Date()...,
                    displayedComponents: .date
                )
                .datePickerStyle(.graphical)
                .tint(Color(hex: "#22C55E"))

                // Time slots
                VStack(alignment: .leading, spacing: 12) {
                    Text("Créneaux disponibles")
                        .font(.headline)

                    ScrollView {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                            ForEach(availableSlots) { slot in
                                Button(action: {
                                    if slot.isAvailable {
                                        scheduleManager.selectedTimeSlot = slot
                                    }
                                }) {
                                    Text(slot.displayString)
                                        .font(.subheadline)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 12)
                                        .background(
                                            scheduleManager.selectedTimeSlot?.id == slot.id
                                            ? Color(hex: "#22C55E")
                                            : (slot.isAvailable ? Color(.systemGray6) : Color(.systemGray5))
                                        )
                                        .foregroundColor(
                                            scheduleManager.selectedTimeSlot?.id == slot.id
                                            ? .white
                                            : (slot.isAvailable ? .primary : .secondary)
                                        )
                                        .cornerRadius(10)
                                }
                                .disabled(!slot.isAvailable)
                            }
                        }
                    }
                }
                .padding(.horizontal)

                Spacer()
            }
            .navigationTitle("Programmer livraison")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Confirmer") { dismiss() }
                        .disabled(scheduleManager.selectedTimeSlot == nil)
                }
            }
        }
    }
}

// MARK: - Client Orders View
struct ClientOrdersView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var dataService = DataService.shared
    @State private var selectedTab = 0

    var activeOrders: [Order] {
        guard let userId = authService.userProfile?.id else { return [] }
        return dataService.getOrders(forUser: userId).filter {
            $0.status != .delivered && $0.status != .cancelled
        }
    }

    var pastOrders: [Order] {
        guard let userId = authService.userProfile?.id else { return [] }
        return dataService.getOrders(forUser: userId).filter {
            $0.status == .delivered || $0.status == .cancelled
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tabs
                Picker("", selection: $selectedTab) {
                    Text("En cours").tag(0)
                    Text("Historique").tag(1)
                }
                .pickerStyle(.segmented)
                .padding()

                if selectedTab == 0 {
                    if activeOrders.isEmpty {
                        Spacer()
                        VStack(spacing: 12) {
                            Image(systemName: "bag")
                                .font(.system(size: 50))
                                .foregroundColor(.secondary)
                            Text("Aucune commande en cours")
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 16) {
                                ForEach(activeOrders) { order in
                                    OrderCard(order: order)
                                }
                            }
                            .padding()
                        }
                    }
                } else {
                    if pastOrders.isEmpty {
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
                                ForEach(pastOrders) { order in
                                    OrderCard(order: order)
                                }
                            }
                            .padding()
                        }
                    }
                }
            }
            .navigationTitle("Mes Commandes")
            .overlay {
                if dataService.isLoading && activeOrders.isEmpty && pastOrders.isEmpty {
                    ProgressView("Chargement...")
                }
            }
            .refreshable {
                await dataService.loadOrders()
            }
            .task {
                await dataService.loadOrders()
            }
        }
    }
}

struct OrderCard: View {
    let order: Order
    @State private var showTracking = false
    @State private var showReview = false
    @StateObject private var reviewManager = ReviewManager.shared

    var hasReviewed: Bool {
        reviewManager.reviews.contains { $0.orderId == order.id }
    }

    var body: some View {
        Button(action: { showTracking = true }) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(order.shopName)
                            .font(.headline)
                            .foregroundColor(.primary)
                        Text(order.createdAt.formatted(date: .abbreviated, time: .shortened))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    StatusBadge(status: order.status)
                }

                Divider()

                ForEach(order.items.prefix(3)) { item in
                    HStack {
                        Text("\(item.quantity)x")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(item.productName)
                            .font(.subheadline)
                            .foregroundColor(.primary)
                    }
                }

                if order.items.count > 3 {
                    Text("+ \(order.items.count - 3) autres articles")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Divider()

                HStack {
                    Text("Total")
                        .font(.subheadline)
                        .foregroundColor(.primary)
                    Spacer()
                    Text(String(format: "%.2f €", order.total))
                        .font(.headline)
                        .foregroundColor(Color(hex: "#22C55E"))
                }

                // Show tracking button for active orders
                if order.status.isActive {
                    HStack {
                        Image(systemName: "location.fill")
                        Text("Suivre ma commande")
                            .fontWeight(.medium)
                    }
                    .font(.subheadline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color(hex: "#22C55E"))
                    .cornerRadius(8)
                }

                // Show review button for delivered orders
                if order.status == .delivered && !hasReviewed {
                    Button(action: { showReview = true }) {
                        HStack {
                            Image(systemName: "star.fill")
                            Text("Donner mon avis")
                                .fontWeight(.medium)
                        }
                        .font(.subheadline)
                        .foregroundColor(Color(hex: "#22C55E"))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color(hex: "#22C55E").opacity(0.1))
                        .cornerRadius(8)
                    }
                }

                // Show "reviewed" badge
                if order.status == .delivered && hasReviewed {
                    HStack {
                        Image(systemName: "checkmark.seal.fill")
                        Text("Avis envoyé")
                            .fontWeight(.medium)
                    }
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
        }
        .buttonStyle(PlainButtonStyle())
        .sheet(isPresented: $showTracking) {
            OrderTrackingDetailView(order: order)
        }
        .sheet(isPresented: $showReview) {
            ReviewOrderView(order: order)
        }
    }
}

struct StatusBadge: View {
    let status: OrderStatus

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: status.icon)
                .font(.caption)
            Text(status.displayName)
                .font(.caption)
                .fontWeight(.medium)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color(hex: status.color).opacity(0.15))
        .foregroundColor(Color(hex: status.color))
        .cornerRadius(8)
    }
}

// MARK: - Order Tracking Detail View
struct OrderTrackingDetailView: View {
    let order: Order
    @Environment(\.dismiss) private var dismiss
    @State private var showMap = false
    @State private var showChat = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Order Header
                    VStack(spacing: 8) {
                        Image(systemName: order.status.icon)
                            .font(.system(size: 50))
                            .foregroundColor(Color(hex: order.status.color))

                        Text(order.status.displayName)
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("Commande #\(order.id.prefix(8))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top)

                    // Driver assigned indicator
                    if order.status == .ready && order.driverId != nil {
                        HStack {
                            Image(systemName: "bicycle")
                                .foregroundColor(Color(hex: "#22C55E"))
                            Text("Livreur assigne - en route vers le magasin")
                                .font(.subheadline)
                                .fontWeight(.medium)
                        }
                        .padding()
                        .background(Color(hex: "#22C55E").opacity(0.1))
                        .cornerRadius(12)
                        .padding(.horizontal)
                    }

                    // Progress Tracker
                    OrderProgressTracker(order: order)
                        .padding(.horizontal)

                    // Estimated Time
                    if order.status.isActive, let estimated = order.estimatedDelivery {
                        HStack {
                            Image(systemName: "clock.fill")
                                .foregroundColor(Color(hex: "#22C55E"))
                            VStack(alignment: .leading) {
                                Text("Livraison estimée")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Text(estimated.formatted(date: .omitted, time: .shortened))
                                    .font(.headline)
                            }
                            Spacer()
                        }
                        .padding()
                        .background(Color(hex: "#22C55E").opacity(0.1))
                        .cornerRadius(12)
                        .padding(.horizontal)
                    }

                    // Delivery Code
                    if let code = order.deliveryCode, order.status.isActive {
                        VStack(spacing: 8) {
                            Text("Code de livraison")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text(code)
                                .font(.system(size: 36, weight: .bold, design: .monospaced))
                                .foregroundColor(Color(hex: "#22C55E"))
                            Text("Donnez ce code au livreur pour confirmer la réception")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(hex: "#22C55E").opacity(0.08))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color(hex: "#22C55E").opacity(0.3), lineWidth: 1)
                        )
                        .padding(.horizontal)
                    }

                    // Shop Info
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Boutique")
                            .font(.headline)

                        HStack {
                            Image(systemName: "storefront.fill")
                                .foregroundColor(Color(hex: "#22C55E"))
                                .frame(width: 40, height: 40)
                                .background(Color(hex: "#22C55E").opacity(0.1))
                                .cornerRadius(10)

                            VStack(alignment: .leading) {
                                Text(order.shopName)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                            }

                            Spacer()
                        }
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.03), radius: 8)
                    .padding(.horizontal)

                    // Delivery Address
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Adresse de livraison")
                            .font(.headline)

                        HStack {
                            Image(systemName: "mappin.circle.fill")
                                .foregroundColor(.red)
                                .frame(width: 40, height: 40)
                                .background(Color.red.opacity(0.1))
                                .cornerRadius(10)

                            VStack(alignment: .leading) {
                                Text(order.deliveryAddress)
                                    .font(.subheadline)
                            }

                            Spacer()

                            Button(action: { showMap = true }) {
                                Image(systemName: "map.fill")
                                    .foregroundColor(Color(hex: "#22C55E"))
                            }
                        }
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.03), radius: 8)
                    .padding(.horizontal)

                    // Order Items
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Articles commandés")
                            .font(.headline)

                        ForEach(order.items) { item in
                            HStack {
                                Text("\(item.quantity)x")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                    .frame(width: 30)

                                Text(item.productName)
                                    .font(.subheadline)

                                Spacer()

                                Text(String(format: "%.2f €", item.total))
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.vertical, 4)
                        }

                        Divider()

                        HStack {
                            Text("Sous-total")
                            Spacer()
                            Text(String(format: "%.2f €", order.subtotal))
                        }
                        .font(.subheadline)

                        HStack {
                            Text("Frais de livraison")
                            Spacer()
                            Text(String(format: "%.2f €", order.deliveryFee))
                        }
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                        Divider()

                        HStack {
                            Text("Total")
                                .fontWeight(.bold)
                            Spacer()
                            Text(String(format: "%.2f €", order.total))
                                .fontWeight(.bold)
                                .foregroundColor(Color(hex: "#22C55E"))
                        }
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.03), radius: 8)
                    .padding(.horizontal)

                    // Chat & Actions
                    if order.status.isActive && order.driverId != nil {
                        HStack(spacing: 12) {
                            Button(action: { showChat = true }) {
                                HStack {
                                    Image(systemName: "message.fill")
                                    Text("Chat livreur")
                                }
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color(hex: "#3B82F6"))
                                .cornerRadius(12)
                            }

                            Button(action: { showMap = true }) {
                                HStack {
                                    Image(systemName: "map.fill")
                                    Text("Voir carte")
                                }
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color(hex: "#22C55E"))
                                .cornerRadius(12)
                            }
                        }
                        .padding(.horizontal)
                    }

                    // Post-delivery actions (Tip & Review)
                    if order.status == .delivered {
                        // Tip prompt
                        if order.driverId != nil {
                            OrderTipPrompt(order: order)
                                .padding(.horizontal)
                        }

                        // Review prompt
                        PendingReviewBanner(order: order)
                            .padding(.horizontal)
                    }

                    // Help Button
                    NavigationLink(destination: FAQView()) {
                        HStack {
                            Image(systemName: "questionmark.circle.fill")
                            Text("Besoin d'aide ?")
                        }
                        .foregroundColor(Color(hex: "#22C55E"))
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(hex: "#22C55E").opacity(0.1))
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)
                    .padding(.bottom)
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Suivi commande")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Fermer") { dismiss() }
                }
            }
            .sheet(isPresented: $showMap) {
                OrderTrackingMapView(order: order)
            }
            .fullScreenCover(isPresented: $showChat) {
                OrderChatView(order: order)
            }
        }
    }
}

// MARK: - Order Progress Tracker
struct OrderProgressTracker: View {
    let order: Order

    var currentStatus: OrderStatus { order.status }

    var effectiveProgress: Double {
        if order.status == .ready && order.driverId != nil {
            return 0.65
        }
        return order.status.progressValue
    }

    let steps = [
        ("Confirmée", "checkmark.circle.fill", 1),
        ("Préparation", "flame.fill", 2),
        ("Prête", "bag.fill", 3),
        ("En livraison", "bicycle", 4),
        ("Livrée", "checkmark.seal.fill", 5)
    ]

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                    let isCompleted = currentStatus.stepNumber > step.2
                    let isCurrent = currentStatus.stepNumber == step.2

                    VStack(spacing: 8) {
                        ZStack {
                            Circle()
                                .fill(isCompleted || isCurrent ? Color(hex: "#22C55E") : Color(.systemGray4))
                                .frame(width: 36, height: 36)

                            if isCompleted {
                                Image(systemName: "checkmark")
                                    .font(.caption.bold())
                                    .foregroundColor(.white)
                            } else {
                                Image(systemName: step.1)
                                    .font(.caption)
                                    .foregroundColor(isCurrent ? .white : .gray)
                            }
                        }

                        Text(step.0)
                            .font(.caption2)
                            .foregroundColor(isCompleted || isCurrent ? .primary : .secondary)
                            .multilineTextAlignment(.center)
                            .frame(width: 60)
                    }

                    if index < steps.count - 1 {
                        Rectangle()
                            .fill(currentStatus.stepNumber > step.2 ? Color(hex: "#22C55E") : Color(.systemGray4))
                            .frame(height: 3)
                            .frame(maxWidth: .infinity)
                            .padding(.bottom, 28)
                    }
                }
            }
        }
        .padding(.vertical)
    }
}

// MARK: - Order Map View
struct OrderMapView: View {
    let order: Order
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack {
                // Map placeholder - would use MapKit in real implementation
                ZStack {
                    Color(.systemGray5)

                    VStack(spacing: 16) {
                        Image(systemName: "map.fill")
                            .font(.system(size: 60))
                            .foregroundColor(Color(hex: "#22C55E"))

                        Text("Carte de suivi")
                            .font(.title3)
                            .fontWeight(.medium)

                        Text(order.deliveryAddress)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)

                        // Open in Maps button
                        Button(action: openInMaps) {
                            HStack {
                                Image(systemName: "arrow.triangle.turn.up.right.diamond.fill")
                                Text("Ouvrir dans Plans")
                            }
                            .foregroundColor(.white)
                            .padding()
                            .background(Color(hex: "#22C55E"))
                            .cornerRadius(12)
                        }
                    }
                }
            }
            .navigationTitle("Localisation")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Fermer") { dismiss() }
                }
            }
        }
    }

    private func openInMaps() {
        let coordinate = "\(order.deliveryLatitude),\(order.deliveryLongitude)"
        if let url = URL(string: "http://maps.apple.com/?daddr=\(coordinate)") {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Review Order View
struct ReviewOrderView: View {
    let order: Order
    @Environment(\.dismiss) private var dismiss
    @StateObject private var reviewManager = ReviewManager.shared

    @State private var rating: Int = 5
    @State private var comment: String = ""
    @State private var isSubmitting = false
    @State private var showSuccess = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 12) {
                        Image(systemName: "star.bubble.fill")
                            .font(.system(size: 50))
                            .foregroundColor(Color(hex: "#22C55E"))

                        Text("Comment s'est passée\nvotre commande ?")
                            .font(.title2)
                            .fontWeight(.bold)
                            .multilineTextAlignment(.center)

                        Text(order.shopName)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top)

                    // Star Rating
                    VStack(spacing: 12) {
                        Text("Votre note")
                            .font(.headline)

                        HStack(spacing: 12) {
                            ForEach(1...5, id: \.self) { star in
                                Button(action: {
                                    withAnimation(.spring(response: 0.3)) {
                                        rating = star
                                    }
                                }) {
                                    Image(systemName: star <= rating ? "star.fill" : "star")
                                        .font(.system(size: 36))
                                        .foregroundColor(star <= rating ? .yellow : .gray.opacity(0.3))
                                }
                            }
                        }

                        Text(ratingDescription)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(16)
                    .padding(.horizontal)

                    // Comment
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Votre commentaire (optionnel)")
                            .font(.headline)

                        TextEditor(text: $comment)
                            .frame(height: 120)
                            .padding(8)
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color(.systemGray4), lineWidth: 1)
                            )

                        Text("\(comment.count)/500 caractères")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal)

                    // Quick Tags
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Tags rapides")
                            .font(.headline)
                            .padding(.horizontal)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(quickTags, id: \.self) { tag in
                                    Button(action: {
                                        if comment.isEmpty {
                                            comment = tag
                                        } else {
                                            comment += " \(tag)"
                                        }
                                    }) {
                                        Text(tag)
                                            .font(.caption)
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 8)
                                            .background(Color(hex: "#22C55E").opacity(0.1))
                                            .foregroundColor(Color(hex: "#22C55E"))
                                            .cornerRadius(20)
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                    }

                    Spacer(minLength: 20)

                    // Submit Button
                    Button(action: submitReview) {
                        HStack {
                            if isSubmitting {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Image(systemName: "paperplane.fill")
                                Text("Envoyer mon avis")
                                    .fontWeight(.semibold)
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(hex: "#22C55E"))
                        .cornerRadius(12)
                    }
                    .disabled(isSubmitting)
                    .padding(.horizontal)
                    .padding(.bottom)
                }
            }
            .navigationTitle("Évaluation")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Annuler") { dismiss() }
                }
            }
            .alert("Merci pour votre avis !", isPresented: $showSuccess) {
                Button("OK") { dismiss() }
            } message: {
                Text("Votre évaluation a été enregistrée et aidera les autres utilisateurs.")
            }
        }
    }

    private var ratingDescription: String {
        switch rating {
        case 1: return "Très déçu 😞"
        case 2: return "Déçu 😕"
        case 3: return "Correct 😐"
        case 4: return "Satisfait 🙂"
        case 5: return "Excellent ! 😍"
        default: return ""
        }
    }

    private var quickTags: [String] {
        [
            "Livraison rapide",
            "Produits frais",
            "Bien emballé",
            "Livreur sympathique",
            "Conforme à la commande",
            "Prix correct"
        ]
    }

    private func submitReview() {
        isSubmitting = true

        Task {
            do {
                try await reviewManager.submitReview(
                    orderId: order.id,
                    shopId: order.shopId,
                    rating: rating,
                    comment: comment.trimmingCharacters(in: .whitespacesAndNewlines)
                )
                showSuccess = true
            } catch {
            }
            isSubmitting = false
        }
    }
}

// MARK: - Shop Reviews View
struct ShopReviewsView: View {
    let shopId: String
    let shopName: String
    @StateObject private var reviewManager = ReviewManager.shared

    var body: some View {
        NavigationStack {
            Group {
                if reviewManager.isLoading {
                    ProgressView("Chargement des avis...")
                } else if reviewManager.reviews.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "bubble.left.and.bubble.right")
                            .font(.system(size: 50))
                            .foregroundColor(.secondary)

                        Text("Aucun avis pour le moment")
                            .font(.headline)

                        Text("Soyez le premier à donner votre avis !")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            // Rating Summary
                            RatingSummaryView(reviews: reviewManager.reviews)
                                .padding(.horizontal)

                            Divider()
                                .padding(.horizontal)

                            // Individual Reviews
                            ForEach(reviewManager.reviews) { review in
                                ShopReviewCard(review: review)
                            }
                        }
                        .padding(.vertical)
                    }
                }
            }
            .navigationTitle("Avis - \(shopName)")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await reviewManager.loadReviews(forShop: shopId)
            }
        }
    }
}

struct RatingSummaryView: View {
    let reviews: [ReviewManager.Review]

    var averageRating: Double {
        guard !reviews.isEmpty else { return 0 }
        return Double(reviews.reduce(0) { $0 + $1.rating }) / Double(max(reviews.count, 1))
    }

    var body: some View {
        HStack(spacing: 20) {
            VStack {
                Text(String(format: "%.1f", averageRating))
                    .font(.system(size: 48, weight: .bold))
                    .foregroundColor(Color(hex: "#22C55E"))

                HStack(spacing: 2) {
                    ForEach(1...5, id: \.self) { star in
                        Image(systemName: Double(star) <= averageRating ? "star.fill" : (Double(star) - 0.5 <= averageRating ? "star.leadinghalf.filled" : "star"))
                            .font(.caption)
                            .foregroundColor(.yellow)
                    }
                }

                Text("\(reviews.count) avis")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Divider()
                .frame(height: 80)

            VStack(alignment: .leading, spacing: 4) {
                ForEach((1...5).reversed(), id: \.self) { star in
                    HStack(spacing: 8) {
                        Text("\(star)")
                            .font(.caption)
                            .frame(width: 12)

                        Image(systemName: "star.fill")
                            .font(.caption2)
                            .foregroundColor(.yellow)

                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                Rectangle()
                                    .fill(Color(.systemGray5))
                                    .frame(height: 8)
                                    .cornerRadius(4)

                                Rectangle()
                                    .fill(Color(hex: "#22C55E"))
                                    .frame(width: geometry.size.width * percentageForStar(star), height: 8)
                                    .cornerRadius(4)
                            }
                        }
                        .frame(height: 8)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(16)
    }

    private func percentageForStar(_ star: Int) -> Double {
        guard !reviews.isEmpty else { return 0 }
        let count = reviews.filter { $0.rating == star }.count
        return Double(count) / Double(max(reviews.count, 1))
    }
}

struct ShopReviewCard: View {
    let review: ReviewManager.Review

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                // Avatar
                Circle()
                    .fill(Color(hex: "#22C55E").opacity(0.2))
                    .frame(width: 40, height: 40)
                    .overlay(
                        Text(String(review.userName.prefix(1)))
                            .font(.headline)
                            .foregroundColor(Color(hex: "#22C55E"))
                    )

                VStack(alignment: .leading, spacing: 2) {
                    Text(review.userName)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    Text(review.createdAt.formatted(date: .abbreviated, time: .omitted))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                HStack(spacing: 2) {
                    ForEach(1...5, id: \.self) { star in
                        Image(systemName: star <= review.rating ? "star.fill" : "star")
                            .font(.caption2)
                            .foregroundColor(.yellow)
                    }
                }
            }

            if !review.comment.isEmpty {
                Text(review.comment)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 8)
        .padding(.horizontal)
    }
}
