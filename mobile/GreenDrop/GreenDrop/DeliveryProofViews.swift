import SwiftUI
import PhotosUI
import FirebaseStorage
import FirebaseFirestore

// MARK: - Delivery Proof Model
struct DeliveryProof: Codable {
    let orderId: String
    let driverId: String
    let photoURL: String?
    let signatureURL: String?
    let notes: String?
    let location: GeoPoint?
    let timestamp: Date
}

// MARK: - Delivery Proof Service
@MainActor
final class DeliveryProofService: ObservableObject {
    static let shared = DeliveryProofService()

    @Published var isUploading = false
    @Published var uploadProgress: Double = 0

    private let db = Firestore.firestore()
    private let storage = Storage.storage()

    private init() {}

    func uploadProof(
        orderId: String,
        photo: UIImage?,
        signature: UIImage?,
        notes: String?,
        location: CLLocationCoordinate2D?
    ) async throws -> DeliveryProof {
        guard let driverId = AuthService.shared.userProfile?.id else {
            throw NSError(domain: "DeliveryProofService", code: 401, userInfo: [NSLocalizedDescriptionKey: "Driver not authenticated"])
        }

        isUploading = true
        uploadProgress = 0
        defer { isUploading = false }

        var photoURL: String?
        var signatureURL: String?

        // Upload photo
        if let photo = photo {
            uploadProgress = 0.1
            photoURL = try await uploadImage(
                image: photo,
                path: "delivery-proofs/\(orderId)/photo.jpg"
            )
            uploadProgress = 0.4
        }

        // Upload signature
        if let signature = signature {
            uploadProgress = 0.5
            signatureURL = try await uploadImage(
                image: signature,
                path: "delivery-proofs/\(orderId)/signature.png"
            )
            uploadProgress = 0.8
        }

        // Create proof record
        var proofData: [String: Any] = [
            "orderId": orderId,
            "driverId": driverId,
            "timestamp": Timestamp(date: Date())
        ]

        if let photoURL = photoURL {
            proofData["photoURL"] = photoURL
        }
        if let signatureURL = signatureURL {
            proofData["signatureURL"] = signatureURL
        }
        if let notes = notes, !notes.isEmpty {
            proofData["notes"] = notes
        }
        if let location = location {
            proofData["location"] = GeoPoint(latitude: location.latitude, longitude: location.longitude)
        }

        // Save to Firestore
        try await db.collection("delivery-proofs").document(orderId).setData(proofData)

        // Update order with proof
        try await db.collection("orders").document(orderId).updateData([
            "proofOfDelivery": proofData,
            "deliveredAt": Timestamp(date: Date())
        ])

        uploadProgress = 1.0

        return DeliveryProof(
            orderId: orderId,
            driverId: driverId,
            photoURL: photoURL,
            signatureURL: signatureURL,
            notes: notes,
            location: location != nil ? GeoPoint(latitude: location!.latitude, longitude: location!.longitude) : nil,
            timestamp: Date()
        )
    }

    private func uploadImage(image: UIImage, path: String) async throws -> String {
        guard let imageData = image.jpegData(compressionQuality: 0.7) else {
            throw NSError(domain: "DeliveryProofService", code: 400, userInfo: [NSLocalizedDescriptionKey: "Failed to convert image"])
        }

        let storageRef = storage.reference().child(path)
        let metadata = StorageMetadata()
        metadata.contentType = path.hasSuffix(".png") ? "image/png" : "image/jpeg"

        _ = try await storageRef.putDataAsync(imageData, metadata: metadata)
        let url = try await storageRef.downloadURL()

        return url.absoluteString
    }
}

// MARK: - Delivery Proof View
struct DeliveryProofView: View {
    let delivery: Delivery
    let onComplete: () -> Void

    @StateObject private var proofService = DeliveryProofService.shared
    @StateObject private var locationManager = LocationManager()
    @Environment(\.dismiss) private var dismiss

    @State private var capturedPhoto: UIImage?
    @State private var signatureImage: UIImage?
    @State private var notes = ""
    @State private var showCamera = false
    @State private var showSignaturePad = false
    @State private var showSuccess = false
    @State private var errorMessage: String?

    var canComplete: Bool {
        // At least photo OR signature is required
        capturedPhoto != nil || signatureImage != nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 8) {
                        Image(systemName: "checkmark.shield.fill")
                            .font(.system(size: 60))
                            .foregroundColor(Color(hex: "#22C55E"))

                        Text("Confirmer la livraison")
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("Prenez une photo et/ou collectez la signature du client")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top)

