export default {
    title: 'Redly',
    description: 'Guides and Documentation for Redly',
    base: '/redly/docs/',
    themeConfig: {
        logo: '/Redly_logo_full.png',
        nav: [
            { text: 'Home', link: '/' },
            { text: 'Open App', link: 'https://jredsell.github.io/redly' }
        ],
        sidebar: [
            {
                text: 'Getting Started',
                items: [
                    { text: 'Introduction', link: '/getting-started/introduction' },
                    { text: 'Installation & Setup', link: '/getting-started/installation-setup' },
                    { text: 'Storage Options', link: '/getting-started/storage-options' }
                ]
            },
            {
                text: 'The Editor',
                items: [
                    { text: 'Markdown Basics', link: '/the-editor/markdown-basics' },
                    { text: 'Wikilinks & Backlinks', link: '/the-editor/wikilinks-backlinks' },
                    { text: 'Tables & Formatting', link: '/the-editor/tables-formatting' },
                    { text: 'Templates', link: '/the-editor/templates' }
                ]
            },
            {
                text: 'Task Management',
                items: [
                    { text: 'Todo Lists', link: '/task-management/todo-lists' },
                    { text: 'Global Tasks', link: '/task-management/global-tasks' },
                    { text: 'Kanban Boards', link: '/task-management/kanban-boards' },
                    { text: 'Notifications', link: '/task-management/notifications' }
                ]
            },
            {
                text: 'Organisation & Sync',
                items: [
                    { text: 'File Management', link: '/organisation-sync/file-management' },
                    { text: 'Syncing Devices', link: '/organisation-sync/syncing-devices' },
                    { text: 'Keyboard Shortcuts', link: '/organisation-sync/keyboard-shortcuts' }
                ]
            }
        ],
        search: {
            provider: 'local'
        }
    }
}
