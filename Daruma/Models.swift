import Foundation
import SwiftData

/// Wie ein Habit abgehakt wird.
enum HabitKind: String, Codable, CaseIterable, Identifiable {
    /// Einmal antippen = erledigt (z.B. Meditieren)
    case check
    /// Hochzählen bis zum Ziel (z.B. 3 L Wasser in 0,5-L-Schritten)
    case count
    /// Abends einen Wert eintragen, der unter dem Limit bleiben soll (z.B. Bildschirmzeit unter 90 min)
    case limit

    var id: String { rawValue }

    var title: String {
        switch self {
        case .check: return "Abhaken"
        case .count: return "Zählen"
        case .limit: return "Limit"
        }
    }
}

@Model
final class Habit {
    var name: String
    var icon: String
    var kindRaw: String
    /// Zählen: Zielwert (z.B. 3). Limit: Höchstwert (z.B. 90).
    var target: Double
    /// Zählen: Schrittweite pro Tipp (z.B. 0,5).
    var step: Double
    var unit: String
    /// Wochentage nach Kalender-Zählung: 1 = Sonntag, 2 = Montag, ... 7 = Samstag
    var weekdays: [Int]
    var sortOrder: Int
    var createdAt: Date
    var isArchived: Bool

    @Relationship(deleteRule: .cascade, inverse: \HabitLog.habit)
    var logs: [HabitLog] = []

    init(
        name: String,
        icon: String = "checkmark.circle",
        kind: HabitKind = .check,
        target: Double = 1,
        step: Double = 1,
        unit: String = "",
        weekdays: [Int] = [1, 2, 3, 4, 5, 6, 7],
        sortOrder: Int = 0
    ) {
        self.name = name
        self.icon = icon
        self.kindRaw = kind.rawValue
        self.target = target
        self.step = step
        self.unit = unit
        self.weekdays = weekdays
        self.sortOrder = sortOrder
        self.createdAt = .now
        self.isArchived = false
    }

    var kind: HabitKind {
        get { HabitKind(rawValue: kindRaw) ?? .check }
        set { kindRaw = newValue.rawValue }
    }

    func log(on day: Date) -> HabitLog? {
        logs.first { Calendar.current.isDate($0.day, inSameDayAs: day) }
    }

    func value(on day: Date) -> Double {
        log(on: day)?.value ?? 0
    }

    func isScheduled(on day: Date) -> Bool {
        weekdays.contains(Calendar.current.component(.weekday, from: day))
    }

    func isDone(on day: Date) -> Bool {
        switch kind {
        case .check:
            return value(on: day) >= 1
        case .count:
            return value(on: day) >= target
        case .limit:
            guard let log = log(on: day) else { return false }
            return log.value <= target
        }
    }

    /// Setzt den Wert für einen Tag. Wert 0 löscht den Eintrag (außer bei Limit, dort ist 0 ein gültiger Wert).
    func setValue(_ newValue: Double, on day: Date, in context: ModelContext) {
        let start = Calendar.current.startOfDay(for: day)
        if let existing = log(on: start) {
            if newValue <= 0 && kind != .limit {
                logs.removeAll { $0.persistentModelID == existing.persistentModelID }
                context.delete(existing)
            } else {
                existing.value = newValue
            }
        } else if newValue > 0 || kind == .limit {
            let entry = HabitLog(day: start, value: newValue)
            context.insert(entry)
            entry.habit = self
        }
    }

    func clearValue(on day: Date, in context: ModelContext) {
        guard let existing = log(on: day) else { return }
        logs.removeAll { $0.persistentModelID == existing.persistentModelID }
        context.delete(existing)
    }
}

/// Ein Eintrag pro Habit und Tag. Wird von Anfang an gespeichert, damit spätere Auswertungen auch rückwirkend funktionieren.
@Model
final class HabitLog {
    var day: Date
    var value: Double
    var habit: Habit?

    init(day: Date, value: Double) {
        self.day = day
        self.value = value
    }
}

extension Double {
    /// Zahl im deutschen Format, z.B. "1,5" oder "90".
    var short: String {
        formatted(.number.precision(.fractionLength(0...1)))
    }
}
