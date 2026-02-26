# Redly

![Redly Hero](docs/assets/hero.png)

### Your private, offline-first Markdown knowledge base.

Redly is a minimalist, powerful, and aesthetically pleasing note-taking application designed for people who value privacy, speed, and standard formats. It turns your local folders or browser storage into a sleek, searchable knowledge base.

## 🚀 Key Features

- **Local-First Architecture**: Your data never leaves your machine unless you explicitly export it.
- **Markdown Native**: Write using standard Markdown with a beautiful, rich-text live preview.
- **Integrated Global Search**: A sleek, header-embedded search bar that finds notes by filename or content instantly as you type.
- **Interactive Tasks**: Turn any note into a productivity hub with `@date` badges, interactive timelines, and a **Global Tasks Dashboard**.
- **Keyboard-First Navigation**: Optimized for power users with comprehensive hotkeys for every major action.
- **PWA Support**: Install Redly as a desktop app for a native experience.
- **Dark Mode**: Beautifully curated themes for both night owls and day dreamers.
- **Backup & Restore**: Easily export and import your browser storage as JSON.

## 📦 Getting Started

### 1. Choose Your Storage
- **Local Storage**: Map Redly to a folder on your computer. Your notes are stored as plain `.md` files that you can open with any other editor.
- **Browser Storage**: Store your notes in a secure, hidden browser sandbox. Zero-config and incredibly fast.

### 2. Create Your First Note
Click the **New Note** button or press `Alt + N`. Start typing! Use `#` for headers, `- [ ]` for tasks, and `---` for horizontal rules.

### 3. Add Deadlines
Type `@today`, `@friday 2pm`, or `@next monday` next to any task. Redly will automatically parse the date and color-code the badge.

## ⌨️ Power User Hotkeys

| Action | Shortcut |
|---|---|
| **Global Search** | `Alt + K` |
| New Note | `Alt + N` |
| New Folder | `Alt + F` |
| Go Home | `Alt + H` |
| Focus Sidebar | `Alt + S` |
| **Focus Editor** | `Alt + E` |
| **Enter Note** | `→` (Right Arrow) |
| Global Tasks | `Alt + T` |
| Change Workspace | `Alt + W` |
| Help & Guide | `Alt + /` |
| Rename Selection | `F2` |
| Delete Selection | `Delete` |

## 🛡️ Privacy & Security

Redly is built on a "No Data Collection" philosophy. 
- **Offline First**: No cloud syncing, no logins, no tracking.
- **Standard Formats**: Your notes are yours. Even if you stop using Redly, your files are standard Markdown or JSON.
- **Transparent**: No hidden background processes or external telemetry.

For more details, see our full [Privacy Policy](PRIVACY.md).

## 📲 Installation (PWA)

Redly is a Progressive Web App (PWA). You don't need to install any dependencies to use it.
1.  Open [Redly](https://jredsell.github.io/redly/) in your browser.
2.  Click the **"Install"** button in the browser's address bar or find it in the App menu.
3.  Launch Redly directly from your desktop or home screen!

## 🔨 Developer Setup

These commands are only required if you want to modify the source code or build the project from scratch.

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev

# 3. Build for production (outputs to /dist)
npm run build
```

## 📄 License

Copyright (c) 2026 Jonathan Redsell. **All Rights Reserved.**
Unauthorized use, copying, or distribution is strictly prohibited.
