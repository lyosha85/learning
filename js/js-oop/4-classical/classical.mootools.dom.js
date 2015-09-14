// Classical Inheritance (with Mootools)
// DOM Example

var TooltipButton = new Class({
    initialize: function (btn, panel) {
        this.button = document.id(btn);
        this.panel = document.id(panel);
        this._event_fns = {};
    },
    show : function () {
        this.panel.show();
    },
    hide : function () {
       this.panel.hide();
    },
    bind_events : function () {
        this._event_fns.show = this.show.bind(this);
        this._event_fns.hide = this.hide.bind(this);
        this.button.addEvent("mouseover", this._event_fns.show);
        this.button.addEvent("mouseout", this._event_fns.hide);
    },
    unbind_events : function () {
       this.button.removeEvent("mouseover", this._event_fns.show);
       this.button.removeEvent("mouseout", this._event_fns.hide); 
    }
});

var tb = new TooltipButton("button", "panel");

tb.bind_events();

var FadingTooltipButton = new Class({
    Extends: TooltipButton,
    show : function () {
        this.panel.fade("in");
    },
    hide : function () {
        this.panel.fade("out");
    }
});

var ftb = new FadingTooltipButton("button", "panel");
tb.unbind_events();

ftb.bind_events();

