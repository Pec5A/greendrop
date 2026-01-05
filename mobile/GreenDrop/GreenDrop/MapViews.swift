import SwiftUI
import MapKit
import Combine
import AVFoundation
import FirebaseFirestore

// MARK: - Voice Navigation Service
@MainActor
class VoiceNavigationService: NSObject, ObservableObject {
    static let shared = VoiceNavigationService()
    private let synthesizer = AVSpeechSynthesizer()
    @Published var isVoiceEnabled = true
    @Published var lastSpokenInstruction = ""

    override init() {
        super.init()
        setupAudioSession()
    }

    private func setupAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .voicePrompt, options: [.duckOthers, .interruptSpokenAudioAndMixWithOthers])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
        }
    }

    func speak(_ text: String) {
        guard isVoiceEnabled else { return }
        guard text != lastSpokenInstruction else { return }

        lastSpokenInstruction = text

        synthesizer.stopSpeaking(at: .immediate)
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "fr-FR")
        utterance.rate = 0.5
        utterance.pitchMultiplier = 1.0
        utterance.volume = 1.0
        synthesizer.speak(utterance)
    }

    func stopSpeaking() {
        synthesizer.stopSpeaking(at: .immediate)
    }
}

// MARK: - Navigation State
@MainActor
class NavigationState: ObservableObject {
    @Published var isNavigating = false
    @Published var currentRoute: MKRoute?
    @Published var currentStepIndex = 0
    @Published var distanceToNextStep: CLLocationDistance = 0
    @Published var estimatedTimeRemaining: TimeInterval = 0
    @Published var totalDistance: CLLocationDistance = 0

    var currentInstruction: String {
        guard let route = currentRoute,
              currentStepIndex < route.steps.count else {
            return "Calcul de l'itinéraire..."
        }
        return route.steps[currentStepIndex].instructions
    }

    var nextInstruction: String? {
        guard let route = currentRoute,
              currentStepIndex + 1 < route.steps.count else {
            return nil
        }
        return route.steps[currentStepIndex + 1].instructions
    }

    func startNavigation(with route: MKRoute) {
        self.currentRoute = route
        self.isNavigating = true
        self.currentStepIndex = 0
        self.totalDistance = route.distance
        self.estimatedTimeRemaining = route.expectedTravelTime
    }

    func stopNavigation() {
        isNavigating = false
        currentRoute = nil
        currentStepIndex = 0
    }
}

// MARK: - Simple Map Marker
struct MapMarker: View {
    let icon: String
    let color: Color

    var body: some View {
        ZStack {
            Circle()
                .fill(color)
                .frame(width: 40, height: 40)
                .shadow(radius: 4)
            Image(systemName: icon)
                .foregroundColor(.white)
                .font(.system(size: 18))
        }
    }
}

// MARK: - Driver Marker
struct DriverMarker: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(Color(hex: "#22C55E"))
                .frame(width: 44, height: 44)
                .shadow(color: Color(hex: "#22C55E").opacity(0.5), radius: 8)
            Image(systemName: "car.fill")
                .foregroundColor(.white)
                .font(.system(size: 20))
        }
    }
}

// MARK: - Delivery Route Map View (for Driver)
struct DeliveryRouteMapView: View {
    let shopCoordinate: CLLocationCoordinate2D
    let customerCoordinate: CLLocationCoordinate2D
    let shopName: String
    let customerName: String
    @Binding var driverLocation: CLLocationCoordinate2D?

    @State private var region: MKCoordinateRegion

