# require 'test/unit'

# class TestArray < Test::Unit::TestCase
#   def test_array_can_be_created
#     assert_instance Array, Array.new
#   end

#   def test_array_of_specific_length_can_be_created
#     assert_equal 10, Array.new(10).size
#   end
# end

require 'minitest/spec'
require 'minitest/autorun'

describe Array do
  it "can be created with no arguments" do
    Array.new.must_be_instance_of Array
  end
  it "can be created with a specific size" do
    Array.new(10).size.must_equal 10
  end
end
