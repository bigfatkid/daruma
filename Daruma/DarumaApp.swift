import SwiftUI
import SwiftData

@main
struct DarumaApp: App {
    private let container: ModelContainer = DarumaApp.makeContainer()

    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(container)
    }

    private static func makeContainer() -> ModelContainer {
        let schema = Schema([Habit.self, HabitLog.self])
        #if DEBUG
        if DemoMode.isActive {
            let configuration = ModelConfiguration(isStoredInMemoryOnly: true)
            do {
                let container = try ModelContainer(for: schema, configurations: configuration)
                DemoMode.seed(into: container)
                return container
            } catch {
                fatalError("Demo-Daten konnten nicht angelegt werden: \(error)")
            }
        }
        #endif
        do {
            return try ModelContainer(for: schema)
        } catch {
            fatalError("Datenspeicher konnte nicht geöffnet werden: \(error)")
        }
    }
}

struct RootView: View {
    @Environment(\.modelContext) private var context
    @AppStorage("didSeedStarterHabits") private var didSeed = false

    var body: some View {
        TabView {
            TodayView()
                .tabItem { Label("Heute", systemImage: "sun.max") }
            ComingSoonView(
                title: "Pool",
                icon: "tray.full",
                text: "Hier landen bald deine Langzeit-Listen. Wenn du Zeit und Lust hast, holst du dir einen Eintrag auf Heute."
            )
            .tabItem { Label("Pool", systemImage: "tray.full") }
            ComingSoonView(
                title: "Fortschritt",
                icon: "chart.bar",
                text: "Hier siehst du bald deine Serien, Quoten und den Kalender pro Habit. Deine Einträge werden schon jetzt gespeichert."
            )
            .tabItem { Label("Fortschritt", systemImage: "chart.bar") }
        }
        .task { seedIfNeeded() }
    }

    private func seedIfNeeded() {
        #if DEBUG
        if DemoMode.isActive { return }
        #endif
        guard !didSeed else { return }
        for (index, template) in HabitCatalog.starter.enumerated() {
            context.insert(template.makeHabit(sortOrder: index))
        }
        didSeed = true
    }
}

struct ComingSoonView: View {
    let title: String
    let icon: String
    let text: String

    var body: some View {
        NavigationStack {
            ContentUnavailableView(title, systemImage: icon, description: Text(text))
                .navigationTitle(title)
        }
    }
}
