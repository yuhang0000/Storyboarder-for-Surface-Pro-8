const {ipcRenderer} = require('electron')
const EventEmitter = require('events').EventEmitter
const Tether = require('tether')
const Color = require('color-js')
const tooltips = require('./tooltips')

class ColorPicker extends EventEmitter {
  constructor () {
    super()
    this.state = { color: null }

    this.target = null

    this.primaryColors = [
      ['红色', '#F44336'],
      ['粉色', '#E91E63'],
      ['紫色', '#9C27B0'],
      ['暗紫色', '#673AB7'],
      ['靛蓝色', '#3F51B5'],
      ['蓝色', '#2196F3'],
      ['矢车菊蓝', '#03A9F4'],
      ['青色', '#00BCD4'],
      ['深青色', '#009688'],
      ['深绿色', '#4CAF50'],
      ['绿色', '#8BC34A'],
      ['荧光绿', '#CDDC39'],
      ['黄色', '#FFEB3B'],
      ['琥珀色', '#FFC107'],
      ['橙色', '#FF9800'],
      ['深橙色', '#FF5722'],
      ['棕色', '#795548'],
      ['蓝灰色', '#607D8B'],
      ['灰色', '#9E9E9E'],
    ]

    this.el = null
    this.innerEl = null
    this.create()
  }

  setState (newState) {
    this.state = Object.assign(this.state, newState)
    this.render()
  }

  generateColors () {
    let colorRows = []
    let colorRow 
    colorRow = []
    for (var i = 0; i < this.primaryColors.length; i++) {
      if (this.primaryColors.length-1 == i) {
        colorRow.push(['白色',Color("#fff").toCSS()])
      } else {
        colorRow.push(['很淡的 ' + this.primaryColors[i][0],Color(this.primaryColors[i][1]).blend(Color("#fff"),.50).toCSS()])
      }
    }
    colorRows.push(colorRow)
    colorRow = []
    for (var i = 0; i < this.primaryColors.length; i++) {
      colorRow.push(['淡淡的 ' + this.primaryColors[i][0],Color(this.primaryColors[i][1]).blend(Color("#fff"),.20).toCSS()])
    }
    colorRows.push(colorRow)
    colorRow = []
    for (var i = 0; i < this.primaryColors.length; i++) {
      colorRow.push([this.primaryColors[i][0],this.primaryColors[i][1]])
    }
    colorRows.push(colorRow)
    colorRow = []
    for (var i = 0; i < this.primaryColors.length; i++) {
      colorRow.push(['有点暗的 ' + this.primaryColors[i][0],Color(this.primaryColors[i][1]).shiftHue(-5).blend(Color("#000"),.20).toCSS()])
    }
    colorRows.push(colorRow)
    colorRow = []
    for (var i = 0; i < this.primaryColors.length; i++) {
      colorRow.push(['暗暗的 ' + this.primaryColors[i][0],Color(this.primaryColors[i][1]).shiftHue(-10).blend(Color("#000"),.40).toCSS()])
    }
    colorRows.push(colorRow)
    colorRow = []
    for (var i = 0; i < this.primaryColors.length; i++) {
      colorRow.push(['很暗的 ' + this.primaryColors[i][0],Color(this.primaryColors[i][1]).shiftHue(-20).blend(Color("#000"),.65).toCSS()])
    }
    colorRows.push(colorRow)
    colorRow = []
    for (var i = 0; i < this.primaryColors.length - 3; i++) {
      colorRow.push(['炒鸡暗的 ' + this.primaryColors[i][0],Color(this.primaryColors[i][1]).shiftHue(-20).blend(Color("#000"),.80).toCSS()])
    }
    colorRow.push(['五彩斑斓的黑色',Color("#000").toCSS()])
    colorRows.push(colorRow)
    return colorRows
  }

  // TODO use a class instead of id for styling, refactor context menu
  template () {
    this.colorRows = this.generateColors()

    let html = []

    for (var i = 0; i < this.colorRows.length; i++) {
      html.push(`<div class="color-row">`)
      for (var i2 = 0; i2 < this.colorRows[i].length; i2++) {
        let classArr = ["color-swatch"]
        if (i == (this.colorRows.length-1) && i2 == (this.colorRows[i].length-1) ) {
          classArr.push("last-color")
        }
        html.push(`<div class="${classArr.join(' ')}" data-color-name="${this.colorRows[i][i2][0]}" data-color="${this.colorRows[i][i2][1]}" style="background-color: ${this.colorRows[i][i2][1]};"></div>`)
      }
      html.push(`</div>`)
    }

    return `<div class="color-picker-container popup-container">
      <div id="context-menu" class="color-picker top-nub">
        
        ${html.join('')}
        <div class="color-name"><span class="name">Pick a color</span><input class="color-css" type="text" value=""></div>
      </div>
    </div>`
  }

