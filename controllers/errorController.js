const AppError = require('../utils/appError');

const copyError = (err) => {
  const errorCopy = {};

  // Copy all own property names (enumerable + non-enumerable)
  Object.getOwnPropertyNames(err).forEach((key) => {
    errorCopy[key] = err[key];
  });

  // Optionally include symbol properties (rare in Mongoose errors)
  Object.getOwnPropertySymbols(err).forEach((sym) => {
    errorCopy[sym] = err[sym];
  });

  errorCopy.name = err.name;

  return errorCopy;
};

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const message = `Duplicate field value: ${err.keyValue.name}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJwtError = () =>
  new AppError('Invalid token. Please login again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token expired. Please login again!', 401);

const sendDevError = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    //API Error
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  }
  //RENDERED Error
  res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};
const sendProdError = (err, req, res) => {
  //API Error
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      // Operational, trusted error: send message to client
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // Programming or other unknown error: don't leak error details
    console.error(`Error💥: ${err}`);
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
  //RENDERED Error
  if (err.isOperational) {
    // Operational, trusted error: send message to client
    console.error(`Error💥: ${err}`);
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
  console.error(`Error💥: ${err}`);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    // Development error handling
    sendDevError(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    // Production error handling
    let error = copyError(err);
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) {
      error = handleDuplicateFieldsDB(error);
    }
    if (error.name === 'ValidationError') {
      error = handleValidationErrorDB(error);
    }
    if (error.name === 'JsonWebTokenError') error = handleJwtError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    //Send Error message to client
    sendProdError(error, req, res);
  }
};
