/*
snorkle.js: take a look under the surface

  visualise and combine variables in realtime
  ideal for prototyping interfaces with complex multi-variate interplay

dependencies :/
  - backbone
  - underscore
  - jquery
  - jquery.sparkleline

/*
   [√]  multiple values input in realtime
   [√]  multiple values calculated and output in realtime
   [√]  all values remember their history and display a sparkleline
   [√]  values normalised internally ( 0 - 1.0 )
   [√]  all changes bindable
   [√]  ids known so el: not needed

   [√]  calculate() updatable at runtime
   [√]  generate html 
   [√]  creates param, if it doesn't already exist
   [√]  support multi value variables

   [√]  separate library  -  snorkle.js
   [√]  insert HTML for parameters/outputs
   [√]  generalise id   
   [√]  switch off / bypass prod-vs-dev
   
      
  ----

 apply
   [ ]  moving average
   [ ]  display maxs + mins
   [ ]  reset max + min (recalibrate)
   [ ]  edit max + min

   [ ]  hide variable (and stop processing)

   [ ]  bounding flag + working (?)
   [ ]  fix bug: same value()s mean no update to the variable

  use cases
    paper.js
    faceosc
      animating faces with paper.js
      emoticon history
      logo manip
    touch
      logo manip
    accelerometer
*/

var Templates = {}, Model = {}, View = {}, Collection = {};

Model.Var = Backbone.Model.extend({
  initHistory: function() {  
    this.set({ history_length: 50, history: [] });
  },
  addToHistory: function(v) {
    var h = this.get( 'history' );
    if (h.length > this.get('history_length')) {
	    h.shift();
	  }
	  h.push( v );
	  this.set({ history: h })
  }
});

View.Var = Backbone.View.extend({
  initHistory: function() {
    var that = this;
    this.model.bind( 'change:value', function() {
      var $el = $(that.el);

      var spark_options = { 
        width: '120px', normalRangeMin: 0, normalRangeMax: 1, chartRangeClip: true, 
        spotColor: false, maxSpotColor: false, fillColor: false, minSpotColor: false,
      	lineColor: '#777'
      };
      
      if ($el) {
        $el.find( "span.value" ).text( shorten( this.value() ) );
        $el.find( "span.raw"   ).text( shorten( this.get('raw') ) );
        $el.find( "span.viz"   ).sparkline( this.get('history'), spark_options );
      }
    });
  }
});

///////////////////////////////////////////////////////////////////////////////

Templates.input = 
  '<h2><%= id %></h2>' +
  '<div class="row"> <span class="viz"></span> <span class="value"></span> <span class="raw"></span> </div>';

Model.In = Model.Var.extend({
  initialize: function (options) {
    var initial = (typeof options.initial == "undefined" || options.initial == null) ? 0 : options.initial;    
    this.initHistory();
    this.set({ raw: initial, value: initial });
    
    if (typeof options.range !== "undefined" && options.range !== null) {
      this.min = options.range.min;
      this.max = options.range.max;
    } else {
      this.min = 0;
      this.max = 1;
    }
  },
  value: function(v) {
    if (typeof v == "undefined" || v == null) {
      return this.get('value');
    }
    var raw = v;
    
    if (v < this.min) {
      this.min = v;
    }
    if (v > this.max) {
      this.max = v;
    }

    var diff = this.max - this.min;
    var off  = 1 - this.max / diff;
  
    v = (v / diff) + off; // coax value to be 0.0 - 1.0
    
    this.addToHistory( v );
    this.set({  value: v,  raw: raw  });
  }
});

View.In = View.Var.extend({
  tagName: 'li',
  className: 'input',
  template: _.template( Templates.input ),
  events: { },
  initialize: function() {
    this.initHistory();
    // this.model.bind('change', this.render, this);
    // this.model.bind('destroy', this.remove, this);
  },
  render: function() {
    $(this.el).html( this.template( this.model.toJSON() ) );
    return this;
  }
});

///////////////////////////////////////////////////////////////////////////////

Templates.param = '<button class="delete">&times;</button>' +
                  '<h2><%= id %></h2>' +
                  '<span class="viz"></span> <span class="value"></span> <span class="raw"></span>' +
                  '<input class="code" type="text" value="<%= formula %>">' +
                  '<input class="default_value" type="text" value="<%= initial %>">';

View.Param = View.Var.extend({
  tagName:   'li',
  className: 'result',
  template:  _.template( Templates.param ),
  events: {
    // rename
    'click  button.delete':       'clear',
    'keyup  input.code':          'updateFormula',
    'change input.default_value': 'setDefault'
  },
  initialize: function() {
    this.initHistory();
    this.model.bind('destroy', this.remove, this);
  },
  render: function() {
    $(this.el).html( this.template( this.model.toJSON() ) );
    return this;
  },
  updateFormula: function() {
    var f = $(this.el).find('input.code').val();
    this.model.calculateEntered( f ).update();
  },
  setDefault: function() {},  
  clear: function() {
    this.remove();
    this.model.destroy();
  }
});

