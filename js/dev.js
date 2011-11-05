less.watchMode = false;
CONFIG.imageRefresh = false,
CONFIG.transitions = false;

// setInterval(function() { if (less.watchMode) less.refresh() }, 1000); // why, i do not know

window.onkeyup = function(e) {
  if (e.keyCode == 49) {
    less.watchMode = ! less.watchMode;
    window.status = 'less refresh = ' + less.watchMode;
  }
  if (e.keyCode == 58) {
    IMG_REFRESH = ! IMG_REFRESH;
    console.log('image refresh = ' + IMG_REFRESH);
  }

  if (e.keyCode == 51) {
    CONFIG.transitions = ! CONFIG.transitions;
    $('body').toggleClass('no_transitions', CONFIG.transitions)
    window.status = 'css transitions = ' + CONFIG.transitions;
  }
};


// $.imagine = function() {
//   $('img').each(function(i, el){
//     el.src =  el.src.split('?')[0] + '?' + new Date().getTime(); 
//   });
// 
//   $('*').each(function(i, el){
//     var f = $(el).css('background-image');
//     var res = /\((.*\/)(.*)\)/.exec( f );
//     if (res && res[1]) {
//       var new_img = 'url(' + res[1] + res[2].split('?')[0] + "?" + new Date().getTime() + ')'; 
//       $(el).css({ width: '', backgroundImage: new_img });
//     }
//   });
// };


// setInterval(function() {
//   if (IMG_REFRESH) {
//     $.imagine();                  
//   }
// }, 5000);
// 
// var CODE_REFRESH = false;
// 
// setInterval(function() {
//   if (CODE_REFRESH) {
//     $.get('/javascripts/refresh.js', function(response) {
//       eval(response);
//     });
//   }
// }, 2000);
// 
// $(window).focus(function() {
//   less.refresh();
  // if (IMG_REFRESH) {
  //   $.imagine();
  // }
//   $.get('/javascripts/refresh.js', function(response) {
//     eval(response);
//   })
// });