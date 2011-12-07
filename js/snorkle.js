/*

snorkle.js: take a look under the surface

  visualise and combine variables in realtime

  ideal for prototyping interfaces with unknown streams of data 



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
   [ ]  global pause button
   [ ]  find big win optimisations (init() as well as tick())
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

var templates = {
  input: 
    '<li id="<%= id %>">' +
      '<h2><%= id %></h2>' +
      '<div class="row"> <span class="viz"></span> <span class="value"></span> <span class="raw"></span> </div>' +
    '</li>',
  output:   
    '<li class="result" id="<%= id %>"> <h2><%= id %></h2>' +
      '<span class="viz"></span> <span class="value"></span> <span class="raw"></span>' +
      '<input type="text" value="return 0">' +
    '</li>',
  frame:
    '<ul id="vars">' +
      '<h1>inputs</h1><div id="inputs"></div>' +
      '<h1>results</h1><div id="results"></div>' +
    '</ul>'
};
  



function shorten (f) {
  if (typeof f == 'string') {
    return f
  }
  return Math.round(f * 10000) / 10000
}

function kv (k, v) {
  var s = {};  s[k] = v;
  return s;
}

function int(f) {
  return Math.floor( f );
}


var Model = {};

var options = { 
  normalRangeMin: 0, normalRangeMax: 1, 
  width: '120px', chartRangeClip: true, spotColor: false,
  minSpotColor: false, maxSpotColor: false
};



Model.Var = Backbone.Model.extend({
  initHistory: function() {
    this.bind( 'change:value', function() {
      var el = '#' + this.id;
      
      if (el) {
        $(el + " span.value").text( shorten( this.value() ) );
        $(el + " span.raw"  ).text( shorten( this.get('raw') ) );
        $(el + " span.viz"  ).sparkline( this.get('history'), options );
      }
    });
    
    this.set({ history_length: 50, history: [] });
  },
  addToHistory: function(v) {
    var h = this.get('history');
    
    if (h.length > this.get('history_length')) {
	    h.shift();
	  }
	  h.push( v );
	  
	  this.set({ history: h })
  }
});


Model.In = Model.Var.extend({
  initialize: function (options) {
    var initial = (typeof options.initial == "undefined" || options.initial == null) ? 0 : options.initial;
    
    $('ul#vars div#inputs').append( _.template( templates.input )({ id: options.id }) );
    
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

    this.set({ 
      value: v, 
      raw: raw 
    });
  }
});




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



Model.Out = Model.Var.extend({
  initialize: function(options) {
    var initial = (typeof options.initial == "undefined" || options.initial == null) ? 0 : options.initial;
    var formula = localStorage.getItem('out_' + this.id);
    var that = this;
    $('ul#vars div#results').append( _.template( templates.output )({ id: options.id }) );
    
    $('li.result#' + options.id + ' input').keyup(function(ev) {
      that.calculateEntered( ev.target.value );
    })

    this.set({ raw: initial, value: initial });

    this.initHistory();
    if (formula) {
      this.calculateEntered( formula ).update();
      $('li#' + this.id + ' input').val( formula );
    }

    return this;
  },
  calculateEntered: function(formula) {
    var f, ok = true;
    
    try { // ... to create function with the code entered
      f = new Function( formula );
      f.toString = function() { return formula; } // don't return 'function() { ' or ' }'
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
    ok && (this.calculate = f); // set the calculate function that tick() will call
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
  }
});


var Snorkle = Backbone.Model.extend({
  initialize: function() {
    this.bind('change', function() {
      this.updateReals();
    });
    
    $('body').append(templates.frame);
    
    this.updateReals();
  },
  updateReals: function() {
    var that = this;
    this.reals = {};
        
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
    
    var v = new Model.In( options );
    this.set( kv(id, v) );
    return v;
  },
  addOutput: function(id, options) {
    options = options || { initial: 0 };
    options.id = id; // very useful
    options.parent = this;
        
    var v = new Model.Out( options );
    this.set( kv(id, v) ); // add it to vars
    return v;
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



