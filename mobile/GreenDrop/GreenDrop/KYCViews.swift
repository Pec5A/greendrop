import SwiftUI
import PhotosUI
import FirebaseFirestore
import FirebaseStorage

// MARK: - KYC Service
@MainActor
final class KYCService: ObservableObject {
    static let shared = KYCService()

    @Published var verificationStatus: VerificationStatus = .notStarted
    @Published var verificationData: VerificationData?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let db = Firestore.firestore()

    enum VerificationStatus: String, Codable {
        case notStarted = "not_started"
        case pending = "pending"
        case inReview = "in_review"
        case approved = "approved"
        case rejected = "rejected"

        var displayName: String {
            switch self {
            case .notStarted: return "Non vérifié"
            case .pending: return "En attente"
            case .inReview: return "En cours de vérification"
            case .approved: return "Vérifié"
            case .rejected: return "Refusé"
            }
        }

        var icon: String {
            switch self {
            case .notStarted: return "person.badge.shield.checkmark"
            case .pending: return "clock.fill"
            case .inReview: return "eye.fill"
            case .approved: return "checkmark.shield.fill"
            case .rejected: return "xmark.shield.fill"
            }
        }

        var color: String {
            switch self {
            case .notStarted: return "#6B7280"
            case .pending: return "#F59E0B"
            case .inReview: return "#3B82F6"
            case .approved: return "#22C55E"
            case .rejected: return "#EF4444"
            }
        }
    }

    struct VerificationData: Codable {
        let userId: String
        var status: VerificationStatus
        var firstName: String
        var lastName: String
        var dateOfBirth: Date
        var documentType: DocumentType
        var documentNumber: String
        var documentFrontURL: String?
        var documentBackURL: String?
        var selfieURL: String?
        var submittedAt: Date?
        var reviewedAt: Date?
        var rejectionReason: String?

        var age: Int {
            Calendar.current.dateComponents([.year], from: dateOfBirth, to: Date()).year ?? 0
        }

        var isAdult: Bool {
            age >= 18
        }
    }

    enum DocumentType: String, Codable, CaseIterable {
        case idCard = "id_card"
        case passport = "passport"
        case drivingLicense = "driving_license"
        case residencePermit = "residence_permit"

        var displayName: String {
            switch self {
            case .idCard: return "Carte d'identité"
            case .passport: return "Passeport"
            case .drivingLicense: return "Permis de conduire"
            case .residencePermit: return "Titre de séjour"
            }
        }

        var icon: String {
            switch self {
            case .idCard: return "person.text.rectangle"
            case .passport: return "book.closed"
            case .drivingLicense: return "car"
            case .residencePermit: return "doc.text"
            }
        }

        var requiresBackPhoto: Bool {
            self == .idCard || self == .residencePermit
        }
    }

    private init() {
        loadVerificationStatus()
    }

    func loadVerificationStatus() {
        guard let userId = AuthService.shared.userProfile?.id else {
            verificationStatus = .notStarted
            return
        }

        isLoading = true

        Task {
            do {
                let document = try await db.collection("verifications").document(userId).getDocument()

                if document.exists, let data = document.data() {
                    verificationStatus = VerificationStatus(rawValue: data["status"] as? String ?? "") ?? .notStarted

                    verificationData = VerificationData(
                        userId: userId,
                        status: verificationStatus,
                        firstName: data["firstName"] as? String ?? "",
                        lastName: data["lastName"] as? String ?? "",
                        dateOfBirth: (data["dateOfBirth"] as? Timestamp)?.dateValue() ?? Date(),
                        documentType: DocumentType(rawValue: data["documentType"] as? String ?? "") ?? .idCard,
                        documentNumber: data["documentNumber"] as? String ?? "",
                        documentFrontURL: data["documentFrontURL"] as? String,
                        documentBackURL: data["documentBackURL"] as? String,
                        selfieURL: data["selfieURL"] as? String,
                        submittedAt: (data["submittedAt"] as? Timestamp)?.dateValue(),
                        reviewedAt: (data["reviewedAt"] as? Timestamp)?.dateValue(),
                        rejectionReason: data["rejectionReason"] as? String
                    )
                } else {
                    verificationStatus = .notStarted
                }
            } catch {
                verificationStatus = .notStarted
            }

            isLoading = false
        }
    }

