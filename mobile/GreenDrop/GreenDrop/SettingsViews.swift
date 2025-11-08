import SwiftUI
import CoreLocation
import MapKit
import PhotosUI
import FirebaseFirestore
import FirebaseStorage

// MARK: - Settings View
struct SettingsView: View {
    @StateObject private var settings = AppSettingsManager.shared
    @EnvironmentObject var authService: AuthService
    @State private var showAddresses = false
    @State private var showLegal = false
    @State private var showSupport = false
    @State private var showDeleteAccount = false
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        NavigationStack {
            List {
                // Profile Section
                Section {
                    NavigationLink(destination: EditProfileView()) {
                        HStack(spacing: 16) {
                            if let avatar = authService.userProfile?.avatar, let url = URL(string: avatar) {
                                AsyncImage(url: url) { phase in
                                    switch phase {
                                    case .success(let image):
                                        image.resizable().aspectRatio(contentMode: .fill)
                                    default:
                                        profilePlaceholder
                                    }
                                }
                                .frame(width: 64, height: 64)
                                .clipShape(Circle())
                            } else {
                                profilePlaceholder
                            }

                            VStack(alignment: .leading, spacing: 4) {
                                Text(authService.userProfile?.name ?? "Utilisateur")
                                    .font(.headline)
                                Text(authService.userProfile?.email ?? "")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                if let phone = authService.userProfile?.phone, !phone.isEmpty {
                                    Text(phone)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }

                            Spacer()
                        }
                        .padding(.vertical, 4)
                    }
                }

                // Account Section
                Section("Compte") {
                    NavigationLink(destination: AddressesListView()) {
                        SettingsRow(icon: "mappin.circle.fill", title: "Mes adresses", color: "#22C55E")
                    }

                    NavigationLink(destination: PaymentMethodsView()) {
                        SettingsRow(icon: "creditcard.fill", title: "Moyens de paiement", color: "#3B82F6")
                    }

                    NavigationLink(destination: OrderHistoryView()) {
                        SettingsRow(icon: "clock.fill", title: "Historique des commandes", color: "#8B5CF6")
                    }
                }

                // Preferences Section
                Section("Préférences") {
                    Toggle(isOn: $settings.isDarkMode) {
                        SettingsRow(icon: "moon.fill", title: "Mode sombre", color: "#6366F1")
                    }
                    .tint(Color(hex: "#22C55E"))

                    Toggle(isOn: $settings.notificationsEnabled) {
                        SettingsRow(icon: "bell.fill", title: "Notifications", color: "#F59E0B")
                    }
                    .tint(Color(hex: "#22C55E"))

                    Toggle(isOn: $settings.soundEnabled) {
                        SettingsRow(icon: "speaker.wave.2.fill", title: "Sons", color: "#EC4899")
                    }
                    .tint(Color(hex: "#22C55E"))

                    NavigationLink(destination: LanguageSelectionView()) {
                        HStack {
                            SettingsRow(icon: "globe", title: "Langue", color: "#06B6D4")
                            Spacer()
                            Text(settings.availableLanguages.first { $0.0 == settings.language }?.1 ?? "Français")
                                .foregroundColor(.secondary)
                        }
                    }
                }

                // Support Section
                Section("Aide & Support") {
                    NavigationLink(destination: FAQView()) {
                        SettingsRow(icon: "questionmark.circle.fill", title: "FAQ", color: "#22C55E")
                    }

                    NavigationLink(destination: ContactSupportView()) {
                        SettingsRow(icon: "envelope.fill", title: "Contacter le support", color: "#3B82F6")
                    }

                    NavigationLink(destination: ReportProblemView()) {
                        SettingsRow(icon: "exclamationmark.triangle.fill", title: "Signaler un problème", color: "#F59E0B")
                    }
                }

                // Legal Section
                Section("Légal") {
                    NavigationLink(destination: TermsOfServiceView()) {
                        SettingsRow(icon: "doc.text.fill", title: "Conditions d'utilisation", color: "#6B7280")
                    }

                    NavigationLink(destination: PrivacyPolicyView()) {
                        SettingsRow(icon: "hand.raised.fill", title: "Politique de confidentialité", color: "#6B7280")
                    }

                    NavigationLink(destination: LicensesView()) {
                        SettingsRow(icon: "scroll.fill", title: "Licences", color: "#6B7280")
                    }
                }

                // Danger Zone
                Section {
                    Button(action: { showDeleteAccount = true }) {
                        HStack {
                            Image(systemName: "trash.fill")
                                .foregroundColor(.red)
                            Text("Supprimer mon compte")
                                .foregroundColor(.red)
                        }
                    }
                }

                // App Info
                Section {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0 (Build 1)")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("Paramètres")
            .preferredColorScheme(settings.isDarkMode ? .dark : .light)
            .alert("Supprimer le compte", isPresented: $showDeleteAccount) {
                Button("Annuler", role: .cancel) {}
                Button("Supprimer", role: .destructive) {
                    deleteAccount()
                }
            } message: {
                Text("Cette action est irréversible. Toutes vos données seront supprimées.")
            }
        }
    }

    var profilePlaceholder: some View {
        ZStack {
            Circle()
                .fill(Color(hex: "#22C55E").opacity(0.15))
                .frame(width: 64, height: 64)
            Text(String((authService.userProfile?.name ?? "U").prefix(1)).uppercased())
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(Color(hex: "#22C55E"))
        }
    }

    func deleteAccount() {
        // In production, this would call the backend to delete the account
        Task {
            try? authService.signOut()
        }
    }
}

struct SettingsRow: View {
    let icon: String
    let title: String
    let color: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(Color(hex: color))
                .frame(width: 24)
            Text(title)
        }
    }
}

