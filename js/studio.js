function append_png() {
  var img     = canvas.el.toDataURL("image/png");
  meh.innerHTML = '<img src="'+img+'">';
}


SVGCanvas.prototype.transform = SVGCanvas.prototype.translate;
SVGCanvas.prototype.fillText = SVGCanvas.prototype.text;

paper.View.prototype.toSVG = function() {
  var svgContext = new SVGCanvas(this.canvas.width, this.canvas.height);

  var oldCtx = this._context;

  this._context = svgContext;
  this.draw(false);

  this._context = oldCtx;

  // Optional serialization of the SVG DOM nodes
  var serializer = new XMLSerializer();
  return serializer.serializeToString(svgContext.svg.htmlElement);
};


// Concept:
//  - name
//  - description, inspired by what?
//  - background

// Version:
//  - *design
//  - number
//  - parameters
//  - functions

// Creation:
//  - *version
//  - preset values


var dump_design = function(id) { 
  var the_dump = {
    functions: {}, parameters: {}
  };

  _( localStorage.getItem(id).split(',') ).each( function(it, n) {
    the_dump.parameters[it] = JSON.parse( localStorage.getItem(id + '-' + it) );
  });
  _(editors).each( function(it, editor) {
    the_dump.functions[editor] = localStorage.getItem( id + "_" + editor );
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
  });
}


