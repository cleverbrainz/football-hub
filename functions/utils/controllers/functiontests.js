const moment = require('moment')

const createRegister = (startDate, endDate, sessionDays, playerList) => {

  const sessions = []
  let date = moment(startDate)
  const endMoment = moment(endDate)
  
  while (date.isSameOrBefore(endMoment)) {
    if (sessionDays.some(day => day === date.day())) {
      console.log(date.day())
      sessions.push(date.format('YYYY-MM-DD'))
    }
    console.log(date)
    date = date.add(1, 'days')
  }
  const register = { sessions }

  for (const player of playerList) {
    register[player.id] = { name: player.name }
    for (const date of sessions) {
      register[player.id][date] = { attendance: false, notes: '' }
    }
  }

  console.log(sessions, register)
  return register
}

const addUsersToRegister = (register, newAdditions) => {
  for (const player of newAdditions) {
    register[player.id] = { name: player.name }
    for (const date of register.sessions) {
      register[player.id][date] = { attendance: false, notes: '' }
    }
  }
  return register
}


// console.log('hello')
// const eggs = createRegister('2020-11-20', '2020-12-27', [2], [{name: 'tom', id: '1234'}, {name: 'ben', id: '54321'}])
// console.log(eggs)
// const updatedEggs = addUsersToRegister(eggs, [{name: 'brian', id: '900'}, {name: 'tony', id: '360'}])
// console.log(updatedEggs)

const sessions = [{day: 'Tuesday'}, {day: 'Friday'}]
const dayNums = sessions.map(session => moment().day(session.day).day())

console.log(dayNums)