    init(shopCoordinate: CLLocationCoordinate2D, customerCoordinate: CLLocationCoordinate2D, shopName: String, customerName: String, driverLocation: Binding<CLLocationCoordinate2D?>) {
        self.shopCoordinate = shopCoordinate
        self.customerCoordinate = customerCoordinate
        self.shopName = shopName
        self.customerName = customerName
        self._driverLocation = driverLocation

        // Calculate center between shop and customer
        let centerLat = (shopCoordinate.latitude + customerCoordinate.latitude) / 2
        let centerLng = (shopCoordinate.longitude + customerCoordinate.longitude) / 2
        let latDelta = abs(shopCoordinate.latitude - customerCoordinate.latitude) * 1.5
        let lngDelta = abs(shopCoordinate.longitude - customerCoordinate.longitude) * 1.5

        _region = State(initialValue: MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: centerLat, longitude: centerLng),
            span: MKCoordinateSpan(latitudeDelta: max(latDelta, 0.01), longitudeDelta: max(lngDelta, 0.01))
        ))
    }

    var annotations: [MapLocation] {
        var items = [
            MapLocation(id: "shop", name: shopName, coordinate: shopCoordinate, type: .shop),
            MapLocation(id: "customer", name: customerName, coordinate: customerCoordinate, type: .customer)
        ]
        if let driverLoc = driverLocation {
            items.append(MapLocation(id: "driver", name: "Vous", coordinate: driverLoc, type: .driver))
        }
        return items
    }

    var body: some View {
        Map(coordinateRegion: $region, annotationItems: annotations) { location in
            MapAnnotation(coordinate: location.coordinate) {
                switch location.type {
                case .shop:
                    MapMarker(icon: "storefront.fill", color: Color(hex: "#22C55E"))
                case .customer:
                    MapMarker(icon: "house.fill", color: .red)
                case .driver:
                    DriverMarker()
                }
            }
        }
    }
}

// MARK: - Map Location Model
struct MapLocation: Identifiable {
    let id: String
    let name: String
    let coordinate: CLLocationCoordinate2D
    let type: LocationType

    enum LocationType {
        case shop, customer, driver
    }
}

// MARK: - Order Tracking Map View (for Customer)
struct OrderTrackingMapView: View {
    let order: Order
    @State private var driverLocation: CLLocationCoordinate2D?
    @State private var region: MKCoordinateRegion
    @State private var driverLocationListener: ListenerRegistration?

    init(order: Order) {
        self.order = order

        // Initialize region centered on delivery address
        _region = State(initialValue: MKCoordinateRegion(
            center: order.deliveryCoordinate,
            span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
        ))
    }

    var shopCoordinate: CLLocationCoordinate2D {
        if let shop = DataService.shared.getShop(id: order.shopId) {
            return shop.coordinate
        }
        return CLLocationCoordinate2D(latitude: 48.8566, longitude: 2.3522)
    }

    var annotations: [MapLocation] {
        var items = [
            MapLocation(id: "shop", name: order.shopName, coordinate: shopCoordinate, type: .shop),
            MapLocation(id: "delivery", name: "Livraison", coordinate: order.deliveryCoordinate, type: .customer)
        ]
        if let driverLoc = driverLocation {
            items.append(MapLocation(id: "driver", name: "Livreur", coordinate: driverLoc, type: .driver))
        }
        return items
    }

