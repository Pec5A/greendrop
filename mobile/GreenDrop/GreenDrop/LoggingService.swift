import Foundation
import UIKit

/// Singleton service for buffered mobile event logging.
///
/// Collects events in a local buffer (max 20) and flushes them every 30 seconds
/// or when the app enters the background. Sends batches to the Cloud Function
/// `logMobileEvents` endpoint authenticated via API key.
///
/// On network failure, events are re-buffered (capped at 100) for retry.
final class LoggingService {
    static let shared = LoggingService()

    private var buffer: [LogEntry] = []
    private let maxBufferSize = 20
    private let maxRetryBuffer = 100
    private let flushInterval: TimeInterval = 30
    private var flushTimer: Timer?
    private let queue = DispatchQueue(label: "com.greendrop.logging", qos: .utility)

    private let sessionId = UUID().uuidString
    private let appVersion: String
    private let osVersion: String
    private let deviceModel: String

    private init() {
        appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"
        osVersion = UIDevice.current.systemVersion
        deviceModel = UIDevice.current.model

        startFlushTimer()
        observeAppLifecycle()
    }

    // MARK: - Public API

    /// Log a generic event.
    func log(_ event: String, level: String = "info", metadata: [String: Any]? = nil) {
        let entry = LogEntry(
            level: level,
            event: event,
            timestamp: ISO8601DateFormatter().string(from: Date()),
            userId: currentUserId,
            sessionId: sessionId,
            appVersion: appVersion,
            osVersion: osVersion,
            deviceModel: deviceModel,
            metadata: metadata
        )

        queue.async { [weak self] in
            self?.addToBuffer(entry)
        }
    }

    /// Track a screen view event.
    func trackScreenView(_ screenName: String) {
        log("screen_view", metadata: ["screen": screenName])
    }

    /// Track an API call with timing information.
    func trackAPICall(endpoint: String, method: String, durationMs: Int, statusCode: Int) {
        log("api_call", metadata: [
            "endpoint": endpoint,
            "method": method,
            "durationMs": durationMs,
            "statusCode": statusCode,
        ])
    }

    /// Track an error event.
    func trackError(_ error: String, context: String? = nil) {
        var meta: [String: Any] = ["error": error]
        if let context = context { meta["context"] = context }
        log("error", level: "error", metadata: meta)
    }

    /// Track an order lifecycle event.
    func trackOrderEvent(_ event: String, orderId: String? = nil, metadata: [String: Any]? = nil) {
        var meta = metadata ?? [:]
        if let orderId = orderId { meta["orderId"] = orderId }
        log(event, metadata: meta)
    }

    // MARK: - User ID

    private var currentUserId: String?

    /// Set the current user ID for log attribution.
    func setUserId(_ userId: String?) {
        currentUserId = userId
    }

    // MARK: - Buffer Management

    private func addToBuffer(_ entry: LogEntry) {
        buffer.append(entry)
        if buffer.count >= maxBufferSize {
            flush()
        }
    }

    private func flush() {
        guard !buffer.isEmpty else { return }

        let entries = Array(buffer)
        buffer.removeAll()

        sendToServer(entries)
    }

    private func sendToServer(_ entries: [LogEntry]) {
        guard let url = URL(string: MobileConfig.logEndpoint) else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(MobileConfig.logAPIKey, forHTTPHeaderField: "x-api-key")
        request.timeoutInterval = 10

        let payload: [String: Any] = [
            "events": entries.map { $0.toDictionary() }
        ]

        guard let body = try? JSONSerialization.data(withJSONObject: payload) else { return }
        request.httpBody = body

        URLSession.shared.dataTask(with: request) { [weak self] _, response, error in
            guard let self = self else { return }

            let httpResponse = response as? HTTPURLResponse
            if error != nil || (httpResponse?.statusCode ?? 500) >= 400 {
                // Re-buffer on failure (capped)
                self.queue.async {
                    let remaining = self.maxRetryBuffer - self.buffer.count
                    if remaining > 0 {
                        self.buffer.insert(contentsOf: entries.prefix(remaining), at: 0)
                    }
                }
            }
        }.resume()
    }

    // MARK: - Timer & Lifecycle

    private func startFlushTimer() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.flushTimer?.invalidate()
            self.flushTimer = Timer.scheduledTimer(withTimeInterval: self.flushInterval, repeats: true) { [weak self] _ in
                self?.queue.async { self?.flush() }
            }
        }
    }

    private func observeAppLifecycle() {
        NotificationCenter.default.addObserver(
            forName: UIApplication.willResignActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.queue.async { self?.flush() }
        }
    }
}

// MARK: - Log Entry

private struct LogEntry {
    let level: String
    let event: String
    let timestamp: String
    let userId: String?
    let sessionId: String
    let appVersion: String
    let osVersion: String
    let deviceModel: String
    let metadata: [String: Any]?

    func toDictionary() -> [String: Any] {
        var dict: [String: Any] = [
            "level": level,
            "event": event,
            "timestamp": timestamp,
            "sessionId": sessionId,
            "appVersion": appVersion,
            "osVersion": osVersion,
            "deviceModel": deviceModel,
        ]
        if let userId = userId { dict["userId"] = userId }
        if let metadata = metadata { dict["metadata"] = metadata }
        return dict
    }
}
