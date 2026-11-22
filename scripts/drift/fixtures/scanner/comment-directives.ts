'use strict'
// eslint-disable-next-line no-console
console.log(1)
// @ts-expect-error: a planted type error
const wrong: number = 'text'
