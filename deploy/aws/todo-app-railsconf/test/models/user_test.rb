require 'test_helper'

class UserTest < ActiveSupport::TestCase
  # Username Test
  should validate_presence_of(:username)
  should validate_length_of(:username).is_at_least(5).is_at_most(32)
  should validate_uniqueness_of(:username).case_insensitive

  # Email Test
  should validate_presence_of(:email)
  should validate_uniqueness_of(:email).case_insensitive

  valid_emails = %w[valid@example.org t.e.s.t@example.com
                    test+tags@example.random.tld]
  valid_emails.each do |valid|
    should allow_value(valid).for(:email)
  end

  invalid_emails = %w[not_an_email @forgottheprefix.com fail_at_wrong_dot_com
                      foo@bar_baz.com foo@bar+baz.com]
  invalid_emails << "#{ 'x' * 244 }@example.com"
  invalid_emails.each do |invalid|
    should_not allow_value(invalid).for(:email)
  end

  # Password Test
  should have_secure_password
end
