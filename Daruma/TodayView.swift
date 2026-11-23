import SwiftUI
import SwiftData

struct TodayView: View {
    @Environment(\.modelContext) private var context
    @Query(filter: #Predicate<Habit> { $0.isArchived == false }, sort: \Habit.sortOrder)
    private var habits: [Habit]

    @State private var showingAdd = false
    @State private var editingHabit: Habit?

    private var today: Date { Calendar.current.startOfDay(for: .now) }
    private var todaysHabits: [Habit] { habits.filter { $0.isScheduled(on: today) } }
    private var doneCount: Int { todaysHabits.filter { $0.isDone(on: today) }.count }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    DarumaHeader(done: doneCount, total: todaysHabits.count)
                }

                Section("Habits") {
                    if todaysHabits.isEmpty {
                        Text("Heute stehen keine Habits an. Tippe oben auf +, um eins anzulegen.")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(todaysHabits) { habit in
                        HabitRow(habit: habit, day: today)
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
            .navigationTitle("Heute")
            .toolbar {
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
    let done: Int
    let total: Int

    private var allDone: Bool { total > 0 && done == total }

    var body: some View {
        HStack(spacing: 16) {
            DarumaFigure(secondEyePainted: allDone)
            VStack(alignment: .leading, spacing: 6) {
                Text(Date.now.formatted(.dateTime.weekday(.wide).day().month(.wide)))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text("\(done) von \(total) erledigt")
                    .font(.title3.bold())
                ProgressView(value: Double(done), total: Double(max(total, 1)))
                Text(allDone ? "Daruma hat beide Augen. Stark!" : "Schaffst du alle, malt Daruma das zweite Auge aus.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 8)
        .sensoryFeedback(.success, trigger: allDone) { _, newValue in newValue }
    }
}

/// Die Daruma-Figur: Das linke Auge ist gemalt, sobald du ein Ziel hast. Das rechte, wenn alles erledigt ist.
struct DarumaFigure: View {
    var secondEyePainted: Bool

    private let red = Color(red: 0.82, green: 0.20, blue: 0.18)
    private let gold = Color(red: 0.91, green: 0.71, blue: 0.24)

    var body: some View {
        ZStack {
            Ellipse()
                .fill(red)
                .frame(width: 90, height: 100)
            Ellipse()
                .fill(Color(white: 0.98))
                .frame(width: 56, height: 46)
                .offset(y: -18)
            HStack(spacing: 8) {
                brow
                brow
            }
            .offset(y: -34)
            HStack(spacing: 7) {
                DarumaEye(painted: true)
                DarumaEye(painted: secondEyePainted)
            }
            .offset(y: -21)
            Capsule()
                .fill(gold)
                .frame(width: 32, height: 11)
                .offset(y: 28)
        }
        .frame(width: 90, height: 100)
        .animation(.spring(duration: 0.5, bounce: 0.4), value: secondEyePainted)
        .accessibilityElement()
        .accessibilityLabel(secondEyePainted ? "Daruma mit beiden Augen" : "Daruma mit einem Auge")
    }

    private var brow: some View {
        Capsule()
            .fill(Color.black)
            .frame(width: 14, height: 3)
    }
}

struct DarumaEye: View {
    var painted: Bool

    var body: some View {
        ZStack {
            Circle().fill(Color.white)
            Circle().stroke(Color.black, lineWidth: 1.5)
            if painted {
                Circle()
                    .fill(Color.black)
                    .padding(4)
                    .transition(.scale)
            }
        }
        .frame(width: 16, height: 16)
    }
}

#Preview {
    RootView()
        .modelContainer(for: [Habit.self, HabitLog.self], inMemory: true)
}
