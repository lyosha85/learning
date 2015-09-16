require 'test_helper'

class UserSessionsTest < ActionDispatch::IntegrationTest
  def setup
    @user = users(:test)
  end

  test "user can log in then out" do
    # Pre Login State
    visit root_path
    assert !page.has_content?('Log Out')

    # Login Form
    login_as_test_user

    # Post Login State
    assert_equal current_path, root_path

    # Logout Button Should Be In Layout
    click_link 'Log Out'

    # Post Logout State
    assert_equal current_path, root_path
    assert !page.has_content?('Log Out')
  end

  test "login fails with invalid credentials" do
    # Go to Login Page
    visit root_path
    click_link 'Log In'
    visit '/login'

    # Login Form
    fill_in 'Email',    with: 'test@example.org'
    fill_in 'Password', with: 'hackyhack'
    click_button 'Log In'

    # Login Failure Postconditions
    assert_equal current_path, login_path
    assert page.has_content?('Invalid email/password combination!'),
      "Missing flash warning for invalid login."
  end
end
