import { createHash } from "crypto"

export const shuffle = <T>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export const hashPassword = (password: string): string =>
  createHash("sha256").update(password).digest("hex")

export function* makeBatches<T>(arr: T[], batchSize: number): IterableIterator<T[]> {
  const n = arr.length
  for (let i = 0; i < n; i += batchSize) {
    yield arr.slice(i, i + batchSize)
  }
}

const urlRegex = /^((http[s]?|ftp):\/)?\/?([^:\/\s]+)((\/\w+)*\/)([\w\-\.]+[^#?\s]+)(.*)?(#[\w\-]+)?$/
export const isURL = (str: string): boolean => urlRegex.test(str)
