const pre = 'scroll'

export default {
  methods: {
    // 生成 css class
    c (className) {
      return className ? `${pre}${className}` : `${pre}`
    },
  },
}
