require 'test_helper'

class UserCreationTest < ActionDispatch::IntegrationTest
  test "user creation process from home page" do
    # Go to User Creation Page
    visit root_path
    click_link 'Register'

    # New User Form
    fill_in 'Username',     with: 'testuser'
    fill_in 'Email',        with: 'testuser@example.org'
    fill_in 'Password',     with: 'password123'
    fill_in 'Confirmation', with: 'password123'
    click_button 'Create'

    # Post Creation State
    assert_equal current_path, user_path(User.find_by_username('testuser'))
    assert page.has_content?('testuser'), "Missing username in user page."
    assert page.has_content?('Log Out'),  "Missing logout button."
  end

  test "user creation process from login page" do
    # Go to User Creation Page
    visit root_path
    click_link 'Log In'
    click_link 'Create a New Account'

    # New User Form
    fill_in 'Username',     with: 'testuser'
    fill_in 'Email',        with: 'testuser@example.org'
    fill_in 'Password',     with: 'password123'
    fill_in 'Confirmation', with: 'password123'
    click_button 'Create'

    # Post Creation State
    assert_equal current_path, user_path(User.find_by_username('testuser'))
    assert page.has_content?('testuser'), "Missing username in user page."
    assert page.has_content?('Log Out'),  "Missing logout button."
  end
end
