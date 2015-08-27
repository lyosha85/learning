class PagesController < ApplicationController
  def index

  end
  def mail
    UserMailer.durmail.deliver_now
    redirect_to root_path
  end
end
