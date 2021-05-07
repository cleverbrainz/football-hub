/* eslint-disable quotes */
const arr = [

  {
    "page": "greetings",
    "section": "hello",
    "english": "Hello ${name}",
    "korean": "${name} 님"
  },
  {
    "page": "greetings",
    "section": "pleaseLogin",
    "english": "Please login to see more details.",
    "korean": "더 자세한 내용을 위해 로그인해 주십시오."
  },
  
  {
    "page": "application",
    "section": "header:submitted",
    "english": "Your recent application was submitted!",
    "korean": "지원서가 접수되었습니다!"
  },
  {
    "page": "application",
    "section": "header:successful",
    "english": "Your recent application was successful!",
    "korean": ""
  },
  {
    "page": "application",
    "section": "header:unsuccessful",
    "english": "Your recent application was unsuccessful",
    "korean": ""
  },
  {
    "page": "application",
    "section": "content:submitted",
    "english": "We have recieved your application for the upcoming ${contentCourse}. It will now be judged by our panel and you will recieve a further update once our decision has been made.",
    "korean": "${contentCourse}에 대한 지원서가 접수되었습니다. 평가를 거쳐 결정이 완료되면 즉시 통지해 드리겠습니다."
  },
  {
    "page": "application",
    "section": "content:successful",
    "english": "Congratulations, your application for the upcoming ${contentCourse} was successful. You will recieve more information soon.",
    "korean": ""
  },
  {
    "page": "application",
    "section": "content:unsuccessful",
    "english": "Unfortunately your application for the upcoming ${contentCourse} was unsuccessful. We wish you luck in the future.",
    "korean": ""
  }

]

function convert(arr) {
  const obj = {}

  arr.forEach(x => {
    if (!(x.page in obj)) {
      obj[x.page] = {
        [x.section]: {
          en: x.english,
          ko: x.korean
        }
      }
    } else {
      obj[x.page] = {
        ...obj[x.page],
        [x.section]: {
          en: x.english,
          ko: x.korean
        }
      }
    }
  })

  return obj
}
const { greetings, application } = convert(arr)

module.exports = { application, greetings }