Model.Param = Model.Var.extend({
  defaults: {
    initial: 0,  raw: 0,  formula: ""
  },
  initialize: function(options) {
    // options.formula = localStorage.getItem('out_' + this.id);
    // if (typeof options.initial == "undefined" || options.initial == null) options.initial = 0;
    this.set( options );
    this.initHistory();
    return this;
  },
  calculateEntered: function(formula) {
    var f, ok = true;

    try { // ... to create function with the code entered
      f = new Function( 
				"with (this) {\nreturn " + formula + "\n}"
	 		);
    	// f.toString = function() { return formula; } 
			// don't return 'function() { ' or ' }'
			// console.log(f);
    } catch (e) { // error if the code was garbage
      ok = false;
      this.error = e;
    };
    try { // ...to actually run the function
      f.call( GlobalSnorkle.reals );
    } catch (e) { // error if the code is runtime bad
      this.error = e;
      ok = false;
    };
    this.save({ formula: formula });
    
    if (ok) {
			this.calculate = f; // set the calculate function that tick() will call
			var callback = GlobalSnorkle.changeCallback;
			callback && callback(); 
		}
    return this;
  },
  update: function() {
    if (typeof this.calculate == 'function') {
      var v = this.calculate.call( GlobalSnorkle.reals );
      this.addToHistory( v );
      this.set({ value: v });
    } else {
      this.error = 'calculate() is not set';
    }
  },
  value: function() {
    return this.get('value')
  }
});


Collection.Params = Backbone.Collection.extend({
  model: Model.Param
});


///////////////////////////////////////////////////////////////

Model.InArray = Model.Var.extend({
  initialize: function() {
    this.children = [];
  },
  value: function(values) { // takes an array and sets children or returns array of child values
    if (typeof values == "undefined" || values == null) {
      var ret = [];
      _(this.children).each( function(child) {
        ret.push( child.value() )
      });
      return ret;
    }
    var that = this;
    _(values).each(function( val, n ) {
      that.child( n ).value( val );
    });
  },
  child: function(n) {
    if (this.children[n]) {
      return this.children[n]
    } else {
      var child_attr = _.clone(this.attributes);
      child_attr.id = this.id + "_" + n;
      var c = new Model.In( child_attr );
      this.children[n] = c;
      return c;
    }
  }
});

///////////////////////////////////////////////////////////////

Templates.frame =   '<h1>Parameters</h1> <button class="add_parameter">+ Param</button> <div id="parameters"></div>' +
                    '<h1>Inputs</h1> <div id="inputs"></div>';

// reload for each design
View.UI = Backbone.View.extend({
  tagName: "ul",
  className: "Snorkle",
  template: _.template( Templates.frame ),

  events: {
    "click button.add_parameter": "addParam"
  },
  render: function() {
    $(this.el).html( this.template({}) );
    return this;
  },
  addParam: function() {
    var name = prompt('Parameter name?');
    if (name) {
      
      var param = new Model.Param({ id: name });
      ParamsList.add( param );
      GlobalSnorkle.addParam( param ); // display it and wire it to vars
    }
  }
});

var Snorkle = Backbone.Model.extend({
  initialize: function(huh, options) {
    window.GlobalSnorkle = this; // hacky but fuck this straightjacket shit seriously
    this.reals = {};
    this.changeCallback = options.change;
    
    // remove previous UI
    $('ul.Snorkle').remove();
    
    // setup UI
    var view = new View.UI;
    $("body").append( view.render().el );
    
    this.bind('change', function() {
      this.updateReals();
    });
    
    // setup the list of params
    window.ParamsList = new Collection.Params;

    // define it's localStorage
    ParamsList.localStorage = new Store( options.design );
    
    // load all on reset
    ParamsList.bind("reset", function(what) {
      this.each( GlobalSnorkle.addParam );
    });
    // ParamsList.bind('all', function(a){ console.log(a); });

    ParamsList.fetch();  // load any saved params

    this.updateReals();
  },
  updateReals: function() {
    var that = this;

    _.each(this.attributes, function(v, k) {
      that.reals[k] = v.value();
    });
  },
  recalculate: function() {
    _.each(this.attributes, function(v, k) {
      if (v.update) {
        v.update()
      }
    });
  },
  addInput: function(id, options) {
    options.id = id; // very useful
    
    var model = new Model.In( options );
    this.set( kv(id, model) );
    var view = new View.In({ model: model });
    $('div#inputs').prepend( view.render().el );
    return model;
  },
  addParam: function(param) {
    GlobalSnorkle.set( kv(param.id, param) );
    var view = new View.Param({ model: param });
    $('div#parameters').prepend( view.render().el );
  },
  addInputArray: function(id, options) {
    options.id = id;
    
    var v = new Model.InArray( options );

    this.set( kv(id, v) );
    return v;
  },
  pumpInput: function(data) { // data = hash of: values or array values
    var that = this;

    _(data).each(function(v, k) {
      var exists = that.get( k );
      if (exists) {
        exists.value( v )
      } else {
        if (typeof v == 'object') {
          that.addInputArray(k, {});
        } else {
          that.addInput(k, {});
        }
      }
    })
  }
});



function kv (k, v) {
  var s = {};  s[k] = v;
  return s;
}


function int(f) {
  return Math.floor( f );
}

function mod(a,b) {
	return a - (a % b);
}

function clamp (n, min, max) { // not used
	return Math.min(Math.max(n, min), max);
}

function of () { // return first valid value
	for(var i=0; i<arguments.length; i++) {
		if (typeof arguments[i] != "undefined" || arguments[i] != null) {
			return arguments[i];
		}
	}
}

//  (0.1, 10, 110) 			 ->  20
//  (.1, 5, 10) 				 ->   5.5
//  (.1, 10, 5) 				 ->   9.5
//  (20, 10, 110, 0, 20) -> 110
function coax(val, min, max, d, e) {
  var in_min  = (typeof d == "undefined" || d == null) ? 0 : d, // assume input range is:
			in_max  = (typeof e == "undefined" || e == null) ? 1 : e, // 0.0 - 1.0
			in_diff = in_max - in_min,
			diff    = max    - min,
			ratio   = diff / in_diff,
			result  = val * ratio;

	return min + result;
}

function shorten (f) {
  if (typeof f == 'string') {
    return f
  }
  return Math.round(f * 10000) / 10000
}
