export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
