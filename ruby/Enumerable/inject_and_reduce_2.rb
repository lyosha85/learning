# These two methods are aliases. 

# add 1 to 10
puts (1..10).reduce(:+)
puts (1..10).inject(:+)

# now with a block
puts (1..10).inject {|sum, n| sum + n}

# multiply
puts (1..10).reduce(1, :*)

# with a block
puts (1..10).inject {|product, n| product * n}

# find the longest word
# In the first iteration, mem will store the first element of the enum, while word will store the second
# in each iteration, mem will store the return value of each iteration 
# here I will return the longest word per iteration
# the block will be excecuted as many times as there are items in the enum
# the final result will be returned to the puts function, which will print it to the screen
puts %w{dhh rails rubies matz mri}.inject {|mem, word| mem.length > word.length ? mem : word}

# how about declaring the first variable?
puts %w{dhh rails rubies matz mri}.inject("tenderlove") {|mem, word| mem.length > word.length ? mem : word}

# makeup some test results
TestResult = Struct.new(:status, :message)
results = [
	TestResult.new(:failed, "1 expected but was 2"),
	TestResult.new(:success),
	TestResult.new(:failed, "10 expected but was 20")
]
# find which ones failed
failed = results.inject([])  do |messages, test_result| 
	messages << test_result if test_result.status == :failed
	messages
end
puts failed

# and group them togather
grouped_results = results.inject({}) do |grouped, test_result|
	grouped[test_result.status] = [] if grouped[test_result.status].nil?
	grouped[test_result.status] << test_result
	grouped
end
puts grouped_results