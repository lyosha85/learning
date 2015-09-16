// Module Pattern
// DOM example

var hover_button = (function () {
    var btn = jQuery("#button"),
        panel = jQuery("#panel");

    function fade_in () {
        panel.fadeIn();
    }
    function fade_out() {
        panel.fadeOut();
    }

    return {
        bind_events : function () {
            btn.bind("mouseover", fade_in)
                .bind("mouseout", fade_out);
            return this;
        },
        unbind_events: function () {
            btn.unbind("mouseover", fade_in)
                .unbind("mouseout", fade_out);
            return this;
       },
        show : function () {
            fade_in();
            return this;
       },
        hide : function () {
           fade_out();
           return this;
       }
    };
}());

hover_button.bind_events();
