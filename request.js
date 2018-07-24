const zlib = require('zlib')
const url = require('url')
const http = require('http')
const https = require('https')

function customizeHeaders(extraHeaders){
	var headers = {
		'Accept': 'application/json, text/plain, */*',
		'Accept-Encoding': 'gzip, deflate',
		'Accept-Language': 'zh-CN,zh;q=0.9',
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36'
	}
	if(typeof(extraHeaders) != 'undefined'){
		for(var key in extraHeaders){
			headers[key] = extraHeaders[key]
		}		
	}
	return headers
}

function init(method, urlObj, extraHeaders){
	var options = {
		method: method,
		headers: customizeHeaders(extraHeaders)
	}
	options.headers['Host'] = urlObj.host
	if(proxy){
		options.hostname = switchHost(proxy.hostname)
		options.port = proxy.port || ((proxy.protocol == 'https:') ? 443 : 80)
		options.path = urlObj.protocol + '//' + switchHost(urlObj.hostname) + urlObj.path
	}
	else{
		options.hostname = switchHost(urlObj.hostname)
		options.port = urlObj.port || ((urlObj.protocol == 'https:') ? 443 : 80)
		options.path = urlObj.path
	}
	return options
}

function request(method, uri, extraHeaders, body, raw){
	var urlObj = url.parse(uri)
	var options = init(method, urlObj, extraHeaders)
	var makeRequest = (proxy) ? ((proxy.protocol == 'https:') ? https.request : http.request) : ((urlObj.protocol == 'https:') ? https.request : http.request)

	return new Promise(function(resolve, reject){
		var req = makeRequest(options, function(res){
			if(method == 'HEAD')
				resolve(res)
			else
				read(res, raw).then(function(body){resolve(body)}).catch(function(e){reject(e)})
		}).on('error', function(e){
			reject(e)
		})
		if(typeof(body) != 'undefined'){
			req.write(body)
		}
		req.end()
	})
}

function read(connect, raw){
	return new Promise(function(resolve, reject){
		var chunks = []
		if(connect.headers['content-encoding'] == 'gzip'){
			var gunzip = zlib.createGunzip()
			connect.pipe(gunzip)
			gunzip.on('data', function(chunk){
				chunks.push(chunk)
			})
			gunzip.on('end', function(){
				end()
			})
			gunzip.on('error', function(e){
				reject(e)
			})
		}
		else{
			connect.on('data', function(chunk){
				chunks.push(chunk)
			})
			connect.on('end', function(){
				end()
			})
			connect.on('error', function(e){
				reject(e)
			})
		}
		function end(){
			var buffer = Buffer.concat(chunks)
			if(raw == true)
				resolve(buffer)
			else
				resolve(buffer.toString())
		}
	})
}
request.init = init
request.read = read

module.exports = request