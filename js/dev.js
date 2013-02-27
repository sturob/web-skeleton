var CONFIG = {};
less.watchMode = false;
CONFIG.imageRefresh = false,
CONFIG.transitions = false;

// setInterval(function() { if (less.watchMode) less.refresh() }, 1000); // why, i do not know

window.onkeyup = function(e) {
  // if (e.keyCode == 0) { // §
  //   less.watchMode = ! less.watchMode;
  //   if (less.watchMode) less.watch();
  //   window.status = 'less refresh = ' + less.watchMode;
  // }

  // if (e.keyCode == 58) {
  //   IMG_REFRESH = ! IMG_REFRESH;
  //   console.log('image refresh = ' + IMG_REFRESH);
  // }

  // if (e.keyCode == 51) {
  //   CONFIG.transitions = ! CONFIG.transitions;
  //   $('body').toggleClass('no_transitions', CONFIG.transitions)
  //   window.status = 'css transitions = ' + CONFIG.transitions;
  // }
};


(function() {
  var hn  = window.location.hostname;
  window.devMode = hn == 'localhost' || hn.substr(-3) == 'dev' || hn.substr(-6) == 'xip.io';

  if (devMode) { // delete stylesheets + add less
    var sheet = document.styleSheets[0]; // .ownerNode.id == 'styles'
    var rules = sheet.cssRules ? sheet.cssRules : sheet.rules; // IE meh
    var i = rules.length;
    if (i != 0) {
      while (i--) {
        sheet.deleteRule ? sheet.deleteRule(i) : sheet.removeRule(i); // IE meh
      }
    }

    var s = document.getElementsByTagName('link')[0];
    var liveless = document.createElement('link');
    var lessjs   = document.createElement('script');

    if (! s) return;

    liveless.id   = "live_styles";
    liveless.href = s.href.replace(/css/g, 'less'); // "assets/less/f.less"
    liveless.rel  = "stylesheet/less";
    s.parentNode.insertBefore(liveless, s);

    lessjs.type = 'text/javascript';
    lessjs.src  = 'assets/less/less-1.3.3.js';
    s.parentNode.insertBefore(lessjs, s);
  }
})();



// adapted www.jameswiseman.com/blog/2010/08/24/manually-traverse-a-dom-tree-using-jquery/

function html2less($item, pass) {  
  var tmp = {};
  
  $item = $item ? $item : $('body');
  pass = pass ? pass : { max: 50, count: 0, less: "" };

  $item.each(function(n, v) {
    var tagName   = this.tagName.toLowerCase(),
        className = this.className ? '.' + this.className : '',
        selector  = tagName + className,
        indented = Array(pass.count * 2).join(" ");

    if (tmp[selector]) {
      return;
    } else {
      tmp[selector] = true;
    }
    
    pass.count++;
    if (pass.count > pass.max) {  
      pass.max = pass.count;  
    }

    pass.less += indented + selector + " {\n";
    html2less( $(this).children(), pass );
    pass.less += indented + "}\n";
  });  
  pass.count--;  
  return pass.less;  
}  
  



function ls (obj, depth, original) { // 
  if (! depth) { 
    depth    = 0;
    original = obj;
  }
  
  var indent = Array(depth + 1).join('^') + " ",
      props  = Object.getOwnPropertyNames( obj ),
      parent = Object.getPrototypeOf( obj ),
      text   = '';
  
  props = _(props).sort().map(function(p) {
    try {
      if (_.isFunction( obj[p] )) { 
        var str = (obj[p] + "").split('\n')[0];
        if (str) {
          str = str.replace(/\ /g, ''); // no fucking spaces
          var match = str.match( /^function\((.*?)\)/ );
          p += match ? '(' + match[1] + ')' : '(?)';
        }
      }
      if (_.isElement(  obj[p] )) { p += "$" }
      if (_.isArray(    obj[p] )) { p += "[" + obj[p].length + "]" }
      if (_.isString(   obj[p] )) { p += '="' + obj[p] + '"' }
      if (_.isBoolean(  obj[p] )) { p += '=' + obj[p] }
      if (_.isNumber(   obj[p] )) { p += '=' + obj[p] }
    } catch (err) {
      p = p + "*";
      // console.log(err)
    }
    return p;
  });
      
  text = "\n" + indent + props.join('  ') + "\n";

  return (parent ? ls(parent, ++depth, original) + text : text);
}


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
