// Classical Inheritance (with Base.js)
// DOM example

var TB = Base.extend({
    constructor: function (btn, panel) {
        this.button = jQuery(btn);
        this.panel = jQuery(panel);
    },
    show : function () {
        this.panel.show();
    },
    hide : function () {
       this.panel.hide();
    },
    bind_events : function () {
        var that = this;
        this.button.bind("mouseover.TB", function () { that.show.call(that); });
        this.button.bind("mouseout.TB", function () { that.hide.call(that); });
    },
    unbind_events : function () {
        this.button.unbind(".TB");
    }
});

var tb = new TB("#button", "#panel");

tb.bind_events();


var FTB = TB.extend({
    show : function () {
        this.panel.fadeIn();
    },
    hide: function () {
      this.panel.fadeOut();
    }
});

tb.unbind_events();

var ftb = new FTB("#button", "#panel");
ftb.bind_events();
