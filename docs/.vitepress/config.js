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
                    { text: 'Introduction', link: '/' },
                    { text: 'Installation', link: '/installation' }
                ]
            },
            {
                text: 'Guides',
                items: [
                    { text: 'Writing Markdown', link: '/markdown' },
                    { text: 'Device Syncing', link: '/syncing' }
                ]
            }
        ],
        search: {
            provider: 'local'
        }
    }
}
