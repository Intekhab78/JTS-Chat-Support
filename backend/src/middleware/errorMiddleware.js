const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: {
      code: err.code || "internal_error",
      details: err.details || null
    },
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: {
        code: err.code || "operational_error",
        details: err.details || null
      }
    });
  } else {
    console.error("ERROR", err);
    res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
      error: {
        code: "internal_error",
        details: null
      }
    });
  }
};

function normalizeError(err) {
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors || {})
      .map((error) => error.message)
      .join("; ");
    err.statusCode = 400;
    err.status = "fail";
    err.message = messages || "Validation failed";
    err.isOperational = true;
  }

  if (err.name === "CastError") {
    err.statusCode = 400;
    err.status = "fail";
    err.message = `Invalid ${err.path}: ${err.value}`;
    err.isOperational = true;
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(", ");
    err.statusCode = 409;
    err.status = "fail";
    err.message = `Duplicate value for: ${field}`;
    err.isOperational = true;
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    err.statusCode = 413;
    err.status = "fail";
    err.message = "File too large. Maximum size allowed is 10MB.";
    err.isOperational = true;
  }

  if (err.message && err.message.includes("Unsupported file type")) {
    err.statusCode = 400;
    err.status = "fail";
    err.message = err.message;
    err.isOperational = true;
  }

  return err;
}

const errorMiddleware = (err, req, res, next) => {
  err = normalizeError(err);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
    sendErrorDev(err, res);
  } else {
    sendErrorProd(err, res);
  }
};

export default errorMiddleware;
