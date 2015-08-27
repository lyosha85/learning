require 'sinatra'
require 'sinatra/reloader' if development? # just like rails' spring

# Route handler for http verb get
get '/hello' do
  # return evaluated and sent to the browser
  'Hai there'
end

# first declared URL gets precedence
get '/frank' do
  name = 'frank'
  "Hai there, #{name}."
end

# generalized URL
get '/:name' do
  "Hai there,.. #{params[:name]}" # access params hash like in rails
end
