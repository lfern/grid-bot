class ExchangeError extends Error {
    constructor(message) {
      super(message);
      this.name = "ExchangeError";
    }
}

class ExchangeNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "ExchangeNotFoundError";
  }
}

module.exports = {
  ExchangeError,
  ExchangeNotFoundError
}