Blogger.AboutController = Ember.Controller.extend({
	isPictureShowing: false,
	actions: {
		showRealName: function(){
			alert('Wallachian');
		},
		showPicture: function(){
			this.set('isPictureShowing', true);
		}
		
	}
});