$(function() {
  // bind UI
  function toggle_pause () {
    paused = ! paused;
    $('#pause').text( paused ? '>' : '||' );
  }
  
  $('#pause').bind('touchstart', toggle_pause);
  $('#pause').bind('mousedown', toggle_pause);
  
  $('#control button.zoomer').bind('click', function() {
    $('body')[0].className = this.id;

    if (this.id == 'z1') {
       canvas.resize({ height: $('img#t').height() - 220 }, changed)      
    }
    if (this.id == "z2") {       
       canvas.resize({ height: $(window).innerHeight() - 20 }, changed)
    } else if (this.id == 'z3') {
       canvas.resize({ width: 4200 }, changed);
    }
  });
  
  $('#append_png').click( function() {
    if ($('#meh:visible').length) {
      $('#meh img').remove();
      $('#meh').hide();
    } else {
      append_png();
      $('#meh').show();
    }
  });
  
  $('#color').keyup(function() {
    $('#t').css({ backgroundColor: $(this).val() });
    $('#canvas canvas').globalcss( 'background-color', $(this).val() );
  }).keyup();
  
  
  // canvas mouse events
  var $canvas = $('div#canvas');
  
  $canvas.on('mousewheel', _.throttle(function(e) {
    e = e.originalEvent;
    var zoom = e.wheelDeltaY > 0 ? 1.25 : 0.8;
    view.zoom *= zoom;
    if (view.zoom <= 1) {
      view.zoom = 1;
      view.setCenter( [ view.size.width / 2, view.size.height / 2 ] );
    } else {
      hack = 1;
      view.setCenter( ([e.x * hack,  e.y * hack]) );
    }
  }, 100) );

  $canvas.on('mousedown', function(e) {
    e = e.originalEvent;
    canvas.pos = [e.x, e.y];
    canvas.dragging = true;
  });
  
  $canvas.on('mousemove', _.throttle(function(e) {
    e = e.originalEvent;
    if (canvas.dragging) {
      view.scrollBy( new Point(canvas.pos[0] - e.x, canvas.pos[1] - e.y) );
      canvas.pos = [e.x, e.y];
    }
  }, 40) );
  
  $canvas.on('mouseup', function(e) { canvas.dragging = false });
  
  
  
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
  window.SAFE_MODE  = (window.location.hash == '#safe');
  window.unfocused  = false; // really?
  window.paused     = SAFE_MODE;
  window.previous   = {};
  window.ev         = new tickEvent();
  window.v          = { inputs: {} };
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
  
  $('#reload').click(function() {
    Design.load( current_design );
  })
  
  $('#save_a_version').click( save_a_version );
  
  

  
  // initialisations
  
  paper.install( window );

  window.canvas = new Canvas;
  // canvas.resize({ height: $(window).innerHeight() - 60 }, changed) // size
  



  window.J = new Snorkle({}, { change: _.throttle(changed, 100) }); // TODO this empty

  window.current_design = 'breton'; // change for each design
  
  window.editors = {
        'canvas':  { f: function() {} },
        'paperjs': { f: function() {} },
        'initial': { f: function() {} }
      };

  // generate a function to deal with changes to code for :key
  function code_change_for(key) { 
    return _.debounce(function(ev) {
      var ed = editors[key],
          f_text = ed.ace.getSession().getValue(),
          error_last_time = !! ed.error;
      ed.error = false;    
      
      if (SAFE_MODE) {// save change but don't run
        console.log('safe mode');
        localStorage.setItem( current_design + "_" + key, f_text );
        return;
      }
      
      try {
  			ed.f = new Function('ev', 'n', 'with (v.inputs) { ' + f_text + '\n } ');
      } catch (e) {
  			ed.error = e;
        inform_of_error(e);
      }

  		if (! ed.error) {
        if (error_last_time) inform_of_error(false);
        changed();
  		}
      localStorage.setItem( current_design + "_" + key, f_text ); // save
    }, 500);
  }
  
  // setup code editors
  var JavaScriptMode = require("ace/mode/javascript").Mode;
  _(editors).each(function(editor, key) {
    editor.error = false;
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
  
  
  function inform_of_error(e) {
    if (e) {
      $('#editor .error_message').text("line " + e.line + ": " + e.message).show();
    } else {
      $('#editor .error_message').text('').hide();
    }
  }
  
  
  // animation loop stuff
  var update_fps = _.throttle( function() { 
    frame_count.innerHTML = ev.count; 
    fps.innerHTML = shorten(1 / ev.delta);
  }, 1000);
  

  var drawPost = false;
    
  var initAnimation = _.once(function() {
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
    	if (drawPost) editors.canvas.f.call(v);
      drawPost = false;
    }
    setInterval(postCanvas, 200);
  })
  
  
  
  
  // below here - only code called when a design loads

  window.Design = {
    load: function(id) {
      canvas.addElement();
      paper.setup( canvas.el ); // Create
      initAnimation(); // already once()d
      
      J = new Snorkle({}, { design: id, change: _.throttle(changed, 100) });
      
      changed();
      window.ev = new tickEvent();
      current_design = id; // TODO save this var automatically in LocalStorage instead of...
      localStorage.setItem( 'tudio::current_design', current_design );
      
      console.log('loading design: ' + id);
      $('#design_picker option#' + id).attr({ selected: true }); // make sure
      
      // load code
      _(editors).each(function(editor, key) {
        var session = editor.ace.getSession();
        var saved_f = localStorage.getItem( current_design + '_' + key ) || '';
        session.setValue( saved_f );
      });
  
      $('.tabs a:first-child').click(); // TODO remember
    
      if (! SAFE_MODE) {
        Design[id].call();
      }
      paused = false;
    }
  }; 


  // below here - only design specific code
  
  // note:
  //  - designs/whatever.js needs to be loadable by tshirt.html also
  //  export window.onFrame


  var ProtoDesign = function(bg) {
    v = {
      inputs: J.reals
    };
    
    editors.initial.f.call(v); // call with this set to p
    
    window.onFrame = function(event) { // replace with your own
      try {
        editors.paperjs.f.call(v, event, 0); // call with this set to p
      } catch(e) {
        editors.paperjs.error = e;
        inform_of_error(e);
      }
    };
  };



  // backg colors !
  var bgs = {
    dotboom:     '#333',
    mushroom:    '#333',
    valentines:  '#333',
//  triangles:   '#333',
//  maps:        '#333',
    joy:         '#333',
    fibonacci:   '#333',
    discs:       '#333',
    blocks:      '#333',
    dreamsquare: '#333',
    lines:       '#333'
  };

  _(bgs).each(function(bg, d) {
    Design[d] = ProtoDesign;
  });

  Design.breton = function() {    


    window.onFrame = function(event) { // breton

      for (var i = 0; i < v.points; i++) {
        var pos = editors.paperjs.f.call(v, event, i); // call with this set to p
        if (pos) {
          v.path.segments[i].point.y = pos.y * canvas.sizeRatio;
          v.path.segments[i].point.x = pos.x * canvas.sizeRatio;
        }
      }
      return true;
    }		
  };

  var t = _.template('<option id="<%= id %>"><%= id %></option>');
  _(Design).each(function(d, id) {
    $('#design_picker').append( t({ id: id }) );
  });
  
  Design.load( localStorage.getItem( 'tudio::current_design') || 'breton' );
});
