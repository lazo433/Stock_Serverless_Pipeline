import 'vuetify/styles'
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import App from './App.vue'
import vuetify from './plugins/vuetify'

const app = createApp(App)
app.use(vuetify)
app.mount('#app')