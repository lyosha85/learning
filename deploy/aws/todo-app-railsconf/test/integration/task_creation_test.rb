require 'test_helper'

class TaskCreationTest < ActionDispatch::IntegrationTest
  test "user can create a new task" do
    # Log in and go to task form.
    login_as_test_user
    visit root_path
    click_link 'Create New Task'

    # New task form.
    fill_in 'Name',        with: "Sample Task"
    fill_in 'Description', with: "An example task."
    click_button 'Create Task'

    # Task Creation Postcondition
    assert page.has_content?("Sample Task"),
      "Missing task name."
    assert page.has_content?("An example task."),
      "Missing task description."
    assert page.has_content?("Created By: test"),
      "Missing 'created_by' declaration."

    # Tasks Should Appear on the Root Page
    visit root_path
    assert page.has_content?("Sample Task")
    click_link 'Log Out' # This state bleeds across tests.
  end
end
