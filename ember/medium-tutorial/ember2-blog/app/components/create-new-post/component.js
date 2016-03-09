import Ember from 'ember';

export default Ember.Component.extend({
  actions: {
    createPost: function(model){
      // console.log(newPost.title, newPost.author);
      this.sendAction('createPost', model);

      //clear each input field
      this.set('newPost.title', null);
      this.set('newPost.author', null);
      this.set('newPost.text', null);
    }
  }
});
