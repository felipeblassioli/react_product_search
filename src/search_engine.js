var _ = require('underscore');

var ProductsInvertedTokenIndexEngine = function(kwargs){

	this.init = function(kwargs){
		this._index = {};
		this._data = {};
		this._tokens = [];

		kwargs = kwargs || {};
		if (!kwargs.datumTokenizer || !kwargs.queryTokenizer) {
			console.error('ERROR: datumTokenizer and queryTokenizer are both required');
		}
		//transform datum into array of tokens
		this.datumTokenizer = kwargs.datumTokenizer; 
		//transform query into array of tokens
		this.queryTokenizer = kwargs.queryTokenizer;
		this.identify = kwargs.identify || function(datum){
			return datum.id;
		};
		this.identifyToken = kwargs.identifyToken || function(token){
			return token;
		};
		this.normalizeToken = kwargs.normalizeToken || function(token){
			return token.toLowerCase();
		};
		this.normalizeTokens = function(tokens){ return _.map(tokens, this.normalizeToken); }.bind(this);
	}.bind(this);

	this.add = function(data){
		/* Compliance with old QI stuff */
		/* Expected product has fields: {id, name, tags_tokens} */
		/* tags_tokens is an array of {name, category, type} */
		var that = this;
		var data = _.isArray(data) ? data : [data];

		_.each(data, function(product){
			var tokens = that.datumTokenizer(product); 
			var indexEntry = that.identify(product);
			that._data[indexEntry] = product;

			_.each(tokens, function(token){
				that._tokens.push(token);
				var indexKey = that.normalizeToken(that.identifyToken(token));
				
				if(_.isArray(that._index[indexKey]))
					that._index[indexKey].push(indexEntry);
				else
					that._index[indexKey] = [indexEntry];
			});
		});
	}.bind(this);

	this.search = function(q){
		var tokens = this.normalizeTokens(_.map(this.queryTokenizer(q), this.identifyToken));
		var that = this;
		var ids = _.intersection.apply(this, _.map(tokens, function(t){ return that._index[t]; }));
		return _.map(ids, function(id){ return that._data[id]; }); 
	}.bind(this);

	this.getTokens = function(){
		//return _.keys(this._index);
		return this._tokens;
	};

	this.init(kwargs);
};

module.exports = {
	ProductsInvertedTokenIndexEngine: ProductsInvertedTokenIndexEngine
};