    func submitVerification(
        firstName: String,
        lastName: String,
        dateOfBirth: Date,
        documentType: DocumentType,
        documentNumber: String,
        frontImage: UIImage?,
        backImage: UIImage?,
        selfieImage: UIImage?
    ) async throws {
        guard let userId = AuthService.shared.userProfile?.id else {
            throw KYCError.notAuthenticated
        }

        // Validate age
        let age = Calendar.current.dateComponents([.year], from: dateOfBirth, to: Date()).year ?? 0
        guard age >= 18 else {
            throw KYCError.underAge
        }

        isLoading = true
        errorMessage = nil

        do {
            // Upload images (in production, use Firebase Storage)
            var frontURL: String?
            var backURL: String?
            var selfieURL: String?

            if let frontImage = frontImage {
                frontURL = try await uploadImage(frontImage, path: "verifications/\(userId)/front.jpg")
            }

            if let backImage = backImage {
                backURL = try await uploadImage(backImage, path: "verifications/\(userId)/back.jpg")
            }

            if let selfieImage = selfieImage {
                selfieURL = try await uploadImage(selfieImage, path: "verifications/\(userId)/selfie.jpg")
            }

            // Save verification data
            let verificationDoc: [String: Any] = [
                "userId": userId,
                "status": VerificationStatus.pending.rawValue,
                "firstName": firstName,
                "lastName": lastName,
                "dateOfBirth": Timestamp(date: dateOfBirth),
                "documentType": documentType.rawValue,
                "documentNumber": documentNumber,
                "documentFrontURL": frontURL as Any,
                "documentBackURL": backURL as Any,
                "selfieURL": selfieURL as Any,
                "submittedAt": Timestamp(date: Date()),
                "reviewedAt": NSNull(),
                "rejectionReason": NSNull()
            ]

            try await db.collection("verifications").document(userId).setData(verificationDoc)

            verificationStatus = .pending
            verificationData = VerificationData(
                userId: userId,
                status: .pending,
                firstName: firstName,
                lastName: lastName,
                dateOfBirth: dateOfBirth,
                documentType: documentType,
                documentNumber: documentNumber,
                documentFrontURL: frontURL,
                documentBackURL: backURL,
                selfieURL: selfieURL,
                submittedAt: Date(),
                reviewedAt: nil,
                rejectionReason: nil
            )

            // Update user profile
            try await db.collection("users").document(userId).updateData([
                "isVerified": false,
                "verificationStatus": VerificationStatus.pending.rawValue
            ])

            NotificationService.shared.sendLocalNotification(
                title: "Vérification soumise",
                body: "Votre demande de vérification d'identité est en cours de traitement."
            )

        } catch {
            errorMessage = error.localizedDescription
            throw error
        }

        isLoading = false
    }

    private func uploadImage(_ image: UIImage, path: String) async throws -> String {
        guard let imageData = image.jpegData(compressionQuality: 0.7) else {
            throw KYCError.imageProcessingFailed
        }

        let storageRef = Storage.storage().reference().child(path)
        let metadata = StorageMetadata()
        metadata.contentType = "image/jpeg"

        let _ = try await storageRef.putData(imageData, metadata: metadata)
        let downloadURL = try await storageRef.downloadURL()
        return downloadURL.absoluteString
    }

    // For demo/testing - simulate approval
    func simulateApproval() {
        verificationStatus = .approved
        if var data = verificationData {
            data.status = .approved
            verificationData = data
        }
    }

    enum KYCError: LocalizedError {
        case notAuthenticated
        case underAge
        case imageProcessingFailed
        case uploadFailed

        var errorDescription: String? {
            switch self {
            case .notAuthenticated:
                return "Vous devez être connecté pour soumettre une vérification."
            case .underAge:
                return "Vous devez avoir au moins 18 ans pour utiliser ce service."
            case .imageProcessingFailed:
                return "Erreur lors du traitement de l'image."
            case .uploadFailed:
                return "Erreur lors de l'envoi des documents."
            }
        }
    }
}

// MARK: - KYC Status View
struct KYCStatusView: View {
    @StateObject private var kycService = KYCService.shared
    @State private var showVerificationFlow = false

    var body: some View {
        VStack(spacing: 16) {
            // Status Card
            HStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(Color(hex: kycService.verificationStatus.color).opacity(0.15))
                        .frame(width: 56, height: 56)

                    Image(systemName: kycService.verificationStatus.icon)
                        .font(.title2)
                        .foregroundColor(Color(hex: kycService.verificationStatus.color))
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Vérification d'identité")
                        .font(.headline)

                    Text(kycService.verificationStatus.displayName)
                        .font(.subheadline)
                        .foregroundColor(Color(hex: kycService.verificationStatus.color))
                }

                Spacer()

                if kycService.verificationStatus == .notStarted || kycService.verificationStatus == .rejected {
                    Button(action: { showVerificationFlow = true }) {
                        Text(kycService.verificationStatus == .rejected ? "Réessayer" : "Vérifier")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color(hex: "#22C55E"))
                            .cornerRadius(8)
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.05), radius: 10)

