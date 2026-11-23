#if DEBUG
import Foundation
import SwiftData

/// Nur für Screenshots: Startet die App mit Beispieldaten, ohne echte Daten anzufassen.
/// Aufruf mit dem Startargument `-demoScene today | alldone | catalog | editor`.
enum DemoMode {
    static var scene: String? {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "-demoScene"), index + 1 < arguments.count else {
            return nil
        }
        return arguments[index + 1]
    }

    static var isActive: Bool { scene != nil }

    static func seed(into container: ModelContainer) {
        let context = ModelContext(container)
        let today = Calendar.current.startOfDay(for: .now)
        let allDone = scene == "alldone"

        let templates = HabitCatalog.starter + [
            HabitTemplate(name: "10 Minuten Dehnen", icon: "figure.flexibility", kind: .check),
            HabitTemplate(name: "10 Seiten lesen", icon: "book", kind: .check),
        ]
        let values: [String: Double] = allDone
            ? ["Meditieren": 1, "3 L Wasser trinken": 3, "Bildschirmzeit": 75, "10 Minuten Dehnen": 1, "10 Seiten lesen": 1]
            : ["Meditieren": 1, "3 L Wasser trinken": 1.5, "10 Minuten Dehnen": 1]

        for (index, template) in templates.enumerated() {
            let habit = template.makeHabit(sortOrder: index)
            context.insert(habit)
            if let value = values[template.name] {
                let entry = HabitLog(day: today, value: value)
                context.insert(entry)
                entry.habit = habit
            }
        }
        try? context.save()
    }
}
#endif
