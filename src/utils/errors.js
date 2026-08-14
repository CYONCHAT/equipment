class AppError extends Error {
  constructor(message, code = 'APP_ERROR', status = 400, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

class ValidationError extends AppError {
  constructor(message, code = 'VALIDATION_ERROR', details) { super(message, code, 422, details); }
}
class AuthenticationError extends AppError {
  constructor(message, code = 'AUTHENTICATION_ERROR') { super(message, code, 401); }
}
class AuthorizationError extends AppError {
  constructor(message, code = 'AUTHORIZATION_ERROR') { super(message, code, 403); }
}
class NotFoundError extends AppError {
  constructor(message, code = 'NOT_FOUND') { super(message, code, 404); }
}
class ConflictError extends AppError {
  constructor(message, code = 'CONFLICT', details) { super(message, code, 409, details); }
}

module.exports = { AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError };
