var React = require('react')
//var ReactDOM = require('react-dom');
var Reflux = require('reflux');
var _ = require('underscore')
var TypeaheadTokenizer = require('react-typeahead').Tokenizer;
var Promise = require('bluebird');

var SearchEngines = require('./search_engine');
/* API BEGIN */
//var ProductsActions = Reflux.createActions({'search': {children: ['completed', 'failed']}});

var SE;

var ProductsAPITest = {
	fetch: function(){
		return new Promise(function(resolve, reject){
			var products = require('../tests/data/recepedia_products_short.json');
			//var products = [];
			resolve(products);
		});
	},
	fetchTokens: function(){
		return new Promise(function(resolve, reject){
			var tokens = [];
			resolve(tokens);
		});
	},
	search: function(q){
		return new Promise(function(resolve, reject){
			var products = SE.search(q);
			resolve(products);
		});
	}
};
var ProductsAPI = ProductsAPITest;
/* API END */

/* ACTIONS BEGIN */
var TokensActions = Reflux.createActions(['addTokens']);
var SelectedTokensActions = Reflux.createActions(['addToken', 'removeToken']);
var ProductsActions = Reflux.createActions(['search']);
var SelectedProductsActions = Reflux.createActions(['toggleProduct', 'selectProduct', 'unselectProduct']);

/* ACTIONS END */

/* STORES BEGIN */
var TokensStore = Reflux.createStore({
	listenables: [TokensActions],
	init: function(){
		this._tokens = [];
	},
	onAddTokens: function(tokens){
		this._tokens = _.union(this._tokens, tokens);
		this.trigger(this._tokens);
	}
});

var SelectedTokensStore = Reflux.createStore({
	listenables: [SelectedTokensActions],
	init: function(){
		this._tokens = [];
	},
	onAddToken: function(token){
		this._tokens.push(token);
		this.trigger(this._tokens);
	},
	onRemoveToken: function(token){
		var index = this._tokens.indexOf(token);
		if (index > -1) {
			this._tokens.splice(index, 1);
		}
		this.trigger(this._tokens);
	}
});

var SelectedProductsStore = Reflux.createStore({
	listenables: [SelectedProductsActions],
	init: function(){
		this._products = [];
		this._isSelected = {};
	},
	onSelectProduct: function(product){
		this._products.push(product);
		this._isSelected[product.id] = true;

		this.trigger(this._products, 222);
	},
	onUnselectProduct: function(product){
		var index = this._products.indexOf(product);
		if (index > -1){
			this._products.splice(index, 1);
			this._isSelected[product.id] = false;
		}

		this.trigger(this._products);
	},
	onToggleProduct: function(product){
		if(this._isSelected[product.id])
			this.onUnselectProduct(product);
		else
			this.onSelectProduct(product);
	}
});

var ProductsStore = Reflux.createStore({
	listenables: [ProductsActions],
	init: function(){
		this._products = [];
		this._selectedProductsIds = [];
		this.listenTo(SelectedProductsStore, this._updateSelectedProductsIds);
	},
	onSearch: function(q){
		ProductsAPI.search(q).then(this.onSearchCompleted).error(this.onSearchFailed);
	},
	onSearchCompleted: function(products){
		this.updateProducts(products);
	},
	onSearchFailed: function(){
	},
	updateProducts: function(products){
		var selectedIds = this._selectedProductsIds;
		var _addSelected = function(p){
			p.selected = (_.indexOf(selectedIds, p.id) !== -1);
			return p;	
		};
		this._products = _.map(products, _addSelected);
		this.trigger(this._products);
	},
	_updateSelectedProductsIds: function(selectedProducts, added, removed){
		var _notFalsy = function(x){ return !!x };
		this._selectedProductsIds = _.filter(_.map(selectedProducts, function(p){ return p.id }), _notFalsy);
		this.updateProducts(this._products);
	}
});
/* STORES END */

