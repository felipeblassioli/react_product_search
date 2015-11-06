var React = require('react')
//var ReactDOM = require('react-dom');
var Reflux = require('reflux');
var _ = require('underscore')
var TypeaheadTokenizer = require('react-typeahead').Tokenizer;
var Promise = require('bluebird');
var fuzzy = require("fuzzy");

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
var JobActions = Reflux.createActions(['receiveJob', 'sendJobResult', 'clearJob']);
var ControlActions = Reflux.createActions(['clear']);

/* ACTIONS END */

/* STORES BEGIN */
var TokensStore = Reflux.createStore({
	listenables: [ControlActions, TokensActions],
	init: function(){
		this._tokens = [];
	},
	onAddTokens: function(tokens){
		this._tokens = _.union(this._tokens, tokens);
		this.trigger(this._tokens);
	},
	onClear: function(){
		//this._tokens = [];
		//this.trigger(this._tokens);
	}
});

var SelectedTokensStore = Reflux.createStore({
	listenables: [ControlActions, SelectedTokensActions],
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
	},
	onClear: function(){
		console.log('hey!!1');
		_.each(this._tokens, this.onRemoveToken);
	}
});

var SelectedProductsStore = Reflux.createStore({
	listenables: [ControlActions, SelectedProductsActions],
	init: function(){
		this._products = [];
		this._isSelected = {};
	},
	onSelectProduct: function(product){
		this._products.push(product);
		this._isSelected[product.id] = true;

		this.trigger(this._products);
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
	},
	onClear: function(){
		this._products = [];
		this._isSelected = {};
		this.trigger(this._products)
	}
});

var ProductsStore = Reflux.createStore({
	listenables: [ControlActions, ProductsActions],
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
	},
	onClear: function(){
		this.updateProducts([]);
	}
});

