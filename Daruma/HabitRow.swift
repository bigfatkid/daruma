import SwiftUI
import SwiftData

/// Eine Zeile auf dem Heute-Bildschirm. Rechts steht immer der Status-Kreis,
/// davor bei Bedarf die Bedienung (Plus/Minus oder Wert eintragen).
struct HabitRow: View {
    @Environment(\.modelContext) private var context
    let habit: Habit
    let day: Date

    @State private var showingEntry = false
    @State private var entryText = ""

    private var done: Bool { habit.isDone(on: day) }
    private var value: Double { habit.value(on: day) }
    private var hasEntry: Bool { habit.log(on: day) != nil }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: habit.icon)
                .font(.title3)
                .foregroundStyle(done ? Color.accentColor : Color.secondary)
                .frame(width: 32)

            Text(habit.name)
                .lineLimit(2)
                .layoutPriority(0)

            Spacer(minLength: 8)

            controls
                .layoutPriority(1)
        }
        .padding(.vertical, 6)
        .sensoryFeedback(.success, trigger: done) { _, newValue in newValue }
        .alert(habit.name, isPresented: $showingEntry) {
            TextField("Wert in \(habit.unit)", text: $entryText)
                .keyboardType(.decimalPad)
            Button("Speichern") { saveEntry() }
            if hasEntry {
                Button("Eintrag löschen", role: .destructive) {
                    habit.clearValue(on: day, in: context)
                }
            }
            Button("Abbrechen", role: .cancel) {}
        } message: {
            Text("Wie viel war es heute? Limit: \(habit.target.short) \(habit.unit).")
        }
    }

    @ViewBuilder
    private var controls: some View {
        switch habit.kind {
        case .check:
            Button {
                habit.setValue(done ? 0 : 1, on: day, in: context)
            } label: {
                StatusCircle(progress: done ? 1 : 0, state: done ? .done : .open)
            }
            .buttonStyle(.borderless)
            .accessibilityLabel(done ? "Erledigt, antippen zum Zurücksetzen" : "Abhaken")

        case .count:
            HStack(spacing: 8) {
                Text("\(value.short)/\(habit.target.short) \(habit.unit)")
                    .font(.subheadline)
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
                    .fixedSize()

                StepButton(systemImage: "minus") {
                    habit.setValue(max(0, value - habit.step), on: day, in: context)
                }
                .disabled(value <= 0)
                .accessibilityLabel("Minus \(habit.step.short) \(habit.unit)")

                StepButton(systemImage: "plus") {
                    habit.setValue(value + habit.step, on: day, in: context)
                }
                .accessibilityLabel("Plus \(habit.step.short) \(habit.unit)")

                StatusCircle(
                    progress: min(1, value / max(habit.target, 0.0001)),
                    state: done ? .done : .open
                )
                .padding(.leading, 4)
                .accessibilityHidden(true)
            }

        case .limit:
            Button {
                entryText = habit.log(on: day).map { $0.value.short } ?? ""
                showingEntry = true
            } label: {
                HStack(spacing: 10) {
                    if let log = habit.log(on: day) {
                        Text("\(log.value.short) \(habit.unit)")
                            .font(.subheadline)
                            .monospacedDigit()
                            .foregroundStyle(.secondary)
                        StatusCircle(progress: 1, state: done ? .done : .missed)
                    } else {
                        Text("Eintragen")
                            .font(.subheadline.bold())
                        StatusCircle(progress: 0, state: .open)
                    }
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

/// Runder Status rechts in jeder Zeile: offen (mit Fortschrittsring), erledigt oder verfehlt.
struct StatusCircle: View {
    enum Status { case open, done, missed }

    var progress: Double
    var state: Status

    var body: some View {
        ZStack {
            switch state {
            case .done:
                Image(systemName: "checkmark.circle.fill")
                    .resizable()
                    .foregroundStyle(Color.accentColor)
                    .transition(.scale.combined(with: .opacity))
            case .missed:
                Image(systemName: "xmark.circle.fill")
                    .resizable()
                    .foregroundStyle(Color.orange)
            case .open:
                Circle()
                    .stroke(Color.secondary.opacity(0.35), lineWidth: 2)
                    .padding(1.5)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(Color.accentColor, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .padding(1.5)
            }
        }
        .frame(width: 28, height: 28)
        .animation(.spring(duration: 0.35), value: progress)
        .animation(.spring(duration: 0.35), value: state)
    }
}

/// Kleiner runder Knopf für Plus und Minus.
struct StepButton: View {
    let systemImage: String
    let action: () -> Void

    @Environment(\.isEnabled) private var isEnabled

    var body: some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.footnote.bold())
                .frame(width: 30, height: 30)
                .background(Color.secondary.opacity(0.12), in: Circle())
                .foregroundStyle(isEnabled ? Color.primary : Color.secondary.opacity(0.4))
        }
        .buttonStyle(.borderless)
    }
}
