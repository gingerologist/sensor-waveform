class Max86141Config {
  constructor () {
    this.lastRaw = []
  }

  incoming (raw) {
    this.lastRaw = raw
  }
}

const createMax86141Config = new Max86141Config()
export default createMax86141Config
