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
 0. Ember Inspector: We can grab almost any instance of a Route, Controller, View or Model with the ember- inspector and then reference it in the console with the $E variable. This variable is reset every time the browser gets refreshed.
 0. We can grab almost any instance of a Route, Controller, View or Model with the ember- inspector and then reference it in the console with the $E variable. This variable is reset every time the browser gets refreshed.
  0. First, the resolver tries to find an adapter at the model level:
  0. Second, if no adapter is specified for the model, then the resolver checks if we specified an application adapter. As we can see, it returns undefined, which means we didn’t specify one
  0. Third, if no model or application adapter is found, then ember data falls back to the default adapter, the JSONAPIAdapter. We can check the implementation for this directly in the adapterFor32 function in ember data.
 0. Since we want to work with a different adapter, we need to tell ember to do so. `ember install active-model-adapter` And then run ember g adapter application to create an application adapter `ember g adapter application`
 0. This will namespace our requests to /api/#{resource}
  ```
    export default ActiveModelAdapter.extend({
      namespace: 'api'
    });
  ```
