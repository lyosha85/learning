class SubscriptionsController < ApplicationController
  before_action :logged_in_user, only: [:create]

  def create
    subscription = Subscription.new(subscription_params)
    if correct_user(subscription)
      if subscription.save
        flash[:success] = "Successfully subscribed to task updates!"
      else
        flash[:danger] = "Subscription failed to save!"
      end
    else
      flash[:danger] = "User doesn't match!"
    end
    redirect_to task_path(subscription.task_id)
  end

  private
  def subscription_params
    params.require(:subscription).permit(:user_id, :task_id)
  end

  def correct_user(subscription)
    current_user.id == subscription.user_id
  end
end
