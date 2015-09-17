Blogger.ContactController = Ember.Controller.extend({
	actions: {
		sendMessage: function() {
			var message = prompt('Enter message here');
		}
	}
});