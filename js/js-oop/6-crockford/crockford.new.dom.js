
var tooltip_button = new_constructor(Object, function (btn, panel) {
    this.button = jQuery(btn);
    this.panel  = jQuery(panel);
},
{
    show : function () { this.panel.show(); },
    hide : function () { this.panel.hide(); },

    bind_events: function () {
        var that = this;
        this.button.bind('mouseover.tooltip_button', function () { that.show.call(that); })
                   .bind('mouseout.tooltip_button', function () { that.hide.call(that); });
    },
    unbind_events : function () {
        this.button.unbind(".tooltip_button");
    },
});


var tb = tooltip_button("#button", "#panel");

tb.bind_events();


tb.unbind_events();

var fading_tooltip_button = new_constructor(tooltip_button, function (btn, panel) {
    this.button = jQuery(btn);
    this.panel  = jQuery(panel);
},
{
    show : function () { this.panel.fadeIn(); },
    hide : function () { this.panel.fadeOut(); }
});

var ftb = fading_tooltip_button("#button", "#panel");

ftb.bind_events();
