# Daruma

Eine iPhone-App für tägliche Habits, To-Dos und einen Pool aus Langzeit-Aufgaben.
Benannt nach der japanischen Daruma-Puppe: Ein Auge wird ausgemalt, wenn man sich ein Ziel setzt, das zweite, wenn man es erreicht hat.

## Stand (Version 0.1)

- **Heute:** deine Habits für den Tag
  - *Abhaken*, z.B. Meditieren
  - *Zählen*, z.B. 3 L Wasser in 0,5-L-Schritten
  - *Limit*, z.B. Bildschirmzeit unter 90 Minuten (abends eintragen)
- **Daruma** malt das zweite Auge aus, wenn alle Habits des Tages erledigt sind.
- **Habit-Katalog** mit Vorschlägen plus eigene Habits, mit Wochentagen und Symbol.
- Wischen nach links auf einem Habit: bearbeiten oder löschen.
- Jeder Eintrag wird mit Datum gespeichert, damit spätere Auswertungen auch rückwirkend funktionieren.
- *Pool* und *Fortschritt* sind als Tabs angelegt und kommen als Nächstes.

Alle Daten bleiben auf dem iPhone. Kein Konto, kein Server.

## App auf das iPhone bringen

Du brauchst: Mac mit Xcode (aus dem App Store), dein iPhone und ein USB-Kabel.

1. **Projekt holen:** Xcode öffnen → *Clone Git Repository…* (oder Menü *Integrate → Clone…*) → `https://github.com/bigfatkid/daruma_app` eingeben → Ordner wählen → *Clone*.
2. **Projekt öffnen:** Falls es nicht automatisch aufgeht, `Daruma.xcodeproj` doppelklicken.
3. **Signieren:** Links ganz oben auf das blaue Symbol *Daruma* klicken → Reiter *Signing & Capabilities* → bei *Team* deine Apple-ID auswählen (falls keine da ist: *Add an Account…*).
   - Meldet Xcode, dass die *Bundle Identifier* schon vergeben ist, hänge einfach etwas an, z.B. `com.bigfatkid.daruma.matti`.
4. **iPhone verbinden:** iPhone per Kabel an den Mac, entsperren und *Vertrauen* tippen.
5. **Entwicklermodus einschalten** (nur beim ersten Mal): iPhone → *Einstellungen → Datenschutz & Sicherheit → Entwicklermodus* → an → iPhone startet neu.
6. **Starten:** Oben in Xcode dein iPhone als Ziel auswählen und auf ▶︎ klicken.
7. **Entwickler vertrauen** (nur beim ersten Mal): iPhone → *Einstellungen → Allgemein → VPN & Geräteverwaltung* → deine Apple-ID → *Vertrauen*. Dann nochmal ▶︎.

Mit einer kostenlosen Apple-ID läuft die App 7 Tage, danach einfach wieder in Xcode auf ▶︎ drücken. Mit dem Apple-Developer-Account (ca. 99 € im Jahr) entfällt das.

### Neue Version holen

In Xcode: Menü *Integrate → Pull…* → *Pull*. Danach ▶︎ drücken. Deine Daten auf dem iPhone bleiben erhalten.

## Technik

SwiftUI und SwiftData, ab iOS 17, Xcode 16 oder neuer.
Bei jeder Änderung prüft GitHub automatisch, ob sich die App bauen lässt (Reiter *Actions*).
