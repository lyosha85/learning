class SubscriptionMailer < ApplicationMailer

  # Subject can be set in your I18n file at config/locales/en.yml
  # with the following lookup:
  #
  #   en.subscription_mailer.task_update.subject
  #
  def task_update(user, task)
    @task = task
    @user = user

    subject = "Task '#{task.name}' Moved to #{task.state}"

    mail to: user.email, subject: subject
  end
end