    var body: some View {
        VStack(spacing: 0) {
            // Map
            Map(coordinateRegion: $region, annotationItems: annotations) { location in
                MapAnnotation(coordinate: location.coordinate) {
                    switch location.type {
                    case .shop:
                        MapMarker(icon: "storefront.fill", color: Color(hex: "#22C55E"))
                    case .customer:
                        MapMarker(icon: "mappin.circle.fill", color: .red)
                    case .driver:
                        DriverMarker()
                    }
                }
            }
            .frame(height: 300)

            // Order Status
            VStack(spacing: 16) {
                HStack {
                    Image(systemName: order.status.icon)
                        .foregroundColor(Color(hex: order.status.color))
                        .font(.title2)

                    VStack(alignment: .leading) {
                        Text(order.status.displayName)
                            .font(.headline)
                        if let eta = order.estimatedDelivery {
                            Text("Arrivée estimée: \(eta.formatted(date: .omitted, time: .shortened))")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }

                    Spacer()
                }

                // Progress bar
                ProgressView(value: order.status.progressValue)
                    .tint(Color(hex: "#22C55E"))
            }
            .padding()
            .background(Color(.systemBackground))
        }
        .cornerRadius(16)
        .shadow(radius: 8)
        .onAppear {
            startListeningForDriverLocation()
        }
        .onDisappear {
            driverLocationListener?.remove()
            driverLocationListener = nil
        }
    }

    private func startListeningForDriverLocation() {
        guard order.status.isActive else { return }

        let db = Firestore.firestore()
        driverLocationListener = db.collection("orders").document(order.id)
            .addSnapshotListener { snapshot, error in
                guard let data = snapshot?.data(),
                      let location = data["driverLocation"] as? [String: Any] else { return }

                let lat = location["latitude"] as? Double ?? 0
                let lng = location["longitude"] as? Double ?? 0
                if lat != 0 && lng != 0 {
                    driverLocation = CLLocationCoordinate2D(latitude: lat, longitude: lng)

                    // Center map to include driver
                    let centerLat = (lat + order.deliveryCoordinate.latitude) / 2
                    let centerLng = (lng + order.deliveryCoordinate.longitude) / 2
                    let latDelta = abs(lat - order.deliveryCoordinate.latitude) * 1.5
                    let lngDelta = abs(lng - order.deliveryCoordinate.longitude) * 1.5
                    region = MKCoordinateRegion(
                        center: CLLocationCoordinate2D(latitude: centerLat, longitude: centerLng),
                        span: MKCoordinateSpan(latitudeDelta: max(latDelta, 0.01), longitudeDelta: max(lngDelta, 0.01))
                    )
                }
            }
    }
}

// MARK: - Route Map View (UIViewRepresentable with MKDirections)
struct RouteMapView: UIViewRepresentable {
    let annotations: [MapLocation]
    let routeSource: CLLocationCoordinate2D?
    let routeDestination: CLLocationCoordinate2D?
    @Binding var eta: TimeInterval?
    @Binding var distance: CLLocationDistance?

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView()
        mapView.delegate = context.coordinator
        mapView.showsUserLocation = true
        mapView.pointOfInterestFilter = .excludingAll
        return mapView
    }

    func updateUIView(_ mapView: MKMapView, context: Context) {
        // Update annotations
        mapView.removeAnnotations(mapView.annotations)
        for location in annotations where location.type != .driver {
            let annotation = MKPointAnnotation()
            annotation.coordinate = location.coordinate
            annotation.title = location.name
            annotation.subtitle = location.type == .shop ? "shop" : "customer"
            mapView.addAnnotation(annotation)
        }

        // Calculate route if source and destination are available
        let newSrc = routeSource
        let newDst = routeDestination
        let prevSrc = context.coordinator.lastSource
        let prevDst = context.coordinator.lastDestination

        let sourceChanged = newSrc.map { src in
            prevSrc.map { abs($0.latitude - src.latitude) > 0.0005 || abs($0.longitude - src.longitude) > 0.0005 } ?? true
        } ?? (prevSrc != nil)

        let destChanged = newDst.map { dst in
            prevDst.map { abs($0.latitude - dst.latitude) > 0.0005 || abs($0.longitude - dst.longitude) > 0.0005 } ?? true
        } ?? (prevDst != nil)

        if sourceChanged || destChanged {
            context.coordinator.lastSource = newSrc
            context.coordinator.lastDestination = newDst
            calculateRoute(on: mapView, context: context)
        }
    }

    private func calculateRoute(on mapView: MKMapView, context: Context) {
        mapView.removeOverlays(mapView.overlays)

        guard let source = routeSource, let destination = routeDestination else {
            // Zoom to fit annotations
            mapView.showAnnotations(mapView.annotations, animated: true)
            return
        }

        let request = MKDirections.Request()
        request.source = MKMapItem(placemark: MKPlacemark(coordinate: source))
        request.destination = MKMapItem(placemark: MKPlacemark(coordinate: destination))
        request.transportType = .automobile

        let directions = MKDirections(request: request)
        directions.calculate { response, error in
            guard let route = response?.routes.first else { return }

            DispatchQueue.main.async {
                self.eta = route.expectedTravelTime
                self.distance = route.distance
            }

            mapView.addOverlay(route.polyline, level: .aboveRoads)

            let rect = route.polyline.boundingMapRect
            let insets = UIEdgeInsets(top: 60, left: 40, bottom: 60, right: 40)
            mapView.setVisibleMapRect(rect, edgePadding: insets, animated: true)
        }
    }

