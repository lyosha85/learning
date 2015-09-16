require 'test_helper'

class TaskTest < ActiveSupport::TestCase
  should validate_presence_of(:name)
  should validate_presence_of(:description)
  should validate_presence_of(:user_id)
  should validate_presence_of(:state)
end
