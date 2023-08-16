# Document on electron-app

## Framework Integration

React: https://www.electronforge.io/guides/framework-integration/react



## Configuration
### webpack.rules.js

for react support

```javascript
  {
    test: /\.jsx?$/,
    use: {
      loader: 'babel-loader',
      options: {
        exclude: /node_modules/,
        presets: ['@babel/preset-react']
      }
    }
  }
```



### webpack.main.config.js

```
	target: 'electron-main'
	...
	// the following is added and removed (change serialport to web-serial)
	externals: {
    	serialport: 'serialport'
  	}
  	
  	// also if serialport is used, "@timfish/forge-externals-plugin" must be installed and the following must be
  	// set in forge.config.js
  	// {
	//      name: '@timfish/forge-externals-plugin',
	//      config: {
	//      	externals: ['serialport'],
	//        	includeDeps: true
	//      }
	// }
```



### webpack.renderer.config.js

```js
	target: 'electron-renderer' // there is an advice that if nodeIntegration is false, this can be set to 'electron-web'
								// to eliminate many checks (and failure)
	// these are for react?
	resolve: {
    	extensions: ['.js', '.ts', '.jsx', '.tsx', '.css']
  	},
  	devtool: 'source-map'	
```



### forge.configs.js

devContentSecurityPolicy for `webpack-dev-server`

```
        // https://stackoverflow.com/questions/73034017/content-security-policy-with-fluentui-react-electron-forge
        devContentSecurityPolicy: "default-src 'none'; script-src 'unsafe-eval' 'unsafe-inline' blob:; script-src-elem 'self'; img-src *; style-src 'self' 'unsafe-inline'; font-src 'self' https://static2.sharepointonline.com/files/fabric/assets/icons/ https://res-1.cdn.office.net/files/fabric-cdn-prod_20221209.001/assets/fonts/; connect-src 'self'; worker-src 'self' 'unsafe-eval' 'unsafe-inline' blob:",
        // devContentSecurityPolicy: "default-src 'none'; script-src 'unsafe-eval'; script-src-elem 'self'; img-src *; style-src 'self' 'unsafe-inline'; font-src 'self' https://static2.sharepointonline.com/files/fabric/assets/icons/; connect-src 'self';",
  
```

in `renderer.entryPoints`

```js
	// not sure if this is needed after setting nodeIntegration and nodeIntegrationInWorker on, switch off contextIsolation.
	{
    	name: 'magus_worker',
      	js: './src/workers/magus-worker.js'
    }
```



## Data flow

1. There is a packet parser, which parse packet to tlvs. (lib function a)
2. Detect sensorId, version, instanceId (lib function b)
3. sensor-specific handler 
   1. to js-friendly data format (sensor specific lib function m)
   2. format output (sensor specific lib function, header and line n)
   3. update worker state, data structure and code in worker
   4. generate view data. view-specific

a and b are generic function

m and n should be factored to separate file

the remaining part 3.3 and 3.4 resides in worker file.









