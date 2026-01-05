import SwiftUI
import FirebaseFirestore

// MARK: - Chat Service
@MainActor
final class ChatService: ObservableObject {
    static let shared = ChatService()

    @Published var messages: [ChatMessage] = []
    @Published var isLoading = false

    private let db = Firestore.firestore()
    private var listener: ListenerRegistration?

    struct ChatMessage: Identifiable, Codable, Equatable {
        let id: String
        let orderId: String
        let senderId: String
        let senderName: String
        let senderRole: String // "client", "driver"
        let content: String
        let timestamp: Date
        var isRead: Bool
    }

    func isFromCurrentUser(_ message: ChatMessage) -> Bool {
        message.senderId == AuthService.shared.userProfile?.id
    }

    private init() {}

    func startListening(forOrder orderId: String) {
        stopListening()

        listener = db.collection("chats")
            .document(orderId)
            .collection("messages")
            .order(by: "timestamp", descending: false)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let documents = snapshot?.documents else { return }

                self?.messages = documents.compactMap { doc in
                    let data = doc.data()
                    return ChatMessage(
                        id: doc.documentID,
                        orderId: data["orderId"] as? String ?? "",
                        senderId: data["senderId"] as? String ?? "",
                        senderName: data["senderName"] as? String ?? "",
                        senderRole: data["senderRole"] as? String ?? "",
                        content: data["content"] as? String ?? "",
                        timestamp: (data["timestamp"] as? Timestamp)?.dateValue() ?? Date(),
                        isRead: data["isRead"] as? Bool ?? false
                    )
                }
            }
    }

    func stopListening() {
        listener?.remove()
        listener = nil
        messages = []
    }

    func sendMessage(orderId: String, content: String) async throws {
        guard let user = AuthService.shared.userProfile else {
            throw NSError(domain: "ChatService", code: 401, userInfo: [NSLocalizedDescriptionKey: "User not authenticated"])
        }

        let messageData: [String: Any] = [
            "orderId": orderId,
            "senderId": user.id,
            "senderName": user.name,
            "senderRole": user.role,
            "content": content,
            "timestamp": Timestamp(date: Date()),
            "isRead": false
        ]

        try await db.collection("chats")
            .document(orderId)
            .collection("messages")
            .addDocument(data: messageData)
    }

    func markAsRead(orderId: String) async {
        guard let userId = AuthService.shared.userProfile?.id else { return }

        let unreadMessages = messages.filter { !$0.isRead && $0.senderId != userId }

        for message in unreadMessages {
            try? await db.collection("chats")
                .document(orderId)
                .collection("messages")
                .document(message.id)
                .updateData(["isRead": true])
        }
    }

}

// MARK: - Chat View
struct OrderChatView: View {
    let order: Order
    @StateObject private var chatService = ChatService.shared
    @State private var messageText = ""
    @FocusState private var isTextFieldFocused: Bool
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            // Chat header
            ChatHeader(order: order, onDismiss: { dismiss() })

            // Messages
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(chatService.messages) { message in
                            ChatBubble(message: message, isFromCurrentUser: chatService.isFromCurrentUser(message))
                                .id(message.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: chatService.messages.count) { _, _ in
                    if let lastMessage = chatService.messages.last {
                        withAnimation {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }
            }

            // Input bar
            ChatInputBar(
                text: $messageText,
                isFocused: $isTextFieldFocused,
                onSend: sendMessage
            )
        }
        .navigationBarHidden(true)
        .onAppear {
            chatService.startListening(forOrder: order.id)
        }
        .onDisappear {
            chatService.stopListening()
        }
    }

    func sendMessage() {
        guard !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        let content = messageText
        messageText = ""

        Task {
            do {
                try await chatService.sendMessage(orderId: order.id, content: content)
            } catch {
            }
        }
    }
}

// MARK: - Delivery Chat View (For Drivers)
struct DeliveryChatView: View {
    let delivery: Delivery
    @StateObject private var chatService = ChatService.shared
    @State private var messageText = ""
    @FocusState private var isTextFieldFocused: Bool
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            // Chat header for driver
            DriverChatHeader(delivery: delivery, onDismiss: { dismiss() })

            // Messages
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(chatService.messages) { message in
                            ChatBubble(message: message, isFromCurrentUser: chatService.isFromCurrentUser(message))
                                .id(message.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: chatService.messages.count) { _, _ in
                    if let lastMessage = chatService.messages.last {
                        withAnimation {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }
            }

            // Input bar
            ChatInputBar(
                text: $messageText,
                isFocused: $isTextFieldFocused,
                onSend: sendMessage
            )
        }
        .navigationBarHidden(true)
        .onAppear {
            chatService.startListening(forOrder: delivery.orderId)
        }
        .onDisappear {
            chatService.stopListening()
        }
    }

