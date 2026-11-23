import SwiftUI
import SwiftData

/// Eine Zeile auf dem Heute-Bildschirm. Je nach Art: abhaken, hochzählen oder Wert eintragen.
struct HabitRow: View {
    @Environment(\.modelContext) private var context
    let habit: Habit
    let day: Date

    @State private var showingEntry = false
    @State private var entryText = ""

    private var done: Bool { habit.isDone(on: day) }
    private var value: Double { habit.value(on: day) }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: habit.icon)
                .font(.title3)
                .foregroundStyle(done ? Color.accentColor : Color.secondary)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(habit.name)
                if let detail {
                    Text(detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            control
        }
        .padding(.vertical, 4)
        .sensoryFeedback(.success, trigger: done) { _, newValue in newValue }
        .alert(habit.name, isPresented: $showingEntry) {
            TextField("Wert in \(habit.unit)", text: $entryText)
                .keyboardType(.decimalPad)
            Button("Speichern") { saveEntry() }
            if habit.log(on: day) != nil {
                Button("Eintrag löschen", role: .destructive) {
                    habit.clearValue(on: day, in: context)
                }
            }
            Button("Abbrechen", role: .cancel) {}
        } message: {
            Text("Wie viel war es heute? Ziel: höchstens \(habit.target.short) \(habit.unit).")
        }
    }

    private var detail: String? {
        switch habit.kind {
        case .check:
            return nil
        case .count:
            return "\(value.short) von \(habit.target.short) \(habit.unit)"
        case .limit:
            if let log = habit.log(on: day) {
                return "\(log.value.short) \(habit.unit) · Limit \(habit.target.short) \(habit.unit)"
            }
            return "Abends eintragen · Limit \(habit.target.short) \(habit.unit)"
        }
    }

    @ViewBuilder
    private var control: some View {
        switch habit.kind {
        case .check:
            Button {
                habit.setValue(done ? 0 : 1, on: day, in: context)
            } label: {
                Image(systemName: done ? "checkmark.circle.fill" : "circle")
                    .font(.title)
                    .foregroundStyle(done ? Color.accentColor : Color.secondary)
            }
            .buttonStyle(.borderless)
            .accessibilityLabel(done ? "Erledigt, antippen zum Zurücksetzen" : "Abhaken")

        case .count:
            HStack(spacing: 12) {
                if value > 0 {
                    Button {
                        habit.setValue(max(0, value - habit.step), on: day, in: context)
                    } label: {
                        Image(systemName: "minus.circle")
                            .font(.title2)
                            .foregroundStyle(Color.secondary)
                    }
                    .buttonStyle(.borderless)
                    .accessibilityLabel("Weniger")
                }
                Button {
                    habit.setValue(value + habit.step, on: day, in: context)
                } label: {
                    ZStack {
                        Circle()
                            .stroke(Color.secondary.opacity(0.25), lineWidth: 4)
                        Circle()
                            .trim(from: 0, to: min(1, value / max(habit.target, 0.0001)))
                            .stroke(Color.accentColor, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                        Image(systemName: done ? "checkmark" : "plus")
                            .font(.caption.bold())
                            .foregroundStyle(done ? Color.accentColor : Color.primary)
                    }
                    .frame(width: 32, height: 32)
                    .animation(.easeOut, value: value)
                }
                .buttonStyle(.borderless)
                .accessibilityLabel("Plus \(habit.step.short) \(habit.unit)")
            }

        case .limit:
            Button {
                entryText = habit.log(on: day).map { $0.value.short } ?? ""
                showingEntry = true
            } label: {
                if habit.log(on: day) != nil {
                    Image(systemName: done ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .font(.title)
                        .foregroundStyle(done ? Color.accentColor : Color.orange)
                } else {
                    Text("Eintragen")
                        .font(.subheadline.bold())
                }
            }
            .buttonStyle(.borderless)
        }
    }

    private func saveEntry() {
        let normalized = entryText
            .replacingOccurrences(of: ",", with: ".")
            .trimmingCharacters(in: .whitespaces)
        guard let number = Double(normalized), number >= 0 else { return }
        habit.setValue(number, on: day, in: context)
    }
}
