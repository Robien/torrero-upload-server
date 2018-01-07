#!/usr/bin/env node

var host = process.env.HOST || '0.0.0.0'
var httpPort = process.env.HTTP_PORT || 8090
var folder = process.env.FOLDER || process.cwd() + '/uploads'

var fs = require('fs')
var http = require('http')
var express = require('express')
var multer = require('multer')
var app = express()

var ipfsAPI = require('ipfs-api')
var ipfs = ipfsAPI('/ip4/172.17.0.2/tcp/9095')

if (!fs.existsSync(folder)) {
  fs.mkdirSync(folder)
}

var storage = multer.diskStorage(
  {
    destination: function (req, file, cb) {
      var fieldName = 'file'
      var fileName = req.body[fieldName] ? req.body[fieldName] : file.originalname

      var hash = req.body['hash']
      var name = req.body['name']
      var label = req.body['label']
      if (!hash || hash.length !== 40) {
        return cb('You should specify data\'s hash')
      }
      if (!label && !name) {
        return cb('You should specify at least one name or one label')
      }

      var path = folder + '/' + hash + '/'

        // label is set if it's a media and not a manifest
      if (label) {
        path += label
        if (fs.existsSync(path + '/video.mp4')) {
          return cb('File already uploaded!')
        }
        if (!fs.existsSync(path)) {
          if (!fs.existsSync(folder + '/' + hash)) {
            fs.mkdirSync(folder + '/' + hash)
          }
          fs.mkdirSync(path)
        }
        return cb(null, path)
      } else {
	if (fileName != 'manifest.torrent') {
          path += name
	}
        if (fs.existsSync(path + '/' + fileName)) {
          return cb('File already uploaded!')
        }
        if (!fs.existsSync(path)) {
          if (!fs.existsSync(folder + '/' + hash)) {
            fs.mkdirSync(folder + '/' + hash)
          }
          fs.mkdirSync(path)
        }
        return cb(null, path)
      }
    },
    filename: function (req, file, cb) {
      var fieldName = 'file'
      var fileName = req.body[fieldName] ? req.body[fieldName] : file.originalname

      if (req.body['label']) {
        cb(null, 'video.mp4')
      } else if (fileName) {
        cb(null, fileName)
      } else {
        cb('Wrong file format')
      }
    }
  })

var upload = multer(
  {
    storage: storage
  })

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.get('/', function (req, res) {
  res.send('<form action="/" method="POST" enctype="multipart/form-data">\n  <input type="text" name="name" value="a">\n  <input type="text" name="hash" value="1234567890123456789012345678901234567890">\n  <input type="file" name="file" multiple>\n  <input type="submit" value="Upload File">\n </form>\n<form action="/" method="POST" enctype="multipart/form-data">\n  <input type="text" name="name" value="a">\n  <input type="text" name="hash" value="1234567890123456789012345678901234567890">\n  <input type="text" name="label">\n  <input type="file" name="file" multiple>\n  <input type="submit" value="Upload File">\n </form>\n')
})

function addToIPFS(path, cb)
{
	fs.readFile(path, function(err, content) {  
		if (err) return cb(err)
		ipfs.files.add([{path:path, content:content}], function (err, resIPFS) {
			if (err)
			{
				return cb(err)
			}
			cb(null, resIPFS[0].hash)
		})
	})

}

function createIPFSReply(path, name, cb)
{
	addToIPFS(path, function(err, hash) {
		if (err) return cb(err)
		console.log(name + " ipfs id = " + hash)
		cb(null, {name: name, hash: hash})
	})

}

function createIPFSReplyForAll(files, cb)
{
	var i = 0
	var ipfsIDs = []
	while (files[i]) {
		var path = files[i].path
		var name = files[i].originalname
		createIPFSReply(path, name, function(err, data) {
			if (err) return cb(err)
			ipfsIDs[ipfsIDs.length] = data
			if (ipfsIDs.length === files.length) {
				cb(null, JSON.stringify(ipfsIDs))
			}
		})
		console.log('[' + new Date() + '] - File uploaded:', path)
		i++
	}
}

app.post('/', upload.any(), function (req, res) {
	createIPFSReplyForAll(req.files, function (err, data)
		{
			if (err) console.log(err)
			res.send(data)
			res.end()
		})
	// it should check hash here
})

http.createServer(app).listen(httpPort, host, function () {
  console.log('[' + new Date() + '] - Torrero! Upload Server started on ' + host + ':' + httpPort)
})