    func sendMessage() {
        guard !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        let content = messageText
        messageText = ""

        Task {
            do {
                try await chatService.sendMessage(orderId: delivery.orderId, content: content)
            } catch {
            }
        }
    }
}

// MARK: - Driver Chat Header
struct DriverChatHeader: View {
    let delivery: Delivery
    let onDismiss: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onDismiss) {
                Image(systemName: "chevron.left")
                    .font(.headline)
            }

            // Customer info
            ZStack {
                Circle()
                    .fill(Color(hex: "#22C55E").opacity(0.15))
                    .frame(width: 44, height: 44)

                Text(String(delivery.customerName.prefix(1)).uppercased())
                    .font(.headline)
                    .foregroundColor(Color(hex: "#22C55E"))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(delivery.customerName)
                    .font(.headline)
                Text(delivery.customerAddress)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            // Call button
            Button(action: {}) {
                Image(systemName: "phone.fill")
                    .font(.headline)
                    .foregroundColor(Color(hex: "#22C55E"))
                    .padding(10)
                    .background(Color(hex: "#22C55E").opacity(0.15))
                    .clipShape(Circle())
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }
}

// MARK: - Chat Header
struct ChatHeader: View {
    let order: Order
    let onDismiss: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onDismiss) {
                Image(systemName: "chevron.left")
                    .font(.headline)
            }

            // Driver info
            ZStack {
                Circle()
                    .fill(Color(hex: "#3B82F6").opacity(0.15))
                    .frame(width: 44, height: 44)

                Image(systemName: "person.fill")
                    .foregroundColor(Color(hex: "#3B82F6"))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("Votre livreur")
                    .font(.headline)
                HStack(spacing: 4) {
                    Circle()
                        .fill(Color(hex: "#22C55E"))
                        .frame(width: 8, height: 8)
                    Text("En ligne")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            // Call button
            Button(action: {}) {
                Image(systemName: "phone.fill")
                    .font(.headline)
                    .foregroundColor(Color(hex: "#22C55E"))
                    .padding(10)
                    .background(Color(hex: "#22C55E").opacity(0.15))
                    .clipShape(Circle())
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }
}

// MARK: - Chat Bubble
struct ChatBubble: View {
    let message: ChatService.ChatMessage
    let isFromCurrentUser: Bool

    var body: some View {
        HStack {
            if isFromCurrentUser {
                Spacer()
            }

            VStack(alignment: isFromCurrentUser ? .trailing : .leading, spacing: 4) {
                if !isFromCurrentUser {
                    Text(message.senderName)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Text(message.content)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(isFromCurrentUser ? Color(hex: "#22C55E") : Color(.systemGray5))
                    .foregroundColor(isFromCurrentUser ? .white : .primary)
                    .cornerRadius(18)

                Text(message.timestamp.formatted(date: .omitted, time: .shortened))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            if !isFromCurrentUser {
                Spacer()
            }
        }
    }
}

// MARK: - Chat Input Bar
struct ChatInputBar: View {
    @Binding var text: String
    var isFocused: FocusState<Bool>.Binding
    let onSend: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Text field
            TextField("Écrivez un message...", text: $text, axis: .vertical)
                .lineLimit(1...4)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Color(.systemGray6))
                .cornerRadius(20)
                .focused(isFocused)

            // Send button
            Button(action: onSend) {
                Image(systemName: "paperplane.fill")
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding(12)
                    .background(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? Color.gray : Color(hex: "#22C55E"))
                    .clipShape(Circle())
            }
            .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
        .shadow(color: .black.opacity(0.05), radius: 5, y: -2)
    }
}

// MARK: - Order Cancellation
struct OrderCancellationView: View {
    let order: Order
    @StateObject private var dataService = DataService.shared
    @State private var selectedReason: CancellationReason?
    @State private var otherReason = ""
    @State private var isCancelling = false
    @State private var showConfirmation = false
    @Environment(\.dismiss) private var dismiss

    enum CancellationReason: String, CaseIterable {
        case changedMind = "J'ai changé d'avis"
        case orderTooLong = "Le délai est trop long"
        case wrongItems = "Articles incorrects"
        case duplicateOrder = "Commande en double"
        case other = "Autre raison"

        var icon: String {
            switch self {
            case .changedMind: return "arrow.uturn.backward"
            case .orderTooLong: return "clock"
            case .wrongItems: return "exclamationmark.triangle"
            case .duplicateOrder: return "doc.on.doc"
            case .other: return "text.bubble"
            }
        }
    }

    var canCancel: Bool {
        // Can only cancel if order is pending or confirmed
        order.status == .pending || order.status == .confirmed || order.status == .created
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Warning banner
                    if !canCancel {
                        HStack(spacing: 12) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)
                            Text("Cette commande ne peut plus être annulée car elle est déjà en préparation.")
                                .font(.subheadline)
                        }
                        .padding()
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(12)
                    }

                    // Order info
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Commande #\(String(order.id.prefix(8)))")
                            .font(.headline)

                        HStack {
                            Text(order.shopName)
                            Spacer()
                            Text(String(format: "%.2f €", order.total))
                                .fontWeight(.semibold)
                        }
                        .font(.subheadline)

                        Text("Statut: \(order.status.displayName)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)

                    // Cancellation reasons
                    if canCancel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Pourquoi souhaitez-vous annuler ?")
                                .font(.headline)

                            ForEach(CancellationReason.allCases, id: \.self) { reason in
                                Button(action: { selectedReason = reason }) {
                                    HStack(spacing: 12) {
                                        Image(systemName: reason.icon)
                                            .foregroundColor(selectedReason == reason ? Color(hex: "#22C55E") : .secondary)
                                            .frame(width: 24)

                                        Text(reason.rawValue)
                                            .foregroundColor(.primary)

                                        Spacer()

                                        if selectedReason == reason {
                                            Image(systemName: "checkmark.circle.fill")
                                                .foregroundColor(Color(hex: "#22C55E"))
                                        }
                                    }
                                    .padding()
                                    .background(selectedReason == reason ? Color(hex: "#22C55E").opacity(0.1) : Color(.systemGray6))
                                    .cornerRadius(12)
                                }
                            }

                            if selectedReason == .other {
                                TextField("Précisez la raison...", text: $otherReason, axis: .vertical)
                                    .lineLimit(3...5)
                                    .padding()
                                    .background(Color(.systemGray6))
                                    .cornerRadius(12)
                            }
                        }

                        // Refund info
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: "info.circle.fill")
                                    .foregroundColor(Color(hex: "#3B82F6"))
                                Text("Politique de remboursement")
                                    .font(.headline)
                            }

                            Text("Le remboursement sera effectué sous 5-10 jours ouvrés sur votre moyen de paiement d'origine.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .padding()
                        .background(Color(hex: "#3B82F6").opacity(0.1))
                        .cornerRadius(12)

                        // Cancel button
                        Button(action: { showConfirmation = true }) {
                            HStack {
                                if isCancelling {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Image(systemName: "xmark.circle.fill")
                                    Text("Annuler la commande")
                                }
                            }
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(selectedReason != nil ? Color.red : Color.gray)
                            .cornerRadius(12)
                        }
                        .disabled(selectedReason == nil || isCancelling)
                    }
                }
                .padding()
            }
            .navigationTitle("Annuler la commande")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { dismiss() }
                }
            }
            .alert("Confirmer l'annulation", isPresented: $showConfirmation) {
                Button("Non, garder la commande", role: .cancel) {}
                Button("Oui, annuler", role: .destructive) {
                    cancelOrder()
                }
            } message: {
                Text("Êtes-vous sûr de vouloir annuler cette commande ? Cette action est irréversible.")
            }
        }
    }

    func cancelOrder() {
        isCancelling = true

        Task {
            // In production, call API to cancel order
            try? await Task.sleep(nanoseconds: 1_000_000_000)

            await dataService.updateOrderStatus(order.id, status: .cancelled)

            NotificationService.shared.sendLocalNotification(
                title: "Commande annulée",
                body: "Votre commande #\(String(order.id.prefix(8))) a été annulée. Le remboursement sera traité sous 5-10 jours."
            )

            isCancelling = false
            dismiss()
        }
    }
}

// MARK: - Quick Actions for Order
struct OrderQuickActions: View {
    let order: Order
    @State private var showChat = false
    @State private var showCancellation = false

    var canCancel: Bool {
        order.status == .pending || order.status == .confirmed || order.status == .created
    }

    var canChat: Bool {
        order.status.isActive && order.driverId != nil
    }

    var body: some View {
        HStack(spacing: 12) {
            if canChat {
                Button(action: { showChat = true }) {
                    Label("Chat", systemImage: "message.fill")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(Color(hex: "#3B82F6"))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color(hex: "#3B82F6").opacity(0.15))
                        .cornerRadius(10)
                }
            }

            if canCancel {
                Button(action: { showCancellation = true }) {
                    Label("Annuler", systemImage: "xmark.circle")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.red)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(10)
                }
            }
        }
        .fullScreenCover(isPresented: $showChat) {
            OrderChatView(order: order)
        }
        .sheet(isPresented: $showCancellation) {
            OrderCancellationView(order: order)
        }
    }
}
