$(function() {
  $.get('js/designs/blocks.json', function(design) {
    window.design = design;
      
    load_design( design )
  });
  
});