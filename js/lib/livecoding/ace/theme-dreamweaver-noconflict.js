ace.define("ace/theme/dreamweaver",["require","exports","module"],function(a,b,c){b.isDark=!1,b.cssClass="ace-tm",b.cssText=".ace-tm .ace_editor {  border: 2px solid rgb(159, 159, 159);}.ace-tm .ace_editor.ace_focus {  border: 2px solid #327fbd;}.ace-tm .ace_gutter {  background: #e8e8e8;  color: #333;}.ace-tm .ace_print_margin {  width: 1px;  background: #e8e8e8;}.ace-tm .ace_fold {    background-color: #00F;}.ace-tm .ace_text-layer {  cursor: text;}.ace-tm .ace_cursor {  border-left: 2px solid black;}.ace-tm .ace_cursor.ace_overwrite {  border-left: 0px;  border-bottom: 1px solid black;}        .ace-tm .ace_line .ace_invisible {  color: rgb(191, 191, 191);}.ace-tm .ace_line .ace_keyword {  color: blue;}.ace-tm .ace_line .ace_constant.ace_buildin {  color: rgb(88, 72, 246);}.ace-tm .ace_line .ace_constant.ace_language {  color: rgb(88, 92, 246);}.ace-tm .ace_line .ace_constant.ace_library {  color: rgb(6, 150, 14);}.ace-tm .ace_line .ace_invalid {  background-color: rgb(153, 0, 0);  color: white;}.ace-tm .ace_line .ace_support.ace_function {  color: rgb(60, 76, 114);}.ace-tm .ace_line .ace_support.ace_constant {  color: rgb(6, 150, 14);}.ace-tm .ace_line .ace_support.ace_type,.ace-tm .ace_line .ace_support.ace_class {  color: #009;}.ace-tm .ace_line .ace_support.ace_php_tag {  color: #f00;}.ace-tm .ace_line .ace_keyword.ace_operator {  color: rgb(104, 118, 135);}.ace-tm .ace_line .ace_string {  color: #00F;}.ace-tm .ace_line .ace_comment {  color: rgb(76, 136, 107);}.ace-tm .ace_line .ace_comment.ace_doc {  color: rgb(0, 102, 255);}.ace-tm .ace_line .ace_comment.ace_doc.ace_tag {  color: rgb(128, 159, 191);}.ace-tm .ace_line .ace_constant.ace_numeric {  color: rgb(0, 0, 205);}.ace-tm .ace_line .ace_variable {  color: #06F}.ace-tm .ace_line .ace_xml_pe {  color: rgb(104, 104, 91);}.ace-tm .ace_entity.ace_name.ace_function {  color: #00F;}.ace-tm .ace_markup.ace_markupine {    text-decoration:underline;}.ace-tm .ace_markup.ace_heading {  color: rgb(12, 7, 255);}.ace-tm .ace_markup.ace_list {  color:rgb(185, 6, 144);}.ace-tm .ace_marker-layer .ace_selection {  background: rgb(181, 213, 255);}.ace-tm .ace_marker-layer .ace_step {  background: rgb(252, 255, 0);}.ace-tm .ace_marker-layer .ace_stack {  background: rgb(164, 229, 101);}.ace-tm .ace_marker-layer .ace_bracket {  margin: -1px 0 0 -1px;  border: 1px solid rgb(192, 192, 192);}.ace-tm .ace_marker-layer .ace_active_line {  background: rgba(0, 0, 0, 0.07);}.ace-tm .ace_marker-layer .ace_selected_word {  background: rgb(250, 250, 255);  border: 1px solid rgb(200, 200, 250);}.ace-tm .ace_meta.ace_tag {  color:#009;}.ace-tm .ace_meta.ace_tag.ace_anchor {  color:#060;}.ace-tm .ace_meta.ace_tag.ace_form {  color:#F90;}.ace-tm .ace_meta.ace_tag.ace_image {  color:#909;}.ace-tm .ace_meta.ace_tag.ace_script {  color:#900;}.ace-tm .ace_meta.ace_tag.ace_style {  color:#909;}.ace-tm .ace_meta.ace_tag.ace_table {  color:#099;}.ace-tm .ace_string.ace_regex {  color: rgb(255, 0, 0)}";var d=a("../lib/dom");d.importCssString(b.cssText,b.cssClass)}),function(){ace.require(["ace/ace"],function(a){window.ace||(window.ace={});for(var b in a)a.hasOwnProperty(b)&&(ace[b]=a[b])})}()