const timestamp = () => {
  const d = new Date()
  const z = n => ('0' + n).slice(-2)
  return d.getFullYear().toString().slice(2) +
         z(d.getMonth() + 1) +
         z(d.getDate()) + '-' +
         z(d.getHours()) +
         z(d.getMinutes()) +
         z(d.getSeconds())
}

export default timestamp
