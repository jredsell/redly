# Redly

Redly is a local-first, privacy-focused Markdown editor designed for speed and simplicity. It reads and writes directly to your local file system, ensuring your data stays yours.

## Key Features

- **Local-First**: All your notes are stored as `.md` files on your device.
- **Rich Markdown Support**: Full GFM (GitHub Flavored Markdown) support including tables and task lists.
- **Interactive Slash Menu**: Type `/` to quickly insert headings, lists, tables, and more.
- **Global Task View**: Aggregate todos from all your notes in one place.
- **Smart Task Badges**: Add dates and times to tasks with interactive badges.
- **Progressive Web App (PWA)**: Install Redly as a desktop app for a native experience and offline support.

## User Guide

1. **Open a Folder**: Click "Open Folder" to select a directory on your computer where your notes are stored.
2. **Create/Edit**: Use the sidebar to navigate your folders and files. Click a file to open it in the editor.
3. **Format**: Use the floating bubble menu for text formatting or the Slash menu for block elements.
4. **Tasks**: Create tasks using `[ ]`. Click the date icon or type `@` inside a task to add a due date/time.

## Developer Setup

To run Redly locally:

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## Documentation

Project documentation and screenshots are stored in the `docs/` directory.

---
*Created with focus on privacy and productivity.*
