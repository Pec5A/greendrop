import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authService: AuthService
    @State private var isShowingRegister = false
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false

    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                // Logo
                VStack(spacing: 12) {
                    Image(systemName: "leaf.circle.fill")
                        .font(.system(size: 80))
                        .foregroundColor(Color(hex: "#22C55E"))

                    Text("GreenDrop")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(Color(hex: "#22C55E"))

                    Text("Livraison éco-responsable")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 60)

                // Form
                VStack(spacing: 20) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Email")
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        TextField("votre@email.com", text: $email)
                            .textFieldStyle(.plain)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                            .accessibilityLabel("Adresse email")
                            .accessibilityHint("Entrez votre adresse email")
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Mot de passe")
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        SecureField("••••••••", text: $password)
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                            .accessibilityLabel("Mot de passe")
                            .accessibilityHint("Entrez votre mot de passe")
                    }
                }
                .padding(.horizontal)

                // Login Button
                Button(action: login) {
                    HStack {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Se connecter")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(hex: "#22C55E"))
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .disabled(isLoading || email.isEmpty || password.isEmpty)
                .opacity(email.isEmpty || password.isEmpty ? 0.6 : 1)
                .padding(.horizontal)

                // Error Message
                if let error = authService.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                        .padding(.horizontal)
                }

                // Register Button
                Button(action: { isShowingRegister = true }) {
                    Text("Créer un compte")
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(.systemGray6))
                        .foregroundColor(Color(hex: "#22C55E"))
                        .cornerRadius(12)
                }
                .padding(.horizontal)

                // Divider
                HStack {
                    Rectangle()
                        .fill(Color(.systemGray4))
                        .frame(height: 1)
                    Text("ou")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Rectangle()
                        .fill(Color(.systemGray4))
                        .frame(height: 1)
                }
                .padding(.horizontal)

                // Google Sign-In Button
                Button(action: loginWithGoogle) {
                    HStack(spacing: 12) {
                        GoogleLogo()
                            .frame(width: 20, height: 20)
                        Text("Continuer avec Google")
                            .fontWeight(.medium)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(.systemBackground))
                    .foregroundColor(.primary)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color(.systemGray4), lineWidth: 1)
                    )
                }
                .disabled(isLoading)
                .padding(.horizontal)
                .accessibilityLabel("Se connecter avec Google")

                // Demo Accounts
                VStack(alignment: .leading, spacing: 12) {
                    Text("Comptes de test")
                        .font(.headline)
                        .foregroundColor(.secondary)

                    VStack(alignment: .leading, spacing: 8) {
                        DemoRow(role: "Client", email: "client1@pec5a.com") { selectedEmail in
                            email = selectedEmail
                            password = "client123"
                        }
                        DemoRow(role: "Chauffeur", email: "driver1@pec5a.com") { selectedEmail in
                            email = selectedEmail
                            password = "driver123"
                        }
                        DemoRow(role: "Marchand", email: "merchant1@pec5a.com") { selectedEmail in
                            email = selectedEmail
                            password = "merchant123"
                        }
                    }

                    Text("Voir seed pour les mots de passe")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal)

                Spacer()
            }
        }
        .sheet(isPresented: $isShowingRegister) {
            RegisterView()
                .environmentObject(authService)
        }
    }

    private func login() {
        isLoading = true
        Task {
            do {
                try await authService.signIn(email: email, password: password)
            } catch {
            }
            isLoading = false
        }
    }

    private func loginWithGoogle() {
        isLoading = true
        Task {
            do {
                try await authService.signInWithGoogle()
            } catch {
            }
            isLoading = false
        }
    }
}

struct DemoRow: View {
    let role: String
    let email: String
    var onTap: ((String) -> Void)?

    var body: some View {
        Button(action: { onTap?(email) }) {
            HStack {
                Text(role)
                    .font(.caption)
                    .fontWeight(.medium)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(hex: "#22C55E").opacity(0.2))
                    .foregroundColor(Color(hex: "#22C55E"))
                    .cornerRadius(4)

                Text(email)
                    .font(.subheadline)
                    .foregroundColor(.primary)

                Spacer()

                Image(systemName: "arrow.right.circle.fill")
                    .foregroundColor(Color(hex: "#22C55E"))
            }
        }
    }
}

// MARK: - Register View
struct RegisterView: View {
    @EnvironmentObject var authService: AuthService
    @Environment(\.dismiss) var dismiss

    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var selectedRole = "user"
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showSuccess = false

    let roles = [
        ("user", "Client", "person.fill"),
        ("driver", "Chauffeur", "car.fill"),
        ("merchant", "Marchand", "storefront.fill")
    ]

