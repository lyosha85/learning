require 'sinatra'
require 'sinatra/reloader' if development?

set :public_folder, 'assets'
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