var CurrentJobStore = Reflux.createStore({
	listenables: [ JobActions ],

	onReceiveJob: function(job){
		console.log('CurrentJobStore.onReceiveJob', job);
		/*
		   {id: "563b9edf9a652a2c21000023", _id: "563b9edf9a652a2c21000023", image: "5d07ea5c8c62108f64576171e06123c7", media: "image", priority: "high"…}
				_id: "563b9edf9a652a2c21000023"
			client: "recepedia"
			create_time: "2015-11-05T18:24:31.878Z"
			id: "563b9edf9a652a2c21000023"
			image: "5d07ea5c8c62108f64576171e06123c7"
			media: "image"
			priority: "high"
			processing: false
			timeout: "2015-11-05T18:25:16.878Z"
			training: false}

			/recepedia/static/5d/5d07ea5c8c62108f64576171e06123c7.jpg
		*/
		if( job['media'] === "image" ){
			if( 'img_url' in job ){
				var jobWrapper = {
					img_url: job.img_url 
				};
				this.trigger(jobWrapper);
			} else if( 'image' in job && 'client' in job ){
				var jobWrapper = {
					img_url: '/'+job.client+'/static/'+job.image.substring(0,2)+'/'+job.image+'.jpg'
				};
				console.log('trigger', jobWrapper);
				this.trigger(jobWrapper);
			} 
		}
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

var TypeaheadTokenSelector = React.createClass({
	propTypes: {
		options: React.PropTypes.array,
		customClasses: React.PropTypes.object,
		customValue: React.PropTypes.string,
		selectionIndex: React.PropTypes.number,
		onOptionSelected: React.PropTypes.func,
		displayOption: React.PropTypes.func.isRequired,
		defaultClassNames: React.PropTypes.bool
	},
	getDefaultProps: function() {
		return {
			selectionIndex: null,
			customClasses: {},
			customValue: null,
			onOptionSelected: function(option) { },
			defaultClassNames: true
		};
	},

	_renderToken: function(option){
		var _onClick = function(opt, evt){
			console.log('onOptionSelected', opt, evt);
			this.props.onOptionSelected(opt, evt);	
		};
		var name;
		if(option.selected)
			name = option.display + '(SELECTED)';
		else
			name = option.display;
		
		return (
			<div className={"tt-suggestion"} onClick={_onClick.bind(this, option)}
				dangerouslySetInnerHTML={{ __html: name }}>
			</div>
		);
	},
	_renderCategory: function(tokens, categoryName){
		return (
			<div>
				<h1>{categoryName}</h1>
				{_.map(tokens, this._renderToken)}
			</div>
		);
	},
	render: function(){
		var categories = _.groupBy(this.props.options, function(o){ return o.category });

		if(_.isNumber(this.props.selectionIndex)){
			var currentIndex = 0;
			var selectedIndex = this.props.selectionIndex;
			_.each(categories,function(tokens, categoryName){
				_.each(tokens, function(token){
					token.selected = (selectedIndex === currentIndex);
					currentIndex++;
				});
			});
		}
		return (
			<div className={"tt-menu tt-open"}>
				{ _.map(categories, this._renderCategory) }
			</div>
		);
	}
});

var ProductsSearchTypeahead = React.createClass({
	mixins: [
		Reflux.connect(TokensStore, "tokens"),
		Reflux.listenTo(ControlActions.clear, "clearTokens")
	],
	clearTokens: function(){
		this.refs.typeahead.clearTokens();
	},
	onTokenAdd: function(token){
		SelectedTokensActions.addToken(token);
	},
	onTokenRemove: function(token){
		SelectedTokensActions.removeToken(token);
	},
	optionToString: function(option){
		return option.name;
	},
	_filterOptions: function(value, candidates){
		var categories;
		var _toOption = function(res){
			var opt = _.clone(res.original);
			opt.display = res.string;
			return opt;
		};
		candidates = _.uniq(candidates, this.optionToString); 
		candidates = _.map(fuzzy.filter(value, candidates, {extract: this.optionToString, pre: "<strong>", post: "</strong>"}), _toOption);
		categories = _.groupBy(candidates, function(o){ return o.category });
		candidates = _.flatten(_.map(categories, function(tokens, categoryName){ return tokens; }));
		return candidates;
	},
	render: function(){
		return (
			<div>
				<TypeaheadTokenizer
					options={this.state.tokens}
					allowCustomValues={4}
					onTokenAdd={this.onTokenAdd}
					onTokenRemove={this.onTokenRemove}
					filterOptions={this._filterOptions}
					displayOption={this.optionToString}
					customListComponent={TypeaheadTokenSelector}
					customClasses={{
						typeahead: "topcoat-list",
						input: "topcoat-text-input",
						results: "topcoat-list__container",
						listItem: "topcoat-list__item",
						token: "topcoat-button",
						customAdd: "topcoat-addme"
					}} 
					ref={"typeahead"} />
			</div>
		);
	}
});

var ActionBar = React.createClass({
	_notFoundClick: function(){
		console.log('_notFoundClick');
		JobActions.sendJobResult();
	},
	_sendResultClick: function(){
		console.log('_sendResultClick');
		//JobActions.receiveJob({image: '45234dsar13', client: "recepedia", media: "image"});
		JobActions.sendJobResult();
	},
	render: function(){
		return (
			<div className={"actionBar"}>
				<button className={"productNotFoundButton"} onClick={this._notFoundClick}>Nao Identificado</button>
				<button className={"sendResultButton"} onClick={this._sendResultClick}>Enviar</button>
			</div>
		);
	}
});

var ImagePreview = React.createClass({
	mixins: [
		Reflux.connect(CurrentJobStore, "job"),
		Reflux.listenTo(ControlActions.clear, "clear")
	],
	getInitialState: function(){
		return { job: { img_url: null } };
	},
	clear: function(){
		this.setState(this.getInitialState());
	},
	render: function(){
		console.log("render ImagePreview", this.state);
		return (
			<div className={"imagePreview"}>
				<h1>Image Preview</h1>	
				{ this.state.job.img_url? <img src={this.state.job.img_url} /> : null }
			</div>
		);
	}
});


var DemoApp = React.createClass({
	render: function(){
		return (
			<div >
				<div className={"leftBox"}>
					<ProductsSearchTypeahead />
					<ProductsView />
					<ActionBar />
				</div>
				<div className={"rightBox"}>
					<ImagePreview />
					<SelectedProductsView />
				</div>
			</div>
		);		
	}
});

var JobResultEmitter = function(onJobResult){
	this._results = [];
	this.onJobResult = onJobResult;
	
	this._emitJobResult = function(results){
		if(this.onJobResult)
			this.onJobResult(results);
		//JobActions.clearJob();
		ControlActions.clear();
	}.bind(this);

	SelectedProductsStore.listen(function(products){
		this._results = _.clone(products);
	}.bind(this));

	JobActions.sendJobResult.listen(function(overrideResults){
		if(overrideResults)
			this._emitJobResult( overrideResults );
		else
			this._emitJobResult( this._results );

	}.bind(this));
	
};

function tmp_init(){
	var initSearchEngineAndTypeahead = function(products){
		var tokens, validTokenIds, validTokens;
		tokens = _.flatten( _.map(products, function(p){ return p.tags_tokens; }));
		console.log('initSearchEngineAndTypeahead3')
		console.log('tokens:', tokens);

		SE.add(products);
		validTokenIds = _.map(SE.getTokens(), function(t){ return t.id });
		validTokens = _.filter(tokens, function(t){ return (_.indexOf(validTokenIds, t.id) !== -1); });

		console.log('ValidTokenIds', validTokenIds);
		console.log('validTokens', validTokens);
		TokensActions.addTokens(validTokens);
	};

	var recepedia_kwargs = {
		datumTokenizer: function(datum){
			tokens = _.filter(datum.tags_tokens, function(d){ return d.category === 'branded' || d.category === 'diverse' || d.category === 'brand'; });
			return tokens; 
		},
		identifyToken: function(token){ return token.name },
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

console.log('xxxx',SelectedProductsStore);
module.exports = {
	Adapter: function(options){

		this._emitJobResult = function(results){
			console.log('Adapter._emitJobResult', results);
			if(this.onJobResult)
				this.onJobResult(results);
		}.bind(this);

		this.init = function(domElementId){
			tmp_init();
			React.render(<DemoApp />, document.getElementById(domElementId));
		}.bind(this);

		this.receiveJob = function(job){
			console.log('PRPFRONTEND got job', job);
			JobActions.receiveJob(job);
		};

		//TODO: not sure if this is needed
		this.clear = function(){
			ControlActions.clear();
		};
		
		options = options || {};
		this.onJobResult = options.onJobResult;
		this._jobEmitter = new JobResultEmitter( this._emitJobResult );
	}

}
/* VIEW END */
