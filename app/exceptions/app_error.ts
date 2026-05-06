export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'AppError'
  }

  static badRequest(message: string, code = 'BAD_REQUEST') {
    return new AppError(400, code, message)
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new AppError(401, code, message)
  }

  static forbidden(message = 'Insufficient permissions', code = 'FORBIDDEN') {
    return new AppError(403, code, message)
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new AppError(404, code, message)
  }

  static conflict(message: string, code = 'CONFLICT') {
    return new AppError(409, code, message)
  }

  static internal(message = 'An unexpected error occurred', code = 'INTERNAL_ERROR') {
    return new AppError(500, code, message)
  }
}
