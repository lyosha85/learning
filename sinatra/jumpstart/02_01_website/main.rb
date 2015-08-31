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

