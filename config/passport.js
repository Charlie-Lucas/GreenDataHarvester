module.exports = function (passport) {
  require('./passport-strategies/passport-local')(passport);
};
