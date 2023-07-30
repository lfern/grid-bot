const {bitfinex2} = require('./bitfinex2');
const {bitmex} = require('./bitmex');
const {deribit} = require('./deribit');

exports.overrides = {
    bitfinex2,
    deribit,
    //bitmex
}