var os = require('os')

const { pressed, findMatchingCommandsByKeys } = require('../utils/keytracker')

const { getInitialStateRenderer } = require('electron-redux')
const configureStore = require('../shared/store/configureStore')

const store = configureStore(getInitialStateRenderer(), 'renderer')

const capitalizeSingleLetters = keystroke => keystroke.split('+').map(k => k.length === 1 ? k.toUpperCase() : k).join('+')

const keystrokeFor = commandCode => capitalizeSingleLetters(store.getState().entities.keymap[commandCode])

let IS_MAC = os.platform() === 'darwin'
//IS_MAC = false

const CMD_OR_CTRL = IS_MAC ? '\u2318' : '\u2303'
const CODE_CMD_OR_CTRL = IS_MAC ? 'Command' : 'Control'

const MODIFIER_MAP = {
  'Command': '\u2318',
  'Cmd': '\u2318',
  'CommandOrControl': CMD_OR_CTRL,
  'CmdOrCtrl': CMD_OR_CTRL,
  'Super': '\u2318',
  'Control': '\u2303',
  'Ctrl': '\u2303',
  'Shift': '\u21e7',
  'Alt': IS_MAC ? 'Option' : 'Alt', // \u2325
}

const CODE_MODIFIER_MAP = {
  'Command': 'Command',
  'Cmd': 'Command',
  'CommandOrControl': CODE_CMD_OR_CTRL,
  'CmdOrCtrl': CODE_CMD_OR_CTRL,
  'Super': 'Super',
  'Control': 'Control',
  'Ctrl': 'Control',
  'Shift': 'Shift',
  'Alt': IS_MAC ? 'Option' : 'Alt', // \u2325
}

//这里把 ◄ 换成 ◀
const KEY_MAP = {
  'Left': '◀',
  'Right': '▶',
  'Up': '▲',
  'Down': '▼',
  'CapsLock': 'caps lock',
  'Escape': 'esc',
  'Tab': IS_MAC ? 'tab' : '↹ tab',
  'Return': IS_MAC ? 'return' : 'enter',
  'Fn': IS_MAC ? 'fn': 'insert',
  'Delete': IS_MAC ? 'delete ⌦' : 'delete',
  'LeftShift': '⇧ shift',
  'LeftControl':  IS_MAC ? 'control' : '\u2303 ctrl',
  'LeftCommand': '\u2318 command',
  'LeftAlt': IS_MAC ? 'option' : 'alt',
  'RightShift': '⇧ shift',
  'RightControl':  IS_MAC ? 'control' : '\u2303 ctrl',
  'RightCommand': '\u2318 command',
  'RightAlt': IS_MAC ? 'option' : 'alt',
  'Space': ' ',
  'Backspace': 'backspace',
  'Home': 'home',
  'End': 'end',
  'PageUp': 'page<br/>up',
  'PageDown': 'page down',
  'F13': IS_MAC ? 'F13': 'printscr',
  'F14': IS_MAC ? 'F14': 'scroll',
  'F15': IS_MAC ? 'F15': 'break',
  'Windows': '❖'
}

const CODE_KEY_MAP = {
  '`': 'tilde',
  '=': 'equals',
  '[': 'leftbracket',
  ']': 'rightbracket',
  '\\': 'backslash',
  ',': 'comma',
  '.': 'period',
  '/': 'forwardslash',
  'LeftAlt': IS_MAC ? 'leftoption' : 'leftalt',
  'RightAlt': IS_MAC ? 'rightoption' : 'rightalt',
}

let keyMapLeft = [
  'Escape F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12',
  '` 1 2 3 4 5 6 7 8 9 0 - = Backspace',
  `Tab Q W E R T Y U I O P [ ] \\`,
  `CapsLock A S D F G H J K L ; ' Return`,
  'LeftShift Z X C V B N M , . / RightShift',
  'LeftControl LeftAlt LeftCommand Space RightCommand RightAlt RightControl'
]

if (!IS_MAC) {keyMapLeft[5] = 'LeftControl Windows LeftAlt Space RightAlt Windows RightControl'}

let keyMapRight = [
  `F13 F14 F15`,
  `Fn Home PageUp`,
  `Delete End PageDown`,
  ``,
  `Up`,
  `Left Down Right`
]

