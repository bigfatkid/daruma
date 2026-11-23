import SwiftUI
import SwiftData

struct TodayView: View {
    @Environment(\.modelContext) private var context
    @Query(filter: #Predicate<Habit> { $0.isArchived == false }, sort: \Habit.sortOrder)
    private var habits: [Habit]

    @State private var showingAdd = false
    @State private var editingHabit: Habit?
    @State private var selectedDay = Calendar.current.startOfDay(for: .now)

    private var today: Date { Calendar.current.startOfDay(for: .now) }
    private var isToday: Bool { Calendar.current.isDate(selectedDay, inSameDayAs: today) }
    private var isFuture: Bool { selectedDay > today }
    private var dayHabits: [Habit] { habits.filter { $0.isActive(on: selectedDay) } }
    private var doneCount: Int { dayHabits.filter { $0.isDone(on: selectedDay) }.count }

    private var title: String {
        if isToday { return "Heute" }
        let calendar = Calendar.current
        if let yesterday = calendar.date(byAdding: .day, value: -1, to: today),
           calendar.isDate(selectedDay, inSameDayAs: yesterday) {
            return "Gestern"
        }
        return selectedDay.formatted(.dateTime.weekday(.wide))
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    WeekStrip(selectedDay: $selectedDay, habits: habits)
                }
                .listRowInsets(EdgeInsets(top: 8, leading: 8, bottom: 8, trailing: 8))

                Section {
                    DarumaHeader(day: selectedDay, done: doneCount, total: dayHabits.count, isFuture: isFuture)
                }

                Section("Habits") {
                    if dayHabits.isEmpty {
                        Text("An diesem Tag stehen keine Habits an. Tippe oben auf +, um eins anzulegen.")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(dayHabits) { habit in
                        HabitRow(habit: habit, day: selectedDay)
                            .disabled(isFuture)
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    context.delete(habit)
                                } label: {
                                    Label("Löschen", systemImage: "trash")
                                }
                                Button {
                                    editingHabit = habit
                                } label: {
                                    Label("Bearbeiten", systemImage: "pencil")
                                }
                                .tint(.orange)
                            }
                    }
                }
            }
            .navigationTitle(title)
            .animation(.snappy, value: selectedDay)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if !isToday {
                        Button("Zu heute") {
                            selectedDay = today
                        }
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingAdd = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Habit hinzufügen")
                }
            }
            .sheet(isPresented: $showingAdd) {
                AddHabitView(nextSortOrder: (habits.map(\.sortOrder).max() ?? -1) + 1)
            }
            .sheet(item: $editingHabit) { habit in
                NavigationStack {
                    HabitEditorView(habit: habit)
                }
            }
            .task {
                #if DEBUG
                switch DemoMode.scene {
                case "catalog":
                    showingAdd = true
                case "editor":
                    editingHabit = habits.first { $0.kind == .count }
                case "yesterday":
                    selectedDay = Calendar.current.date(byAdding: .day, value: -1, to: today) ?? today
                default:
                    break
                }
                #endif
            }
        }
    }
}

/// Kopfbereich mit Daruma und Tagesfortschritt.
struct DarumaHeader: View {
    let day: Date
    let done: Int
    let total: Int
    let isFuture: Bool

    private var allDone: Bool { total > 0 && done == total }

    private var message: String {
        if isFuture { return "Dieser Tag kommt noch. Abhaken kannst du, wenn er da ist." }
        if allDone { return "Daruma hat beide Augen. Stark!" }
        return "Schaffst du alle, malt Daruma das zweite Auge aus."
    }

    var body: some View {
        HStack(spacing: 14) {
            DarumaFigure(secondEyePainted: allDone)
            VStack(alignment: .leading, spacing: 6) {
                Text(day.formatted(.dateTime.weekday(.wide).day().month(.wide)))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text("\(done) von \(total) erledigt")
                    .font(.title3.bold())
                ProgressView(value: Double(done), total: Double(max(total, 1)))
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
        .sensoryFeedback(.success, trigger: allDone) { _, newValue in newValue }
    }
}

/// Wochenleiste Mo bis So. Ring = Anteil erledigter Habits, antippen wechselt den Tag.
struct WeekStrip: View {
    @Binding var selectedDay: Date
    let habits: [Habit]

    private let calendar = Calendar.current

    private var days: [Date] {
        guard let start = calendar.dateInterval(of: .weekOfYear, for: selectedDay)?.start else { return [] }
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: start) }
    }

    var body: some View {
        HStack(spacing: 2) {
            shiftButton(systemImage: "chevron.left", weeks: -1)
            ForEach(days, id: \.self) { day in
                dayCell(day)
            }
            shiftButton(systemImage: "chevron.right", weeks: 1)
        }
    }

    private func shiftButton(systemImage: String, weeks: Int) -> some View {
        Button {
            if let newDay = calendar.date(byAdding: .weekOfYear, value: weeks, to: selectedDay) {
                selectedDay = calendar.startOfDay(for: newDay)
            }
        } label: {
            Image(systemName: systemImage)
                .font(.footnote.bold())
                .foregroundStyle(.secondary)
                .frame(width: 22, height: 60)
        }
        .buttonStyle(.borderless)
        .accessibilityLabel(weeks < 0 ? "Vorherige Woche" : "Nächste Woche")
    }

    private func dayCell(_ day: Date) -> some View {
        let isSelected = calendar.isDate(day, inSameDayAs: selectedDay)
        let isToday = calendar.isDateInToday(day)
        let isFuture = day > calendar.startOfDay(for: .now)
        let active = habits.filter { $0.isActive(on: day) }
        let done = active.filter { $0.isDone(on: day) }.count
        let progress = active.isEmpty ? 0 : Double(done) / Double(active.count)

        return Button {
            selectedDay = day
        } label: {
            VStack(spacing: 5) {
                Text(day.formatted(.dateTime.weekday(.narrow)))
                    .font(.caption2.bold())
                    .foregroundStyle(isSelected ? Color.white.opacity(0.85) : Color.secondary)
                Text(day.formatted(.dateTime.day()))
                    .font(.subheadline.bold())
                    .foregroundStyle(isSelected ? Color.white : (isToday ? Color.accentColor : Color.primary))
                ZStack {
                    Circle()
                        .stroke((isSelected ? Color.white : Color.secondary).opacity(0.3), lineWidth: 2.5)
                    if !isFuture {
                        Circle()
                            .trim(from: 0, to: progress)
                            .stroke(isSelected ? Color.white : Color.accentColor,
                                    style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                    }
                    if !isFuture && progress >= 1 {
                        Image(systemName: "checkmark")
                            .font(.system(size: 7, weight: .heavy))
                            .foregroundStyle(isSelected ? Color.white : Color.accentColor)
                    }
                }
                .frame(width: 16, height: 16)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 7)
            .background(isSelected ? Color.accentColor : Color.clear, in: RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.borderless)
        .accessibilityLabel(day.formatted(.dateTime.weekday(.wide).day().month()))
    }
}

#Preview {
    RootView()
        .modelContainer(for: [Habit.self, HabitLog.self], inMemory: true)
}