// MARK: - Edit Profile View
struct EditProfileView: View {
    @EnvironmentObject var authService: AuthService
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var phone = ""
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var isUploadingAvatar = false
    @State private var isSaving = false
    @State private var showSuccess = false

    var body: some View {
        Form {
            // Avatar section
            Section {
                HStack {
                    Spacer()
                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        ZStack(alignment: .bottomTrailing) {
                            if isUploadingAvatar {
                                ZStack {
                                    Circle()
                                        .fill(Color(.systemGray5))
                                        .frame(width: 100, height: 100)
                                    ProgressView()
                                        .tint(Color(hex: "#22C55E"))
                                }
                            } else if let avatar = authService.userProfile?.avatar, let url = URL(string: avatar) {
                                AsyncImage(url: url) { phase in
                                    switch phase {
                                    case .success(let image):
                                        image.resizable().aspectRatio(contentMode: .fill)
                                    default:
                                        avatarPlaceholder
                                    }
                                }
                                .frame(width: 100, height: 100)
                                .clipShape(Circle())
                            } else {
                                avatarPlaceholder
                            }

                            Circle()
                                .fill(Color(hex: "#22C55E"))
                                .frame(width: 30, height: 30)
                                .overlay(
                                    Image(systemName: "camera.fill")
                                        .font(.system(size: 14))
                                        .foregroundColor(.white)
                                )
                        }
                    }
                    Spacer()
                }
                .listRowBackground(Color.clear)
            }
            .onChange(of: selectedPhotoItem) { _, newItem in
                guard let item = newItem else { return }
                uploadAvatar(item: item)
            }

            // Personal info
            Section("Informations personnelles") {
                HStack {
                    Image(systemName: "person.fill")
                        .foregroundColor(Color(hex: "#22C55E"))
                        .frame(width: 24)
                    TextField("Nom complet", text: $name)
                }

                HStack {
                    Image(systemName: "phone.fill")
                        .foregroundColor(Color(hex: "#22C55E"))
                        .frame(width: 24)
                    TextField("Numéro de téléphone", text: $phone)
                        .keyboardType(.phonePad)
                }
            }

            // Email (read-only)
            Section("Email") {
                HStack {
                    Image(systemName: "envelope.fill")
                        .foregroundColor(.secondary)
                        .frame(width: 24)
                    Text(authService.userProfile?.email ?? "")
                        .foregroundColor(.secondary)
                }
            }

            // Save
            Section {
                Button(action: saveProfile) {
                    HStack {
                        Spacer()
                        if isSaving {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Enregistrer les modifications")
                                .fontWeight(.semibold)
                        }
                        Spacer()
                    }
                    .foregroundColor(.white)
                    .padding(.vertical, 8)
                    .background(Color(hex: "#22C55E"))
                    .cornerRadius(10)
                }
                .disabled(isSaving || name.isEmpty)
                .listRowBackground(Color.clear)
            }
        }
        .navigationTitle("Mon profil")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            name = authService.userProfile?.name ?? ""
            phone = authService.userProfile?.phone ?? ""
        }
        .alert("Profil mis à jour", isPresented: $showSuccess) {
            Button("OK") { dismiss() }
        } message: {
            Text("Vos informations ont été enregistrées.")
        }
    }

    private var avatarPlaceholder: some View {
        ZStack {
            Circle()
                .fill(Color(hex: "#22C55E").opacity(0.15))
                .frame(width: 100, height: 100)
            Text(String((authService.userProfile?.name ?? "U").prefix(1)).uppercased())
                .font(.system(size: 40, weight: .bold))
                .foregroundColor(Color(hex: "#22C55E"))
        }
    }

    private func uploadAvatar(item: PhotosPickerItem) {
        isUploadingAvatar = true
        Task {
            guard let data = try? await item.loadTransferable(type: Data.self),
                  let image = UIImage(data: data),
                  let jpegData = image.jpegData(compressionQuality: 0.7),
                  let userId = authService.userProfile?.id else {
                isUploadingAvatar = false
                return
            }

            let storageRef = Storage.storage().reference().child("avatars/\(userId).jpg")
            _ = try? await storageRef.putDataAsync(jpegData)
            if let url = try? await storageRef.downloadURL() {
                authService.updateAvatar(url.absoluteString)
            }
            isUploadingAvatar = false
        }
    }

    private func saveProfile() {
        isSaving = true
        authService.updateProfile(name: name, phone: phone, address: authService.userProfile?.address ?? "")
        isSaving = false
        showSuccess = true
    }
}

