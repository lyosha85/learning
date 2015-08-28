require 'sinatra'
require 'sinatra/reloader'

get '/bet/:stake/on/:number' do
  stake = params[:stake].to_i # params always pass as str
  number = params[:number].to_i
  roll = rand(6) + 1
  if number == roll
    result = 6 * stake
    "It landed on #{roll}. Well done, you win #{result} chips"
  else
    "It landed on #{roll}. You lose your stake of #{stake} chips"
  end
end
