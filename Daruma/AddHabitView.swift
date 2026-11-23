import SwiftUI
import SwiftData

/// Katalog zum Auswählen plus "Eigenes Habit erstellen".
struct AddHabitView: View {
    @Environment(\.dismiss) private var dismiss
    @Query private var existing: [Habit]
    let nextSortOrder: Int

    var body: some View {
        NavigationStack {
            List {
                Section {
                    NavigationLink {
                        HabitEditorView(template: nil, sortOrder: nextSortOrder) { dismiss() }
                    } label: {
                        Label("Eigenes Habit erstellen", systemImage: "plus.circle.fill")
                    }
                }

                ForEach(HabitCatalog.categories) { category in
                    Section(category.name) {
                        ForEach(category.templates) { template in
                            NavigationLink {
                                HabitEditorView(template: template, sortOrder: nextSortOrder) { dismiss() }
                            } label: {
                                HStack {
                                    Label(template.name, systemImage: template.icon)
                                    Spacer()
                                    if alreadyAdded(template) {
                                        Text("Schon dabei")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Habit hinzufügen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Abbrechen") { dismiss() }
                }
            }
        }
    }

    private func alreadyAdded(_ template: HabitTemplate) -> Bool {
        existing.contains { $0.name == template.name && !$0.isArchived }
    }
}

/// Formular zum Anlegen oder Bearbeiten eines Habits.
struct HabitEditorView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context

    private let habit: Habit?
    private let sortOrder: Int
    private let onSave: (() -> Void)?

    @State private var name: String
    @State private var icon: String
    @State private var kind: HabitKind
    @State private var target: Double
    @State private var step: Double
    @State private var unit: String
    @State private var weekdays: Set<Int>

    /// Bestehendes Habit bearbeiten.
    init(habit: Habit) {
        self.habit = habit
        self.sortOrder = habit.sortOrder
        self.onSave = nil
        _name = State(initialValue: habit.name)
        _icon = State(initialValue: habit.icon)
        _kind = State(initialValue: habit.kind)
        _target = State(initialValue: habit.target)
        _step = State(initialValue: habit.step)
        _unit = State(initialValue: habit.unit)
        _weekdays = State(initialValue: Set(habit.weekdays))
    }

    /// Neues Habit, optional aus einer Katalog-Vorlage.
    init(template: HabitTemplate?, sortOrder: Int, onSave: (() -> Void)? = nil) {
        self.habit = nil
        self.sortOrder = sortOrder
        self.onSave = onSave
        _name = State(initialValue: template?.name ?? "")
        _icon = State(initialValue: template?.icon ?? "checkmark.circle")
        _kind = State(initialValue: template?.kind ?? .check)
        _target = State(initialValue: template?.target ?? 1)
        _step = State(initialValue: template?.step ?? 1)
        _unit = State(initialValue: template?.unit ?? "")
        _weekdays = State(initialValue: Set(1...7))
    }

    private var kindExplanation: String {
        switch kind {
        case .check: return "Einmal antippen, dann ist es für heute erledigt."
        case .count: return "Du zählst hoch, bis das Ziel erreicht ist, z.B. 3 L Wasser in 0,5-L-Schritten."
        case .limit: return "Du trägst abends einen Wert ein. Erledigt, wenn er unter dem Limit bleibt, z.B. Bildschirmzeit."
        }
    }

    private var iconChoices: [String] {
        HabitCatalog.icons.contains(icon) ? HabitCatalog.icons : [icon] + HabitCatalog.icons
    }

    private var isValid: Bool {
        let hasName = !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let hasTarget = kind == .check || target > 0
        let hasStep = kind != .count || step > 0
        return hasName && hasTarget && hasStep && !weekdays.isEmpty
    }

    var body: some View {
        Form {
            Section("Name") {
                TextField("z.B. Meditieren", text: $name)
            }

            Section("Art") {
                Picker("Art", selection: $kind) {
                    ForEach(HabitKind.allCases) { kind in
                        Text(kind.title).tag(kind)
                    }
                }
                .pickerStyle(.segmented)
                Text(kindExplanation)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            if kind != .check {
                Section(kind == .count ? "Ziel" : "Limit") {
                    HStack {
                        Text(kind == .count ? "Ziel pro Tag" : "Höchstens")
                        Spacer()
                        TextField("Wert", value: $target, format: .number)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 90)
                    }
                    if kind == .count {
                        HStack {
                            Text("Pro Tipp")
                            Spacer()
                            TextField("Schritt", value: $step, format: .number)
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.trailing)
                                .frame(width: 90)
                        }
                    }
                    HStack {
                        Text("Einheit")
                        Spacer()
                        TextField("z.B. L oder min", text: $unit)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 140)
                    }
                }
            }

            Section("An welchen Tagen?") {
                WeekdayPicker(selection: $weekdays)
            }

            Section("Symbol") {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 5), spacing: 10) {
                    ForEach(iconChoices, id: \.self) { symbol in
                        Button {
                            icon = symbol
                        } label: {
                            Image(systemName: symbol)
                                .font(.title3)
                                .frame(width: 44, height: 44)
                                .background(
                                    icon == symbol ? Color.accentColor.opacity(0.2) : Color.clear,
                                    in: RoundedRectangle(cornerRadius: 10)
                                )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .navigationTitle(habit == nil ? "Neues Habit" : "Habit bearbeiten")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                if habit != nil {
                    Button("Abbrechen") { dismiss() }
                }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button(habit == nil ? "Hinzufügen" : "Sichern") { save() }
                    .disabled(!isValid)
            }
        }
    }

    private func save() {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let days = weekdays.sorted()
        let finalTarget = kind == .check ? 1 : target
        let finalStep = kind == .count ? step : 1

        if let habit {
            habit.name = trimmedName
            habit.icon = icon
            habit.kind = kind
            habit.target = finalTarget
            habit.step = finalStep
            habit.unit = unit
            habit.weekdays = days
            dismiss()
        } else {
            let newHabit = Habit(
                name: trimmedName,
                icon: icon,
                kind: kind,
                target: finalTarget,
                step: finalStep,
                unit: unit,
                weekdays: days,
                sortOrder: sortOrder
            )
            context.insert(newHabit)
            if let onSave {
                onSave()
            } else {
                dismiss()
            }
        }
    }
}

/// Wochentage Mo bis So zum An- und Abwählen.
struct WeekdayPicker: View {
    @Binding var selection: Set<Int>

    /// Kalender-Zählung: 1 = Sonntag, 2 = Montag, ... 7 = Samstag
    private struct Day: Identifiable {
        let number: Int
        let label: String
        var id: Int { number }
    }

    private let days: [Day] = [
        Day(number: 2, label: "Mo"), Day(number: 3, label: "Di"), Day(number: 4, label: "Mi"),
        Day(number: 5, label: "Do"), Day(number: 6, label: "Fr"), Day(number: 7, label: "Sa"),
        Day(number: 1, label: "So"),
    ]

    var body: some View {
        HStack(spacing: 6) {
            ForEach(days) { day in
                let isOn = selection.contains(day.number)
                Button {
                    if isOn {
                        selection.remove(day.number)
                    } else {
                        selection.insert(day.number)
                    }
                } label: {
                    Text(day.label)
                        .font(.subheadline.bold())
                        .frame(maxWidth: .infinity, minHeight: 36)
                        .background(isOn ? Color.accentColor : Color.secondary.opacity(0.15), in: Capsule())
                        .foregroundStyle(isOn ? Color.white : Color.primary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, 4)
    }
}