let commands = [
  ["文件", [
      ['保存', keystrokeFor("menu:file:save")],
      ['打开...', keystrokeFor("menu:file:open")],
      ['<strong>导出为 GIF 动图</strong>', keystrokeFor("menu:file:export-animated-gif")],
      ['<strong>打印为工作表...</strong>', keystrokeFor("menu:file:print-worksheet")],
      ['导入工作表...', keystrokeFor("menu:file:import-worksheets")],
      ['<strong>导入图像...</strong>', keystrokeFor("menu:file:import-images")],
    ]
  ],
  ["编辑", [
      ['<strong>撤销</strong>', keystrokeFor("menu:edit:undo")],
      ['恢复', keystrokeFor("menu:edit:redo")],
      ['复制', keystrokeFor("menu:edit:copy")],
      ['粘贴', keystrokeFor("menu:edit:paste")],
      // ['Select All', keystrokeFor("menu:edit:select-all")],
    ]
  ],
  ["导航", [
      ['<strong>上一个画板</strong>', keystrokeFor("menu:navigation:previous-board")],
      ['<strong>下一个画板</strong>', keystrokeFor("menu:navigation:next-board")],
      ['上一个场景', keystrokeFor("menu:navigation:previous-scene")],
      ['下一个场景', keystrokeFor("menu:navigation:next-scene")],
    ]
  ],
  ["画板", [
      ['<strong>创建新画板</strong>', keystrokeFor("menu:boards:new-board")],
      ['在前面创建新画板', keystrokeFor("menu:boards:new-board-before")],
      ['<strong>删除画板</strong>', keystrokeFor("menu:boards:delete-boards")],
      ['删除画板并向前移动', keystrokeFor("menu:boards:delete-boards-go-forward")],
      ['<strong>创建画板副本</strong>', keystrokeFor("menu:boards:duplicate")],
      ['向左重新排序', keystrokeFor("menu:boards:reorder-left")],
      ['向右重新排序', keystrokeFor("menu:boards:reorder-right")],
      ['将画板标记为新镜头', keystrokeFor("menu:boards:toggle-new-shot")],
    ]
  ],
  ["工具", [
      ['<strong>软铅笔</strong>', keystrokeFor("menu:tools:light-pencil")],
      ['铅笔', keystrokeFor("menu:tools:pencil")],
      ['<strong>钢笔</strong>', keystrokeFor("menu:tools:pen")],
      ['刷子', keystrokeFor("menu:tools:brush")],
      ['记号笔', keystrokeFor("menu:tools:note-pen")],
      ['擦子', keystrokeFor("menu:tools:eraser")],
      ['<strong>清除所有图层</strong>', keystrokeFor("menu:tools:clear-all-layers")],
      ['清除当前图层', keystrokeFor("menu:tools:clear-layer")],
      ['<strong>增大笔刷大小</strong>', keystrokeFor("drawing:brush-size:dec")],
      ['<strong>减少笔刷大小</strong>', keystrokeFor("drawing:brush-size:inc")],
      ['使用 1 号调色板', keystrokeFor("menu:tools:palette-color-1")],
      ['使用 2 号调色板', keystrokeFor("menu:tools:palette-color-2")],
      ['使用 3 号调色板', keystrokeFor("menu:tools:palette-color-3")],
      ['水平翻转', keystrokeFor("menu:tools:flip-horizontal")],
      ['<strong>在 Photoshop 上编辑</strong>', keystrokeFor("menu:tools:edit-in-photoshop")],
    ]
  ],
  ["视图", [
      ['<strong>切换视图</strong>', keystrokeFor("menu:view:cycle-view-mode")],
      ['反向切换视图', keystrokeFor("menu:view:cycle-view-mode-reverse")],
      ['切换洋葱皮', keystrokeFor("menu:view:onion-skin")],
      ['切换字幕', keystrokeFor("menu:view:toggle-captions")],
      ['全屏', keystrokeFor("menu:view:toggle-full-screen")],
    ]
  ],
  ["窗口", [
      ['退出 StoryBoarder', keystrokeFor("menu:window:close")],
      ['最小化窗口', keystrokeFor("menu:window:minimize")],
    ]
  ],
  ["帮助", [
      ['获取一些提示!', keystrokeFor("menu:help:show-story-tip")],
    ]
  ],

]

