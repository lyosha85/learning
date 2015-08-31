require 'sinatra'
require 'sinatra/reloader' if development?

get '/' do
  erb :home
end

get '/about' do
  erb :about, layout: :special
end

get '/contact' do
  erb :about
end

