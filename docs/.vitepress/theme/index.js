import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import CustomThemeToggle from './components/CustomThemeToggle.vue'
import './style.css'

export default {
    extends: DefaultTheme,
    Layout() {
        return h(DefaultTheme.Layout, null, {
            'nav-bar-content-after': () => h(CustomThemeToggle),
            'nav-screen-content-after': () => h(CustomThemeToggle)
        })
    }
}
