module.exports = {
  packagerConfig: {
    asar: true
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {}
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-deb',
      config: {}
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {}
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {}
    },
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        // https://stackoverflow.com/questions/73034017/content-security-policy-with-fluentui-react-electron-forge
        devContentSecurityPolicy: "default-src 'none'; script-src 'unsafe-eval' 'unsafe-inline' blob:; script-src-elem 'self'; img-src *; style-src 'self' 'unsafe-inline'; font-src 'self' https://static2.sharepointonline.com/files/fabric/assets/icons/ https://res-1.cdn.office.net/files/fabric-cdn-prod_20221209.001/assets/fonts/; connect-src 'self'; worker-src 'self' 'unsafe-eval' 'unsafe-inline' blob:",
        // devContentSecurityPolicy: "default-src 'none'; script-src 'unsafe-eval'; script-src-elem 'self'; img-src *; style-src 'self' 'unsafe-inline'; font-src 'self' https://static2.sharepointonline.com/files/fabric/assets/icons/; connect-src 'self';",
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/index.html',
              js: './src/renderer.js',
              name: 'main_window',
              preload: {
                js: './src/preload.js'
              }
            },
            {
              name: 'magus_worker',
              js: './src/workers/magus-worker.js'
            }
          ]
        }
      }
    },
//    {
//      name: '@timfish/forge-externals-plugin',
//      config: {
//        externals: ['serialport'],
//        includeDeps: true
//      }
//    }
  ]
}