            // Rejection reason
            if kycService.verificationStatus == .rejected, let reason = kycService.verificationData?.rejectionReason {
                HStack(spacing: 12) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.red)

                    Text(reason)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding()
                .background(Color.red.opacity(0.1))
                .cornerRadius(12)
            }

            // Info text
            if kycService.verificationStatus == .notStarted {
                HStack(spacing: 12) {
                    Image(systemName: "info.circle.fill")
                        .foregroundColor(Color(hex: "#3B82F6"))

                    Text("La vérification d'identité est requise pour certaines fonctionnalités comme la livraison d'alcool.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding()
                .background(Color(hex: "#3B82F6").opacity(0.1))
                .cornerRadius(12)
            }
        }
        .fullScreenCover(isPresented: $showVerificationFlow) {
            KYCVerificationFlow()
        }
    }
}

// MARK: - KYC Verification Flow
struct KYCVerificationFlow: View {
    @StateObject private var kycService = KYCService.shared
    @Environment(\.dismiss) private var dismiss

    @State private var currentStep = 0
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var dateOfBirth = Calendar.current.date(byAdding: .year, value: -25, to: Date()) ?? Date()
    @State private var documentType: KYCService.DocumentType = .idCard
    @State private var documentNumber = ""
    @State private var frontImage: UIImage?
    @State private var backImage: UIImage?
    @State private var selfieImage: UIImage?
    @State private var showImagePicker = false
    @State private var imagePickerType: ImagePickerType = .front
    @State private var showCamera = false
    @State private var isSubmitting = false
    @State private var showSuccess = false
    @State private var showError = false
    @State private var errorMessage = ""

    enum ImagePickerType {
        case front, back, selfie
    }

    var progress: Double {
        Double(currentStep + 1) / 4.0
    }

    var canProceed: Bool {
        switch currentStep {
        case 0:
            return !firstName.isEmpty && !lastName.isEmpty && isAdult
        case 1:
            return !documentNumber.isEmpty
        case 2:
            return frontImage != nil && (!documentType.requiresBackPhoto || backImage != nil)
        case 3:
            return selfieImage != nil
        default:
            return false
        }
    }

