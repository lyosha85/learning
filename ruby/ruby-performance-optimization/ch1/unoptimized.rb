require "benchmark"

num_rows = 100000
num_cols = 10

data = Array.new(num_rows) {Array.new(num_cols) {"x"*1000}}

time = Benchmark.realtime do
	csv = data.map {|row| row.join(",")}.join("\n")
end

puts time.round(2)