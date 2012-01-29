// dynamic canvas
window.canvas = {
  resize: function(new_size) {
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
};
  
$(function() {
  canvas.el = $('canvas')[0];
  window.context    = canvas.el.getContext('2d');
});

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
