class ApiResponse {
  constructor(statusCode, message, data = null) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  static ok(res, message = 'Success', data = null) {
    return res.status(200).json(new ApiResponse(200, message, data));
  }

  static created(res, message = 'Created successfully', data = null) {
    return res.status(201).json(new ApiResponse(201, message, data));
  }

  static noContent(res) {
    return res.status(204).end();
  }

  static error(res, statusCode, message, errors = []) {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      errors,
    });
  }
}

export default ApiResponse;
