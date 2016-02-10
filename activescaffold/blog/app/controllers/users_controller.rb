class UsersController < ApplicationController
  active_scaffold :"user" do |conf|

  end
  active_scaffold do |config|
    config.action_links.add :index, :label => 'Show active', :parameters => {:scope => :a}, :position => false
  end
  def beginning_of_chain
    if params[:scope].present? && User::POSSIBLE_SCOPES.include?(params[:scope])
      super.send(params[:scope] )
    end
  end
end
