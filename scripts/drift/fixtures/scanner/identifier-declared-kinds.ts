import { readFile as readText } from 'node:fs'
export { readText as loadText }
interface Shape { width: number; area(): number }
type Box = { depth: number }
enum Colour { Red, Green = 2 }
const point = { x: 1, move() {} }
function wrap<Item>(item: Item) {}
const named = function inner() {}
const Made = class Built {}
class Ledger { #secret = 1; #hide() { return this.#secret } }
const short = { point }
import * as files from 'node:fs'
export * as paths from 'node:path'
