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
    "english": "Thank you very much for your application to Pathway Development Programme: Residential Training with AFC Ajax. We are very excited to get to know your player profile and football ambitions. | What happens next? Our expert professional UEFA coaches will now review your player profile and assess your football challenges. The assessment team looking at your player profile is Gwynne Berry founder of Tec4Tekkers, Jack Johnson - Fulham FC and Stuart Searle from Chelsea FC. | Once we finish the assessment, we will get back to you with a response as soon as possible. | In the meantime, please feel free to contact us if you have any queries.",
    "korean": "글로벌 유망주 프로젝트: AFC 아약스와 함께 하는 합숙 트레이닝 프로그램에 지원해 주셔서 감사합니다. 저희 사전 평가 코치들은 귀하가 작성한 프로필과 축구에 대한 남다른 열정에 큰 기대를 갖고 있습니다. | 이제 프로 UEFA(유럽축구연맹) 코치들이 귀하의 프로필과 축구 챌린지 영상을 평가할 것입니다. 평가 코치진은 Tec4Tekkers 설립자 Gwynne Berry,  풀럼FC 소속 Jack Johnson 그리고 첼시FC 소속 Stuart Searle 로 구성되어 있습니다. | 평가가 마무리되는 대로 별도의 메일을 통해 캠프 참여 자격 획득 여부를 알려 드리도록 하겠습니다. | 그동안 문의 사항이 있다면 언제든지 연락 주십시오."
  },
  {
    "page": "application",
    "section": "content:successful",
    "english": "Good news! Your application for Pathway Development Programme: Residential Training with AFC Ajax has been successful. | Our professional assessment team was very impressed by your effort and ability, and decided to invite you to the programme. | To secure your slot, please make payment to the account below in 48 hours: Account details | Once you confirm your participation by making payment, we will provide you with programme rules and further details, as well as a questionnaire for reasonable adjustments. | In the meantime, please feel free to contact us if you have any queries. ",
    "korean": "축하합니다! ${name} 님은 글로벌 유망주 프로젝트: AFC 아약스와 함께 하는 합숙 트레이닝 프로그램에 참여할 자격을 획득하셨습니다. | 저희 평가 코치들은 ${name} 님의 노력과 기술, 재능을 인상 깊게 보아 본 프로그램에 초대하기로 결정하였습니다. | 프로그램 참여를 확정하기 위해 아래 계좌로 참가비를 송금해주시기 바랍니다. 48시간 내 미입금 시 다른 지원자에게 참가 기회가 주어집니다. Account details | 참여 확정 이후 프로그램 규칙과 기타 세부 사항들을 별도로 안내드리겠습니다. | 그동안 문의 사항이 있다면 언제든지 연락 주십시오. "
  },
  {
    "page": "application",
    "section": "content:unsuccessful",
    "english": "Thank you very much for your application to Pathway Development Programme: Residential Training with AFC Ajax. | We have received an incredible number of applications, and the standard of players applying for this programme has become very high. | Our professional assessment team have reviewed your player profile and challenges and we are sorry to say you will not be invited to the project on this occasion. | Though telling you the disappointing news this time, we encourage you to keep it up and try next time again – our coaches still saw a great potential in you. | In the meantime, please feel free to contact us if you have any queries. ",
    "korean": "글로벌 유망주 프로젝트: AFC 아약스와 함께 하는 합숙 트레이닝 프로그램에 지원해 주셔서 감사합니다.  | 참여 가능 인원은 제한되어 있는 반면 수많은 지원서가 제출되어, 심사 통과 기준이 매우 높았음을 미리 말씀 드립니다. | 평가 코치들의 신중한 심사 결과, 귀하는 안타깝게 이번 프로그램 참여 자격을 얻지 못하셨습니다. | 실망스러운 소식이지만, 저희 평가 코치들은 여전히 귀하의 잠재력을 인상 깊게 보았습니다. 부단히 노력하여 다음 기회에 다시 도전하시기를 추천드립니다.  | 문의 사항이 있다면 언제든지 연락 주십시오.  "
  },
  {
    "page": "application",
    "section": "email:signature",
    "english": "Kind regards,  | Indulge Football | Email: | Kakaotalk open chat: ",
    "korean": "감사합니다. | 인덜지풋볼 | 이메일: | 카카오톡 오픈챗:"
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