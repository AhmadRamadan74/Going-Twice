"""Application-level exceptions raised by services."""


class AppError(Exception):
    def __init__(self, message: str, code: str = "APP_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, resource: str, identifier: str = ""):
        msg = f"{resource} not found"
        if identifier:
            msg = f"{resource} '{identifier}' not found"
        super().__init__(message=msg, code="NOT_FOUND")


class ConflictError(AppError):
    def __init__(self, message: str):
        super().__init__(message=message, code="CONFLICT")


class AuthenticationError(AppError):
    def __init__(self, message: str = "Invalid credentials"):
        super().__init__(message=message, code="AUTHENTICATION_ERROR")


class AuthorizationError(AppError):
    def __init__(self, message: str = "Permission denied"):
        super().__init__(message=message, code="AUTHORIZATION_ERROR")


class ValidationError(AppError):
    def __init__(self, message: str, errors: list | dict | None = None):
        super().__init__(message=message, code="VALIDATION_ERROR")
        self.errors = errors


class ForbiddenError(AppError):
    def __init__(self, message: str = "Access denied"):
        super().__init__(message=message, code="FORBIDDEN")


class ThrottledError(AppError):
    def __init__(
        self,
        message: str = "Please wait before trying again.",
        *,
        retry_after_seconds: int | None = None,
    ):
        super().__init__(message=message, code="TOO_MANY_REQUESTS")
        self.retry_after_seconds = retry_after_seconds
