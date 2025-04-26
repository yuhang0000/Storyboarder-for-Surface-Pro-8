const {shell, ipcRenderer} = require('electron')
const EventEmitter = require('events').EventEmitter
const Tether = require('tether')
const PomodoroTimer = require('../pomodoro-timer')
const prefsModule = require('electron').remote.require('./prefs')
const userDataHelper = require('../files/user-data-helper')
const sfx = require('../wonderunit-sound')
const moment = require('moment')
const fs = require('fs')
const tooltips = require('./tooltips')

class PomodorTimerView extends EventEmitter {
  constructor() {
    super()

    this.el = null
    this.innerEl = null
    this.minutesInput = null

    this.pomodoroTimerMinutes = prefsModule.getPrefs('main')['pomodoroTimerMinutes']

    this.pomodoroTimer = new PomodoroTimer()
    this.pomodoroTimer.on('update', (data)=>{
      this.emit('update', data)
      this.update(data)
    })
    this.state = this.pomodoroTimer.state
    this.create()

    userDataHelper.getData('recordings.json')
      .then(recordings => {
        this.recordings = recordings
        this.updateRecordingsView()
      })
      .catch(error => {
        this.recordings = []
      })
  }

  template() {
    return `<div id="pomodoro-timer-container" class="pomodoro-timer-container popup-container">
      <div id="pomodoro-timer" class="pomodoro-timer">
      </div>
    </div>`
  }

  update(data) {
    if(data.state != this.state) {
      this.transitionToState(data.state)
    }
    switch(data.state) {
      case "rest":
        break
      case "running":
        // debugger;
        let remainingView = this.el.querySelector('#pomodoro-timer-remaining', true)
        remainingView.style.display = "inline-block"
        remainingView.innerHTML = data.remainingFriendly
        break
      case "paused":
        break
      case "completed":
        // wait for the recording filepath to come in before showing.
        // this.fadeIn()
        break
    }
    
  }

  transitionToState(newState) {
    let content
    let texth //申明一个变量来存放文本高度
    switch(newState) {
      case "rest":
        let ttt;
        texth = this.innerEl.querySelector("[id='pomodoro-timer-minutes-input']");
        if(texth != null){
          texth = window.getComputedStyle(texth).getPropertyValue("height");
          ttt = this.innerEl.querySelector("[id='pomodoro-timer-remaining']");
          ttt = ttt.innerText;
        }
        else{
          texth = "0; display: none;";
          ttt = this.getStartTimeFriendly();
        }
        
        content = `
          <h3 id="pomodoro-timer-title">记录延时快照</h3>
          <div style="position: relative; wedth: 100%; display: flex; flex-wrap: nowrap; justify-content: center;">
          <div id="pomodoro-timer-remaining" class="pomodoro-timer-remaining disable" style="height: ${texth}">${ttt}</div>
          <input id="pomodoro-timer-minutes-input" class="pomodoro-timer-minutes-input" type="number" id="minutesInput" value="${this.pomodoroTimerMinutes}" min="1" max="500">
          </div>
          <div id="pomodoro-timer-minutes-label">分钟</div>
          <div id="pomodoro-timer-start-button" class="pomodoro-timer-button">
            <div class="pomodoro-timer-button-copy">开始</div><svg id="pomodoro-timer-start-icon" class="pomodoro-timer-button-icon"><use xlink:href="./img/button-play-pause.svg#icon-play"></use></svg>
          </div>
          <div id="pomodoro-timer-recordings-label">上一次的延时快照</div>
          <div id="pomodoro-timer-recordings">
          </div>
        `
        this.innerEl.innerHTML = content
        let startButton = this.el.querySelector('#pomodoro-timer-start-button')
        startButton.addEventListener('click', (event)=>{
          this.startTimer()
        })
        this.minutesInput = this.el.querySelector("#pomodoro-timer-minutes-input")
        this.minutesInput.addEventListener("blur", (event)=>{
          if(this.minutesInput.value == "") {
            this.minutesInput.value = 1
          }
        })
        this.minutesInput.addEventListener("input", (event) => {
          if(event.target.value.length < 1) {
            this.minutesInput.value = ""
            return
          }
          var result = 1
          try {
            result = parseInt(this.minutesInput.value)
          } catch(e) {}
          result = result >= 1 ? result : 1
          result = result <= 500 ? result : 500
          this.minutesInput.value = result
        })
        this.updateRecordingsView()
        break
      case "running":
        //强迫症犯了是吧, 这里统一文字高度, 以及加了点动画
        texth = this.innerEl.querySelector("[id='pomodoro-timer-minutes-input']");
        texth = window.getComputedStyle(texth).getPropertyValue("height");
        
        content = `
          <h3 id="pomodoro-timer-title">记录延时快照</h3>
          <div style="position: relative; wedth: 100%; display: flex; flex-wrap: nowrap; justify-content: center;">
          <input id="pomodoro-timer-minutes-input" class="pomodoro-timer-minutes-input" type="number" id="minutesInput" value="${this.pomodoroTimerMinutes}" min="1" max="500" disabled="disabled">
          <div id="pomodoro-timer-remaining" class="pomodoro-timer-remaining" style="height: ${texth}">${this.getStartTimeFriendly()}</div>
          </div>
          <div id="pomodoro-timer-minutes-label">倒计时</div>
          <div id="pomodoro-timer-cancel-button"  class="pomodoro-timer-button">
            <div class="pomodoro-timer-button-copy">取消</div>
            <svg id="pomodoro-timer-start-icon" class="pomodoro-timer-button-icon"><use xlink:href="./img/button-play-pause.svg#icon-stop"></use></svg>
          </div>
          <div id="pomodoro-timer-recordings-label">上一次的延时快照</div>
          <div id="pomodoro-timer-recordings">
          </div>
        `
        this.innerEl.innerHTML = content

        let cancelButton = this.el.querySelector('#pomodoro-timer-cancel-button')
        cancelButton.addEventListener('click', (event)=>{
          this.cancelTimer()
        })
        this.updateRecordingsView()
        // debugger;
        break
      case "completed":
        content = `
          <h3 id="pomodoro-timer-title">记录延时快照</h3>
          <div id="pomodoro-timer-success" class="pomodoro-timer-success">
            <div id="pomodoro-timer-success-headline">
              完成啦!
            </div>
          </div>
          <div id="pomodoro-timer-recordings">
          </div>
          <div id="pomodoro-timer-success-message">
            您辛苦啦, 一个人的努力总是充满挑战. (毕竟你是独自完成了这一切.) <br>你刚才的工作非常出色, 时间管理也非常棒. 祝贺你完美地完成了工作! <br>不妨把这份成果分享出去, 让更多人看到你的努力和成就吧!
          </div>
          <div id="pomodoro-timer-tweet-button"  class="pomodoro-timer-button">
            <div class="pomodoro-timer-button-copy">Twtter</div>
            <svg id="pomodoro-timer-start-icon" class="pomodoro-timer-button-icon" style="height:25px; "><use xlink:href="./img/social.svg#icon-twitter"></use></svg>
          </div>
          <div id="pomodoro-timer-continue-button"  class="pomodoro-timer-button">
            <div class="pomodoro-timer-button-copy">完成</div>
          </div>
        `
        this.innerEl.innerHTML = content
        let continueButton = this.el.querySelector('#pomodoro-timer-continue-button')
        continueButton.addEventListener('click', (event)=>{
          this.continue()
        })
        let tweetButton = this.el.querySelector('#pomodoro-timer-tweet-button')
        tweetButton.addEventListener('click', (event)=>{
          this.tweet()
        })
        break
    }
    this.state = newState
  }

  create () {
    let t = document.createElement('template')
    t.innerHTML = this.template()

    this.el = t.content.firstChild
    document.getElementById('storyboarder-main').appendChild(this.el)
    this.innerEl = this.el.querySelector('#pomodoro-timer')
    this.transitionToState(this.state)
    this.el.addEventListener('pointerleave', this.onPointerLeave.bind(this))
    this.el.addEventListener('pointerenter', this.onPointerEnter.bind(this))
    
  }

  updateRecordingsView() {
    let recordingsView = ''
    if(this.recordings && this.recordings.length) {
      let isMain = true
      let existingRecordings = 0;
      for(let i=0; i<this.recordings.length && existingRecordings<5; i++) {
        let recordingPath = this.recordings[i]
        if(fs.existsSync(recordingPath)) {
          recordingsView += `<div><img class="pomodoro-timer-recording" src="${recordingPath}" data-filepath="${recordingPath}" draggable=false></img></div>`
          existingRecordings++
        }
      }
      this.el.querySelector('#pomodoro-timer-recordings').innerHTML = recordingsView
      let recordingImages = this.el.querySelectorAll(".pomodoro-timer-recording")
      for(let i=0; i<recordingImages.length && i<5; i++) {
        let recordingImage = recordingImages[i]
        recordingImage.addEventListener('click', (event)=>{
          event.preventDefault()
          shell.showItemInFolder(event.target.dataset.filepath)
        })
      }
      this.el.querySelector('#pomodoro-timer-recordings-label').innerHTML = `上一次的延时快照`
      this.el.querySelector('#pomodoro-timer-recordings-label').style.display = `block`
    } else {
      this.el.querySelector('#pomodoro-timer-recordings-label').innerHTML = ``
      this.el.querySelector('#pomodoro-timer-recordings-label').style.display = `none`
    }
  }