    var isFormValid: Bool {
        !name.isEmpty &&
        !email.isEmpty &&
        !password.isEmpty &&
        password == confirmPassword &&
        password.count >= 6
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 8) {
                        Image(systemName: "person.badge.plus")
                            .font(.system(size: 60))
                            .foregroundColor(Color(hex: "#22C55E"))

                        Text("Créer un compte")
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("Rejoignez GreenDrop aujourd'hui")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top, 20)

                    // Role Selection
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Je suis un...")
                            .font(.headline)

                        HStack(spacing: 12) {
                            ForEach(roles, id: \.0) { role in
                                RoleButton(
                                    title: role.1,
                                    icon: role.2,
                                    isSelected: selectedRole == role.0
                                ) {
                                    selectedRole = role.0
                                }
                            }
                        }
                    }
                    .padding(.horizontal)

                    // Form Fields
                    VStack(spacing: 16) {
                        CustomTextField(
                            title: "Nom complet",
                            placeholder: "Jean Dupont",
                            text: $name,
                            icon: "person.fill"
                        )

                        CustomTextField(
                            title: "Email",
                            placeholder: "jean@example.com",
                            text: $email,
                            icon: "envelope.fill",
                            keyboardType: .emailAddress
                        )

                        CustomSecureField(
                            title: "Mot de passe",
                            placeholder: "Minimum 6 caractères",
                            text: $password,
                            icon: "lock.fill"
                        )

                        CustomSecureField(
                            title: "Confirmer le mot de passe",
                            placeholder: "Retapez votre mot de passe",
                            text: $confirmPassword,
                            icon: "lock.fill"
                        )

                        // Password match indicator
                        if !confirmPassword.isEmpty {
                            HStack {
                                Image(systemName: password == confirmPassword ? "checkmark.circle.fill" : "xmark.circle.fill")
                                    .foregroundColor(password == confirmPassword ? .green : .red)
                                Text(password == confirmPassword ? "Les mots de passe correspondent" : "Les mots de passe ne correspondent pas")
                                    .font(.caption)
                                    .foregroundColor(password == confirmPassword ? .green : .red)
                                Spacer()
                            }
                            .padding(.horizontal)
                        }
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

                    // Register Button
                    Button(action: register) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Image(systemName: "person.badge.plus")
                                Text("Créer mon compte")
                                    .fontWeight(.semibold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(isFormValid ? Color(hex: "#22C55E") : Color.gray)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(!isFormValid || isLoading)
                    .padding(.horizontal)

                    // Terms
                    Text("En créant un compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    Spacer()
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Annuler") {
                        dismiss()
                    }
                }
            }
            .alert("Compte créé !", isPresented: $showSuccess) {
                Button("OK") {
                    dismiss()
                }
            } message: {
                Text("Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.")
            }
        }
    }

    private func register() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await authService.signUp(
                    email: email,
                    password: password,
                    name: name,
                    role: selectedRole
                )
                showSuccess = true
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

// MARK: - Role Button
struct RoleButton: View {
    let title: String
    let icon: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                Text(title)
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(isSelected ? Color(hex: "#22C55E").opacity(0.15) : Color(.systemGray6))
            .foregroundColor(isSelected ? Color(hex: "#22C55E") : .secondary)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color(hex: "#22C55E") : Color.clear, lineWidth: 2)
            )
        }
    }
}

// MARK: - Custom Text Field
struct CustomTextField: View {
    let title: String
    let placeholder: String
    @Binding var text: String
    let icon: String
    var keyboardType: UIKeyboardType = .default

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)

            HStack {
                Image(systemName: icon)
                    .foregroundColor(.secondary)
                    .frame(width: 24)

                TextField(placeholder, text: $text)
                    .keyboardType(keyboardType)
                    .autocapitalization(keyboardType == .emailAddress ? .none : .words)
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }
}

// MARK: - Custom Secure Field
struct CustomSecureField: View {
    let title: String
    let placeholder: String
    @Binding var text: String
    let icon: String
    @State private var isVisible = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)

            HStack {
                Image(systemName: icon)
                    .foregroundColor(.secondary)
                    .frame(width: 24)

                if isVisible {
                    TextField(placeholder, text: $text)
                } else {
                    SecureField(placeholder, text: $text)
                }

                Button(action: { isVisible.toggle() }) {
                    Image(systemName: isVisible ? "eye.slash.fill" : "eye.fill")
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }
}

// MARK: - Google Role Selection View
struct GoogleRoleSelectionView: View {
    @EnvironmentObject var authService: AuthService
    @State private var selectedRole = "user"
    @State private var isLoading = false
    @State private var errorMessage: String?

