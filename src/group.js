var sortBy = require('lodash.sortby');
var moment = require('moment');
var gaussian = require('@quarterto/gaussian');

var pairs = xs => xs.length < 2 ? [] : [xs.slice(0, 2)].concat(pairs(xs.slice(1)));

const MONTH_MS = (365.2425 / 12) * 24 * 60 * 60 * 1000;
var sixMonthsAgo = moment().subtract(6, 'months');

module.exports = class TransactionGroup {
	static from(t) {
		if(t instanceof Group) return t;
		if(t.transactions)     return new Group(t.transactions);
		if(Array.isArray(t))   return new Group(t);
		throw new Error(`Can't convert ${t} to Group`);
	}

	constructor(transactions) {
		this.transactions = transactions;
	}

	add(transaction) {
		this.transactions.push(transaction);
		return this;
	}

	get gaussian() {
		return gaussian(this.transactions.map(t => t.amount));
	}

	get timeGaussian() {
		if(this.length <= 2) return {};
		return gaussian(pairs(sortBy(this.transactions, t => new Date(t.date))).map(([t1, t2]) => {
			return new Date(t2.date) - new Date(t1.date);
		}));
	}

	get recurring() {
		var expectedIn6Months = 6 * MONTH_MS / this.timeGaussian.μ;
		var actualIn6Months = this.transactions.filter(t => moment(t.date).isAfter(sixMonthsAgo)).length;
		var sdevThreshold = 2 * MONTH_MS * Math.atan(this.timeGaussian.μ / MONTH_MS) / 10;

		return this.length > 2
		  && this.timeGaussian.σ < sdevThreshold
		  && Math.pow(1 - actualIn6Months / expectedIn6Months, 2) < 0.1;
	}

	get perMonth() {
		return MONTH_MS * this.gaussian.μ / this.timeGaussian.μ;
	}

	get length() {
		return this.transactions.length;
	}

	toString() {
		return this.name;
	}

	toJSON() {
		return {
			transactions: this.transactions,
			gaussian:     this.gaussian,
			timeGaussian: this.timeGaussian,
			recurring:    this.recurring,
			perMonth:     this.perMonth,
		};
	}
}