const acceleratorAsHtml = (accelerator, options = { animated: true }) => {
  let splitOn
  if (accelerator.includes('|')) {
    splitOn = "|"
  } else {
    splitOn = "+"
  }
  accelerator = accelerator
    .split(splitOn)
    .map(function(k) {
      let m = MODIFIER_MAP[k]
      if (m) {
        return `<kbd class="modifier${ options.animated ? ' modifier-key-anim' : ''}">${m}</kbd>`
      } else {
        return `<kbd ${ options.animated ? 'class="action-key-anim"' : ''}>${KEY_MAP[k] || k}</kbd>`
      }
    })

  if (splitOn == "|") {
    accelerator = accelerator.join('OR')
  } else {
    accelerator = accelerator.join("+")
  }
  return accelerator
}

const acceleratorParts = (accelerator) => {
  let splitOn
  if (accelerator.includes('|')) {
    splitOn = "|"
  } else {
    splitOn = "+"
  }

  let keyMods = []
  let keyRoot = []

  accelerator = accelerator
    .split(splitOn)
    .map(function(k) {
      let m = CODE_MODIFIER_MAP[k]
      if (m) {
        keyMods.push(m)
      } else {
        keyRoot.push((CODE_KEY_MAP[k] || k.toLowerCase()))
      }
    })
  return [keyMods, keyRoot]
}


let renderKeyboard = () => {
  let html = []

  for (var i = 0; i < keyMapLeft.length; i++) {
    html.push('<div class="row">')
    let keys = keyMapLeft[i].split(' ')
    for (var y = 0; y < keys.length; y++) {
      let m = CODE_KEY_MAP[keys[y]]
      if (keys[y].length > 1) {
        html.push('<div class="key fill" id="key-' + (m || keys[y].toLowerCase()) + '"><span>' + (KEY_MAP[keys[y]] || keys[y]) + '</span></div>') 
      } else {
        html.push('<div class="key" id="key-' + (m || keys[y].toLowerCase()) + '"><span>' + (KEY_MAP[keys[y]] || keys[y]) + '</span></div>') 
      }
    }

    html.push('</div>')

  }

  document.querySelector('#keyboard .left').innerHTML = html.join('')

  html = []

  for (var i = 0; i < keyMapRight.length; i++) {
    html.push('<div class="row">')
    let keys = keyMapRight[i].split(' ')
    for (var y = 0; y < keys.length; y++) {
      if (keys[y]) {
        html.push('<div class="key" id="key-' + keys[y].toLowerCase() + '"><span>' + (KEY_MAP[keys[y]] || keys[y]) + '</span></div>') 
      }
    }

    html.push('</div>')

  }
  document.querySelector('#keyboard .right').innerHTML = html.join('')
}

