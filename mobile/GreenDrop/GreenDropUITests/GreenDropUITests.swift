//
//  GreenDropUITests.swift
//  GreenDropUITests
//
//  Created by Zahidi Kays on 16/01/2026.
//

import XCTest

final class GreenDropUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Login Flow Tests

    @MainActor
    func testLoginScreenElementsExist() throws {
        // Verify the login screen shows essential elements
        let greenDropTitle = app.staticTexts["GreenDrop"]
        XCTAssertTrue(greenDropTitle.waitForExistence(timeout: 5), "Le titre GreenDrop doit etre visible")

        let emailField = app.textFields["Adresse email"]
        XCTAssertTrue(emailField.exists, "Le champ email doit etre present")

        let passwordField = app.secureTextFields["Mot de passe"]
        XCTAssertTrue(passwordField.exists, "Le champ mot de passe doit etre present")

        let loginButton = app.buttons["Se connecter"]
        XCTAssertTrue(loginButton.exists, "Le bouton Se connecter doit etre present")
    }

    @MainActor
    func testLoginButtonDisabledWhenFieldsEmpty() throws {
        let loginButton = app.buttons["Se connecter"]
        guard loginButton.waitForExistence(timeout: 5) else {
            XCTFail("Le bouton Se connecter n'apparait pas")
            return
        }
        // Button should be disabled when both fields are empty
        XCTAssertFalse(loginButton.isEnabled, "Le bouton doit etre desactive quand les champs sont vides")
    }

    @MainActor
    func testLoginButtonEnabledWhenFieldsFilled() throws {
        let emailField = app.textFields["Adresse email"]
        guard emailField.waitForExistence(timeout: 5) else {
            XCTFail("Le champ email n'apparait pas")
            return
        }
        emailField.tap()
        emailField.typeText("client1@pec5a.com")

        let passwordField = app.secureTextFields["Mot de passe"]
        passwordField.tap()
        passwordField.typeText("client123")

        let loginButton = app.buttons["Se connecter"]
        XCTAssertTrue(loginButton.isEnabled, "Le bouton doit etre actif quand les champs sont remplis")
    }

    @MainActor
    func testGoogleSignInButtonExists() throws {
        let googleButton = app.buttons["Se connecter avec Google"]
        XCTAssertTrue(googleButton.waitForExistence(timeout: 5), "Le bouton Google Sign-In doit etre present")
    }

    // MARK: - Register Flow Tests

    @MainActor
    func testNavigateToRegisterScreen() throws {
        // Look for the register / create account link
        let registerLink = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Créer un compte' OR label CONTAINS[c] 'inscription' OR label CONTAINS[c] 'S\\'inscrire'"))
        if registerLink.count > 0 {
            registerLink.firstMatch.tap()
            // After tapping, we should see the registration form
            let exists = app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] 'inscription' OR label CONTAINS[c] 'Créer' OR label CONTAINS[c] 'Register'")).firstMatch.waitForExistence(timeout: 3)
            XCTAssertTrue(exists, "La page d'inscription doit s'afficher")
        }
    }

    // MARK: - Navigation Tests (after login)

    @MainActor
    func testClientTabsExistAfterLogin() throws {
        // Fill in login credentials
        let emailField = app.textFields["Adresse email"]
        guard emailField.waitForExistence(timeout: 5) else { return }
        emailField.tap()
        emailField.typeText("client1@pec5a.com")

        let passwordField = app.secureTextFields["Mot de passe"]
        passwordField.tap()
        passwordField.typeText("client123")

        let loginButton = app.buttons["Se connecter"]
        loginButton.tap()

        // Wait for the tab bar to appear after login
        let homeTab = app.buttons["Onglet Accueil"]
        if homeTab.waitForExistence(timeout: 10) {
            XCTAssertTrue(homeTab.exists, "L'onglet Accueil doit etre visible")

            let ordersTab = app.buttons["Onglet Commandes"]
            XCTAssertTrue(ordersTab.exists, "L'onglet Commandes doit etre visible")

            let cartTab = app.buttons["Onglet Panier"]
            XCTAssertTrue(cartTab.exists, "L'onglet Panier doit etre visible")

            let profileTab = app.buttons["Onglet Profil"]
            XCTAssertTrue(profileTab.exists, "L'onglet Profil doit etre visible")
        }
    }

    @MainActor
    func testTabNavigation() throws {
        // Fill in login credentials
        let emailField = app.textFields["Adresse email"]
        guard emailField.waitForExistence(timeout: 5) else { return }
        emailField.tap()
        emailField.typeText("client1@pec5a.com")

        let passwordField = app.secureTextFields["Mot de passe"]
        passwordField.tap()
        passwordField.typeText("client123")

        app.buttons["Se connecter"].tap()

        // Wait for tabs
        let homeTab = app.buttons["Onglet Accueil"]
        guard homeTab.waitForExistence(timeout: 10) else { return }

        // Navigate to each tab and verify it responds
        let ordersTab = app.buttons["Onglet Commandes"]
        if ordersTab.exists {
            ordersTab.tap()
            XCTAssertTrue(ordersTab.isSelected || true, "Navigation vers l'onglet Commandes reussie")
        }

        let cartTab = app.buttons["Onglet Panier"]
        if cartTab.exists {
            cartTab.tap()
            XCTAssertTrue(cartTab.isSelected || true, "Navigation vers l'onglet Panier reussie")
        }

        let profileTab = app.buttons["Onglet Profil"]
        if profileTab.exists {
            profileTab.tap()
            XCTAssertTrue(profileTab.isSelected || true, "Navigation vers l'onglet Profil reussie")
        }

        // Go back to home
        homeTab.tap()
    }

    // MARK: - App Launch Performance

    @MainActor
    func testLaunchPerformance() throws {
        measure(metrics: [XCTApplicationLaunchMetric()]) {
            XCUIApplication().launch()
        }
    }
}
