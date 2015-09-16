// ECMAScript 5 Pattern
// DOM Example
var tooltip_button = {
    show : function () {
        this.panel.show();
    },
    hide : function () {
        this.panel.hide();
    },
    bind_events : function () {
        var that = this;
        this.button.bind("mouseover.Tooltip_Button", function () { that.show.call(that); });
        this.button.bind("mouseout.Tooltip_Button", function () { that.hide.call(that); });
                  },
    unbind_events : function () {
        this.button.unbind(".Tooltip_Button");
    }
};

var tb = Object.create(tooltip_button);

tb.button = jQuery("#button");
tb.panel  = jQuery("#panel");

tb.bind_events();
// After testing the first one . . . 
tb.unbind_events();

var fading_tooltip_button = Object.create(tooltip_button);

fading_tooltip_button.show = function () {
    this.panel.fadeIn();
}
fading_tooltip_button.hide = function () {
    this.panel.fadeOut();
}

var ftb = Object.create(fading_tooltip_button);
ftb.button = jQuery("#button");
ftb.panel  = jQuery("#panel");

// By creating a new object based on an instance of tooltip_button, and then changing show / hide on that, you don't have to set the button and panel properties.
//var fading_tooltip_button = Object.create(tb);

fading_tooltip_button.bind_events();