// MARK: - Addresses List View
struct AddressesListView: View {
    @StateObject private var addressManager = AddressManager.shared
    @StateObject private var locationManager = LocationManager()
    @State private var showAddAddress = false
    @State private var isLocating = false
    @State private var locationError: String?

    var body: some View {
        List {
            // Bouton localisation GPS
            Section {
                Button(action: { addFromCurrentLocation() }) {
                    HStack(spacing: 10) {
                        ZStack {
                            Circle()
                                .fill(Color(hex: "#22C55E").opacity(0.15))
                                .frame(width: 36, height: 36)
                            if isLocating {
                                ProgressView()
                                    .tint(Color(hex: "#22C55E"))
                            } else {
                                Image(systemName: "location.fill")
                                    .foregroundColor(Color(hex: "#22C55E"))
                            }
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Ajouter ma position actuelle")
                                .fontWeight(.medium)
                                .foregroundColor(.primary)
                            Text("Utiliser le GPS pour enregistrer une adresse")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .disabled(isLocating)

                if let error = locationError {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                }
            }

            // Adresses existantes
            if !addressManager.addresses.isEmpty {
                Section("Mes adresses") {
                    ForEach(addressManager.addresses) { address in
                        AddressRow(address: address)
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    addressManager.deleteAddress(id: address.id)
                                } label: {
                                    Label("Supprimer", systemImage: "trash")
                                }

                                Button {
                                    addressManager.setDefault(id: address.id)
                                } label: {
                                    Label("Par défaut", systemImage: "star")
                                }
                                .tint(.orange)
                            }
                    }
                }
            }

            // Ajouter manuellement
            Section {
                Button(action: { showAddAddress = true }) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(Color(hex: "#22C55E"))
                        Text("Ajouter une adresse manuellement")
                            .foregroundColor(Color(hex: "#22C55E"))
                    }
                }
            }
        }
        .navigationTitle("Mes adresses")
        .sheet(isPresented: $showAddAddress) {
            AddEditAddressView()
        }
        .overlay {
            if addressManager.addresses.isEmpty && !isLocating {
                ContentUnavailableView(
                    "Aucune adresse",
                    systemImage: "mappin.slash",
                    description: Text("Ajoutez une adresse pour faciliter vos commandes")
                )
            }
        }
        .onAppear {
            locationManager.requestPermission()
        }
    }

    private func addFromCurrentLocation() {
        isLocating = true
        locationError = nil
        locationManager.startUpdating()

        Task {
            for _ in 0..<20 {
                if locationManager.location != nil { break }
                try? await Task.sleep(nanoseconds: 500_000_000)
            }

            guard let coord = locationManager.location else {
                locationError = "Impossible d'obtenir votre position."
                isLocating = false
                return
            }

            do {
                _ = try await addressManager.addAddressFromLocation(coord, label: "Ma position")
            } catch {
                locationError = "Impossible de résoudre l'adresse."
            }

            isLocating = false
            locationManager.stopUpdating()
        }
    }
}

