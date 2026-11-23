// Signal 2's plants; `expected.ts` names each reported line.
import { readFile as savedAtReader } from 'node:fs'
export const changingLine = 1
export function undoAll(trashBin: number): number { return trashBin }
export class QueryText {
  movingLines = 0
  #stalkPile = 0
  get savedAt(): number { return this.#stalkPile }
}
export interface Reading {
  searchTerm: string
}
export type Shape = { gua_name: string }
export enum Mode { Undo }
export const options = { trashCan: 1 }
export const handlers = { undoStep() {} }
export function identity<SearchTerms>(value: SearchTerms): SearchTerms { return value }
export const named = function stalkPiles() {}
export const Built = class GuaTable {}
export const isDRMGate = true
export const changing2Line = 0
export const label = 'Pick a search term'
export const banner = `Undo ${label} now`
export const help = `First line,
then a changing line
at the end.`
export type Tag = 'saved at' | 'plain'
