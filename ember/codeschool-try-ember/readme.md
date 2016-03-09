Video 1
 - Ember came out of apple project sprout-core
 - MVC
 - Client side
 - Framework, tooling, convention, standards, w3c standards

 - install node, ember cli (npm install -g ember-cli)
  - installs ember executable, not ember-cli
 - $ ember help


Video 2 - templates and routes
 - Template instructs what to render, using handlebars
 - application.hbs -> is main template
 - {{outlet}} <- dynamic data points that can change , like other templates
   - they get rendered and displayed at outlet
   - get layered
 - if nothing in to render, it will render an auto-generated nothing
 - to tell ember about endpoint -> you gotta route that
 - you can remove {path: 'resource/'} if this.route('resource') has the same resource name
 - you cam omit the index
 - link_to takes a route like the rails helper
   - use block {{#link-to "orders"}}Order{{/link-to}} -> generates a special anchor tag
   - to add a class
    - {{#link-to class="orders-link"}}Orders{{/link-to}}
   - to use a custom tag
    - {{#link-to "orders" tagName="div"}}Orders{{/link-to}}
      - ember listens to clicks on that div
   - Why does the router updates the url?
      - to keep state, use bookmarks, share urls, use the back button

Video 2 - Section 2 - routes
 - router -> routes -> templates
 - ember auto generates default routes
 - to add an endpoint -> add a new router
  - `ember generate route name_of_route`
 - {{#each model as |order|}} Order {{order.id}} for {{order.name}} {{/each}}
 - model hooks:
    activate -> triggered when navigation enters the route.
    deactivate-> triggered when navigation leaves the route.
    model -> returns model data to use in the route and template
    redirect -> optionally used to send the use to a different route
 - making links within iterators
    - router .. create a  new route ->   this.route('order', {path: '/order/:order_id'});
    {{#each model as |order|}}
      {{#link-to ????????}} hai {{/link-to}}
    {{/each}}
    - router will compare its route againts the routes one by one, until it meets something that matches the route, and its dynamic segment.
    - then, it will capture the dynamic segment, such as the id, it will be passed to the correct route as a hash {order_id: 4}
 - route takes parameters like this
  model(params) {
    return[
      {id: 1, name: "Nate"},
      {id: 1, name: "Gregg"}
    ].findBy('id', params.order_id)
  }

- then, render it like this
  order {{model.id}} for {{model.name}}

- finally ->
{{#each model as |order|}}
  {{#link-to "order" order}} hai {{order.id}}:{{order.name}} {{/link-to}}
{{/each}}

- nested routes
Router.map(function() {
  this.route('orders', function(){
    this.route('order', {path: '/:order/id'});  //makes order a child of the orders route
    });
  });
   -- and {{link-to "order.order" order}}


Video 3 - models and services
 - centralize data with long lived data "singleton"
  - good for 3rd party resources, login systems, holding data in data repo
 - ember generate service <service name>

 example: services/store.js
  getOrders() {
    <!-- return[
      {id: 1, name: 'Nate'},
      {id: 1, name: 'Gregg'}
    ] --> instead..
    getOrderById(id){
      const orders = this.getOrders();
      return orders.findBy('id', id);
    }
  }
 && routes/order.js
 export default Ember.Route.extend({
   model(params){
     const id = params.order_id;
     const store = this.get('store');  //js throws error if cont value changes
     return store.getOrder();
   },
   store: Ember.inject.service('store') //local name as store, and name of service injected
   })
   && orders.js


   products, -> titles, desc, image,
   orders -> name, line items
   line item -> product, quantity

   Models!
   -> sometimes persistance
   app/models/..
   app/models/product.js

   import Ember from 'ember';
   export default Ember.Object.extend({})

-> why extend from ember object? (4:50)