  create () {
    let t = document.createElement('template')
    t.innerHTML = this.template()

    this.el = t.content.firstChild
    document.getElementById('storyboarder-main').appendChild(this.el)

    this.el.addEventListener('pointerdown', this.onPointerDown.bind(this))
    this.el.addEventListener('pointerleave', this.onPointerLeave.bind(this))
    this.el.addEventListener('pointerenter', this.onPointerEnter.bind(this))
    
    this.innerEl = this.el.querySelector('.color-picker')

    var swatches = document.querySelectorAll(".color-swatch")

    swatches.forEach((e)=>{
      e.addEventListener('pointerdown', (e)=>{
        // console.log('click!', e.target.dataset)
        // request a color change from sketchPane
        this.emit('color', Color(e.target.dataset.color))
      })
    })

    document.querySelector(".color-name .color-css").addEventListener('focus', (e)=> {
      e.target.select()
    })

    document.querySelector(".color-name .color-css").addEventListener('input', (e)=> {
      if (e.target.value.length == 7 && Color(e.target.value).red !== undefined) {
        let color = Color(e.target.value)
        // request a color change from sketchPane
        this.emit('color', color)
      }
    })
  }
  
  onPointerDown (event) {
    console.log('onPointerDown')
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
  
  fadeIn () {
    this.el.classList.add('is-visible')
    this.innerEl.classList.add('appear-anim')

    tooltips.closeAll()
    tooltips.setIgnore(document.querySelector('#toolbar-current-color'), true)
  }

  fadeOut () {
    this.innerEl.classList.remove('appear-anim')
    this.el.classList.remove('is-visible')
    tooltips.setIgnore(document.querySelector('#toolbar-current-color'), false)
  }
  
  hasChild (child) {
    return this.el.contains(child)
  }

  attachTo (target) {
    if (this.target !== target) {
      if (this.tethered) this.remove()

      this.target = target
      this.tethered = new Tether({
        element: this.el,
        target: this.target,
        attachment: 'top center',
        targetAttachment: 'bottom center',
        offset: '-18px 0'
      })
    }
    ipcRenderer.send('textInputMode', true)
    this.fadeIn()
  }
  
  remove () {
    ipcRenderer.send('textInputMode', false)
    this.target = null
    this.fadeOut()
    this.tethered && this.tethered.destroy()
  }

  colorDistance (color1, color2) {
    var i,
        d = 0

    for (i = 0; i < color1.length; i++) {
      d += (color1[i] - color2[i])*(color1[i] - color2[i])
    }
    return Math.sqrt(d)
  }

  render () {
    let closestColorName = ''
    let closestColor = ''
    let closestColorDistance = 999999

    // loop through all the generated colors, find the closest
    for (var i = 0; i < this.colorRows.length; i++) {
      for (var i2 = 0; i2 < this.colorRows[i].length; i2++) {
        var color1 = Color(this.state.color).toRGB()
        color1 = [color1.red, color1.green, color1.blue]
        var color2 = Color(this.colorRows[i][i2][1]).toRGB()
        color2 = [color2.red, color2.green, color2.blue]
        var distance = this.colorDistance(color1,color2)
        if (closestColorDistance > distance) {
          closestColorName = this.colorRows[i][i2][0]
          closestColor = this.colorRows[i][i2][1]
          closestColorDistance = distance
        }
      }
    }

    console.log(closestColorName)
    // set active
    if (document.querySelector(".color-swatch.active")){
      document.querySelector(".color-swatch.active").classList.remove("active")
    }
    document.querySelector(`.color-swatch[data-color-name="${closestColorName}"]`).className += " active"
    // update the name
    document.querySelector(".color-name .name").innerHTML = closestColorName
    document.querySelector(".color-name .color-css").value = this.state.color

    console.log('ColorPicker#render', this.state)
  }
}

module.exports = ColorPicker