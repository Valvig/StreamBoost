import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify';
import router from './router'
import VueSession from 'vue-session'
// require Cookies
Vue.use(require('vue-cookies'))

Vue.use(VueSession)

Vue.config.productionTip = false

new Vue({
  vuetify,
  router,
  render: h => h(App)
}).$mount('#app')