                    // Delivery Info
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "mappin.circle.fill")
                                .foregroundColor(.red)
                            Text(delivery.customerAddress)
                                .font(.subheadline)
                        }

                        HStack {
                            Image(systemName: "person.fill")
                                .foregroundColor(Color(hex: "#3B82F6"))
                            Text(delivery.customerName)
                                .font(.subheadline)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .padding(.horizontal)

                    // Photo Section
                    ProofPhotoSection(
                        photo: $capturedPhoto,
                        showCamera: $showCamera
                    )

                    // Signature Section
                    ProofSignatureSection(
                        signature: $signatureImage,
                        showSignaturePad: $showSignaturePad
                    )

                    // Notes Section
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Notes (optionnel)")
                            .font(.subheadline)
                            .fontWeight(.medium)

                        TextField("Ex: Laissé à la conciergerie", text: $notes, axis: .vertical)
                            .lineLimit(2...4)
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                    }
                    .padding(.horizontal)

                    // Error Message
                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(8)
                            .padding(.horizontal)
                    }

                    // Upload Progress
                    if proofService.isUploading {
                        VStack(spacing: 8) {
                            ProgressView(value: proofService.uploadProgress)
                                .tint(Color(hex: "#22C55E"))

                            Text("Envoi en cours... \(Int(proofService.uploadProgress * 100))%")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal)
                    }

                    // Submit Button
                    Button(action: submitProof) {
                        HStack {
                            if proofService.isUploading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Image(systemName: "checkmark.circle.fill")
                                Text("Confirmer la livraison")
                            }
                        }
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(canComplete ? Color(hex: "#22C55E") : Color.gray)
                        .cornerRadius(14)
                    }
                    .disabled(!canComplete || proofService.isUploading)
                    .padding(.horizontal)

                    // Skip (without proof)
                    Button(action: { onComplete(); dismiss() }) {
                        Text("Passer (sans preuve)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.bottom)
                }
            }
            .navigationTitle("Preuve de livraison")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") { dismiss() }
                }
            }
            .fullScreenCover(isPresented: $showCamera) {
                CameraView(image: $capturedPhoto)
            }
            .sheet(isPresented: $showSignaturePad) {
                SignaturePadView(signature: $signatureImage)
            }
            .alert("Livraison confirmee !", isPresented: $showSuccess) {
                Button("OK") {
                    onComplete()
                    dismiss()
                }
            } message: {
                Text("La preuve de livraison a ete enregistree avec succes.")
            }
            .onAppear {
                locationManager.requestPermission()
            }
        }
    }

    func submitProof() {
        Task {
            do {
                _ = try await proofService.uploadProof(
                    orderId: delivery.id,
                    photo: capturedPhoto,
                    signature: signatureImage,
                    notes: notes.isEmpty ? nil : notes,
                    location: locationManager.location
                )
                showSuccess = true
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}

// MARK: - Photo Section
struct ProofPhotoSection: View {
    @Binding var photo: UIImage?
    @Binding var showCamera: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Photo de livraison")
                    .font(.subheadline)
                    .fontWeight(.medium)

                Spacer()

                if photo != nil {
                    Button(action: { photo = nil }) {
                        Text("Supprimer")
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }
            }

            if let photo = photo {
                Image(uiImage: photo)
                    .resizable()
                    .scaledToFill()
                    .frame(height: 200)
                    .clipped()
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color(hex: "#22C55E"), lineWidth: 2)
                    )
            } else {
                Button(action: { showCamera = true }) {
                    VStack(spacing: 12) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 40))
                            .foregroundColor(Color(hex: "#22C55E"))

                        Text("Prendre une photo")
                            .font(.subheadline)
                            .foregroundColor(.primary)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 150)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color(hex: "#22C55E").opacity(0.5), style: StrokeStyle(lineWidth: 2, dash: [8]))
                    )
                }
            }
        }
        .padding(.horizontal)
    }
}

// MARK: - Signature Section
struct ProofSignatureSection: View {
    @Binding var signature: UIImage?
    @Binding var showSignaturePad: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Signature du client")
                    .font(.subheadline)
                    .fontWeight(.medium)

                Spacer()

                if signature != nil {
                    Button(action: { signature = nil }) {
                        Text("Effacer")
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }
            }

            if let signature = signature {
                Image(uiImage: signature)
                    .resizable()
                    .scaledToFit()
                    .frame(height: 120)
                    .frame(maxWidth: .infinity)
                    .background(Color.white)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color(hex: "#3B82F6"), lineWidth: 2)
                    )
            } else {
                Button(action: { showSignaturePad = true }) {
                    VStack(spacing: 12) {
                        Image(systemName: "signature")
                            .font(.system(size: 40))
                            .foregroundColor(Color(hex: "#3B82F6"))

                        Text("Collecter la signature")
                            .font(.subheadline)
                            .foregroundColor(.primary)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 120)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color(hex: "#3B82F6").opacity(0.5), style: StrokeStyle(lineWidth: 2, dash: [8]))
                    )
                }
            }
        }
        .padding(.horizontal)
    }
}

