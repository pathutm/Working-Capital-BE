const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    status: 'error',
    statusCode: status,
    message: message,
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

export default errorHandler;
