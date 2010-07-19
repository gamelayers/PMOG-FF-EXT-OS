/**
 * cust_checkbox_plugin.js
 * Copyright (c) 2009 myPocket technologies (www.mypocket-technologies.com)
 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * View the GNU General Public License <http://www.gnu.org/licenses/>.

 * @author Darren Mason (djmason9@gmail.com)
 * @date 7/3/2009
 * @projectDescription	Replaces the standard HTML form checkbox or radio buttons. Allows for disable, and very customizable.
 * @version 1.0.4
 * 
 * @requires jquery.js (tested with 1.3.2)
 * 
 * @param disable_all:	false,
 * @param wrapperclass:	"group"
 * @param callback:	function(){ * your code here * }
 */

(function($) {	
	$.fn.custCheckBox = function(options){
		
		var defaults = {
				disable_all:	false,				//disables all the elements
				wrapperclass:	"group",			//the class name of the wrapper tag
				callback:	function(){}			//a click event callback
			};
		//override defaults
		var opts = $.extend(defaults, options);
		
		return this.each(function() { 
	 		 var obj = $(this);
	 		 
		$.fn.buildbox = function(thisElm){
			
			$(thisElm).css({display:"none"}).before("<span class=\"cust_checkbox\">&nbsp;&nbsp;&nbsp;&nbsp;</span>");
			
			var isChecked = $(thisElm).attr("checked");
			var boxtype = $(thisElm).attr("type");
			var disabled = $(thisElm).attr("disabled");
			
			if(boxtype === "checkbox")
			{
				$(thisElm).prev("span").addClass("checkbox");
				if(disabled || opts.disable_all){boxtype = "checkbox_disabled";}
			}
			else
			{
				$(thisElm).prev("span").addClass("radio");
				if(disabled || opts.disable_all){boxtype = "radio_disabled";}
			}
			
			if(isChecked)
				$(thisElm).prev("span").addClass("cust_"+boxtype+"_on");
			else
				$(thisElm).prev("span").addClass("cust_"+boxtype+"_off");
			
			if(opts.disable_all)
				$(thisElm).attr("disabled","disabled");
			
			
			//attach a click event for each label.
			
			$(thisElm).prev("span").prev("label").unbind().click(function(){
						
				if(!opts.disable_all)
				{
					var custbox = $(this).next("span");
					var boxtype = $(custbox).next("input").attr("type");
					var disabled = $(custbox).next("input").attr("disabled");

					if($(custbox).hasClass("checkbox"))
					{
						if($(custbox).hasClass("cust_"+boxtype+"_off") && !disabled)
							$(custbox).removeClass("cust_"+boxtype+"_off").addClass("cust_"+boxtype+"_on").next("input").attr("checked","checked"); //turn on
						
						else if(!disabled)					
							$(custbox).removeClass("cust_"+boxtype+"_on").addClass("cust_"+boxtype+"_off").next("input").removeAttr("checked"); //turn off
						
						
					}
					else if(!disabled)
					{
						$(custbox).parent().find(".cust_checkbox").removeClass("cust_"+boxtype+"_on").addClass("cust_"+boxtype+"_off").next("input").removeAttr("checked");
						$(custbox).removeClass("cust_"+boxtype+"_off").addClass("cust_"+boxtype+"_on").next("input").attr("checked","checked"); //turn on
					}
					
					opts.callback.call(this);					 
					
				}
						
			});
		
			//attach a click event for each checkbox.
			$(thisElm).prev("span").unbind().click(function(){
			
				if(!opts.disable_all)
				{
					var boxtype = $(this).next("input").attr("type");
					var disabled = $(this).next("input").attr("disabled");

					if($(this).hasClass("checkbox"))
					{
						if($(this).hasClass("cust_"+boxtype+"_off") && !disabled)
							$(this).removeClass("cust_"+boxtype+"_off").addClass("cust_"+boxtype+"_on").next("input").attr("checked","checked"); //turn on
						else if(!disabled)
							$(this).removeClass("cust_"+boxtype+"_on").addClass("cust_"+boxtype+"_off").next("input").removeAttr("checked"); //turn off
					}
					else if(!disabled)
					{
						$(this).parent().find(".cust_checkbox").removeClass("cust_"+boxtype+"_on").addClass("cust_"+boxtype+"_off").next("input").removeAttr("checked");
						$(this).removeClass("cust_"+boxtype+"_off").addClass("cust_"+boxtype+"_on").next("input").attr("checked","checked"); //turn on
					}

					opts.callback.call(this);

				}
			});			
			
		};
		
		//build the boxes
		$.fn.buildbox($(obj));
		
		
		
		
	}); 	
};
	
})(jQuery);
