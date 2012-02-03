window.ev = new tickEvent(); // meh

function changed() {} // TODO better




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

    paper.view.draw();
  })();
});

var raw_params = {},
    coaxed_params = {},
    v = coaxed_params;

// var p = {
//   pause: false,
//   inputs: current
// };
// 



var old_coax = coax;
var hack;

coax = function(n, min, max, a, b) {
  return old_coax(hack, min, max, a, b);
};


function load_design(design) {    
//  var initial = 
//  design.functions.initial.f.call(v); // call with this set to p
  window.ev = new tickEvent();
  
  var frame_f = new Function('ev', 'n', 'with (current) { ' + design.functions.paperjs + '\n } ');

  window.gui.destroy();
  window.gui = new dat.GUI({  });

  for (p in design.parameters) {
    raw_params[p] = 0;
    gui.add( raw_params, p, 0, 1 ).step( 0.01 ).listen();

    // load sliders
    design.parameters[p].f = new Function( "with (this) {\nreturn " + design.parameters[p].formula + "\n}" );

    var frame_f = new Function('ev', 'n', 'with (v) { ' + design.functions.paperjs + '\n } ');
  }
  
  apply_para_functions( raw_params );
  
  function apply_para_functions(inputs) {
    for (p in design.parameters) {
      // console.log( design.parameters[p].f )
      hack = inputs[p];
      coaxed_params[p] = design.parameters[p].f.call( inputs );
    }
  }

  window.onFrame = function(event) {
    apply_para_functions( raw_params );
    frame_f.call(coaxed_params, event, 0); // call with this set to p
  };

}
