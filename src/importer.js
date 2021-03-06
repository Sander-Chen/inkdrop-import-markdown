import fs from 'fs'
import path from 'path'
import { remote } from 'electron'
import Cutter from 'utf8-binary-cutter'
const { dialog } = remote
const { Note } = inkdrop.models

export function openImportDialog () {
  return dialog.showOpenDialog({
    title: 'Open Markdown file',
    properties: [
      'openFile', 'multiSelections'
    ],
    filters: [
      { name: 'Markdown Files', extensions: [ 'md', 'txt' ] }
    ]
  })
}

export async function importMarkdownFromMultipleFiles (files, destBookId) {
  try {
    for (let i = 0; i < files.length; ++i) {
      await importMarkdownFromFile(files[i], destBookId)
    }
  } catch (e) {
    inkdrop.notifications.addError('Failed to import the Markdown file', { detail: e.stack, dismissable: true })
  }
}

/*
 wri.pe: https://wri.pe/
 If the file was exported from 'wri.pe',
 the first line should be truncated from its body
 and be treated as a title.
 */
function isWripeFormat (fn) {
  return /page-\d+\.txt/.test(path.basename(fn))
}

function getTitleAndBodyFromMarkdown (fn, markDown) {
  const [firstLine, ...restLines] = markDown.split('\n')
  const title = Cutter.truncateToBinarySize(firstLine.replace(/^#+\s*/, ''), 128)
  if (isWripeFormat(fn)) {
    return {title: title, body: restLines.join('\n')}
  } else {
    return {title: title, body: markDown}
  }
}

function getMetaFromMarkdown (body) {
  const meta = {
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  return meta
}

export async function importMarkdownFromFile (fn, destBookId) {
  if (!destBookId) {
    throw new Error('Destination notebook ID is not specified.')
  }
  const markDown = fs.readFileSync(fn, 'utf-8')
  const {title, body} = getTitleAndBodyFromMarkdown(fn, markDown)
  const {tags, createdAt, updatedAt} = getMetaFromMarkdown(body)
  const note = new Note({title: title, body, tags, createdAt, updatedAt})
  note.bookId = destBookId
  await note.save()
}
