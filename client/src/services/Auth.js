import Api from '@/services/Api'

export default {
  follows () {
    return Api().post('follows')
  },
  followers () {
    return Api().post('followers')
  },
  flush () {
    return Api().get('flush')
  },
  userFollows (id) {
    return Api()
    .get('userFollows',
    {
      params: {
        id: id
      }
    })
  },
  getStreamer (id) {
    return Api()
    .get('streamers',
    {
      params: {
        id: id
      }
    })
  }
}