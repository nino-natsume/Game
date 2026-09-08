import SwiftUI

@main
struct GameCenterApp: App {
    private let webURL = URL(string: "https://game.107211.xyz")!

    var body: some Scene {
        WindowGroup {
            GameView(url: webURL)
                .statusBarHidden(true)
                .prefersHomeIndicatorAutoHidden(true)
                .ignoresSafeArea()
                .persistentSystemOverlays(.hidden)
        }
    }
}