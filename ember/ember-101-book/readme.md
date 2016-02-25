# Chapter 1
 0. Install watchman
 0. npm -g install ember-cli (to install ember-cli without sudo read http://www.wenincode.com/installing-node- jsnpm-without-sudo)
 0. ember new borrowers --skip-git
 0. `ember generate resource friends firstName:string lastName:string email:string twitter:string totalArticles:number`
 0. General object structure (ES6 Modules!):
  ```
    import Foo from 'foo';
    export default Foo.extend({ });
  ```
   import Foo from 'foo' consumes the default export from the package foo and assigns it to the variable Foo. (read: http://jsmodules.io/)
 0. Check with: `curl http://api.ember-cli-101.com/api/friends.json | python -m json.tool`
  hint: Piping JSON data to `python -m json.tool` is an easy way to pretty print JSON data in our console using python’s JSON library. It’s very useful if we want to quickly debug JSON data.
 0. When returning a list `ember data active-model-adapter` expects the root of the name of the JSON to match the name of the model, but pluralized.
 0. ember data adapters:
  - http://jsonapi.org/ # standard for stock ember data json
  - ember data active model adapte (https://github.com/rails-api/active_model_serializers)
  - https://github.com/toranb/ember-data-django-rest-adapter
  - https://github.com/escalant3/ember-data-tastypie-adapter
  - https://github.com/firebase/emberfire
  - https://github.com/search?q=ember-data+adapter&ref=opensearch #search for misc adapters
 0. 
