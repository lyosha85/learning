class Task < ActiveRecord::Base
  has_many :subscriptions
  has_many :users, through: :subscriptions
  validates_presence_of :name, :description, :user_id, :state

  def subscriber?(user)
    self.users.include?(user)
  end

  def update_subscribers
    self.users.each do |user|
      SubscriptionMailer.task_update(user, self).deliver_later
    end
  end
end
