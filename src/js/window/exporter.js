const fs = require('fs-extra')
const path = require('path')
const GIFEncoder = require('gifencoder')
const moment = require('moment')
const app = require("electron").remote.app
const { dialog } = require('electron').remote

const {
  boardFileImageSize,
  boardFilenameForExport,
  boardFilenameForPosterFrame
} = require('../models/board')
const {
  getImage,
  exportFlattenedBoard,
  ensureExportsPathExists,
  flattenBoardToCanvas
} = require('../exporters/common')

const exporterFcpX = require('../exporters/final-cut-pro-x')
const exporterFcp = require('../exporters/final-cut-pro')
const exporterPDF = require('../exporters/pdf')
const exporterCleanup = require('../exporters/cleanup')
const exporterFfmpeg = require('../exporters/ffmpeg')
const util = require('../utils/index')

class Exporter {
  exportCleanup (boardData, projectFileAbsolutePath) {
    return new Promise((resolve, reject) => {
      dialog.showMessageBox(
        null,
        {
          type: 'warning',
          title: '清理...',
          message: `清理删除未使用的图像文件, 这确实是可以减少文件大小, 但这是无法挽回的. 你确定要这么做吗?`,
          buttons: ['是', '否'],
      }).then(({ response }) => {
        if (response == 1) {
          reject()
        } else {
          exporterCleanup.cleanupScene(projectFileAbsolutePath).then(newBoardData => {
            resolve(newBoardData)
          }).catch(err => {
            reject(err)
          })
        }
      }).catch(err => console.error(err))
    })
  }

