const util = require('util')
const debug = require('debug')('fs')
const _ = require('lodash')
const request = require('request')
const cheerio = require('cheerio')
const async = require('async')

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const CONCURRENCY = 5

const URLS = {
  players: {
    men: 'https://www.federsquash.it/squash-giocato/classifiche-federali/ranking-maschile.html?filtro=0&attivo=2&sesso=M&start=%i',
    women: 'https://www.federsquash.it/squash-giocato/classifiche-federali/ranking-femminile.html?filtro=0&attivo=2&sesso=F&start=%i'
  },
  events: 'https://www.federsquash.it/squash-giocato/index.php?option=com_risultatigare&view=scheda&id=%i&format=json'
}

URLS.players.male = URLS.players.men
URLS.players.female = URLS.players.women

const getPlayers = (gender, callback) => {
  let page = 0
  let result = {}
  let over = false
  
  async.doUntil((callback) => {
	    const url = util.format(URLS.players[gender], page * 20)
    debug(`downloading players at ${url}`)
    request(url, (err, res, body) => {
      if (err) {
        return callback(err)
      } else if (res.statusCode > 299) {
        return callback(new Error(`server error: ${res.statusCode}`))
      } else {    
        const $ = cheerio.load(body)


        const current = $('.pagination strong').text()
        debug(`queried page: ${page}, current page: ${current}`)
        over = current == page
        
        $('.atleta').each((i, elem) => {
          const id = $(elem).attr('data')
          const name = $('.nome', elem).text()
          const ranking = _.parseInt($('.posizione', elem).text())
          const category = $('.categoria', elem).text()
          const team = $('.societa', elem).text()
          const points = $('.attuali', elem).text()

          // if (result[id]) {
          //   over = true
          // } else {
          result[id] = {
            id,
            name,
            ranking,
            category,
            team,
            points,
            page
          }
          // }
        })
        page++
        return callback()
      }
    })
  }, () => {
    return over
  }, (err) => {
    if (err) {
      return callback(err)
    } else {
      result = _.toArray(result)
      return callback(null, _.sortBy(result, 'ranking'))
      
    }
  })
}

const getPlayerEvents = (id, callback) => {
  const url = util.format(URLS.events, id)
  const result = []
  debug(`downloading events at ${url}`)
  request(url, (err, res, body) => {
    if (err) {
      return callback(err)
    } else if (res.statusCode > 299) {
      return callback(new Error(`server error: ${res.statusCode}`))
    } else {
      const $ = cheerio.load(body)

      $('tr').each((i, elem) => {
        const date = $('.data', elem).text()
        const name = $('.nome', elem).text()
        const venue = $('.luogo', elem).text().trim()
        const placement = $('.risultato', elem).text()
        if (date || name) {
          result.push({
            date,
            name,
            venue,
            placement
          })
        }
      })
      return callback(null, result)
    }
  })
}

const getPlayersEvents = (gender, callback) => {
  async.waterfall([
    (callback) => {
      getPlayers(gender, callback)
    },
    (players, callback) => {
      async.eachLimit(players, CONCURRENCY, (player, callback) => {
        debug('player: %o', player)
        getPlayerEvents(player.id, (err, events) => {
          player.events = events
          return callback(err)
        })
      }, (err) => {
        return callback(err, players)
      })
    },
    (players, callback) => {
      const events = {}
      _.each(players, (player) => {
        _.each(player.events, (event) => {
          events[event.date] = events[event.date] || {}
          events[event.date][event.name] = events[event.date][event.name] || {
            count: 0,
            players: []
          }
          events[event.date][event.name].count++
          events[event.date][event.name].players.push({
            name: player.name,
            team: player.team,
            points: player.points,
            ranking: player.ranking
          })
        })
      })
      return callback(null, events)
    },
    (events, callback) => {
      const list = []
      _.each(events, (event, dates) => {
        event.dates = dates
        list.push(event)
      })
      const ordered = {}
      _.each(_.orderBy(list, (event) => {
        const fields = event.dates.match(/([0-9]+)\/([0-9]+)\/([0-9]+)/)
        return fields[3] + fields[2] + fields[1]
      }, 'desc'), (event) => {
        ordered[event.dates] = event
        delete event.dates
      })
      
      callback(null, ordered)
    }
  ], callback)
}

module.exports = {
  getPlayers,
  getPlayerEvents,
  getPlayersEvents
}
