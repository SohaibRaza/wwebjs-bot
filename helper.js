function getExceptionMessage(exceptionDetails) {
  // Your logic to extract the exception message
  return exceptionDetails.text || "Unknown error";
}

module.exports = { getExceptionMessage };
