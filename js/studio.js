function append_png() {
  var context = canvas.getContext("2d");
  var img     = canvas.toDataURL("image/png");
  meh.innerHTML = '<img src="'+img+'">';
}

var dump_design = function(id) { 

  var the_dump = {};
  _( localStorage.getItem(id).split(',') ).each( function(it, n) {
    the_dump[it] = JSON.parse( localStorage.getItem(id + '-' + it) );
  });
  
  _([ 'paperjs', 'canvas' ]).each( function(it, n) {
    the_dump[it] = localStorage.getItem( id + "_" + it );
  });
  
  return the_dump;
};
  
  
function save_a_version() {
  var data = dump_design( current_design );
  $.ajax({
    type: 'POST',
    url: 'http://localhost:6969/' + current_design,
    data: JSON.stringify( data ),
    dataType: 'json'
    
    // success: success, contentType: 'application/json'
  });
}

setInterval(save_a_version, 60000);

$(function() {
  // bind UI
  function toggle_pause () {
    paused = ! paused;
    $('#pause').text( paused ? '>' : '||' );
  }
  
  $('#pause').bind('touchstart', toggle_pause);
  $('#pause').bind('mousedown', toggle_pause);
  
  $('#control button').bind('click', function() {
    $('body')[0].className = this.id;

    if (this.id == "z2" || this.id == 'z1') {
       // canvas.resize({ y: 600 });
    } else if (this.id == 'z3') {
       canvas.resize({ x: 4200 });
    }
  });
  
  // dynamic canvas
  canvas.resize = function(new_size) {
    var default_size = {  x: 620,  y: 870  },
        ratio        = default_size.y / default_size.x;
    
    if (new_size.x) {
      new_size.y = new_size.x * ratio;
    } else if (new_size.y) {
      new_size.x = new_size.y / ratio;
    } else {
      new_size = default_size;
    }
    canvas.sizeRatio = new_size.x / default_size.x;
    canvas.width  = new_size.x;
    canvas.height = new_size.y;
    changed();
  }
  
  // passed into the tick
  function tickEvent() {
    this.count = 0;  // number of times the frame event was fired
    this.time  = 0;  // total amount of time passed since the first frame event in secs
    this.delta = 0;  // time passed in seconds since the last frame event
    this.first = 0;  // Date.now()/1000 of first call
    this.last  = 0;  // Date.now()/1000 of the previous call
    this.update = function() {
      var now = Date.now() / 1000;
      if (! this.first) {
        this.first = now;
      }
      this.count++;
      this.delta = now - this.last;
      this.time  = now - this.first;
      this.last  = now;
    }
  }
  
  
  if (typeof io != "undefined") {
    var socket = io.connect('http://localhost:8339');
    socket.on('face', function (data) {
      var id = data.shift(),
          t  = data.shift(),
          face = {};

  		if (data.length) {
  	    _(data).each(function(v) {
  	      face[ v[0].replace(/\//g, '_') ] = v.splice(1);
  	    });
  		} else {
  			face[id.replace(/\//g, '_')] = t;
  		}
      J.pumpInput( face );
    });
  }
  
  // loads of globals that really need to be sorted out
  window.unfocused  = false; // really?
  window.paused     = false;
  window.context    = canvas.getContext('2d');
  window.previous   = {};
  window.ev         = new tickEvent();
  window.v          = {};
  window.onFrame    = function() {}; // gonna be overridden

  window.changed = function() {
  	window.previous = {};
  }

  // bind events
  window.onblur  = function() { unfocused = true; };
  window.onfocus = function() { unfocused = false; };

  $('.tabs a').click(function() {
    var id = $(this).attr('href').substr(1)
    $('.tabs a').removeClass('active'); $(this).addClass('active');
    $('.editor').hide();
    $('.editor#'+ id).show();
    return false;
  });
  
  $('#design_picker').change(function(e) {
    Design.load( $(this).find($('option:selected'))[0].id );
  });
  
  // initialisations
  paper.install( window );
  paper.setup( canvas ); // Create an empty project and a view for the canvas
  canvas.resize({ }); // setup

  window.J = new Snorkle({}, { change: _.throttle(changed, 100) }); // TODO this empty

  window.current_design = 'breton'; // change for each design
  
  var	editors = {
        'canvas':  { f: function() {} },
        'paperjs': { f: function() {} }
      };

  function code_change_for(key) { // generate a function to deal with changes to code for :key
    return function(ev) {
      var f_text = editors[key].ace.getSession().getValue();
  		var err = false;
      try {
  			editors[key].f = new Function('ev', 'n', 'with(v.inputs) { ' + f_text + ' } ');
      } catch (e) {
  			err = e;
      }
  		if (! err) {
        changed();
  		}
      localStorage.setItem( current_design + "_" + key, f_text ); // breton
    }
  }
  
  // setup code editors
  var JavaScriptMode = require("ace/mode/javascript").Mode;
  _(editors).each(function(editor, key) {
    // editor.id = save_prefix + key;
    editor.ace = ace.edit( key + "_editor" );
    var session = editor.ace.getSession();
    
    // settings    
    editor.ace.setShowPrintMargin( false );
    editor.ace.setTheme( "ace/theme/twilight" );
    session.setTabSize( 2 );
    session.setUseSoftTabs( true );
    session.setMode( new JavaScriptMode() );
    session.setValue( '' );
    
    // bindings
    console.log('loading code for ' + key)
    editor.onChange = code_change_for( key );
    session.on('change', editor.onChange);
  });
    

  
  // animation loop stuff
  var update_fps = _.throttle( function() { fps.innerHTML = shorten(1 / ev.delta) }, 1000);
  
  (function animloop() {
    requestAnimFrame( animloop );
    if (paused || unfocused) {
      fps.innerHTML = '0';
      return false;
    }
    ev.update();      // update the event var
    update_fps();     // show frames per second
    J.updateReals();  // 
    if (_.isEqual( previous, v.inputs )) return false; // && function has not changed
  	previous = _.clone( v.inputs );
    J.recalculate();
    window.onFrame( ev );
    paper.view.draw();
    drawPost = true; // for postCanvas... can't just run it here cos of timing issues :/
  })();
  
  function postCanvas() {
    if (paused || unfocused) return;
  	if (drawPost) {
      editors.canvas.f.call(v);
  	}
    drawPost = false;
  }
  setInterval(postCanvas, 200);
	
  
  // below here - only code called when a design loads
    
  window.Design = {
    load: function(id) {
      paused = true;
      paper.project.layers[0].removeChildren();
      
      J = new Snorkle({}, { design: id, change: _.throttle(changed, 100) });
      
      changed();
      window.ev = new tickEvent();
      current_design = id; // TODO save this var automatically in LocalStorage instead of...
      localStorage.setItem( 'tudio::current_design', current_design );
      
      console.log('loading design: ' + id);
    
      // load code
      _(editors).each(function(editor, key) {
        var session = editor.ace.getSession();
        var saved_f = localStorage.getItem( current_design + '_' + key ) || '';
        session.setValue( saved_f );
        editor.onChange();
      });
  
      $('.tabs a:first-child').click(); // TODO remember
    
      Design[id].call();
    
      paused = false;
    }
  }; 

  // below here - only design specific code
  
  // note:
  //  - designs/whatever.js needs to be loadable by tshirt.html also
  //  export window.onFrame

  Design.fibonacci = function() {
    $(canvas).css({ background: 'black' });
    
    v = {
      inputs: J.reals
    };
    
    window.onFrame = function(event) { // replace with your own
      editors.paperjs.f.call(v, event, 0); // call with this set to p
    };
  };
  
  
  Design.lines = function() {
    $(canvas).css({ background: 'black' });
    
    v = {
      inputs: J.reals,
      points: 399,
      smooth: false
    };
	
   // move to browser coding?
    v.path = new Path();
    // v.path.strokeWidth = 0;
    v.path.closed = false;

    v.initializePath = function (points) {
      v.center = view.center;
      v.width  = view.size.width;
      v.height = view.size.height / 2;
			
      v.path.segments = [];
      for (var i = 0; i < points; i++) {
        var point = new Point(v.width / points * i, view.center.y);
        v.path.add(point);
      }
      v.path.fullySelected = false;
    }

    v.initializePath( v.points );

    window.onFrame = function(event) { // replace with your own

      for (var i = 0; i < v.points; i++) {
        var pos = editors.paperjs.f.call(v, event, i); // call with this set to p
        if (pos) {
          v.path.segments[i].point.y = pos.y * canvas.sizeRatio;
          v.path.segments[i].point.x = pos.x * canvas.sizeRatio;
        }
      }

      if (v.smooth) { v.path.smooth(); }
      return true;
    }
  };

  Design.breton = function() {
    $(canvas).css({ background: 'white' });
    
    v = {
      inputs: J.reals,
      points: 800,
      smooth: false
    };
	
   // move to browser coding?
    v.path = new Path();
  	v.path.strokeWidth = 0;
    v.path.closed = false;

    v.initializePath = function (points) {
      v.center = view.center;
      v.width  = view.size.width;
      v.height = view.size.height / 2;
			
      v.path.segments = [];
      for (var i = 0; i < points; i++) {
        var point = new Point(v.width / points * i, view.center.y);
        v.path.add(point);
      }
      v.path.fullySelected = false;
    }
    v.initializePath(v.points);

    window.onFrame = function(event) { // breton

      for (var i = 0; i < v.points; i++) {
        var pos = editors.paperjs.f.call(v, event, i); // call with this set to p
        if (pos) {
          v.path.segments[i].point.y = pos.y * canvas.sizeRatio;
          v.path.segments[i].point.x = pos.x * canvas.sizeRatio;
        }
      }

      if (v.smooth) { v.path.smooth(); }
      return true;
    }		
  };

  Design.load( localStorage.getItem( 'tudio::current_design') || 'breton' );

});

// var acc = {};
//   
// if (window.DeviceMotionEvent != undefined) {
// 	  window.ondevicemotion = function(event) {
//     acc.x = event.accelerationIncludingGravity.x;
//     acc.y = event.accelerationIncludingGravity.y;
//     acc.z = event.accelerationIncludingGravity.z;
//   }
//   
//   window.addEventListener('deviceorientation', function(e) {
//     acc.compass = e.webkitCompassHeading;
//   });
  // setInterval( function() {  	
  //   	  J.get('accX').value( acc.x );
  //   	  J.get('accY').value( acc.y );		
  //   J.get('accZ').value( acc.z );
  //   
  //   // J.get('compass').value( acc.compass );
  // }, 100);
// }
  
// $(window).bind( 'mousemove', function(e) {
//   J.get('mouse').value([ e.clientX, e.clientY ]);
// });
  
// J.addInputArray( 'mouse', { initial: 0.1 } );
// var acc_options = { min: -10, max: 10,  initial: 0 };
// J.addInput( 'accX', acc_options );
// J.addInput( 'accY', acc_options );
// J.addInput( 'accZ', acc_options );
// J.addInput( 'compass', { min: 0, max: 360, initial: 180 } );