struct AddressRow: View {
    let address: AddressManager.SavedAddress
    @StateObject private var addressManager = AddressManager.shared

    var body: some View {
        HStack(spacing: 12) {
            // Icon
            ZStack {
                Circle()
                    .fill(Color(hex: "#22C55E").opacity(0.15))
                    .frame(width: 44, height: 44)

                Image(systemName: addressIcon)
                    .foregroundColor(Color(hex: "#22C55E"))
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(address.label)
                        .font(.headline)

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
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)

                if let instructions = address.instructions, !instructions.isEmpty {
                    Text(instructions)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .italic()
                }
            }

            Spacer()

            if addressManager.selectedAddressId == address.id {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(Color(hex: "#22C55E"))
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            addressManager.selectAddress(id: address.id)
        }
    }

    var addressIcon: String {
        switch address.label.lowercased() {
        case "maison", "home": return "house.fill"
        case "travail", "work", "bureau": return "building.2.fill"
        default: return "mappin.circle.fill"
        }
    }
}

// MARK: - Add/Edit Address View
struct AddEditAddressView: View {
    @StateObject private var addressManager = AddressManager.shared
    @StateObject private var locationManager = LocationManager()
    @StateObject private var searchCompleter = AddressSearchCompleter()
    @Environment(\.dismiss) private var dismiss

    // Step 1: Search / GPS  →  Step 2: Confirm details
    @State private var step: AddressStep = .search
    @State private var label = ""
    @State private var street = ""
    @State private var city = ""
    @State private var postalCode = ""
    @State private var country = "France"
    @State private var instructions = ""
    @State private var selectedLabel = "Maison"
    @State private var isSaving = false
    @State private var isLocating = false
    @State private var isResolving = false
    @State private var errorMessage: String?
    @State private var resolvedCoordinate: CLLocationCoordinate2D?
    @State private var resolvedFullAddress: String?

    enum AddressStep {
        case search, confirm
    }

    let labelOptions = ["Maison", "Travail", "Autre"]

    var isValid: Bool {
        !street.isEmpty && !city.isEmpty && !postalCode.isEmpty && resolvedCoordinate != nil
    }

