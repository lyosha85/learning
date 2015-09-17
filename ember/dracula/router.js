Blogger.Router.map( function() {
  this.resource('posts', {path: '/'});
  this.resource('post', {path: 'post/:post_id'});
  this.resource('about', {path: 'about-us'});
  this.resource('contact', {path: 'contact'}, function(){
  	this.resource('phone');
  	this.resource('email');
  }),
  this.resource('comments');
});
