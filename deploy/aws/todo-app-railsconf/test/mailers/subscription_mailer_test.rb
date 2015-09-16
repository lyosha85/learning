require 'test_helper'

class SubscriptionMailerTest < ActionMailer::TestCase
  def setup
    @user = users(:test)
    @task = tasks(:one)
    ENV['FROM_EMAIL'] = 'from@example.com'
  end

  test "task_update" do
    mail = SubscriptionMailer.task_update(@user, @task)
    assert_equal "Task '#{@task.name}' Moved to #{@task.state}", mail.subject
    assert_equal [@user.email], mail.to
    assert_equal ["from@example.com"], mail.from
    assert_match @task.name, mail.body.encoded
  end

end
