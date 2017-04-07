#!/usr/bin/env node

var host = process.env.HOST || '0.0.0.0'
var httpPort = process.env.HTTP_PORT || 8090
var folder = process.env.FOLDER || process.cwd() + '/uploads'

var fs = require('fs')
var http = require('http')
var express = require('express')
var multer = require('multer')
var app = express()

if (!fs.existsSync(folder)) {
  fs.mkdirSync(folder)
}

var storage = multer.diskStorage(
  {
    destination: function (req, file, cb) {
      var fieldName = 'file'
      var fileName = req.body[fieldName] ? req.body[fieldName] : file.originalname
      var hash = fileName.split('-')[0]
      if (hash && hash.length === 40) {
        var path = folder + '/' + hash
        if (fs.existsSync(path)) {
          cb('File already uploaded!')
        } else {
          fs.mkdirSync(path)
          cb(null, path)
        }
      } else {
        cb('Wrong file format')
      }
    },
    filename: function (req, file, cb) {
      var fieldName = 'file'
      var fileName = req.body[fieldName] ? req.body[fieldName] : file.originalname
      var finalFileName = fileName.split('-')[1]
      if (finalFileName) {
        cb(null, finalFileName)
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
  res.send('<form action="/" method="POST" enctype="multipart/form-data">\n  <input type="file" name="file">\n  <input type="submit" value="Upload File">\n</form>\n')
})

app.post('/', upload.any(), function (req, res) {
  console.log('[' + new Date() + '] - File uploaded:', req.files[0].path)
  res.end()
})

http.createServer(app).listen(httpPort, host, function () {
  console.log('[' + new Date() + '] - HTTP File Upload Server started on ' + host + ':' + httpPort)
})
