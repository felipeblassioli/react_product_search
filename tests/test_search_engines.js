var SearchEngines = require('../src/search_engine');
var _ = require('underscore');

var ProductsInvertedTokenIndexEngine = SearchEngines.ProductsInvertedTokenIndexEngine;

console.log('Tests SearchEngines...');

var products = require('./data/recepedia_products_short.json');

var kwargs = {
	datumTokenizer: function(datum){
		tokens = _.filter(datum.tags_tokens, function(d){ return d.category === 'branded' || d.category === 'diverse' });
		tokens = _.map(tokens, function(t){ return t.name });
		return tokens; 
	},
	queryTokenizer:  function(query){
		return [query];
	}
};
var se = new ProductsInvertedTokenIndexEngine(kwargs);

//datumTokenizer, queryTokenizer
se.add(products);
q = 'AdeS AdeS Original';
console.log(se.search(q));

