Blogger.PostsRoute = Ember.Route.extend({
	controllerName: 'posts',
	renderTemplate: function() {
		this.render('posts');
	}
});