    class Coordinator: NSObject, MKMapViewDelegate {
        var parent: RouteMapView
        var lastSource: CLLocationCoordinate2D?
        var lastDestination: CLLocationCoordinate2D?

        init(_ parent: RouteMapView) {
            self.parent = parent
        }

        func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
            if let polyline = overlay as? MKPolyline {
                let renderer = MKPolylineRenderer(polyline: polyline)
                renderer.strokeColor = UIColor(red: 34/255, green: 197/255, blue: 94/255, alpha: 1.0) // #22C55E
                renderer.lineWidth = 5
                return renderer
            }
            return MKOverlayRenderer(overlay: overlay)
        }

        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            guard !annotation.isKind(of: MKUserLocation.self) else { return nil }

            let identifier = "RoutePin"
            var view = mapView.dequeueReusableAnnotationView(withIdentifier: identifier) as? MKMarkerAnnotationView
            if view == nil {
                view = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: identifier)
            } else {
                view?.annotation = annotation
            }

            if let subtitle = annotation.subtitle, subtitle == "shop" {
                view?.markerTintColor = UIColor(red: 34/255, green: 197/255, blue: 94/255, alpha: 1.0)
                view?.glyphImage = UIImage(systemName: "storefront.fill")
            } else {
                view?.markerTintColor = .systemRed
                view?.glyphImage = UIImage(systemName: "house.fill")
            }

            return view
        }
    }
}

