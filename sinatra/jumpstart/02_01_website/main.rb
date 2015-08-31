require 'sinatra'
require 'sinatra/reloader' if development?

set :public_folder, 'assets' # http root path for folder is '/' (not /assets/)
set :views, 'templates'

get '/' do
  erb :home
end

get '/about' do
  erb :about, layout: :special
end

get '/contact' do
  erb :about
end

not_found do
  erb :not_found # still uses layout.erb as layout
end

get "/fake-error" do
  status 500
  "Nothing is wrong.."
end
