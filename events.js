const debug = require('debug')('events')
const async = require('async')
const _ = require('lodash')
const fs = require('./fs')

async.waterfall([
  (callback) => {
    fs.getPlayersEvents('female', callback)
  },
  (women, callback) => {
    fs.getPlayersEvents('male', (err, results) => {
      callback(err, women, results)
    })
  }, 
  (women, men, callback) => {
    callback(null, {
      men,
      women
    })
  }
], (err, results) => {
  if (err)
    throw err
  console.log(JSON.stringify(results, null, ' '))
})

                
