
function make_tooltip_button(button, panel) {
    return {
        button: jQuery(button),
        panel : jQuery(panel),
        show  : function () { this.panel.show(); },
        hide  : function () { this.panel.hide(); },

        bind_events : function () {
            var that = this;
            this.button.bind("mouseover.tooltip_button", function (e) { that.show.call(that, e); })
                        .bind("mouseout.tooltip_button", function (e) { that.hide.call(that, e); });
        },

        unbind_events : function () {
            this.button.unbind(".tooltip_button");
        }
    }
}

var tb = make_tooltip_button("#button", "#panel");

tb.bind_events();


function make_fading_tooltip_button(button, panel) {
    var ret = make_tooltip_button(button, panel);

    ret.show = function () { this.panel.stop().fadeIn(); };
    ret.hide = function () { this.panel.stop().fadeOut(); };

    return ret;
}

var ftb = make_fading_tooltip_button("#button", "#panel");

tb.unbind_events();

ftb.bind_events();
