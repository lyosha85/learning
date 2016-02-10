class UsersController < ApplicationController
  active_scaffold :"user" do |conf|

  end
  active_scaffold do |config|
    config.action_links.add :index, :label => 'Show active', :parameters => {:active => true}, :position => false
  end
end