  async exportFcp (boardData, projectFileAbsolutePath) {
    let exportsPath = ensureExportsPathExists(projectFileAbsolutePath)

    let basename = path.basename(projectFileAbsolutePath)
    let outputPath = path.join(
      exportsPath,
      util.dashed(basename + ' Exported ' + moment().format('YYYY-MM-DD hh.mm.ss'))
    )
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath)
    }

    let data = await exporterFcp.generateFinalCutProData(boardData, { projectFileAbsolutePath, outputPath })
    let xml = exporterFcp.generateFinalCutProXml(data)
    fs.writeFileSync(path.join(outputPath, util.dashed(basename + '.xml')), xml)

    let fcpxData = await exporterFcpX.generateFinalCutProXData(boardData, { projectFileAbsolutePath, outputPath })
    let fcpxml = exporterFcpX.generateFinalCutProXXml(fcpxData)
    fs.writeFileSync(path.join(outputPath, util.dashed(basename + '.fcpxml')), fcpxml)

    // export ALL layers of each one of the boards
    let basenameWithoutExt = path.basename(projectFileAbsolutePath, path.extname(projectFileAbsolutePath))
    let writers = boardData.boards.map(async (board, index) => {
      let filenameForExport = util.dashed(boardFilenameForExport(board, index, basenameWithoutExt))

      await exportFlattenedBoard(
        board,
        filenameForExport,
        boardFileImageSize(boardData),
        projectFileAbsolutePath,
        outputPath
      )
    })
    await Promise.all(writers)

    // export ALL audio
    boardData.boards.forEach((board, index) => {
      if (board.audio && board.audio.filename && board.audio.filename.length) {
        fs.copySync(
          path.join(path.dirname(projectFileAbsolutePath), 'images', board.audio.filename),
          path.join(outputPath, board.audio.filename)
        )
      }
    })

    return outputPath
  }
 
  exportPDF (boardData, projectFileAbsolutePath, _paperSize, _paperOrientation, _rows, _cols, _spacing, _filepath, shouldWatermark = false, watermarkImagePath = undefined, watermarkDimensions = []) {
    return new Promise((resolve, reject) => {
      let outputPath = app.getPath('temp')

      let basenameWithoutExt = path.basename(projectFileAbsolutePath, path.extname(projectFileAbsolutePath))

      boardData.boards.forEach((board, index) => {
        let from = path.join(path.dirname(projectFileAbsolutePath), 'images', boardFilenameForPosterFrame(board))
        let to = path.join(outputPath, `board-` + index + '.jpg')
        try {
          if (!fs.existsSync(from)) throw new Error('Missing posterframe ' + from)

          fs.copySync(from, to)
        } catch (err) {
          reject(err)
        }
      })

      try {
        let exportsPath = ensureExportsPathExists(projectFileAbsolutePath)
        let filepath = _filepath ? _filepath : path.join(exportsPath, basenameWithoutExt + ' ' + moment().format('YYYY-MM-DD hh.mm.ss') + '.pdf')
        let paperSize = _paperSize ? _paperSize : 'LTR'
        let paperOrientation = _paperOrientation ? _paperOrientation : "landscape"
        let rows = _rows ? _rows : 3
        let cols = _cols ? _cols : 3
        let spacing = _spacing ? _spacing : 10
        exporterPDF.generatePDF(
          paperSize,
          paperOrientation,
          rows,
          cols,
          spacing,
          boardData,
          basenameWithoutExt,
          filepath,
          shouldWatermark,
          watermarkImagePath,
          watermarkDimensions
        )
        resolve(filepath)
      } catch(err) {
        reject(err)
      }
    })
  }

  exportImages (boardData, projectFileAbsolutePath, outputPath = null) {
    return new Promise((resolve, reject) => {
      let exportsPath = ensureExportsPathExists(projectFileAbsolutePath)
      let basename = path.basename(projectFileAbsolutePath)
      if (!outputPath) {
        outputPath = path.join(
          exportsPath,
          basename + ' Images ' + moment().format('YYYY-MM-DD hh.mm.ss')
        )
      }

      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath)
      }

      // export ALL layers of each one of the boards
      let writers = []
      let basenameWithoutExt = path.basename(projectFileAbsolutePath, path.extname(projectFileAbsolutePath))
      boardData.boards.forEach((board, index) => {
        writers.push(
          new Promise((resolve, reject) => {
            let filenameForExport = boardFilenameForExport(board, index, basenameWithoutExt)
            exportFlattenedBoard(
              board,
              filenameForExport,
              boardFileImageSize(boardData),
              projectFileAbsolutePath,
              outputPath
            )
            .then(() => resolve())
            .catch(err => reject(err))
          })
        )
      })

      Promise.all(writers).then(() => {
        resolve(outputPath)
      }).catch(err => {
        reject(err)
      })
    })
  }

  async exportAnimatedGif (boards, boardSize, destWidth, projectFileAbsolutePath, mark, boardData, watermarkSrc = './img/watermark.png') {
    let aspect = boardSize.height / boardSize.width
    let destSize = {
      width: destWidth,
      height: Math.floor(destWidth * aspect)
    }
    const fragmentText = (ctx, text, maxWidth) => {
      let words = text.split(' ')
      let lines = []
      let line = ''
      if (ctx.measureText(text).width < maxWidth) {
        return [text]
      }
      while (words.length > 0) {
        while (ctx.measureText(words[0]).width >= maxWidth) {
          var tmp = words[0]
          words[0] = tmp.slice(0, -1)
          if (words.length > 1) {
            words[1] = tmp.slice(-1) + words[1]
          } else {
            words.push(tmp.slice(-1))
          }
        }
        if (ctx.measureText(line + words[0]).width < maxWidth) {
          line += words.shift() + ' '
        } else {
          lines.push(line)
          line = ''
        }
        if (words.length === 0) {
          lines.push(line)
        }
      }
      return lines
    }

    const watermarkImage = await getImage(watermarkSrc)

    const canvases = await Promise.all(
      boards.map(async (board) =>
        // returns a Promise
        flattenBoardToCanvas(
          board,
          null,
          [destSize.width, destSize.height],
          projectFileAbsolutePath
        )
      )
    )

    let encoder = new GIFEncoder(destSize.width, destSize.height)

    // save in the exports directory
    let exportsPath = ensureExportsPathExists(projectFileAbsolutePath)
    let basename = path.basename(projectFileAbsolutePath, path.extname(projectFileAbsolutePath))
    let filepath = path.join(
      exportsPath,
      basename + ' ' + moment().format('YYYY-MM-DD hh.mm.ss') + '.gif'
    )

    encoder.createReadStream().pipe(fs.createWriteStream(filepath))
    encoder.start()
    encoder.setRepeat(0) // 0 for repeat, -1 for no-repeat
    encoder.setDelay(boardData.defaultBoardTiming) // frame delay in ms
    encoder.setQuality(10) // image quality. 10 is default.
    for (var i = 0; i < boards.length; i++) {
      let canvas = canvases[i]
      let context = canvas.getContext('2d')
      if (mark) {
        let dst = { width: Math.floor(destSize.width / 4), height: Math.floor(destSize.height / 4) }
        let src = { width: watermarkImage.width, height: watermarkImage.height }
        let [x, y, w, h] = util.fitToDst(dst, src)
        if (
          src.width <= dst.width &&
          src.height <= dst.height
        ) {
          context.drawImage(
            watermarkImage,
            destSize.width - watermarkImage.width,
            destSize.height - watermarkImage.height
          )
        } else {
          context.drawImage(
            watermarkImage,
            destSize.width - w,
            destSize.height - h,
            w,
            h
          )
        }
      }
      if (boards[i].dialogue) {
        let text = boards[i].dialogue
        let fontSize = 22
        context.font = '300 ' + fontSize + 'px thicccboi, sans-serif'
        context.textAlign = 'center'
        context.fillStyle = 'white'
        context.miterLimit = 1
        context.lineJoin = 'round'
        context.lineWidth = 4
        let lines = fragmentText(context, text, 450)

        let outlinecanvas = document.createElement('canvas')
        let outlinecontext = outlinecanvas.getContext('2d')
        outlinecanvas.width = destSize.width
        outlinecanvas.height = destSize.height

        lines.forEach((line, i) => {
          let xOffset = (i + 1) * (fontSize + 6) + (destSize.height - ((lines.length + 1) * (fontSize + 6))) - 20
          let textWidth = context.measureText(line).width / 2
          outlinecontext.lineWidth = 15
          outlinecontext.lineCap = 'square'
          outlinecontext.lineJoin = 'round'
          outlinecontext.strokeStyle = 'rgba(0,0,0,1)'
          let padding = 35
          outlinecontext.fillRect((destWidth / 2) - textWidth - (padding / 2), xOffset - (6) - (padding / 2), textWidth * 2 + padding, padding)
          outlinecontext.strokeRect((destWidth / 2) - textWidth - (padding / 2), xOffset - (6) - (padding / 2), textWidth * 2 + padding, padding)

          // outlinecontext.beginPath()
          // outlinecontext.moveTo((destWidth/2)-textWidth, xOffset-(6))
          // outlinecontext.lineTo((destWidth/2)+textWidth, xOffset-(6))
          // outlinecontext.stroke()
        })

        context.globalAlpha = 0.5
        context.drawImage(outlinecanvas, 0, 0)
        context.globalAlpha = 1

        lines.forEach((line, i) => {
          let xOffset = (i + 1) * (fontSize + 6) + (destSize.height - ((lines.length + 1) * (fontSize + 6))) - 20
          context.lineWidth = 4
          context.strokeStyle = 'rgba(0,0,0,0.8)'
          context.strokeText(line.trim(), destWidth / 2, xOffset)
          context.strokeStyle = 'rgba(0,0,0,0.2)'
          context.strokeText(line.trim(), destWidth / 2, xOffset + 2)
          context.fillText(line.trim(), destWidth / 2, xOffset)
        })
      }
      let duration
      if (boards[i].duration) {
        duration = boards[i].duration
      } else {
        duration = boardData.defaultBoardTiming
      }
      encoder.setDelay(duration)
      encoder.addFrame(context)
    }
    encoder.finish()

    return filepath
  }

  async exportVideo (scene, sceneFilePath, opts) {
    let outputPath = ensureExportsPathExists(sceneFilePath)

    return await exporterFfmpeg.convertToVideo(
      {
        outputPath,
        sceneFilePath,
        scene,
        progressCallback: opts.progressCallback,
        shouldWatermark: opts.shouldWatermark,
        watermarkImagePath: opts.watermarkImagePath
      }
    )
  }
}

module.exports = new Exporter()
