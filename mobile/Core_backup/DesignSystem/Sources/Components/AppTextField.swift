import SwiftUI

// MARK: - App Text Field
public struct AppTextField: View {
    let title: String
    let placeholder: String
    let icon: String?
    let keyboardType: UIKeyboardType
    let isSecure: Bool
    let errorMessage: String?
    @Binding var text: String
    @FocusState private var isFocused: Bool

    public init(
        _ title: String,
        placeholder: String = "",
        icon: String? = nil,
        text: Binding<String>,
        keyboardType: UIKeyboardType = .default,
        isSecure: Bool = false,
        errorMessage: String? = nil
    ) {
        self.title = title
        self.placeholder = placeholder
        self.icon = icon
        self._text = text
        self.keyboardType = keyboardType
        self.isSecure = isSecure
        self.errorMessage = errorMessage
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            // Label
            Text(title)
                .font(AppTypography.footnote)
                .foregroundColor(AppColors.textSecondary)

            // Input Field
            HStack(spacing: AppSpacing.sm) {
                if let icon = icon {
                    Image(systemName: icon)
                        .foregroundColor(isFocused ? AppColors.primaryFallback : AppColors.textTertiary)
                        .frame(width: 20)
                }

                if isSecure {
                    SecureField(placeholder, text: $text)
                        .textContentType(.password)
                } else {
                    TextField(placeholder, text: $text)
                        .keyboardType(keyboardType)
                        .textInputAutocapitalization(keyboardType == .emailAddress ? .never : .sentences)
                        .autocorrectionDisabled(keyboardType == .emailAddress)
                }
            }
            .padding(.horizontal, AppSpacing.md)
            .frame(height: 48)
            .background(AppColors.secondaryBackground)
            .cornerRadius(AppRadius.md)
            .overlay(
                RoundedRectangle(cornerRadius: AppRadius.md)
                    .stroke(borderColor, lineWidth: 1)
            )
            .focused($isFocused)

            // Error Message
            if let error = errorMessage, !error.isEmpty {
                HStack(spacing: AppSpacing.xs) {
                    Image(systemName: "exclamationmark.circle.fill")
                        .font(.caption)
                    Text(error)
                        .font(AppTypography.caption1)
                }
                .foregroundColor(AppColors.error)
            }
        }
    }

    private var borderColor: Color {
        if errorMessage != nil && !errorMessage!.isEmpty {
            return AppColors.error
        }
        return isFocused ? AppColors.primaryFallback : AppColors.border
    }
}

// MARK: - Search Bar
public struct AppSearchBar: View {
    let placeholder: String
    @Binding var text: String
    let onSubmit: (() -> Void)?

    public init(
        placeholder: String = "Rechercher...",
        text: Binding<String>,
        onSubmit: (() -> Void)? = nil
    ) {
        self.placeholder = placeholder
        self._text = text
        self.onSubmit = onSubmit
    }

    public var body: some View {
        HStack(spacing: AppSpacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(AppColors.textTertiary)

            TextField(placeholder, text: $text)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .onSubmit {
                    onSubmit?()
                }

            if !text.isEmpty {
                Button {
                    text = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(AppColors.textTertiary)
                }
            }
        }
        .padding(.horizontal, AppSpacing.md)
        .frame(height: 44)
        .background(AppColors.secondaryBackground)
        .cornerRadius(AppRadius.lg)
    }
}

// MARK: - Text Area
public struct AppTextArea: View {
    let title: String
    let placeholder: String
    @Binding var text: String
    let minHeight: CGFloat

    public init(
        _ title: String,
        placeholder: String = "",
        text: Binding<String>,
        minHeight: CGFloat = 100
    ) {
        self.title = title
        self.placeholder = placeholder
        self._text = text
        self.minHeight = minHeight
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            Text(title)
                .font(AppTypography.footnote)
                .foregroundColor(AppColors.textSecondary)

            ZStack(alignment: .topLeading) {
                if text.isEmpty {
                    Text(placeholder)
                        .foregroundColor(AppColors.textTertiary)
                        .padding(.horizontal, AppSpacing.md)
                        .padding(.vertical, AppSpacing.md)
                }

                TextEditor(text: $text)
                    .scrollContentBackground(.hidden)
                    .padding(.horizontal, AppSpacing.sm)
                    .padding(.vertical, AppSpacing.sm)
            }
            .frame(minHeight: minHeight)
            .background(AppColors.secondaryBackground)
            .cornerRadius(AppRadius.md)
            .overlay(
                RoundedRectangle(cornerRadius: AppRadius.md)
                    .stroke(AppColors.border, lineWidth: 1)
            )
        }
    }
}

// MARK: - Preview
#Preview {
    VStack(spacing: 20) {
        AppTextField(
            "Email",
            placeholder: "votre@email.com",
            icon: "envelope",
            text: .constant(""),
            keyboardType: .emailAddress
        )

        AppTextField(
            "Mot de passe",
            placeholder: "••••••••",
            icon: "lock",
            text: .constant(""),
            isSecure: true
        )

        AppTextField(
            "Avec erreur",
            placeholder: "Texte",
            icon: "person",
            text: .constant("test"),
            errorMessage: "Ce champ est invalide"
        )

        AppSearchBar(text: .constant("Pizza"))

        AppTextArea(
            "Notes",
            placeholder: "Ajoutez des notes...",
            text: .constant("")
        )
    }
    .padding()
}
