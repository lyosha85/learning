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

function Fading_Tooltip_Button (btn, panel) {
  // idential constructor :-(
  if (this === window) {
    return new Tooltip_Button(btn, panel);
  }
  this.button = jQuery(btn);
  this.panel  = jQuery(panel);
}

Fading_Tooltip_Button.prototype = new Tooltip_Button();
Fading_Tooltip_Button.prototype.constructor = Fading_Tooltip_Button;
Fading_Tooltip_Button.prototype.show = function() {
  this.fadeIn();
  return this;
}
Fading_Tooltip_Button.prototype.hide = function () {
  this.panel.fadeOut();
  return this;
}

hb.unbind_events();
var hb2 = Fading_Tooltip_Button("#button", "#panel");
hb2.bind_events();