// MARK: - Driver Full Map View (Simplified)
struct DriverFullMapView: View {
    @Binding var delivery: Delivery?
    @Environment(\.dismiss) private var dismiss
    @StateObject private var locationManager = LocationManager()
    @StateObject private var voiceService = VoiceNavigationService.shared
    @StateObject private var navState = NavigationState()

    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 48.8566, longitude: 2.3522),
        span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
    )
    @State private var showNavigationMode = false
    @State private var routeETA: TimeInterval?
    @State private var routeDistance: CLLocationDistance?

    var routeDestination: CLLocationCoordinate2D? {
        guard let delivery = delivery else { return nil }
        switch delivery.status {
        case .accepted, .atShop:
            return delivery.shopCoordinate
        case .pickedUp, .delivering:
            return delivery.customerCoordinate
        default:
            return nil
        }
    }

    var annotations: [MapLocation] {
        guard let delivery = delivery else { return [] }
        var items = [
            MapLocation(id: "shop", name: delivery.shopName, coordinate: delivery.shopCoordinate, type: .shop),
            MapLocation(id: "customer", name: delivery.customerName, coordinate: delivery.customerCoordinate, type: .customer)
        ]
        if let loc = locationManager.location {
            items.append(MapLocation(id: "driver", name: "Vous", coordinate: loc, type: .driver))
        }
        return items
    }

    var body: some View {
        ZStack {
            // Map with route
            RouteMapView(
                annotations: annotations,
                routeSource: locationManager.location,
                routeDestination: routeDestination,
                eta: $routeETA,
                distance: $routeDistance
            )
            .ignoresSafeArea()

            // Overlay controls
            VStack {
                // Top bar
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.headline)
                            .foregroundColor(.primary)
                            .padding(12)
                            .background(.ultraThinMaterial)
                            .clipShape(Circle())
                    }

                    Spacer()

                    if let delivery = delivery {
                        Text(delivery.shopName)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(.ultraThinMaterial)
                            .cornerRadius(20)
                    }

                    Spacer()

                    // ETA Badge
                    if let eta = routeETA {
                        HStack(spacing: 4) {
                            Image(systemName: "clock.fill")
                                .font(.caption2)
                            Text("\(Int(eta / 60)) min")
                                .font(.caption)
                                .fontWeight(.semibold)
                            if let dist = routeDistance {
                                Text("· \(String(format: "%.1f", dist / 1000)) km")
                                    .font(.caption)
                            }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(.ultraThinMaterial)
                        .foregroundColor(Color(hex: "#22C55E"))
                        .cornerRadius(16)
                    }

                    Spacer()

                    Button(action: { voiceService.isVoiceEnabled.toggle() }) {
                        Image(systemName: voiceService.isVoiceEnabled ? "speaker.wave.2.fill" : "speaker.slash.fill")
                            .font(.headline)
                            .foregroundColor(.primary)
                            .padding(12)
                            .background(.ultraThinMaterial)
                            .clipShape(Circle())
                    }
                }
                .padding()

                Spacer()

                // Bottom panel with navigation info
                if let delivery = delivery {
                    VStack(spacing: 12) {
                        // Current instruction
                        if navState.isNavigating {
                            HStack(spacing: 12) {
                                Image(systemName: "arrow.turn.up.right")
                                    .font(.title2)
                                    .foregroundColor(Color(hex: "#22C55E"))

                                VStack(alignment: .leading) {
                                    Text(navState.currentInstruction)
                                        .font(.subheadline)
                                        .fontWeight(.medium)

                                    Text("\(Int(navState.distanceToNextStep)) m")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }

                                Spacer()
                            }
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(12)
                        }

                        // Destination info
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(delivery.customerName)
                                    .font(.headline)
                                Text(delivery.customerAddress)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            VStack(alignment: .trailing, spacing: 4) {
                                Text(String(format: "%.1f km", delivery.distance))
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                Text(String(format: "%.2f €", delivery.earnings))
                                    .font(.caption)
                                    .foregroundColor(Color(hex: "#22C55E"))
                            }
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(12)

                        // Action buttons
                        HStack(spacing: 12) {
                            // Open in Maps
                            Button(action: { openInMaps() }) {
                                HStack {
                                    Image(systemName: "map.fill")
                                    Text("Ouvrir dans Plans")
                                }
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color(hex: "#3B82F6"))
                                .cornerRadius(12)
                            }

                            // Start/Stop navigation
                            Button(action: { toggleNavigation() }) {
                                HStack {
                                    Image(systemName: navState.isNavigating ? "stop.fill" : "location.fill")
                                    Text(navState.isNavigating ? "Arrêter" : "Naviguer")
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
                    }
                    .padding()
                    .background(.ultraThinMaterial)
                    .cornerRadius(24, corners: [.topLeft, .topRight])
                }
            }
        }
        .onAppear {
            locationManager.requestPermission()
            centerOnDelivery()
        }
    }

    private func centerOnDelivery() {
        guard let delivery = delivery else { return }
        let centerLat = (delivery.shopCoordinate.latitude + delivery.customerCoordinate.latitude) / 2
        let centerLng = (delivery.shopCoordinate.longitude + delivery.customerCoordinate.longitude) / 2
        let latDelta = abs(delivery.shopCoordinate.latitude - delivery.customerCoordinate.latitude) * 2
        let lngDelta = abs(delivery.shopCoordinate.longitude - delivery.customerCoordinate.longitude) * 2

        region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: centerLat, longitude: centerLng),
            span: MKCoordinateSpan(latitudeDelta: max(latDelta, 0.01), longitudeDelta: max(lngDelta, 0.01))
        )
    }

    private func openInMaps() {
        guard let delivery = delivery else { return }
        let destination = MKMapItem(placemark: MKPlacemark(coordinate: delivery.customerCoordinate))
        destination.name = delivery.customerName
        destination.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving])
    }

    private func toggleNavigation() {
        if navState.isNavigating {
            navState.stopNavigation()
            voiceService.stopSpeaking()
        } else {
            calculateAndStartNavigation()
        }
    }

    private func calculateAndStartNavigation() {
        guard let delivery = delivery,
              let userLocation = locationManager.location else { return }

        let request = MKDirections.Request()
        request.source = MKMapItem(placemark: MKPlacemark(coordinate: userLocation))
        request.destination = MKMapItem(placemark: MKPlacemark(coordinate: delivery.customerCoordinate))
        request.transportType = .automobile

        let directions = MKDirections(request: request)
        directions.calculate { response, error in
            if let route = response?.routes.first {
                navState.startNavigation(with: route)
                voiceService.speak("Démarrage de la navigation. \(route.steps.first?.instructions ?? "")")
            }
        }
    }
}

// MARK: - Corner Radius Extension
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(roundedRect: rect, byRoundingCorners: corners, cornerRadii: CGSize(width: radius, height: radius))
        return Path(path.cgPath)
    }
}

