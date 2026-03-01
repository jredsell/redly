# Redly

### Your private, offline-first Markdown knowledge base.

Redly is a minimalist, powerful, and aesthetically pleasing note-taking application designed for people who value privacy, speed, and standard formats. It turns your local folders or browser storage into a sleek, searchable knowledge base.

## 🚀 Key Features

- **Local-First Architecture**: Your data never leaves your machine unless you explicitly export it.
- **Markdown Native**: Write using standard Markdown with a beautiful, rich-text live preview.
- **Integrated Global Search**: A sleek, header-embedded search bar that finds notes by filename or content instantly as you type.
- **Interactive Tasks & Reminders**: Turn any note into a productivity hub with `@date` and `@time` badges that trigger native push notifications, plus a **Global Task & Kanban Dashboard**.
- **Advanced Editor**: Seamlessly build persistent tables, format code blocks, and utilize a powerful Slash command menu.
- **Keyboard-First Navigation**: Optimized for power users with comprehensive hotkeys for every major action, including full arrow-key and Enter support in complex dropdowns.
- **Keyboard-First Navigation**: Optimized for power users with comprehensive hotkeys for every major action.
- **PWA Support**: Install Redly as a desktop app for a native experience.
- **Dark Mode**: Beautifully curated themes for both night owls and day dreamers.
- **Backup & Restore**: Easily export and import your browser storage as JSON.

## 📦 Getting Started

### 1. Choose Your Storage

Redly offers two distinct storage "tiers" to balance privacy, convenience, and control:

- **Local Storage (Native File System)**: 
  - **Technical**: Uses the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) to map Redly directly to a folder on your computer.
  - **Experience**: Your notes are stored as plain `.md` files. This is the "ultimate control" mode—your files are yours, and you can edit them with any other editor simultaneously.
  - **Compatibility**: Required Chromium-based browsers (Chrome, Edge, Opera) on Desktop.

- **Browser Storage (Sandboxed)**:
  - **Technical**: Uses the [Origin Private File System (OPFS)](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system).
  - **Experience**: Store notes in a secure, hidden browser sandbox. It is incredibly fast and zero-config. Perfect for a quick start or private browsing.
    -   **Compatibility**: High compatibility across all modern browsers (Chrome, Edge, Safari, Firefox) on both Desktop and Mobile.

### 2. Browser Compatibility Matrix

| Feature | Chrome / Edge | Safari | Firefox | Mobile (iOS/Android) |
|---|---|---|---|---|
| **PWA Installation** | ✅ (One-click) | ✅ (Manual) | ⚠️ (Limited) | ✅ (Add to Home) |
| **Browser Storage** | ✅ (OPFS) | ✅ (OPFS) | ✅ (OPFS) | ✅ (OPFS) |
| **Local Storage** | ✅ (Native API) | ❌ | ❌ | ❌ |
| **Dark Mode** | ✅ | ✅ | ✅ | ✅ |

![Redly Welcome Screen](docs/assets/welcome_screen.png)

## Quick Start

1.  **Open Redly**: Launch the app in your browser or from your home screen.
2.  **Choose Storage**: Select **Browser Storage** for a quick start or **Local Storage** to save files directly to your machine.
3.  **Start Writing**: Click the **New Note** button or press `Alt + N`.

### Formatting Made Simple

![Slash Menu Demo](docs/assets/slash_menu_demo.webp)

Redly supports full Markdown and provides a powerful **Slash Menu** to make formatting effortless:

*   **Slash Command**: Type `/` anywhere in a note to bring up a menu of formatting options (Headers, Lists, Todo items, Horizontal Rules, and more).
*   **Markdown Shortcuts**: Use standard syntax like `#` for headers, `**` for bold, and `---` for dividers.
*   **Rich Tables**: Create perfectly formatted markdown tables using the Slash Menu that persist flawlessly across reloads.
*   **Tagging & Autocomplete**: Type `#` in the editor to create tags (e.g., `#ideas`). Redly will instantly display a floating autocomplete menu populated with every tag you've used across your entire workspace! Tags are also color-coded in the editor to easily distinguish them from regular text.
*   **Smart Tasks & Notifications**: Create interactive tasks with `- [ ]`. You can even add dates like `@today` or exact times like `@14:30` to see them in your Global Tasks view and receive **native browser push notifications** right when they are due.

![Mastering Redly Hero Note](docs/assets/hero_note.png)

## Features

### 📅 Global Tasks & Kanban Dashboard

Never lose track of a deadline. The **Global Tasks** view aggregates every `- [ ]` task from all your notes, categorising them into an actionable dashboard. 

You can instantly switch between a classic list and an interactive **Kanban Board** by pressing `Alt + V`.
- **Project Views**: Press `Alt + G` to jump to the tag filter dropdown. Use the **Up/Down arrow keys** to navigate and **Enter** to instantly create dedicated project views based on your tags.
- **Custom Columns**: Add inline hashtags (e.g. `- [ ] Fix bugs #doing`) to sort tasks into specific stages. If you have multiple tags, the **last tag** will always determine the Kanban board column status.
- **Drag & Drop**: Drag a task from `#backlog` to `#done`, and Redly will automatically rewrite the markdown in your raw notes.
- **Deep Linking**: Click anywhere on a task card to instantly auto-scroll to the exact note in your file tree.

![Global Tasks List View](docs/assets/global_tasks.png)

![Kanban Board View](docs/assets/kanban_board.png)

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
| Toggle Kanban / List | `Alt + V` |
| Filter Tags (Tasks View) | `Alt + G` |
| Change Workspace | `Alt + W` |
| Help & Guide | `Alt + /` |
| Rename Selection | `F2` |
| Delete Selection | `Delete` |
| **Close Modals/Dropdowns** | `Escape` |

## 🛡️ Privacy & Security

Redly is built on a "No Data Collection" philosophy. 
- **Offline First**: No cloud syncing, no logins, no tracking.
- **Standard Formats**: Your notes are yours. Even if you stop using Redly, your files are standard Markdown or JSON.
- **Transparent**: No hidden background processes or external telemetry.

For more details, see our full [Privacy Policy](PRIVACY.md).

## 📲 Installation (PWA)

Redly is a Progressive Web App (PWA), meaning it can be installed as a standalone app on your device for an offline-first, distraction-free experience.

- **One-Click Install**: On compatible browsers (Chrome/Edge), look for the **"Install Redly"** button prominently displayed on the Welcome and Home screens.
- **Manual Install (Safari/Firefox)**: 
  - On Safari (iOS): Tap the **Share** button and select **"Add to Home Screen"**.
  - On Other Browsers: Click the menu icon and look for **"Install App"** or **"App > Install this site"**.
- **Integrated Guide**: If a direct one-click install isn't possible (e.g., the browser intercepts the prompt), Redly provides a beautiful, custom-designed fallback modal with step-by-step instructions tailored to your experience.

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
