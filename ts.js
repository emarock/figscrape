const util = require('util')
const debug = require('debug')('ts')
const _ = require('lodash')
const request = require('request').defaults({
  jar: true,
  followAllRedirects: true
})
const cheerio = require('cheerio')
const async = require('async')

const baseURL = 'https://www.tournamentsoftware.com/cookiewall/Save'

const URLS = {
  events: '/find.aspx?a=7&q=61634F47-1954-46F9-B61E-7010D9C9A046',
  event: '/sport/tournament.aspx?id=%s',
  results: '/sport/tournament/matches?id=%s&d=%s'
}

const getEvents = (callback) => {
  debug(`retrieving events at ${URLS.events}`)
  const events = []
  request.post({
    url: baseURL,
    form: {
      ReturnUrl: URLS.events,
      SettingsOpen: false,
      CookiePurposes: 4,
      CookiePurposes: 16
    }
  }, (err, res, body) => {
    if (err) {
      return callback(err)
    } else if (res.statusCode > 299) {
      return callback(new Error(`server error: ${res.statusCode}`))
    } else {    
      const $ = cheerio.load(body)
      $('a[title="Squash"]').each((i, elem) => {
        events.push({
          id: $(elem).attr('href').match(/id=(.*)/)[1],
          title: $(elem).text()
        })
      })
    }
    return callback(null, events)
  })
}

const getEventDays = (id, callback) => {
  const url = util.format(URLS.event, id)
  debug(`retrieving days at ${url}`)
  const days = []
  request.post({
    url: baseURL,
    form: {
      ReturnUrl: url,
      SettingsOpen: false,
      CookiePurposes: 4,
      CookiePurposes: 16
    }
  }, (err, res, body) => {
    if (err) {
      return callback(err)
    } else if (res.statusCode > 299) {
      return callback(new Error(`server error: ${res.statusCode}`))
    } else {    
      const $ = cheerio.load(body)
      $('ul.tournamentcalendar a').each((i, elem) => {
        days.push(
          $(elem).attr('href').match(/&d=(.*)/)[1]
        )
      })
    }
    return callback(null, days)
  })
}

const getDayResults = (id, day, callback) => {
  const url = util.format(URLS.results, id, day)
  debug(`retrieving results at ${url}`)
  const results = []
  request.post({
    url: baseURL,
    form: {
      ReturnUrl: url,
      SettingsOpen: false,
      CookiePurposes: 4,
      CookiePurposes: 16
    }
  }, (err, res, body) => {
    if (err) {
      return callback(err)
    } else if (res.statusCode > 299) {
      return callback(new Error(`server error: ${res.statusCode}`))
    } else {    
      const $ = cheerio.load(body)
      const players = []
      $('a[href^="../player.aspx"]').each((i, elem) => {
        players.push($(elem).text())
      })
      $('span.score').each((i, elem) => {
        const games = _.split($(elem).text(), /\s+/)
        const match = {
          players: [],
          games: games
        }
        match.players.push(players.shift())
        match.players.push(players.shift())
        results.push(match)
      })
    }
    return callback(null, results)
  })
}

module.exports = {
  getEvents,
  getEventDays,
  getDayResults
}