let renderCommands = () => {
  let html = []
  let classType
  for (var i = 0; i < commands.length; i++) {
    html.push('<div class="set">')
    html.push('<div class="section color-' + (i+1) + '">')
    html.push(commands[i][0])
    classType = commands[i][0]
    html.push('</div>')
    for (var y = 0; y < commands[i][1].length; y++) {
      let commandParts = acceleratorParts(commands[i][1][y][1])
      html.push('<div class="command" data-type="' + classType + '" data-command="' + commands[i][1][y][1] + '" data-color="' + (i+1) + '" data-keytrigger="' + commandParts[1][0] + '">')
      html.push(commands[i][1][y][0])
      html.push('<span class="keyset">')
      // get the commands root command and put the classtype in that keyboard button
      let keyEl = document.querySelector('#key-' + commandParts[1][0])
      if (keyEl) {
        keyEl.classList.add('type-' + classType)
        if (!keyEl.dataset.color) {
          keyEl.dataset.color = (i+1)
        }
        //keyEl.classList.add('color-' + (i+1))
        keyEl.dataset.type = classType
      }
      html.push(acceleratorAsHtml(commands[i][1][y][1]))
      html.push('</span>')
      html.push('</div>')
    }
    html.push('</div>')
  }
  document.querySelector('.commands').innerHTML = html.join('')

  document.querySelectorAll('.command').forEach(el => {
    el.addEventListener('mouseenter', function(event) {
      document.querySelector('#keyboard').classList.add('hover')
      document.querySelectorAll('.key.type-' + event.target.dataset.type ).forEach(keyEl => {
        keyEl.classList.add('highlight')
        keyEl.classList.add('color-' + event.target.dataset.color)
      })
      let commandParts = acceleratorParts(event.target.dataset.command)
      let keyEl = document.querySelector('#key-' + commandParts[1][0])
      if (keyEl) {
        let modifierSide
        if (keyEl.getBoundingClientRect().left > 480) {
          modifierSide = 'right'
        } else {
          modifierSide = 'left'
        }
        let i
        for (i = 0; i < commandParts[0].length; i++) {
          document.querySelector('#key-' + modifierSide + commandParts[0][i].toLowerCase()).classList.add('active')
          document.querySelector('#key-' + modifierSide + commandParts[0][i].toLowerCase()).classList.add('color-' + event.target.dataset.color)
          document.querySelector('#key-' + modifierSide + commandParts[0][i].toLowerCase()).classList.add('highlight')
        }
        keyEl.classList.add('active')
      }
    });

    el.addEventListener('mouseleave', function(event) {
      document.querySelectorAll('.key.type-' + event.target.dataset.type ).forEach(keyEl => {
        keyEl.classList.remove('highlight')
        keyEl.classList.remove('active')
        keyEl.classList.remove('color-' + event.target.dataset.color)
      })
      document.querySelectorAll('.key.fill').forEach(keyEl => {
        keyEl.classList.remove('color-1')
        keyEl.classList.remove('color-2')
        keyEl.classList.remove('color-3')
        keyEl.classList.remove('color-4')
        keyEl.classList.remove('color-5')
        keyEl.classList.remove('color-6')
        keyEl.classList.remove('color-7')
        keyEl.classList.remove('color-8')
        keyEl.classList.remove('highlight')
        keyEl.classList.remove('active')
     })
     document.querySelector('#keyboard').classList.remove('hover')
    });
  });

  document.querySelectorAll('#keyboard .key').forEach(el => {
    el.addEventListener('mouseenter', function(event) {
      if (event.target.dataset.color) {
        event.target.classList.add('active')
        event.target.classList.add('color-' + event.target.dataset.color)
      }
      document.querySelectorAll('.command[data-keytrigger="' + event.target.id.split('-')[1] + '"]').forEach(keyEl => {
        keyEl.classList.add('highlight')
      })
    });
    el.addEventListener('mouseleave', function(event) {
      event.target.classList.remove('active')
      event.target.classList.remove('color-' + event.target.dataset.color)
      document.querySelectorAll('.command').forEach(keyEl => {
        keyEl.classList.remove('highlight')
      })
    });
  });

  // key command tester
  let outputEl = document.createElement('div')
  outputEl.innerHTML = `<div
    class="output"
    style="color: rgba(255, 255, 255, 0.8); font-size: 13px; position: absolute; bottom: 0; left: 0">
  </div>`
  document.querySelector('.commands').appendChild(outputEl.firstChild)
  const renderKeyTester = event => {
    let matchingCommands = findMatchingCommandsByKeys(store.getState().entities.keymap, pressed()).join(', ')
    let keysStr = `<span style="color: rgba(255, 255, 255, 0.6); letter-spacing: 0.05em">PRESSED</span>
                   <span style="color: rgba(255, 255, 255, 0.8)">${pressed().join('+')}</span>`
    let matchingCommandsStr = matchingCommands
      ? `&nbsp;&nbsp;&nbsp;
          <span style="color: rgba(255, 255, 255, 0.6); letter-spacing: 0.05em">COMMANDS</span>
          <span style="color: rgba(255, 255, 255, 0.8)">${matchingCommands}</span>
         `
      : ''
    document.querySelector('.output').innerHTML = keysStr + matchingCommandsStr
  }
  const resetKeyTester = event => document.querySelector('.output').innerHTML = ''
  window.addEventListener('keydown', renderKeyTester)
  window.addEventListener('keyup', resetKeyTester)
  window.addEventListener('blur', resetKeyTester)
  document.addEventListener('visibilitychange', resetKeyTester)

}

window.ondragover = () => { return false }
window.ondragleave = () => { return false }
window.ondragend = () => { return false }
window.ondrop = () => { return false }

renderKeyboard()
renderCommands()