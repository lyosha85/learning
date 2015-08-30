array = [1,2,3,4]

def average(arr)
  sum = 0
  arr.each {|n| sum += n}
  return sum / arr.size
end

puts average array