    var body: some View {
        NavigationStack {
            Group {
                if step == .search {
                    searchStepView
                } else {
                    confirmStepView
                }
            }
            .navigationTitle(step == .search ? "Rechercher une adresse" : "Confirmer l'adresse")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(step == .search ? "Annuler" : "Retour") {
                        if step == .confirm {
                            step = .search
                        } else {
                            dismiss()
                        }
                    }
                }
                if step == .confirm {
                    ToolbarItem(placement: .confirmationAction) {
                        if isSaving {
                            ProgressView()
                        } else {
                            Button("Enregistrer") { saveAddress() }
                                .fontWeight(.semibold)
                                .disabled(!isValid)
                        }
                    }
                }
            }
            .onAppear {
                locationManager.requestPermission()
            }
        }
    }

    // MARK: - Step 1: Search

    private var searchStepView: some View {
        List {
            // GPS
            Section {
                Button(action: { useCurrentLocation() }) {
                    HStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Color(hex: "#22C55E").opacity(0.15))
                                .frame(width: 40, height: 40)
                            if isLocating {
                                ProgressView()
                                    .tint(Color(hex: "#22C55E"))
                            } else {
                                Image(systemName: "location.fill")
                                    .foregroundColor(Color(hex: "#22C55E"))
                            }
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Utiliser ma position")
                                .fontWeight(.medium)
                                .foregroundColor(.primary)
                            Text(isLocating ? "Localisation en cours..." : "Position GPS actuelle")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                    }
                }
                .disabled(isLocating || isResolving)
            }

            // Search field
            Section("Rechercher une adresse") {
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    TextField("Tapez une adresse...", text: $searchCompleter.query)
                        .autocorrectionDisabled()
                }

                if isResolving {
                    HStack {
                        ProgressView()
                        Text("Validation de l'adresse...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }

            // Search results
            if !searchCompleter.results.isEmpty && !searchCompleter.query.isEmpty {
                Section("Suggestions") {
                    ForEach(searchCompleter.results, id: \.self) { result in
                        Button(action: { selectSearchResult(result) }) {
                            HStack(spacing: 12) {
                                Image(systemName: "mappin.circle.fill")
                                    .foregroundColor(Color(hex: "#22C55E"))
                                    .font(.title3)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(result.title)
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .foregroundColor(.primary)
                                    if !result.subtitle.isEmpty {
                                        Text(result.subtitle)
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .disabled(isResolving)
                    }
                }
            }

            if let error = errorMessage {
                Section {
                    HStack(spacing: 6) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.orange)
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
    }

    // MARK: - Step 2: Confirm

    private var confirmStepView: some View {
        Form {
            // Validated address preview
            Section {
                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Color(hex: "#22C55E").opacity(0.15))
                            .frame(width: 44, height: 44)
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(Color(hex: "#22C55E"))
                            .font(.title3)
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Adresse validée")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(Color(hex: "#22C55E"))
                        Text(resolvedFullAddress ?? "\(street), \(postalCode) \(city)")
                            .font(.subheadline)
                            .foregroundColor(.primary)
                    }
                }
            }

            Section("Type d'adresse") {
                Picker("Label", selection: $selectedLabel) {
                    ForEach(labelOptions, id: \.self) { option in
                        Text(option).tag(option)
                    }
                }
                .pickerStyle(.segmented)

                if selectedLabel == "Autre" {
                    TextField("Nom personnalisé", text: $label)
                }
            }

            Section("Détails de l'adresse") {
                HStack {
                    Text("Rue")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(street)
                }
                HStack {
                    Text("Ville")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(city)
                }
                HStack {
                    Text("Code postal")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(postalCode)
                }
                HStack {
                    Text("Pays")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(country)
                }
            }

            Section("Instructions de livraison (optionnel)") {
                TextField("Ex: Digicode 1234, 3ème étage, bâtiment B", text: $instructions)
            }
        }
    }

    // MARK: - Actions

    private func useCurrentLocation() {
        isLocating = true
        errorMessage = nil
        locationManager.startUpdating()

        Task {
            for _ in 0..<20 {
                if locationManager.location != nil { break }
                try? await Task.sleep(nanoseconds: 500_000_000)
            }

            guard let coord = locationManager.location else {
                errorMessage = "Impossible d'obtenir votre position. Vérifiez vos paramètres de localisation."
                isLocating = false
                return
            }

            resolvedCoordinate = coord

            do {
                let geocoder = CLGeocoder()
                let location = CLLocation(latitude: coord.latitude, longitude: coord.longitude)
                let placemarks = try await geocoder.reverseGeocodeLocation(location)

                if let pm = placemarks.first {
                    fillFromPlacemark(pm)
                    resolvedFullAddress = [street, "\(postalCode) \(city)", country]
                        .filter { !$0.isEmpty }.joined(separator: ", ")
                    step = .confirm
                } else {
                    errorMessage = "Aucune adresse trouvée pour cette position."
                }
            } catch {
                errorMessage = "Impossible de résoudre l'adresse."
            }

            isLocating = false
            locationManager.stopUpdating()
        }
    }

    private func selectSearchResult(_ result: MKLocalSearchCompletion) {
        isResolving = true
        errorMessage = nil

        Task {
            do {
                let (_, coordinate) = try await searchCompleter.selectResult(result)
                resolvedCoordinate = coordinate

                let geocoder = CLGeocoder()
                let location = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
                let placemarks = try await geocoder.reverseGeocodeLocation(location)

                if let pm = placemarks.first {
                    fillFromPlacemark(pm)
                    resolvedFullAddress = [result.title, result.subtitle]
                        .filter { !$0.isEmpty }.joined(separator: ", ")
                    searchCompleter.query = ""
                    step = .confirm
                } else {
                    // Fallback
                    street = result.title
                    resolvedFullAddress = [result.title, result.subtitle]
                        .filter { !$0.isEmpty }.joined(separator: ", ")
                    searchCompleter.query = ""
                    step = .confirm
                }
            } catch {
                errorMessage = "Impossible de valider cette adresse. Essayez-en une autre."
            }

            isResolving = false
        }
    }

    private func fillFromPlacemark(_ pm: CLPlacemark) {
        var s = ""
        if let num = pm.subThoroughfare { s += num + " " }
        if let road = pm.thoroughfare { s += road }
        street = s.isEmpty ? "Adresse" : s
        city = pm.locality ?? ""
        postalCode = pm.postalCode ?? ""
        country = pm.country ?? "France"
    }

    private func saveAddress() {
        let finalLabel = selectedLabel == "Autre" ? (label.isEmpty ? "Autre" : label) : selectedLabel
        isSaving = true

        let address = addressManager.createAddress(
            label: finalLabel,
            street: street,
            city: city,
            postalCode: postalCode,
            country: country,
            instructions: instructions.isEmpty ? nil : instructions,
            coordinate: resolvedCoordinate
        )
        addressManager.addAddress(address)
        isSaving = false
        dismiss()
    }
}

// MARK: - Address Selection Sheet (for Checkout)
struct AddressSelectionSheet: View {
    @StateObject private var addressManager = AddressManager.shared
    @StateObject private var locationManager = LocationManager()
    @Environment(\.dismiss) private var dismiss
    @State private var showAddAddress = false
    @State private var isLocating = false
    @State private var locationError: String?

    var body: some View {
        NavigationStack {
            List {
                // Utiliser ma position actuelle
                Section {
                    Button(action: { useCurrentLocation() }) {
                        HStack(spacing: 10) {
                            ZStack {
                                Circle()
                                    .fill(Color(hex: "#22C55E").opacity(0.15))
                                    .frame(width: 36, height: 36)
                                if isLocating {
                                    ProgressView()
                                        .tint(Color(hex: "#22C55E"))
                                } else {
                                    Image(systemName: "location.fill")
                                        .foregroundColor(Color(hex: "#22C55E"))
                                }
                            }
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Ma position actuelle")
                                    .fontWeight(.medium)
                                    .foregroundColor(.primary)
                                Text(isLocating ? "Localisation en cours..." : "Utiliser le GPS")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                        }
                    }
                    .disabled(isLocating)

                    if let error = locationError {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }

                // Adresses enregistrées
                if !addressManager.addresses.isEmpty {
                    Section("Adresses enregistrées") {
                        ForEach(addressManager.addresses) { address in
                            Button(action: {
                                addressManager.selectAddress(id: address.id)
                                dismiss()
                            }) {
                                HStack {
                                    AddressRow(address: address)
                                    Spacer()
                                    if addressManager.selectedAddressId == address.id {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(Color(hex: "#22C55E"))
                                    }
                                }
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                }

                // Ajouter une adresse
                Section {
                    Button(action: { showAddAddress = true }) {
                        HStack {
                            Image(systemName: "plus.circle.fill")
                                .foregroundColor(Color(hex: "#22C55E"))
                            Text("Ajouter une adresse")
                                .foregroundColor(Color(hex: "#22C55E"))
                        }
                    }
                }
            }
            .navigationTitle("Adresse de livraison")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { dismiss() }
                }
            }
            .sheet(isPresented: $showAddAddress) {
                AddEditAddressView()
            }
            .onAppear {
                locationManager.requestPermission()
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func useCurrentLocation() {
        isLocating = true
        locationError = nil
        locationManager.startUpdating()

        Task {
            for _ in 0..<20 {
                if locationManager.location != nil { break }
                try? await Task.sleep(nanoseconds: 500_000_000)
            }

            guard let coord = locationManager.location else {
                locationError = "Impossible d'obtenir votre position."
                isLocating = false
                return
            }

            do {
                let saved = try await addressManager.addAddressFromLocation(coord, label: "Ma position")
                addressManager.selectAddress(id: saved.id)
                isLocating = false
                locationManager.stopUpdating()
                dismiss()
            } catch {
                locationError = "Impossible de résoudre l'adresse."
                isLocating = false
                locationManager.stopUpdating()
            }
        }
    }
}

// MARK: - Language Selection View
struct LanguageSelectionView: View {
    @StateObject private var settings = AppSettingsManager.shared

    var body: some View {
        List {
            ForEach(settings.availableLanguages, id: \.0) { code, name in
                Button(action: { settings.language = code }) {
                    HStack {
                        Text(name)
                        Spacer()
                        if settings.language == code {
                            Image(systemName: "checkmark")
                                .foregroundColor(Color(hex: "#22C55E"))
                        }
                    }
                }
                .foregroundColor(.primary)
            }
        }
        .navigationTitle("Langue")
    }
}

// MARK: - FAQ View
struct FAQView: View {
    let faqs: [(String, String)] = [
        ("Comment passer une commande ?", "Parcourez les boutiques, ajoutez des articles à votre panier, puis validez votre commande en choisissant une adresse de livraison."),
        ("Comment suivre ma livraison ?", "Allez dans l'onglet Commandes et sélectionnez votre commande active pour voir son statut en temps réel sur la carte."),
        ("Comment annuler une commande ?", "Vous pouvez annuler une commande tant qu'elle n'a pas été préparée. Allez dans les détails de la commande et appuyez sur Annuler."),
        ("Comment contacter le livreur ?", "Une fois votre commande en cours de livraison, vous pouvez contacter le livreur via le chat intégré ou par téléphone."),
        ("Comment ajouter un code promo ?", "Lors du checkout, entrez votre code promo dans le champ dédié et appuyez sur Appliquer."),
        ("Comment modifier mon adresse ?", "Allez dans Paramètres > Mes adresses pour ajouter, modifier ou supprimer des adresses."),
        ("Comment laisser un pourboire ?", "Vous pouvez ajouter un pourboire lors du checkout ou après la livraison dans les détails de la commande."),
        ("Comment supprimer mon compte ?", "Allez dans Paramètres et faites défiler jusqu'à 'Supprimer mon compte'. Cette action est irréversible.")
    ]

    var body: some View {
        List {
            ForEach(faqs, id: \.0) { question, answer in
                DisclosureGroup {
                    Text(answer)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .padding(.vertical, 8)
                } label: {
                    Text(question)
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
            }
        }
        .navigationTitle("FAQ")
    }
}

// MARK: - Contact Support View
struct ContactSupportView: View {
    @State private var subject = ""
    @State private var message = ""
    @State private var showSuccess = false

    var body: some View {
        Form {
            Section("Sujet") {
                TextField("Décrivez brièvement votre problème", text: $subject)
            }

            Section("Message") {
                TextEditor(text: $message)
                    .frame(minHeight: 150)
            }

            Section {
                Button(action: sendMessage) {
                    HStack {
                        Spacer()
                        Text("Envoyer")
                            .fontWeight(.semibold)
                        Spacer()
                    }
                }
                .disabled(subject.isEmpty || message.isEmpty)
            }
        }
        .navigationTitle("Contacter le support")
        .alert("Message envoyé", isPresented: $showSuccess) {
            Button("OK") {}
        } message: {
            Text("Notre équipe vous répondra dans les plus brefs délais.")
        }
    }

    func sendMessage() {
        // In production, send to backend
        showSuccess = true
        subject = ""
        message = ""
    }
}

// MARK: - Report Problem View
struct ReportProblemView: View {
    @State private var selectedCategory = "Commande"
    @State private var description = ""
    @State private var showSuccess = false

    let categories = ["Commande", "Livraison", "Paiement", "Application", "Autre"]

    var body: some View {
        Form {
            Section("Catégorie") {
                Picker("Type de problème", selection: $selectedCategory) {
                    ForEach(categories, id: \.self) { category in
                        Text(category).tag(category)
                    }
                }
            }

            Section("Description") {
                TextEditor(text: $description)
                    .frame(minHeight: 150)
            }

            Section {
                Button(action: submitReport) {
                    HStack {
                        Spacer()
                        Text("Signaler")
                            .fontWeight(.semibold)
                        Spacer()
                    }
                }
                .disabled(description.isEmpty)
            }
        }
        .navigationTitle("Signaler un problème")
        .alert("Signalement envoyé", isPresented: $showSuccess) {
            Button("OK") {}
        } message: {
            Text("Merci pour votre retour. Nous examinerons votre signalement.")
        }
    }

    func submitReport() {
        showSuccess = true
        description = ""
    }
}

// MARK: - Terms of Service View
struct TermsOfServiceView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Conditions Générales d'Utilisation")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Dernière mise à jour : Janvier 2026")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Group {
                    SectionTitle("1. Acceptation des conditions")
                    Text("En utilisant l'application GreenDrop, vous acceptez d'être lié par les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.")

                    SectionTitle("2. Description du service")
                    Text("GreenDrop est une plateforme de livraison qui met en relation des utilisateurs, des commerçants et des livreurs. Nous facilitons la commande et la livraison de produits alimentaires et autres articles.")

                    SectionTitle("3. Inscription et compte")
                    Text("Pour utiliser nos services, vous devez créer un compte avec des informations exactes et à jour. Vous êtes responsable de la confidentialité de votre mot de passe et de toutes les activités sur votre compte.")

                    SectionTitle("4. Commandes et paiements")
                    Text("Les prix affichés incluent toutes les taxes applicables. Les frais de livraison sont indiqués avant la validation de la commande. Le paiement est effectué au moment de la commande.")

                    SectionTitle("5. Livraison")
                    Text("Les délais de livraison sont donnés à titre indicatif. GreenDrop ne peut être tenu responsable des retards indépendants de notre volonté.")

                    SectionTitle("6. Annulation et remboursement")
                    Text("Vous pouvez annuler une commande tant qu'elle n'a pas été préparée. Les remboursements sont traités sous 5-10 jours ouvrés.")

                    SectionTitle("7. Protection des données")
                    Text("Vos données personnelles sont traitées conformément à notre Politique de Confidentialité et au RGPD.")

                    SectionTitle("8. Modification des conditions")
                    Text("Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prendront effet dès leur publication.")
                }
            }
            .padding()
        }
        .navigationTitle("CGU")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct SectionTitle: View {
    let text: String

    init(_ text: String) {
        self.text = text
    }

    var body: some View {
        Text(text)
            .font(.headline)
            .padding(.top, 8)
    }
}

// MARK: - Privacy Policy View
struct PrivacyPolicyView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Politique de Confidentialité")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Dernière mise à jour : Janvier 2026")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Group {
                    SectionTitle("1. Collecte des données")
                    Text("Nous collectons les données que vous nous fournissez directement : nom, email, adresse, numéro de téléphone, ainsi que les données de localisation lors de l'utilisation de l'application.")

                    SectionTitle("2. Utilisation des données")
                    Text("Vos données sont utilisées pour :\n• Traiter vos commandes\n• Vous livrer vos produits\n• Améliorer nos services\n• Vous contacter si nécessaire")

                    SectionTitle("3. Partage des données")
                    Text("Vos données peuvent être partagées avec :\n• Les commerçants pour préparer votre commande\n• Les livreurs pour effectuer la livraison\n• Nos prestataires de paiement")

                    SectionTitle("4. Sécurité")
                    Text("Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données contre tout accès non autorisé.")

                    SectionTitle("5. Vos droits")
                    Text("Conformément au RGPD, vous disposez des droits suivants :\n• Droit d'accès\n• Droit de rectification\n• Droit à l'effacement\n• Droit à la portabilité\n• Droit d'opposition")

                    SectionTitle("6. Cookies")
                    Text("Notre application utilise des technologies similaires aux cookies pour améliorer votre expérience et analyser l'utilisation du service.")

                    SectionTitle("7. Contact")
                    Text("Pour toute question concernant vos données personnelles, contactez-nous à : privacy@greendrop.com")
                }
            }
            .padding()
        }
        .navigationTitle("Confidentialité")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Licenses View
struct LicensesView: View {
    let licenses = [
        ("Firebase", "Apache 2.0"),
        ("SwiftUI", "Apple Inc."),
        ("MapKit", "Apple Inc."),
        ("Combine", "Apple Inc.")
    ]

    var body: some View {
        List {
            ForEach(licenses, id: \.0) { name, license in
                HStack {
                    Text(name)
                    Spacer()
                    Text(license)
                        .foregroundColor(.secondary)
                }
            }
        }
        .navigationTitle("Licences")
    }
}

// MARK: - Payment Methods View (Placeholder)
struct PaymentMethodsView: View {
    var body: some View {
        ContentUnavailableView(
            "Paiement",
            systemImage: "creditcard.fill",
            description: Text("La gestion des moyens de paiement sera disponible prochainement avec l'intégration Stripe.")
        )
        .navigationTitle("Moyens de paiement")
    }
}

// MARK: - Order History View (Placeholder - reuses ClientOrdersView)
struct OrderHistoryView: View {
    var body: some View {
        ClientOrdersView()
            .navigationTitle("Historique")
    }
}