    let roles = [
        ("user", "Client", "person.fill", "Achetez et faites-vous livrer"),
        ("driver", "Chauffeur", "car.fill", "Livrez des commandes"),
        ("merchant", "Marchand", "storefront.fill", "Vendez vos produits")
    ]

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Header
            VStack(spacing: 12) {
                Image(systemName: "person.badge.plus")
                    .font(.system(size: 60))
                    .foregroundColor(Color(hex: "#22C55E"))

                Text("Bienvenue sur GreenDrop !")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Choisissez votre type de compte")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            // Role Cards
            VStack(spacing: 16) {
                ForEach(roles, id: \.0) { role in
                    Button(action: { selectedRole = role.0 }) {
                        HStack(spacing: 16) {
                            Image(systemName: role.2)
                                .font(.title2)
                                .frame(width: 40, height: 40)
                                .background(selectedRole == role.0 ? Color(hex: "#22C55E").opacity(0.15) : Color(.systemGray6))
                                .foregroundColor(selectedRole == role.0 ? Color(hex: "#22C55E") : .secondary)
                                .cornerRadius(10)

                            VStack(alignment: .leading, spacing: 4) {
                                Text(role.1)
                                    .font(.headline)
                                    .foregroundColor(.primary)
                                Text(role.3)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            Image(systemName: selectedRole == role.0 ? "checkmark.circle.fill" : "circle")
                                .font(.title3)
                                .foregroundColor(selectedRole == role.0 ? Color(hex: "#22C55E") : Color(.systemGray4))
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(16)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(selectedRole == role.0 ? Color(hex: "#22C55E") : Color(.systemGray4), lineWidth: selectedRole == role.0 ? 2 : 1)
                        )
                    }
                }
            }
            .padding(.horizontal)

            // Error
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

            // Confirm Button
            Button(action: confirmRole) {
                HStack {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Confirmer")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(hex: "#22C55E"))
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(isLoading)
            .padding(.horizontal)

            Spacer()
        }
    }

    private func confirmRole() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await authService.completeGoogleSignUp(role: selectedRole)
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

// MARK: - Google Logo
struct GoogleLogo: View {
    var body: some View {
        Canvas { context, size in
            let w = size.width
            let h = size.height
            let cx = w / 2
            let cy = h / 2
            let r = min(w, h) / 2

            // Blue arc (right)
            var blue = Path()
            blue.addArc(center: CGPoint(x: cx, y: cy), radius: r, startAngle: .degrees(-45), endAngle: .degrees(10), clockwise: false)
            blue.addLine(to: CGPoint(x: cx, y: cy))
            blue.closeSubpath()
            context.fill(blue, with: .color(Color(red: 0.26, green: 0.52, blue: 0.96)))

            // Green arc (bottom-right)
            var green = Path()
            green.addArc(center: CGPoint(x: cx, y: cy), radius: r, startAngle: .degrees(10), endAngle: .degrees(120), clockwise: false)
            green.addLine(to: CGPoint(x: cx, y: cy))
            green.closeSubpath()
            context.fill(green, with: .color(Color(red: 0.20, green: 0.66, blue: 0.33)))

            // Yellow arc (bottom-left)
            var yellow = Path()
            yellow.addArc(center: CGPoint(x: cx, y: cy), radius: r, startAngle: .degrees(120), endAngle: .degrees(210), clockwise: false)
            yellow.addLine(to: CGPoint(x: cx, y: cy))
            yellow.closeSubpath()
            context.fill(yellow, with: .color(Color(red: 0.98, green: 0.74, blue: 0.02)))

            // Red arc (top-left)
            var red = Path()
            red.addArc(center: CGPoint(x: cx, y: cy), radius: r, startAngle: .degrees(210), endAngle: .degrees(315), clockwise: false)
            red.addLine(to: CGPoint(x: cx, y: cy))
            red.closeSubpath()
            context.fill(red, with: .color(Color(red: 0.92, green: 0.26, blue: 0.21)))

            // White center
            let innerR = r * 0.6
            let inner = Path(ellipseIn: CGRect(x: cx - innerR, y: cy - innerR, width: innerR * 2, height: innerR * 2))
            context.fill(inner, with: .color(.white))

            // Blue right bar
            let barRect = CGRect(x: cx - w * 0.05, y: cy - h * 0.12, width: w * 0.55, height: h * 0.24)
            context.fill(Path(roundedRect: barRect, cornerRadius: 1), with: .color(Color(red: 0.26, green: 0.52, blue: 0.96)))
        }
    }
}
