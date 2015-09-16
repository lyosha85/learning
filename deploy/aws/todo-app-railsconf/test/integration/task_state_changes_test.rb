require 'test_helper'

class TaskStateChangesTest < ActionDispatch::IntegrationTest
  def setup
    @user = users(:test)
    @task = tasks(:one)
  end

  test "user can change task state" do
    login_as_test_user
    visit task_path(@task)
    within ".label-warning" do
      assert page.has_content?("TODO"),
        "Task doesn't have TODO state before change."
    end
    page.select 'WIP'
    click_button 'Change Task State'
    within ".label-info" do
      assert page.has_content?("WIP"),
        "Task doesn't have WIP state after change."
    end
    click_link 'Log Out'
  end

  test "anonymous user cannot change task state" do
    visit task_path(@task)
    within ".label-warning" do
      assert page.has_content?("TODO"),
        "Task doesn't have TODO state on load."
    end
    assert !page.has_content?("Change Task State"),
      "New task state form shoudn't be visible to anonymous users."
  end
end
