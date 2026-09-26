import SwiftUI
import WebKit

struct ContentView: View {
    var body: some View {
        GDCarWebView(url: URL(string: "https://gd-dispatch-web-xi.vercel.app")!)
            .ignoresSafeArea()
    }
}

struct GDCarWebView: UIViewRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        let webView = WKWebView(frame: .zero, configuration: config)
        context.coordinator.webView = webView
        webView.navigationDelegate = context.coordinator
        webView.load(URLRequest(url: url))
        context.coordinator.observeDeviceToken()
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        weak var webView: WKWebView?
        private var tokenObserver: NSObjectProtocol?
        private var pendingToken: String?

        deinit {
            if let tokenObserver { NotificationCenter.default.removeObserver(tokenObserver) }
        }

        func observeDeviceToken() {
            tokenObserver = NotificationCenter.default.addObserver(
                forName: .gdCarDeviceToken, object: nil, queue: .main
            ) { [weak self] note in
                guard let token = note.object as? String else { return }
                self?.pendingToken = token
                self?.registerTokenIfReady()
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            registerTokenIfReady()
        }

        private func registerTokenIfReady() {
            guard let webView, let token = pendingToken else { return }
            let safeToken = token.replacingOccurrences(of: "'", with: "")
            let js = """
            fetch('/api/device-registration', {
              method: 'PUT',
              credentials: 'include',
              headers: {'Content-Type':'application/json'},
              body: JSON.stringify({token:'\(safeToken)', platform:'ios', deviceName:'GD Car iPhone'})
            }).then(r => r.json()).then(x => JSON.stringify(x)).catch(e => JSON.stringify({ok:false,error:String(e)}))
            """
            webView.evaluateJavaScript(js) { [weak self] result, error in
                guard error == nil,
                      let text = result as? String,
                      text.contains("\"ok\":true") else { return }
                self?.pendingToken = nil
                print("[GD Car] APNs device registered")
            }
        }
    }
}