    var isAdult: Bool {
        let age = Calendar.current.dateComponents([.year], from: dateOfBirth, to: Date()).year ?? 0
        return age >= 18
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Progress bar
                ProgressView(value: progress)
                    .tint(Color(hex: "#22C55E"))
                    .padding(.horizontal)

                // Step indicator
                HStack {
                    Text("Étape \(currentStep + 1) sur 4")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.top, 8)

                // Content
                TabView(selection: $currentStep) {
                    // Step 1: Personal Info
                    PersonalInfoStep(
                        firstName: $firstName,
                        lastName: $lastName,
                        dateOfBirth: $dateOfBirth,
                        isAdult: isAdult
                    )
                    .tag(0)

                    // Step 2: Document Type
                    DocumentTypeStep(
                        documentType: $documentType,
                        documentNumber: $documentNumber
                    )
                    .tag(1)

                    // Step 3: Document Photos
                    DocumentPhotosStep(
                        documentType: documentType,
                        frontImage: $frontImage,
                        backImage: $backImage,
                        onSelectFront: { showImagePickerFor(.front) },
                        onSelectBack: { showImagePickerFor(.back) }
                    )
                    .tag(2)

                    // Step 4: Selfie
                    SelfieStep(
                        selfieImage: $selfieImage,
                        onTakeSelfie: { showImagePickerFor(.selfie) }
                    )
                    .tag(3)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.easeInOut, value: currentStep)

                // Bottom buttons
                VStack(spacing: 12) {
                    Button(action: {
                        if currentStep < 3 {
                            currentStep += 1
                        } else {
                            submitVerification()
                        }
                    }) {
                        HStack {
                            if isSubmitting {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text(currentStep < 3 ? "Continuer" : "Soumettre")
                                    .fontWeight(.semibold)
                                if currentStep < 3 {
                                    Image(systemName: "arrow.right")
                                }
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(canProceed ? Color(hex: "#22C55E") : Color.gray)
                        .cornerRadius(12)
                    }
                    .disabled(!canProceed || isSubmitting)

                    if currentStep > 0 {
                        Button(action: { currentStep -= 1 }) {
                            Text("Retour")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Vérification d'identité")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") { dismiss() }
                }
            }
            .sheet(isPresented: $showImagePicker) {
                ImagePicker(image: bindingForImagePicker(), sourceType: imagePickerType == .selfie ? .camera : .photoLibrary)
            }
            .alert("Vérification soumise", isPresented: $showSuccess) {
                Button("OK") { dismiss() }
            } message: {
                Text("Votre demande de vérification a été soumise avec succès. Vous serez notifié une fois la vérification terminée.")
            }
            .alert("Erreur", isPresented: $showError) {
                Button("OK") {}
            } message: {
                Text(errorMessage)
            }
        }
    }

    func showImagePickerFor(_ type: ImagePickerType) {
        imagePickerType = type
        showImagePicker = true
    }

    func bindingForImagePicker() -> Binding<UIImage?> {
        switch imagePickerType {
        case .front:
            return $frontImage
        case .back:
            return $backImage
        case .selfie:
            return $selfieImage
        }
    }

    func submitVerification() {
        isSubmitting = true

        Task {
            do {
                try await kycService.submitVerification(
                    firstName: firstName,
                    lastName: lastName,
                    dateOfBirth: dateOfBirth,
                    documentType: documentType,
                    documentNumber: documentNumber,
                    frontImage: frontImage,
                    backImage: backImage,
                    selfieImage: selfieImage
                )
                showSuccess = true
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
            isSubmitting = false
        }
    }
}

// MARK: - Step Views
struct PersonalInfoStep: View {
    @Binding var firstName: String
    @Binding var lastName: String
    @Binding var dateOfBirth: Date
    let isAdult: Bool

    var maxDate: Date {
        Calendar.current.date(byAdding: .year, value: -18, to: Date()) ?? Date()
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Informations personnelles")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Ces informations doivent correspondre exactement à votre pièce d'identité.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                // Form
                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Prénom")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        TextField("Votre prénom", text: $firstName)
                            .textContentType(.givenName)
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Nom")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        TextField("Votre nom", text: $lastName)
                            .textContentType(.familyName)
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Date de naissance")
                            .font(.subheadline)
                            .fontWeight(.medium)

                        DatePicker(
                            "",
                            selection: $dateOfBirth,
                            in: ...maxDate,
                            displayedComponents: .date
                        )
                        .datePickerStyle(.wheel)
                        .labelsHidden()
                        .frame(maxHeight: 150)
                    }

                    // Age warning
                    if !isAdult {
                        HStack(spacing: 12) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.red)
                            Text("Vous devez avoir au moins 18 ans pour utiliser ce service.")
                                .font(.caption)
                                .foregroundColor(.red)
                        }
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(12)
                    }
                }
            }
            .padding()
        }
    }
}

struct DocumentTypeStep: View {
    @Binding var documentType: KYCService.DocumentType
    @Binding var documentNumber: String

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Type de document")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Sélectionnez le type de pièce d'identité que vous souhaitez utiliser.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                // Document types
                VStack(spacing: 12) {
                    ForEach(KYCService.DocumentType.allCases, id: \.self) { type in
                        Button(action: { documentType = type }) {
                            HStack(spacing: 16) {
                                Image(systemName: type.icon)
                                    .font(.title2)
                                    .foregroundColor(documentType == type ? Color(hex: "#22C55E") : .secondary)
                                    .frame(width: 32)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(type.displayName)
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .foregroundColor(.primary)

                                    if type.requiresBackPhoto {
                                        Text("Recto et verso requis")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }

                                Spacer()

                                if documentType == type {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(Color(hex: "#22C55E"))
                                }
                            }
                            .padding()
                            .background(documentType == type ? Color(hex: "#22C55E").opacity(0.1) : Color(.systemGray6))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(documentType == type ? Color(hex: "#22C55E") : Color.clear, lineWidth: 2)
                            )
                        }
                    }
                }

                // Document number
                VStack(alignment: .leading, spacing: 8) {
                    Text("Numéro du document")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    TextField("Ex: 123456789", text: $documentNumber)
                        .textInputAutocapitalization(.characters)
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)

                    Text("Le numéro se trouve généralement au recto de votre document.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
        }
    }
}

