import SwiftUI

/// Die Daruma-Figur. Das linke Auge ist gemalt, sobald du ein Ziel hast,
/// das rechte, wenn alles erledigt ist. Antippen lässt sie wackeln.
struct DarumaFigure: View {
    var secondEyePainted: Bool

    @State private var taps = 0

    private let redTop = Color(red: 0.93, green: 0.27, blue: 0.22)
    private let redBottom = Color(red: 0.70, green: 0.10, blue: 0.10)
    private let gold = Color(red: 0.95, green: 0.74, blue: 0.25)
    private let ink = Color(red: 0.10, green: 0.09, blue: 0.09)

    var body: some View {
        ZStack {
            // Schatten
            Ellipse()
                .fill(Color.black.opacity(0.15))
                .frame(width: 70, height: 10)
                .offset(y: 56)

            figure
                .keyframeAnimator(initialValue: 0.0, trigger: wobbleTrigger) { content, angle in
                    content.rotationEffect(.degrees(angle), anchor: .bottom)
                } keyframes: { _ in
                    KeyframeTrack {
                        SpringKeyframe(-14, duration: 0.14)
                        SpringKeyframe(11, duration: 0.18)
                        SpringKeyframe(-7, duration: 0.18)
                        SpringKeyframe(4, duration: 0.18)
                        SpringKeyframe(0, duration: 0.25)
                    }
                }
        }
        .frame(width: 100, height: 120)
        .contentShape(Rectangle())
        .onTapGesture { taps += 1 }
        .sensoryFeedback(.impact(weight: .light), trigger: taps)
        .accessibilityElement()
        .accessibilityLabel(secondEyePainted ? "Daruma mit beiden Augen" : "Daruma mit einem Auge")
    }

    /// Wackelt beim Antippen und wenn das zweite Auge gemalt wird.
    private var wobbleTrigger: Int { taps * 2 + (secondEyePainted ? 1 : 0) }

    private var figure: some View {
        ZStack {
            // Körper
            DarumaBody()
                .fill(LinearGradient(colors: [redTop, redBottom], startPoint: .top, endPoint: .bottom))
                .frame(width: 100, height: 110)

            // Glanzlicht
            Ellipse()
                .fill(Color.white.opacity(0.28))
                .frame(width: 14, height: 26)
                .rotationEffect(.degrees(-25))
                .offset(x: -33, y: -18)

            // Goldene Verzierungen an den Seiten
            Circle()
                .trim(from: 0.30, to: 0.55)
                .stroke(gold, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .frame(width: 34, height: 34)
                .offset(x: -26, y: 22)
            Circle()
                .trim(from: 0.95, to: 1.20)
                .stroke(gold, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .frame(width: 34, height: 34)
                .offset(x: 26, y: 22)

            // Gesicht mit Goldrand
            Ellipse()
                .fill(Color(red: 1.0, green: 0.98, blue: 0.94))
                .overlay(Ellipse().stroke(gold, lineWidth: 3))
                .frame(width: 64, height: 54)
                .offset(y: -12)

            // Augenbrauen (Kraniche)
            Eyebrow()
                .stroke(ink, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .frame(width: 18, height: 8)
                .offset(x: -14, y: -31)
            Eyebrow()
                .stroke(ink, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .frame(width: 18, height: 8)
                .scaleEffect(x: -1)
                .offset(x: 14, y: -31)

            // Augen
            DarumaEye(painted: true)
                .offset(x: -13, y: -16)
            DarumaEye(painted: secondEyePainted)
                .offset(x: 13, y: -16)

            // Bart (Schildkröte)
            Whiskers()
                .stroke(ink, style: StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))
                .frame(width: 30, height: 10)
                .offset(y: 1)

            // Rote Wangen
            Circle()
                .fill(Color.pink.opacity(0.35))
                .frame(width: 8, height: 8)
                .offset(x: -24, y: -4)
            Circle()
                .fill(Color.pink.opacity(0.35))
                .frame(width: 8, height: 8)
                .offset(x: 24, y: -4)

            // Goldener Bauch
            Capsule()
                .fill(gold)
                .frame(width: 30, height: 12)
                .overlay(
                    Capsule()
                        .stroke(Color(red: 0.75, green: 0.52, blue: 0.10), lineWidth: 1.5)
                )
                .offset(y: 32)
        }
        .frame(width: 100, height: 110)
        .offset(y: -4)
    }
}

struct DarumaEye: View {
    var painted: Bool

    var body: some View {
        ZStack {
            Circle().fill(Color.white)
            Circle().stroke(Color.black, lineWidth: 2)
            if painted {
                ZStack {
                    Circle().fill(Color.black)
                    Circle()
                        .fill(Color.white)
                        .frame(width: 3.5, height: 3.5)
                        .offset(x: 2, y: -2)
                }
                .padding(4)
                .transition(.scale(scale: 0.1).combined(with: .opacity))
            }
        }
        .frame(width: 19, height: 19)
        .animation(.spring(duration: 0.5, bounce: 0.5), value: painted)
    }
}

/// Eiförmiger Körper, unten etwas breiter.
struct DarumaBody: Shape {
    func path(in r: CGRect) -> Path {
        let w = r.width
        let h = r.height
        var p = Path()
        p.move(to: CGPoint(x: r.midX, y: r.minY))
        p.addCurve(
            to: CGPoint(x: r.maxX, y: r.minY + h * 0.58),
            control1: CGPoint(x: r.minX + w * 0.84, y: r.minY),
            control2: CGPoint(x: r.maxX, y: r.minY + h * 0.26)
        )
        p.addCurve(
            to: CGPoint(x: r.midX, y: r.maxY),
            control1: CGPoint(x: r.maxX, y: r.minY + h * 0.92),
            control2: CGPoint(x: r.minX + w * 0.80, y: r.maxY)
        )
        p.addCurve(
            to: CGPoint(x: r.minX, y: r.minY + h * 0.58),
            control1: CGPoint(x: r.minX + w * 0.20, y: r.maxY),
            control2: CGPoint(x: r.minX, y: r.minY + h * 0.92)
        )
        p.addCurve(
            to: CGPoint(x: r.midX, y: r.minY),
            control1: CGPoint(x: r.minX, y: r.minY + h * 0.26),
            control2: CGPoint(x: r.minX + w * 0.16, y: r.minY)
        )
        p.closeSubpath()
        return p
    }
}

/// Geschwungene Augenbraue, außen höher als innen.
struct Eyebrow: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: r.minX, y: r.minY + r.height * 0.3))
        p.addQuadCurve(
            to: CGPoint(x: r.maxX, y: r.maxY),
            control: CGPoint(x: r.midX, y: r.minY - r.height * 0.4)
        )
        return p
    }
}

/// Bart als zwei kleine Wellen.
struct Whiskers: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: r.minX, y: r.minY + r.height * 0.2))
        p.addQuadCurve(
            to: CGPoint(x: r.midX, y: r.minY + r.height * 0.45),
            control: CGPoint(x: r.minX + r.width * 0.25, y: r.maxY)
        )
        p.addQuadCurve(
            to: CGPoint(x: r.maxX, y: r.minY + r.height * 0.2),
            control: CGPoint(x: r.maxX - r.width * 0.25, y: r.maxY)
        )
        return p
    }
}

#Preview {
    HStack(spacing: 30) {
        DarumaFigure(secondEyePainted: false)
        DarumaFigure(secondEyePainted: true)
    }
}
