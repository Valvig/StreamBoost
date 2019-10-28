<template>
  <div class="home">
    <h1>HOME</h1>    
    <v-btn
        class="ma-2"
        color="secondary"
        @click="connect()"
      >
        Connect with twitch
      </v-btn>  
    <v-btn
      class="ma-2"
      color="secondary"
      @click="follows()"
    >
      Get Follows
    </v-btn> 
    <v-btn
      class="ma-2"
      color="secondary"
      @click="followers()"
    >
      Get Followers
    </v-btn>
  </div>
</template>

<script>
import Auth from '@/services/Auth'

export default {
  name: 'home',
  data () {
    return {
      email: '',
      password: ''
    }
  },
  methods: {
    async follows () {
      const response = await Auth.follows()
      /* eslint-disable no-console */
      console.log(response.data)
    },
    async followers () {
      const response = await Auth.followers()
      /* eslint-disable no-console */
      console.log(response.data)
    },
    async connect () {
      const response = await Auth.connect()
      
      /* eslint-disable no-console */
      console.log(response.data)
    }
  }
}
</script>