  newRecordingReady(filepaths) {
    if(filepaths && filepaths.length) {
      let recordingPath = filepaths[0]
      this.recordings = filepaths.concat(this.recordings)
      let recordingsView = `<div><img class="pomodoro-timer-recording" src="${recordingPath}" data-filepath="${recordingPath}" draggable=false></img></div>`
      this.el.querySelector('#pomodoro-timer-recordings').innerHTML = recordingsView
      let recordingImages = this.el.querySelectorAll(".pomodoro-timer-recording")
      for(let i=0; i<recordingImages.length && i<5; i++) {
        let recordingImage = recordingImages[i]
        recordingImage.addEventListener('click', (event)=>{
          event.preventDefault()
          // shell.showItemInFolder(event.target.dataset.filepath)
          shell.openPath(recordingPath); //这里应该是直接打开文件, 而不是文件夹
        })
      }
    }
    this.fadeIn()
    sfx.positive()
  }

  attachTo (target) {
    if (this.target !== target) {
      if (this.tethered) {
        this.remove()
      }
      let attachment = 'top center'
      let targetAttachment = 'bottom center'

      let targetRect = target.getBoundingClientRect()
      let targetMiddle = ((targetRect.right - targetRect.left) / 2)+targetRect.left
      if(targetMiddle + 150 > window.innerWidth) {
        attachment = 'top right'
        targetAttachment = 'bottom right'

        // nub: #pomodoro-timer.top-nub:after
        // set nub to right: 8%; or left: 88.5%;
        this.innerEl.classList.add("top-nub-right")
        // set .pomodoro-timer to
        // transform-origin: 88.5% 0%;
        this.innerEl.classList.add("pomodoro-timer-right")
        this.innerEl.classList.remove("top-nub")
      } else {
        this.innerEl.classList.add("top-nub")
        this.innerEl.classList.remove("top-nub-right")
        this.innerEl.classList.remove("pomodoro-timer-right")
        this.innerEl.classList.remove("pomodoro-timer-right")

      }

      this.target = target
      this.tethered = new Tether({
        element: this.el,
        target: this.target,
        attachment: attachment,
        targetAttachment: targetAttachment,
        offset: '-18px -10px'
      })
    }
    ipcRenderer.send('textInputMode', true)
    this.fadeIn()
  }

  fadeIn () {
    this.el.classList.add('is-visible')
    this.innerEl.classList.add('appear-anim')

    tooltips.closeAll()
    tooltips.setIgnore(document.querySelector('#toolbar-pomodoro-rest'), true)
  }

  fadeOut () {
    this.innerEl.classList.remove('appear-anim')
    this.el.classList.remove('is-visible')
    tooltips.setIgnore(document.querySelector('#toolbar-pomodoro-rest'), false)
  }

  onPointerLeave (event) {
    this.pointerTimerID = setTimeout(()=>{
      this.remove()
      this.pointerTimerID = null
    }, 350)
  }
  
  onPointerEnter (event) {
    if(this.pointerTimerID) {
      clearTimeout(this.pointerTimerID)
      this.pointerTimerID = null
    }
  }

  remove () {
    ipcRenderer.send('textInputMode', false)
    this.target = null
    this.fadeOut()
    this.tethered && this.tethered.destroy()
  }

  // Timer Controls
  startTimer() {
    this.pomodoroTimerMinutes = parseInt(this.minutesInput.value)
    this.pomodoroTimer.setDuration(this.pomodoroTimerMinutes)
    this.pomodoroTimer.start()
    this.emit("start", {duration: this.pomodoroTimerMinutes, remainingFriendly: this.getStartTimeFriendly()})
    this.transitionToState("running")
    sfx.positive()

    prefsModule.set('pomodoroTimerMinutes', this.pomodoroTimerMinutes)
  }

  cancelTimer() {
    this.pomodoroTimer.cancel()
    this.transitionToState("rest")
    this.emit("cancel")
  }
  
  continue() {
    this.pomodoroTimer.reset()
  }

  tweet() {
    //这里好像是推特分享连接欸
    shell.openExternal('https://twitter.com/intent/tweet?text=' + encodeURIComponent('我刚刚用 StoryBoarder 完成了一份草图耶! #sketchsprint'))
  }
  
  getStartTimeFriendly() {
    // the timer immediately jumps to XX:59, so let's just start the display
    // at XX:59 to make it smooth
    let mm = moment.duration(this.pomodoroTimerMinutes * 60 * 1000)
    let secondsFriendly = 59 // the input is always minutes, so -1 = 59 seconds
    let remainingFriendly = `${ this.pomodoroTimerMinutes > 60 && mm.hours() > 0 ? mm.hours()+":" : ""}${mm.minutes()-1}:${secondsFriendly}`
    return remainingFriendly
  }
}

module.exports = PomodorTimerView