import Foundation

/// Vorlage aus dem Habit-Katalog.
struct HabitTemplate: Identifiable, Hashable {
    let id = UUID()
    let name: String
    let icon: String
    let kind: HabitKind
    var target: Double = 1
    var step: Double = 1
    var unit: String = ""

    func makeHabit(sortOrder: Int) -> Habit {
        Habit(name: name, icon: icon, kind: kind, target: target, step: step, unit: unit, sortOrder: sortOrder)
    }
}

struct HabitCategory: Identifiable {
    let id = UUID()
    let name: String
    let templates: [HabitTemplate]
}

enum HabitCatalog {
    static let categories: [HabitCategory] = [
        HabitCategory(name: "Körper", templates: [
            HabitTemplate(name: "3 L Wasser trinken", icon: "drop.fill", kind: .count, target: 3, step: 0.5, unit: "L"),
            HabitTemplate(name: "10 Minuten Dehnen", icon: "figure.flexibility", kind: .check),
            HabitTemplate(name: "Hüftübungen", icon: "figure.cooldown", kind: .check),
            HabitTemplate(name: "8.000 Schritte", icon: "figure.walk", kind: .check),
            HabitTemplate(name: "Sport", icon: "figure.run", kind: .check),
            HabitTemplate(name: "Obst oder Gemüse", icon: "carrot", kind: .count, target: 5, step: 1, unit: "Portionen"),
        ]),
        HabitCategory(name: "Kopf", templates: [
            HabitTemplate(name: "Meditieren", icon: "brain.head.profile", kind: .check),
            HabitTemplate(name: "10 Seiten lesen", icon: "book", kind: .check),
            HabitTemplate(name: "Journaling", icon: "square.and.pencil", kind: .check),
            HabitTemplate(name: "3 Dinge, für die ich dankbar bin", icon: "heart", kind: .check),
            HabitTemplate(name: "Spaziergang ohne Handy", icon: "leaf", kind: .check),
        ]),
        HabitCategory(name: "Schlaf", templates: [
            HabitTemplate(name: "Vor 23 Uhr ins Bett", icon: "bed.double", kind: .check),
            HabitTemplate(name: "Kein Handy im Bett", icon: "iphone.slash", kind: .check),
            HabitTemplate(name: "Kein Kaffee nach 14 Uhr", icon: "cup.and.saucer", kind: .check),
        ]),
        HabitCategory(name: "Struktur", templates: [
            HabitTemplate(name: "Bildschirmzeit", icon: "hourglass", kind: .limit, target: 90, step: 1, unit: "min"),
            HabitTemplate(name: "Morgens den Tag planen", icon: "list.bullet.clipboard", kind: .check),
            HabitTemplate(name: "5 Minuten aufräumen", icon: "sparkles", kind: .check),
        ]),
    ]

    /// Habits, die beim allerersten Start schon angelegt sind.
    static let starter: [HabitTemplate] = [
        HabitTemplate(name: "Meditieren", icon: "brain.head.profile", kind: .check),
        HabitTemplate(name: "3 L Wasser trinken", icon: "drop.fill", kind: .count, target: 3, step: 0.5, unit: "L"),
        HabitTemplate(name: "Bildschirmzeit", icon: "hourglass", kind: .limit, target: 90, step: 1, unit: "min"),
    ]

    /// Symbole zur Auswahl für eigene Habits.
    static let icons: [String] = [
        "checkmark.circle", "drop.fill", "brain.head.profile", "book", "figure.walk",
        "figure.run", "figure.flexibility", "heart", "leaf", "bed.double",
        "cup.and.saucer", "hourglass", "sparkles", "sun.max", "moon",
        "pills", "fork.knife", "music.note", "pencil", "dumbbell",
    ]
}
