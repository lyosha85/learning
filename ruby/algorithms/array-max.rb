array = [2,3,4,5,7,8,1]

def positive_max(arr)
  x = 0
  arr.each {|n| x = n if n > x }
  return x
end

puts positive_max array
