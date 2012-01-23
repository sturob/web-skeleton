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
   [√]  insert HTML for results/outputs
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

var Templates = {}, Model = {}, View = {};


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
    var off = 1 - this.max / diff;
  
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

Templates.output =
  '<h2><%= id %></h2>' +
  '<span class="viz"></span> <span class="value"></span> <span class="raw"></span>' +
  '<input class="code" type="text" value="<%= formula %>">' +
  '<input class="default_value" type="text" value="<%= initial %>">';

View.Out = View.Var.extend({
  tagName: 'li',
  className: 'result',
  template: _.template( Templates.output ),
  
  events: {
    // add
    // delete
    // rename... patience!
    'keyup  input.code':          'updateFormula',
    'change input.default_value': 'setDefault'
  },
  initialize: function() {
    this.initHistory();
    // this.model.bind('change', this.render, this);
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
  setDefault: function() {}
  
  // clear: function() {
  //   this.model.destroy();
  // }
});

///////////////////////////////////////////////////////////////

Model.Out = Model.Var.extend({
  initialize: function(options) {
    options.formula = localStorage.getItem('out_' + this.id);

    if (typeof options.initial == "undefined" || options.initial == null) options.initial = 0;
    
    this.set({ raw: options.initial, value: options.initial, formula: options.formula });
    
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
      this.set({ error: e });
    }
    try { // ...to actually run the function
      f.call( this.get('parent').reals );
    } catch (e) { // error if the code is runtime bad
      this.set({ error: e });
      ok = false;
    }

    localStorage.setItem('out_' + this.id, formula );
    if (ok) {
			this.calculate = f; // set the calculate function that tick() will call
			var callback = this.get('parent').changeCallback;
			callback && callback(); 
		}
    return this;
  },
  update: function() {
    if (typeof this.calculate == 'function') {
      var v = this.calculate.call( this.get('parent').reals );
      this.addToHistory( v );
      this.set({ value: v });
    } else {
      this.set({ error: 'calculate() is not set'})
    }
  },
  value: function() {
    return this.get('value')
  },
  setInitial: function(val) {
    // this.options
  }
});

///////////////////////////////////////////////////////////////

Model.InArray = Model.Var.extend({
  initialize: function() {
    this.children = [];
  },
  value: function(values) { // takes and array and sets children or returns array of child values
    if (typeof values == "undefined" || values == null) {
      var ret = [];
      _(this.children).each( function(child) {
        ret.push( child.value() )
      });
      return ret
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

Templates.frame = '<ul id="vars">' +
                    '<h1>results</h1> <div id="results"></div>' +
                    '<h1>inputs</h1>  <div id="inputs"></div>' +
                  '</ul>';

var Snorkle = Backbone.Model.extend({
  initialize: function(huh, options) {
    this.bind('change', function() {
      this.updateReals();
    });
    
		this.changeCallback = options.change;
		
    $('body').append( Templates.frame );

		this.$el = $('ul#vars');
    this.reals = {};
    
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
    options.parent = this;
    
    var model = new Model.In( options );
    this.set( kv(id, model) );
    var view = new View.In({ model: model });
    $('div#inputs').prepend( view.render().el );

    return model;
  },
	renameOutput: function(id, new_id) {
		// this.get(id).
	},
	removeOutput: function(id) {
//    this.get(id).clear()
	},
  addOutput: function(id, options) {
    options = options || { initial: 0 };
    options.id = id; // very useful
    options.parent = this;
    
    var m    = new Model.Out( options );
    this.set( kv(id, m) ); // add it to vars for this Snorkle

    var view = new View.Out({ model: m }); // create + insert view
    $("div#results").append( view.render().el );
    
    return m;
  },
  addInputArray: function(id, options) {
    options.id = id;
    options.parent = this;
    
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