// MARK: - Camera View
struct CameraView: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraView

        init(_ parent: CameraView) {
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

// MARK: - Signature Pad View
struct SignaturePadView: View {
    @Binding var signature: UIImage?
    @Environment(\.dismiss) private var dismiss

    @State private var lines: [[CGPoint]] = []
    @State private var currentLine: [CGPoint] = []

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Instructions
                Text("Signez dans le cadre ci-dessous")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding()

                // Signature Canvas
                GeometryReader { geometry in
                    ZStack {
                        // White background
                        Rectangle()
                            .fill(Color.white)
                            .border(Color(.systemGray3), width: 1)

                        // Draw lines
                        Canvas { context, size in
                            for line in lines {
                                drawLine(context: context, points: line)
                            }
                            drawLine(context: context, points: currentLine)
                        }
                        .gesture(
                            DragGesture(minimumDistance: 0)
                                .onChanged { value in
                                    currentLine.append(value.location)
                                }
                                .onEnded { _ in
                                    lines.append(currentLine)
                                    currentLine = []
                                }
                        )

                        // Placeholder
                        if lines.isEmpty && currentLine.isEmpty {
                            VStack(spacing: 8) {
                                Image(systemName: "signature")
                                    .font(.largeTitle)
                                    .foregroundColor(.gray.opacity(0.3))
                                Text("Signez ici")
                                    .foregroundColor(.gray.opacity(0.5))
                            }
                        }
                    }
                }
                .aspectRatio(2, contentMode: .fit)
                .padding()

                // Buttons
                HStack(spacing: 16) {
                    Button(action: clearSignature) {
                        HStack {
                            Image(systemName: "trash")
                            Text("Effacer")
                        }
                        .font(.subheadline)
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(12)
                    }

                    Button(action: saveSignature) {
                        HStack {
                            Image(systemName: "checkmark")
                            Text("Valider")
                        }
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(lines.isEmpty ? Color.gray : Color(hex: "#22C55E"))
                        .cornerRadius(12)
                    }
                    .disabled(lines.isEmpty)
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Signature")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") { dismiss() }
                }
            }
        }
    }

    private func drawLine(context: GraphicsContext, points: [CGPoint]) {
        guard points.count > 1 else { return }

        var path = Path()
        path.move(to: points[0])

        for point in points.dropFirst() {
            path.addLine(to: point)
        }

        context.stroke(path, with: .color(.black), lineWidth: 3)
    }

    private func clearSignature() {
        lines = []
        currentLine = []
    }

    private func saveSignature() {
        // Create image from canvas
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 600, height: 300))

        let image = renderer.image { context in
            // White background
            UIColor.white.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 600, height: 300))

            // Draw lines
            UIColor.black.setStroke()
            let path = UIBezierPath()
            path.lineWidth = 3

            for line in lines {
                guard let first = line.first else { continue }
                path.move(to: CGPoint(x: first.x * 2, y: first.y * 2)) // Scale to image size

                for point in line.dropFirst() {
                    path.addLine(to: CGPoint(x: point.x * 2, y: point.y * 2))
                }
            }

            path.stroke()
        }

        signature = image
        dismiss()
    }
}

// MARK: - Photo Picker Alternative (for simulator)
struct PhotoPickerButton: View {
    @Binding var selectedImage: UIImage?
    @State private var showPicker = false
    @State private var selectedItem: PhotosPickerItem?

    var body: some View {
        PhotosPicker(selection: $selectedItem, matching: .images) {
            VStack(spacing: 12) {
                Image(systemName: "photo.on.rectangle")
                    .font(.system(size: 40))
                    .foregroundColor(Color(hex: "#22C55E"))

                Text("Choisir une photo")
                    .font(.subheadline)
                    .foregroundColor(.primary)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 150)
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
        .onChange(of: selectedItem) { _, newItem in
            Task {
                if let data = try? await newItem?.loadTransferable(type: Data.self),
                   let image = UIImage(data: data) {
                    selectedImage = image
                }
            }
        }
    }
}

// MARK: - Delivery Proof Preview (for order details)
struct DeliveryProofPreview: View {
    let proof: [String: Any]

    var photoURL: String? {
        proof["photoURL"] as? String
    }

    var notes: String? {
        proof["notes"] as? String
    }

    var timestamp: Date? {
        (proof["timestamp"] as? Timestamp)?.dateValue()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "checkmark.shield.fill")
                    .foregroundColor(Color(hex: "#22C55E"))
                Text("Preuve de livraison")
                    .font(.headline)
            }

            if let photoURL = photoURL {
                AsyncImage(url: URL(string: photoURL)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(height: 150)
                            .clipped()
                            .cornerRadius(8)
                    case .failure:
                        Image(systemName: "photo")
                            .foregroundColor(.secondary)
                    case .empty:
                        ProgressView()
                    @unknown default:
                        EmptyView()
                    }
                }
            }

            if let notes = notes {
                Text("Note: \(notes)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            if let timestamp = timestamp {
                Text("Livree le \(timestamp.formatted(date: .abbreviated, time: .shortened))")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(hex: "#22C55E").opacity(0.1))
        .cornerRadius(12)
    }
}
