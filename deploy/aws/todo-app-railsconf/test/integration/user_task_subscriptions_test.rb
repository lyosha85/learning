require 'test_helper'

class UserTaskSubscriptionsTest < ActionDispatch::IntegrationTest
  def setup
    ActionMailer::Base.deliveries.clear
    @user = users(:test)
    @task = tasks(:one)
  end

  test "user can subscribe to a task and get an update email" do
    login_as_test_user
    visit task_path(@task)
    page.select 'WIP'
    click_button 'Change Task State'
    assert_equal(0, ActionMailer::Base.deliveries.size,
      "Unexpected Email Sent")
    click_button 'Subscribe to Task Updates'
    within ".alert" do
      assert page.has_content?("Successfully subscribed to task updates"),
        "Missing subscription success notice."
    end
    assert !page.has_content?("Subscribe to Task Updates"),
      "Link to subscribe to task updates remains after subscription."
    page.select 'DONE'
    click_button 'Change Task State'
    click_link 'Log Out'
    assert_equal(1, ActionMailer::Base.deliveries.size,
      "Email not sent for task state change.")
  end
end
