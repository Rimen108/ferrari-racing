import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import HostView from '../views/HostView.vue'
import PlayerView from '../views/PlayerView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/host', name: 'host', component: HostView },
    { path: '/play/:code?', name: 'player', component: PlayerView, props: true },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
