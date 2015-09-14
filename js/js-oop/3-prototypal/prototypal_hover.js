// prototype pattern
// with the dom


function Tooltip_Button(btn, panel) {
  if (this === window) {
    return new Tooltip_Button(btn, panel);
  }
  this.button = jQuery(btn);
  this.panel  = jQuery(panel);

}

Tooltip_Button.prototype = {
  constructor: Tooltip_Button,
  show: function () {
    this.panel.show();
    return this
  },
  hide: function () {
    this.panel.hide();
    return this
  },
  bind_events: function() {
    var that = this;
    this.button.bind("mouseover.Tooltip_Button", function() {
      that.show.call(that);
    });
    this.button.unbind("mouseout.Tooltop_Button", function() {
      that.hide.call(that);
    });
  },
  unbind_events : function () {
    this.button.unbind(".Tooltip_Button");
    return this;
  }
};

var hb = new Tooltip_Button("#button", "#panel");

hb.bind_events();