/* VIEW BEGIN */
var SelectableProductMixin = {
	onClick: function(){
		SelectedProductsActions.toggleProduct(this.props.product);

		if(this.props.onClick)
			this.props.onClick();
	},
};

var ProductItem = React.createClass({
	propTypes: {
		product: React.PropTypes.object.isRequired,
		onClick: React.PropTypes.func
	},
	mixins: [SelectableProductMixin],
	render: function(){
		var p = this.props.product;
		return (
			<div onClick={this.onClick}>
				{ p.name } { p.selected? "( SELECTED )" : null }
				<img src={p.images[0]} />
			</div>
		);
	}
});

var SelectedProductItem = React.createClass({
	propTypes: {
		product: React.PropTypes.object.isRequired,
		onClick: React.PropTypes.func
	},
	mixins: [SelectableProductMixin],
	render: function(){
		var p = this.props.product;
		return (
			<div onClick={this.onClick}>
				{ p.name }
				<img src={p.images[0]} />
			</div>
		);
	}
});

var ProductsView = React.createClass({
	mixins: [Reflux.connect(ProductsStore, "products")],
	getInitialState: function(){
		return { products: [] };
	},
	render: function(){
		return (
			<div className={"ProductsView"}>
				<h1>RESULTADOS DA PESQUISA: {this.state.products.length} PRODUTOS</h1>
				<ul> {_.map(this.state.products, function(p){ return <ProductItem product={p} />; })}
				</ul>
			</div>
		);
	}
});

var SelectedProductsView = React.createClass({
	mixins: [Reflux.connect(SelectedProductsStore, "products")],
	render: function(){
		return (
			<div className={"SelectedProductsView"}>
				<h1>SelectedProductsView</h1>
				<ul> {_.map(this.state.products, function(p){ return <SelectedProductItem product={p} />; })}
				</ul>
			</div>
		);
	}
});

var ProductsSearchTypeahead = React.createClass({
	mixins: [Reflux.connect(TokensStore, "tokens")],
	onTokenAdd: function(token){
		SelectedTokensActions.addToken(token);
	},
	onTokenRemove: function(token){
		SelectedTokensActions.removeToken(token);
	},
	render: function(){
		return (
			<div>
				<TypeaheadTokenizer
					options={this.state.tokens}
					allowCustomValues={4}
					onTokenAdd={this.onTokenAdd}
					onTokenRemove={this.onTokenRemove}
					customClasses={{
						typeahead: "topcoat-list",
						input: "topcoat-text-input",
						results: "topcoat-list__container",
						listItem: "topcoat-list__item",
						token: "topcoat-button",
						customAdd: "topcoat-addme"
					}} />
			</div>
		);
	}
});

var DemoApp = React.createClass({
	render: function(){
		return (
			<div>
				<div className={"leftBox"}>
					<ProductsSearchTypeahead />
					<ProductsView />
				</div>
				<div className={"rightBox"}>
					<SelectedProductsView />
				</div>
			</div>
		);		
	}
});

function init(){
	var initSearchEngineAndTypeahead = function(products){
		SE.add(products);
		TokensActions.addTokens(SE.getTokens());
	};

	var recepedia_kwargs = {
		datumTokenizer: function(datum){
			tokens = _.filter(datum.tags_tokens, function(d){ return d.category === 'branded' || d.category === 'diverse' || d.category === 'brand'; });
			tokens = _.map(tokens, function(t){ return t.name });
			return tokens; 
		},
		queryTokenizer:  function(query){
			return query;
		}
	};
	var kwargs = recepedia_kwargs;
	SE = new SearchEngines.ProductsInvertedTokenIndexEngine(kwargs);

	ProductsAPI.fetch().then(initSearchEngineAndTypeahead);

	//Do query if token's current selection change
	SelectedTokensStore.listen(function(tokens){
		var q = tokens;
		ProductsActions.search(q);
	});
}
init();
React.render(<DemoApp />, document.getElementById('App'));
/* VIEW END */
