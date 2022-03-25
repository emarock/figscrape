const debug = require('debug')('list')
const async = require('async')
const _ = require('lodash')
const figs = require('./figs')

const events = require('./data/events')

const selection = [{ 
  gender: 'men',
  dates: '19/03/2022 - 20/03/2022',
  name: '1^ Cat. - M'
}, {
  gender: 'women',
  dates: '19/03/2022 - 20/03/2022',
  name: '1^ Cat. - F'
}]


_.each(selection, (event, i) => {
  console.log(`*${event.dates} -- ${event.name}*`)
  const players = events[event.gender][event.dates][event.name].players
  const count = events[event.gender][event.dates][event.name].count
  const noun = (event.gender === 'men' ?
                (count === 1 ? 'giocatore' : 'giocatori') :
                (count === 1 ? 'giocatrice' : 'giocatrici'))
  const adj = (event.gender === 'men' ?
               (count === 1 ? 'iscritto' : 'iscritti') :
               (count === 1 ? 'iscritta' : 'iscritte'))
  console.log(`_[${count} ${noun} ${adj}]_`)
  _.each(players, (player, j) => {
    console.log(`${j + 1}. ${player.name} (${player.points} - ${player.team})`)
  })
  if (_.size(selection) - i > 1) {
    console.log()
  }
})

