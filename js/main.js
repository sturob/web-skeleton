window.ev = new tickEvent(); // meh

function changed() {
  refresh = true;
}




$(function() {
  
  paper.install( window );
  paper.setup( canvas.el ); // Create an empty project and a view for the canvas
  canvas.resize({ }); // setup


  $.get('js/designs/blocks.json', function(design) {
    window.design = design;
    load_design( design )
  });
  
  (function animloop() {
    requestAnimFrame( animloop );
    ev.update();      // update the event var
    window.onFrame && window.onFrame( ev );
  })();
});

var raw_params = {},
    coaxed_params = {},
    v = coaxed_params;

// var p = {
//   pause: false,
//   inputs: current
// };


var refresh = false,
    animating = false;

var old_coax = coax;
var hack;

coax = function(n, min, max, a, b) {
  return old_coax(hack, min, max, a, b);
};


var randomise_count = 0;
function randomise() {
  var animate_to = {};
  animating = true;
  refresh = true;
  
  var keys = _(design.parameters).keys();
  
  var key = keys[ Math.floor( keys.length * Math.random() ) ];
  
  // for (p in design.parameters) {
    $(raw_params).animate( kv(key, Math.random()), function() {
      animating = false;
    });
  // }
  
//  apply_para_functions( raw_params );
}

function initial_randomise() {
  animating = true;
  
  var stop = _.after( _(design.parameters).keys().length, function () {
    animating = false;
  });
  
  for (p in design.parameters) {
    $(raw_params).animate( kv(p, Math.random()), function() {
      stop();
    });
  }
}


function load_design(design) {    
//  var initial = 
//  design.functions.initial.f.call(v); // call with this set to p
  window.ev = new tickEvent();
  
  var frame_f = new Function('ev', 'n', 'with (current) { ' + design.functions.paperjs + '\n } ');

  window.gui.destroy();
  window.gui = new dat.GUI({  });

  // window.gui.onChange = function() {
  //   console.log('huh');
  //   refresh = true;
  // };

  for (p in design.parameters) {
    raw_params[p] = 0;
    var gui_row = gui.add( raw_params, p, 0, 1 ).step( 0.001 ).listen();

    window.gui_row = gui_row;
    
    gui_row.onChange( function(value) {
      refresh = true;
    });
    
    // raw_params[p] = design.parameters[p].initial - 0;

    // load sliders
    design.parameters[p].f = new Function( "with (this) {\nreturn " + design.parameters[p].formula + "\n}" );
    
    var frame_f = new Function('ev', 'n', 'with (v) { ' + design.functions.paperjs + '\n } ');
  }
  
  apply_para_functions( raw_params );
  
  initial_randomise();
  
  function apply_para_functions(inputs) {
    for (p in design.parameters) {
      hack = inputs[p];
      coaxed_params[p] = design.parameters[p].f.call( inputs );
    }
  }

  window.onFrame = function(event) {
    if (refresh) {
      apply_para_functions( raw_params );
      frame_f.call(coaxed_params, event, 0); // call with this set to p
      paper.view.draw();
      if (! animating) refresh = false;
    }
  };

}
