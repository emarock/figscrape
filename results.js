const debug = require('debug')('results')
const async = require('async')
const _ = require('lodash')
const ts = require('./ts')

const concurrency = 5

async.waterfall([
  (callback) => {
    ts.getEvents(callback)
  },
  (events, callback) => {
    async.eachLimit(events, concurrency, (event, callback) => {
      debug(`retrieving days for ${event.title}`)
      ts.getEventDays(event.id, (err, days) => {
        debug(`retrieved ${days.length} days for ${event.title}`)
        event.days = days
        return callback(err)
      })
    }, (err) => {
      return callback(err, events)
    })
  }, 
  (events, callback) => {
    async.eachLimit(events, concurrency, (event, callback) => {
      async.each(event.days, (day, callback) => {
        debug(`retrieving results on ${day}`)
        event.results = {}
        ts.getDayResults(event.id, day, (err, results) => {
          if (err)
            return callback(err)
          else {
            debug(`retrieved ${results.length} results on ${day}`)
            event.results[day] = results
            return callback()
          }
        })
      }, (err) => {
        return callback(err, events)
      })
    }, (err) => {
      return callback(err, events)
    })
  }
], (err, results) => {
  if (err)
    throw err
  console.log(JSON.stringify(results, null, ' '))
})

                