struct DocumentPhotosStep: View {
    let documentType: KYCService.DocumentType
    @Binding var frontImage: UIImage?
    @Binding var backImage: UIImage?
    let onSelectFront: () -> Void
    let onSelectBack: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Photos du document")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Prenez des photos claires de votre \(documentType.displayName.lowercased()).")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                // Tips
                VStack(alignment: .leading, spacing: 8) {
                    TipRow(icon: "lightbulb.fill", text: "Assurez-vous que le document est bien éclairé")
                    TipRow(icon: "doc.viewfinder", text: "Cadrez le document entier dans la photo")
                    TipRow(icon: "sparkles", text: "Évitez les reflets et les ombres")
                }
                .padding()
                .background(Color(hex: "#F59E0B").opacity(0.1))
                .cornerRadius(12)

                // Front photo
                DocumentPhotoCard(
                    title: "Recto",
                    subtitle: "Face avant du document",
                    image: frontImage,
                    onSelect: onSelectFront
                )

                // Back photo (if required)
                if documentType.requiresBackPhoto {
                    DocumentPhotoCard(
                        title: "Verso",
                        subtitle: "Face arrière du document",
                        image: backImage,
                        onSelect: onSelectBack
                    )
                }
            }
            .padding()
        }
    }
}

struct SelfieStep: View {
    @Binding var selfieImage: UIImage?
    let onTakeSelfie: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Selfie de vérification")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Prenez un selfie pour confirmer que vous êtes bien le titulaire du document.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                // Instructions
                VStack(alignment: .leading, spacing: 12) {
                    InstructionRow(number: 1, text: "Placez votre visage dans le cadre")
                    InstructionRow(number: 2, text: "Assurez-vous d'un bon éclairage")
                    InstructionRow(number: 3, text: "Gardez une expression neutre")
                    InstructionRow(number: 4, text: "Retirez lunettes et chapeau si possible")
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)

                // Selfie preview
                VStack(spacing: 16) {
                    if let image = selfieImage {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                            .frame(width: 200, height: 200)
                            .clipShape(Circle())
                            .overlay(
                                Circle()
                                    .stroke(Color(hex: "#22C55E"), lineWidth: 4)
                            )
                    } else {
                        ZStack {
                            Circle()
                                .fill(Color(.systemGray5))
                                .frame(width: 200, height: 200)

                            Image(systemName: "person.fill")
                                .font(.system(size: 60))
                                .foregroundColor(.secondary)
                        }
                    }

                    Button(action: onTakeSelfie) {
                        HStack {
                            Image(systemName: selfieImage == nil ? "camera.fill" : "arrow.clockwise")
                            Text(selfieImage == nil ? "Prendre un selfie" : "Reprendre")
                        }
                        .font(.headline)
                        .foregroundColor(Color(hex: "#22C55E"))
                        .padding()
                        .background(Color(hex: "#22C55E").opacity(0.15))
                        .cornerRadius(12)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical)
            }
            .padding()
        }
    }
}

// MARK: - Helper Views
struct TipRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(Color(hex: "#F59E0B"))
                .frame(width: 20)
            Text(text)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

struct InstructionRow: View {
    let number: Int
    let text: String

    var body: some View {
        HStack(spacing: 12) {
            Text("\(number)")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .frame(width: 24, height: 24)
                .background(Color(hex: "#22C55E"))
                .clipShape(Circle())

            Text(text)
                .font(.subheadline)
        }
    }
}

struct DocumentPhotoCard: View {
    let title: String
    let subtitle: String
    let image: UIImage?
    let onSelect: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.headline)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                if image != nil {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(Color(hex: "#22C55E"))
                }
            }

            Button(action: onSelect) {
                if let image = image {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(height: 180)
                        .clipped()
                        .cornerRadius(12)
                } else {
                    VStack(spacing: 12) {
                        Image(systemName: "doc.badge.plus")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)
                        Text("Appuyez pour sélectionner")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 180)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(style: StrokeStyle(lineWidth: 2, dash: [8]))
                            .foregroundColor(.secondary.opacity(0.5))
                    )
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10)
    }
}

// MARK: - Image Picker
struct ImagePicker: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    var sourceType: UIImagePickerController.SourceType = .photoLibrary
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = sourceType
        picker.delegate = context.coordinator
        if sourceType == .camera {
            picker.cameraDevice = .front
        }
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: ImagePicker

        init(_ parent: ImagePicker) {
            self.parent = parent
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage {
                parent.image = image
            }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

// MARK: - Verification Badge (for profile)
struct VerificationBadge: View {
    @StateObject private var kycService = KYCService.shared

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: kycService.verificationStatus.icon)
            Text(kycService.verificationStatus == .approved ? "Vérifié" : "Non vérifié")
        }
        .font(.caption)
        .fontWeight(.medium)
        .foregroundColor(Color(hex: kycService.verificationStatus.color))
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color(hex: kycService.verificationStatus.color).opacity(0.15))
        .cornerRadius(8)
    }
}
