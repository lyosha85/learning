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

# params passing
# /frank/sinatra/here takes precedence over /frank
get "/:one/:two/:three" do
  "first: #{params[:one]} <br/>" +
  "second: #{params[:two]} <br/>" +
  "third: #{params[:three]} <br/>"
end

get "/what/time/is/it/in/:number/hours" do
  number = params[:number].to_i
  time = Time.now + number * 3600
  "The time in #{number} hours will be #{time.strftime('%I:%M %p')}"
end
